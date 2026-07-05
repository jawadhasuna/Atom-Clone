// ============================================================
// POST /api/chat
// ------------------------------------------------------------
// Takes { message: "..." } (text the browser already transcribed
// from your voice) and asks Gemini for a short, casual reply.
// GEMINI_API_KEY never leaves this function — the browser never
// talks to Gemini directly in this flow.
// ============================================================

// Gemini 2.0 Flash was shut down mid-2026 — this is the current
// cost-efficient text model as of writing. If Google renames/replaces
// it again later, this is the one line to update.
const MODEL_NAME = "gemini-3.1-flash-lite";

const SYSTEM_INSTRUCTION =
  "You are Atom, a friendly, casual conversational partner. Keep replies short and natural, like a real phone call — a sentence or two, not paragraphs.";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Missing 'message' in request body." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY environment variable");
    return res.status(500).json({ error: "Server is not configured (missing API key)." });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: message }] }],
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Gemini error:", response.status, errBody);
      return res.status(502).json({ error: "Gemini request failed." });
    }

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";

    if (!reply) {
      return res.status(502).json({ error: "Gemini returned an empty reply." });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("api/chat error:", err);
    return res.status(500).json({ error: "Something went wrong talking to Gemini." });
  }
};
