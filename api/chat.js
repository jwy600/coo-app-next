export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Only POST requests are supported." });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (parseError) {
        return res.status(400).json({ error: "Invalid JSON payload." });
      }
    }
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return res.status(400).json({ error: "Please provide a prompt." });
    }

    if (prompt.length > 4000) {
      return res
        .status(400)
        .json({ error: "That prompt is a bit too long. Please shorten it." });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res
        .status(500)
        .json({ error: "Missing OpenAI API key configuration." });
    }

    const openAiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7
        })
      }
    );

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      return res.status(500).json({
        error: "We couldn't reach the assistant. Please try again in a moment.",
        details: errorText
      });
    }

    const payload = await openAiResponse.json();
    const text = payload?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      return res
        .status(500)
        .json({ error: "The assistant didn't return any text." });
    }

    return res.status(200).json({ text });
  } catch (error) {
    return res.status(500).json({
      error: "We ran into an issue generating a response. Please try again."
    });
  }
}
