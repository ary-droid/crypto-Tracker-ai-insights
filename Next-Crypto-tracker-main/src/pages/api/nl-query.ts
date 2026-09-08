import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper to safely parse JSON from LLM output
function extractJson(text: string) {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1) return null;
  const sub = text.substring(first, last + 1);
  try {
    return JSON.parse(sub);
  } catch (e) {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query, coins, holdings } = req.body || {};
  if (!query || typeof query !== "string") {
    return res.status(400).json({ success: false, error: "No query provided" });
  }

  try {
    // Prompt the LLM to produce a strict JSON filter object. Keep instructions explicit.
    const prompt = `Translate the user's natural language query into a JSON filter object with the following schema:\n\n{
  "filter": {
    "owned": true|false (optional),
    "price_change_24h": {"less_than": number, "greater_than": number} (optional),
    "price_change_7d": {"less_than": number, "greater_than": number} (optional),
    "market_cap": {"less_than": number, "greater_than": number} (optional),
    "total_volume": {"less_than": number, "greater_than": number} (optional),
    "id_contains": "string" (optional),
    "symbol": "string" (optional),
    "value": {"less_than": number, "greater_than": number} (optional) // value = price*quantity for owned assets
  }
}\n\nReturn ONLY valid JSON and nothing else. Use the user's sentence: "${query}" to fill the filter.\n\nIf a threshold is mentioned like \"lost more than 5% this week\" interpret as price_change_7d.less_than = -5. If it says \"greater than\" or \"more than\" interpret as greater_than.\n`;

    const response = await ai.models.generateContent({ model: "gemini-3.6-flash", contents: prompt });
    const text = response?.text ?? "";
    const parsed = extractJson(text);

    if (!parsed || typeof parsed !== "object" || !parsed.filter) {
      return res.status(200).json({ success: false, error: "Could not parse filter from LLM response", raw: text });
    }

    const filter = parsed.filter;

    // Prepare coin map and holdings map
    const coinsArr: any[] = Array.isArray(coins) ? coins : [];
    const holdingsArr: any[] = Array.isArray(holdings) ? holdings : [];
    const holdingsMap = new Map<string, any>();
    for (const h of holdingsArr) holdingsMap.set(h.id, h);

    function getCoinField(c: any, key: string) {
      if (key === "price_change_7d") {
        return c.price_change_percentage_7d_in_currency ?? c.price_change_percentage_7d ?? c.price_change_percentage_7d ?? null;
      }
      if (key === "price_change_24h") return c.price_change_percentage_24h ?? null;
      if (key === "market_cap") return c.market_cap ?? null;
      if (key === "total_volume") return c.total_volume ?? null;
      return null;
    }

    // Apply filter
    const results = coinsArr.filter((c: any) => {
      // owned filter
      if (filter.owned === true) {
        if (!holdingsMap.has(c.id)) return false;
      }
      if (filter.owned === false) {
        if (holdingsMap.has(c.id)) return false;
      }

      // price_change_24h
      if (filter.price_change_24h) {
        const v = getCoinField(c, "price_change_24h");
        if (v == null) return false;
        if (typeof filter.price_change_24h.less_than === "number" && !(v < filter.price_change_24h.less_than)) return false;
        if (typeof filter.price_change_24h.greater_than === "number" && !(v > filter.price_change_24h.greater_than)) return false;
      }

      // price_change_7d
      if (filter.price_change_7d) {
        const v = getCoinField(c, "price_change_7d");
        if (v == null) return false;
        if (typeof filter.price_change_7d.less_than === "number" && !(v < filter.price_change_7d.less_than)) return false;
        if (typeof filter.price_change_7d.greater_than === "number" && !(v > filter.price_change_7d.greater_than)) return false;
      }

      // market_cap
      if (filter.market_cap) {
        const v = getCoinField(c, "market_cap");
        if (v == null) return false;
        if (typeof filter.market_cap.less_than === "number" && !(v < filter.market_cap.less_than)) return false;
        if (typeof filter.market_cap.greater_than === "number" && !(v > filter.market_cap.greater_than)) return false;
      }

      // total_volume
      if (filter.total_volume) {
        const v = getCoinField(c, "total_volume");
        if (v == null) return false;
        if (typeof filter.total_volume.less_than === "number" && !(v < filter.total_volume.less_than)) return false;
        if (typeof filter.total_volume.greater_than === "number" && !(v > filter.total_volume.greater_than)) return false;
      }

      // id_contains
      if (filter.id_contains && typeof filter.id_contains === "string") {
        if (!c.id.toLowerCase().includes(filter.id_contains.toLowerCase())) return false;
      }

      // symbol
      if (filter.symbol && typeof filter.symbol === "string") {
        if (!c.symbol || !c.symbol.toLowerCase().includes(filter.symbol.toLowerCase())) return false;
      }

      // value (requires holdings)
      if (filter.value) {
        const h = holdingsMap.get(c.id);
        if (!h) return false;
        const price = Number(h.price ?? c.current_price ?? 0);
        const quantity = Number(h.quantity ?? 0);
        const value = price * quantity;
        if (typeof filter.value.less_than === "number" && !(value < filter.value.less_than)) return false;
        if (typeof filter.value.greater_than === "number" && !(value > filter.value.greater_than)) return false;
      }

      return true;
    });

    return res.status(200).json({ success: true, filter, results });
  } catch (error) {
    console.error("nl-query error:", error);
    return res.status(500).json({ success: false, error: "Failed to translate or execute query" });
  }
}
