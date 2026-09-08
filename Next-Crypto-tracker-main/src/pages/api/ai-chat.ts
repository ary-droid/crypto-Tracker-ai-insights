import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, history, holdings } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ success: false, error: "No message provided" });
  }

  try {
    // Build a short portfolio context
    let compositionText = "";
    if (Array.isArray(holdings) && holdings.length > 0) {
      const computed = holdings.map((h: any) => {
        const price = Number(h.price ?? 0);
        const quantity = Number(h.quantity ?? 0);
        const value = price * quantity;
        return { id: h.id, value };
      });
      const total = computed.reduce((s: number, c: any) => s + c.value, 0) || 0;
      compositionText = computed
        .map((c: any) => `${c.id}: $${c.value.toFixed(2)} (${((c.value / (total || 1)) * 100).toFixed(1)}%)`)
        .join(", ");
    }

    const systemPrompt = `You are a helpful financial assistant. The user's portfolio summary: ${compositionText}. Use this context when answering. Keep answers concise and actionable.`;

    const userContent = history && Array.isArray(history) && history.length > 0
      ? history.map((m: any) => `${m.role || 'user'}: ${m.content}`).join('\n') + `\nuser: ${message}`
      : message;

    const fullPrompt = `${systemPrompt}\n\n${userContent}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: fullPrompt,
    });

    return res.status(200).json({ success: true, reply: response?.text ?? null });
  } catch (error) {
    console.error("ai-chat error:", error);
    return res.status(500).json({ success: false, error: "Failed to get chat reply" });
  }
}
