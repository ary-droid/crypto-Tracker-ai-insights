import type { NextApiRequest, NextApiResponse } from "next";

// Simple rebalance suggestion algorithm
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { holdings, max_pct } = req.body || {};
  if (!Array.isArray(holdings) || holdings.length === 0) {
    return res.status(400).json({ success: false, error: "No holdings provided" });
  }

  const targetMax = typeof max_pct === 'number' ? max_pct : 25; // default 25%

  try {
    const computed = holdings.map((h: any) => {
      const price = Number(h.price ?? 0);
      const quantity = Number(h.quantity ?? 0);
      const value = price * quantity;
      return { id: h.id, price, quantity, value };
    });

    const total = computed.reduce((s: number, c: any) => s + c.value, 0) || 0;
    const withPct = computed.map((c: any) => ({ id: c.id, price: c.price, quantity: c.quantity, value: c.value, pct: total === 0 ? 0 : (c.value / total) * 100 }));

    // Identify overweights and underweights
    const over = withPct.filter((c: any) => c.pct > targetMax).sort((a: any, b: any) => b.pct - a.pct);
    const under = withPct.filter((c: any) => c.pct < targetMax).sort((a: any, b: any) => a.pct - b.pct);

    let proceeds = 0;
    const trades: any[] = [];

    // Sell enough from overweights to bring them to targetMax
    for (const o of over) {
      const excessPct = o.pct - targetMax;
      const sellValue = (excessPct / 100) * total;
      const sellQuantity = sellValue / (o.price || 1);
      proceeds += sellValue;
      trades.push({ action: 'sell', id: o.id, quantity: Number(sellQuantity.toFixed(8)), value: Number(sellValue.toFixed(2)), reason: `Reduce ${o.id} from ${o.pct.toFixed(1)}% to ${targetMax}%` });
    }

    // Distribute proceeds to underweights proportionally to how far they are from target
    const totalGap = under.reduce((s: number, u: any) => s + (targetMax - u.pct), 0) || 1;
    for (const u of under) {
      const gap = targetMax - u.pct;
      const alloc = (gap / totalGap) * proceeds;
      const buyQuantity = alloc / (u.price || 1);
      if (alloc > 0.5) { // only add meaningful buys
        trades.push({ action: 'buy', id: u.id, quantity: Number(buyQuantity.toFixed(8)), value: Number(alloc.toFixed(2)), reason: `Bring ${u.id} closer to ${targetMax}% target` });
      }
    }

    // Compute new allocations after simulated trades
    const simulated = withPct.map((c: any) => ({ ...c }));
    for (const t of trades) {
      const sim = simulated.find((s: any) => s.id === t.id);
      if (sim) {
        if (t.action === 'sell') {
          sim.value = Math.max(0, sim.value - t.value);
        } else {
          sim.value = sim.value + t.value;
        }
        sim.pct = (sim.value / total) * 100;
      }
    }

    return res.status(200).json({ success: true, trades, simulated });
  } catch (error) {
    console.error('rebalance error', error);
    return res.status(500).json({ success: false, error: 'Failed to compute rebalance' });
  }
}
