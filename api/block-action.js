const buildActionPrompt = ({ action, blockText, prompt }) => {
  const trimmedBlock = blockText.trim();
  switch (action) {
    case "translate":
      return `Translate the following text into Chinese:\n\n${trimmedBlock}`;
    case "example":
      return `Provide a concise example that illustrates the following text:\n\n${trimmedBlock}`;
    case "expand":
      return `Expand on the following text with more depth and detail:\n\n${trimmedBlock}`;
    case "eli5":
      return `Explain the following text like I'm five:\n\n${trimmedBlock}`;
    case "rewrite": {
      const highlightPrompt = prompt.trim();
      return `Rewrite the following text, preserving meaning while emphasizing the highlighted phrases.\n\nHighlighted phrases:\n${highlightPrompt}\n\nText to rewrite:\n${trimmedBlock}`;
    }
    case "ask": {
      const trimmedPrompt = prompt.trim();
      return `You are given a selected paragraph:\n"${trimmedBlock}"\n\nUser’s question:\n"${trimmedPrompt}"\n\nAnswer the question about the selected paragraph only.`;
    }
    default:
      return "";
  }
};

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

    const action = typeof body?.action === "string" ? body.action.trim() : "";
    const blockText =
      typeof body?.blockText === "string" ? body.blockText.trim() : "";
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

    if (!action || !blockText) {
      return res.status(400).json({ error: "Missing block action input." });
    }
    if ((action === "ask" || action === "rewrite") && !prompt) {
      return res
        .status(400)
        .json({ error: "Missing prompt for block action." });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res
        .status(500)
        .json({ error: "Missing OpenAI API key configuration." });
    }

    const actionPrompt = buildActionPrompt({ action, blockText, prompt });
    if (!actionPrompt) {
      return res.status(400).json({ error: "Unsupported action." });
    }

    if (actionPrompt.length > 4000) {
      return res.status(400).json({
        error: "That request is a bit too long. Please shorten it."
      });
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
          messages: [{ role: "user", content: actionPrompt }],
          temperature: 0.5
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
