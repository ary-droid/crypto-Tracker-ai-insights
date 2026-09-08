import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { holdings } = req.body || {};
  if (!Array.isArray(holdings) || holdings.length === 0) {
    return res.status(400).json({ success: false, error: "No holdings provided" });
  }

  try {
    // compute values and percentages
    const computed = holdings.map((h: any) => {
      const price = Number(h.price ?? 0);
      const quantity = Number(h.quantity ?? 0);
      const value = price * quantity;
      return { id: h.id, price, quantity, value };
    });

    const total = computed.reduce((s: number, c: any) => s + c.value, 0) || 0;

    const withPct = computed.map((c: any) => ({
      id: c.id,
      value: c.value,
      pct: total === 0 ? 0 : (c.value / total) * 100,
    }));

    // build a concise prompt describing the portfolio composition for the LLM
    const compositionText = withPct
      .map((c: any) => `${c.id}: $${c.value.toFixed(2)} (${c.pct.toFixed(2)}%)`)
      .join(", ");

    const topHoldings = withPct.slice().sort((a: any, b: any) => b.pct - a.pct).slice(0, 5);
    const topText = topHoldings.map((t: any) => `${t.id} (${t.pct.toFixed(1)}%)`).join(", ");

    const prompt = `You are a helpful financial assistant. The user portfolio holdings are: ${compositionText}. Total portfolio value is $${total.toFixed(2)}. Provide a short (2-4 sentences) human-readable insight about this portfolio, mentioning concentration, diversification risk if any, and one concrete suggestion the user could consider (for example: rebalance, add stablecoins, consider dollar-cost averaging). Also list the top holdings by percent: ${topText}. Keep the language simple and actionable.`;

    // Local heuristics for quick explainability and actions
    const sorted = withPct.slice().sort((a: any, b: any) => b.pct - a.pct);
    const highest = sorted[0];
    const riskScore = highest.pct >= 75 ? 90 : highest.pct >= 50 ? 70 : highest.pct >= 30 ? 45 : 20;

    const suggested_actions: any[] = [];
    if (highest.pct >= 50) {
      suggested_actions.push({
        type: 'rebalancing',
        reason: `${highest.id} represents ${highest.pct.toFixed(1)}% of the portfolio, which is concentrated. Consider reducing exposure to ${highest.id} to reduce concentration risk.`,
      });
    } else if (highest.pct >= 30) {
      suggested_actions.push({ type: 'monitor', reason: `${highest.id} is ${highest.pct.toFixed(1)}% — watch for volatility and consider gradual rebalancing.` });
    } else {
      suggested_actions.push({ type: 'diversified', reason: 'Portfolio looks reasonably diversified by percent.' });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    const insightText = response?.text ?? null;

    return res.status(200).json({
      success: true,
      insight: insightText,
      composition: withPct,
      total,
      prompt: prompt,
      topHoldings: topHoldings,
      riskScore,
      suggested_actions,
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    return res.status(500).json({ success: false, error: "Failed to generate AI insight" });
  }
}