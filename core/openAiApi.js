const requestOpenAi = async ({ payload, endpoint }) => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      data?.error ||
      data?.details ||
      "We couldn't reach the assistant. Please try again in a moment.";
    throw new Error(message);
  }
  const text = typeof data?.text === "string" ? data.text.trim() : "";
  if (!text) {
    throw new Error("The assistant didn't return any text.");
  }
  return text;
};

export const createOpenAiApi = () => {
  const fetchAssistantReply = async ({ prompt, threadId }) => {
    const payload = { prompt, threadId, mode: "chat" };
    const text = await requestOpenAi({ payload, endpoint: "/api/chat" });
    return { role: "assistant", text };
  };

  const fetchBlockAction = async ({ blockText, action, prompt }) => {
    const payload = {
      action,
      blockText,
      prompt,
      mode: "block"
    };
    const text = await requestOpenAi({ payload, endpoint: "/api/block-action" });
    return { outputText: text };
  };

  return {
    fetchAssistantReply,
    fetchBlockAction
  };
};
