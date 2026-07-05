// ============================================================
// POST /api/speak
// ------------------------------------------------------------
// Takes { text: "..." } (Gemini's reply) and returns MP3 audio
// spoken in your cloned voice via Fish Audio. FISH_API_KEY never
// leaves this function.
//
// Uses model "s2.1-pro-free" — Fish Audio's free-tier model that
// includes voice cloning under their Fair Use policy (confirmed
// free through end of July 2026 per their announcement; check
// fish.audio if it's been longer than that).
// ============================================================

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text } = req.body || {};
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing 'text' in request body." });
  }

  const fishApiKey = process.env.FISH_API_KEY;
  const voiceId = process.env.FISH_VOICE_ID;
  if (!fishApiKey || !voiceId) {
    console.error("Missing FISH_API_KEY or FISH_VOICE_ID environment variable");
    return res.status(500).json({ error: "Server is not configured (missing Fish Audio credentials)." });
  }

  try {
    const response = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${fishApiKey}`,
        "Content-Type": "application/json",
        // Pins this request to Fish Audio's free model — using a
        // different value here would route to a paid model instead.
        model: "s2.1-pro-free",
      },
      body: JSON.stringify({
        text,
        reference_id: voiceId,
        format: "mp3",
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Fish Audio error:", response.status, errBody);
      return res.status(502).json({ error: "Voice generation failed." });
    }

    const arrayBuffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("api/speak error:", err);
    return res.status(500).json({ error: "Something went wrong generating speech." });
  }
};
