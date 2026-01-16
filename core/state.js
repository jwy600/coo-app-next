const createBlock = (id, messageId, text, type = "paragraph") => ({
  id,
  messageId,
  type,
  text,
  edited: false,
  selections: [],
  prevText: null,
  isRewritten: false
});

export const createInitialState = (idFactory, nowFactory) => {
  const threadId = idFactory();
  const now = nowFactory();
  return {
    mode: "landing",
    selectedBlockId: null,
    hasInitialResponse: false,
    activeThreadId: threadId,
    threads: [
      {
        id: threadId,
        title: "Main",
        createdAt: now,
        updatedAt: now,
        messages: []
      }
    ],
    blocks: []
  };
};

export const setMode = (state, mode) => {
  const next = { ...state, mode };
  if (mode === "landing") {
    return { ...next, selectedBlockId: null };
  }
  return next;
};

export const setActiveThread = (state, threadId) => ({
  ...state,
  activeThreadId: threadId
});

export const updateThreadTitle = (state, threadId, title, nowFactory) => ({
  ...state,
  threads: state.threads.map((thread) =>
    thread.id === threadId
      ? { ...thread, title, updatedAt: nowFactory() }
      : thread
  )
});

export const getThreadById = (state, threadId) =>
  state.threads.find((thread) => thread.id === threadId);

export const createThread = (state, threadId, nowFactory, title = "Main") => {
  const now = nowFactory();
  const thread = {
    id: threadId,
    title,
    createdAt: now,
    updatedAt: now,
    messages: []
  };
  return {
    state: {
      ...state,
      activeThreadId: threadId,
      threads: [...state.threads, thread]
    },
    thread
  };
};

export const clearSelectedBlock = (state) => ({
  ...state,
  selectedBlockId: null
});

export const setHasInitialResponse = (state, value) => ({
  ...state,
  hasInitialResponse: value
});

export const toggleSelectedBlock = (state, blockId) => {
  if (state.mode !== "chat") {
    return { ...state, selectedBlockId: null };
  }
  const nextId = state.selectedBlockId === blockId ? null : blockId;
  return { ...state, selectedBlockId: nextId };
};

export const getBlockById = (state, blockId) =>
  state.blocks.find((block) => block.id === blockId);

const updateThreadMessages = (state, threadId, updater, nowFactory) => {
  const threads = state.threads.map((thread) => {
    if (thread.id !== threadId) return thread;
    const nextMessages = updater(thread.messages);
    return { ...thread, messages: nextMessages, updatedAt: nowFactory() };
  });
  return { ...state, threads };
};

export const addUserMessage = (state, text, idFactory, nowFactory) => {
  const threadId = state.activeThreadId;
  const messageId = idFactory();
  const message = {
    id: messageId,
    threadId,
    role: "user",
    createdAt: nowFactory(),
    content: [
      {
        blockId: idFactory()
      }
    ],
    meta: {}
  };
  const block = createBlock(message.content[0].blockId, messageId, text);
  const nextState = updateThreadMessages(
    state,
    threadId,
    (messages) => [...messages, message],
    nowFactory
  );
  return {
    state: { ...nextState, blocks: [...nextState.blocks, block] },
    message,
    blocks: [block]
  };
};

export const addAssistantMessage = (state, blocksData, idFactory, nowFactory) => {
  const threadId = state.activeThreadId;
  const messageId = idFactory();
  const newBlocks = blocksData.map((block) =>
    createBlock(idFactory(), messageId, block.text, block.type)
  );
  const message = {
    id: messageId,
    threadId,
    role: "assistant",
    createdAt: nowFactory(),
    content: newBlocks.map((block) => ({ blockId: block.id })),
    meta: {}
  };
  const nextState = updateThreadMessages(
    state,
    threadId,
    (messages) => [...messages, message],
    nowFactory
  );
  return {
    state: { ...nextState, blocks: [...nextState.blocks, ...newBlocks] },
    message,
    blocks: newBlocks
  };
};

const ensureThreadExists = (state, threadId, nowFactory) => {
  const existing = getThreadById(state, threadId);
  if (existing) return state;
  const now = nowFactory();
  const thread = {
    id: threadId,
    title: "Main",
    createdAt: now,
    updatedAt: now,
    messages: []
  };
  return { ...state, threads: [...state.threads, thread] };
};

export const addAssistantMessageToThread = (
  state,
  threadId,
  blocksData,
  idFactory,
  nowFactory
) => {
  const baseState = ensureThreadExists(state, threadId, nowFactory);
  const messageId = idFactory();
  const newBlocks = blocksData.map((block) =>
    createBlock(idFactory(), messageId, block.text, block.type)
  );
  const message = {
    id: messageId,
    threadId,
    role: "assistant",
    createdAt: nowFactory(),
    content: newBlocks.map((block) => ({ blockId: block.id })),
    meta: {}
  };
  const nextState = updateThreadMessages(
    baseState,
    threadId,
    (messages) => [...messages, message],
    nowFactory
  );
  return {
    state: { ...nextState, blocks: [...nextState.blocks, ...newBlocks] },
    message,
    blocks: newBlocks
  };
};

const updateBlock = (state, blockId, updater) => {
  let updatedBlock = null;
  const blocks = state.blocks.map((block) => {
    if (block.id !== blockId) return block;
    updatedBlock = updater(block);
    return updatedBlock;
  });
  return {
    state: { ...state, blocks },
    block: updatedBlock
  };
};

export const addSelection = (state, blockId, text) =>
  updateBlock(state, blockId, (block) => ({
    ...block,
    selections: [...block.selections, text]
  }));

export const removeSelection = (state, blockId, index) =>
  updateBlock(state, blockId, (block) => ({
    ...block,
    selections: block.selections.filter((_, idx) => idx !== index)
  }));

export const clearSelections = (state, blockId) =>
  updateBlock(state, blockId, (block) => ({
    ...block,
    selections: []
  }));

export const toggleRewrite = (state, blockId, rewriteSentence) =>
  updateBlock(state, blockId, (block) => {
    if (block.isRewritten && block.prevText != null) {
      return {
        ...block,
        text: block.prevText,
        prevText: null,
        isRewritten: false,
        edited: true
      };
    }
    return {
      ...block,
      prevText: block.text,
      text: rewriteSentence,
      isRewritten: true,
      edited: true
    };
  });

export const updateBlockText = (state, blockId, text, edited = false) =>
  updateBlock(state, blockId, (block) => ({
    ...block,
    text,
    edited: edited ? true : block.edited
  }));

export const getCommandOutput = ({
  blockText,
  command,
  prompt,
  copy,
  specialOutputs
}) => {
  if (!blockText) return "";
  const normalizeText = (value) => {
    if (Array.isArray(value)) {
      return value.join("\n\n");
    }
    return typeof value === "string" ? value : "";
  };
  const diminishingPrefix = "Diminishing returns to each input";
  const isDiminishing = blockText.trim().startsWith(diminishingPrefix);
  const isRewriteSentence =
    copy.rewriteSentence && blockText.trim() === copy.rewriteSentence.trim();

  if (command === "translate") {
    if (isRewriteSentence && copy.rewriteTranslation) {
      return normalizeText(copy.rewriteTranslation);
    }
    if (isDiminishing) {
      return normalizeText(specialOutputs.translate);
    }
    const hasCjk = /[\u3040-\u30ff\u3400-\u9fff]/.test(blockText);
    return hasCjk
      ? `Translation (mock): ${blockText.replace(/。/g, ".")}`
      : `【中文翻译】${blockText}`;
  }

  if (command === "expand") {
    return isDiminishing
      ? normalizeText(specialOutputs.expand)
      : `Expanded:\n${blockText}\n\nContext: This idea connects to everyday choices and long-term planning.\nExample: A small change in one neighborhood can ripple outward and shift habits.\nDetail: It adds texture, clarity, and a more human pace to the original claim.`;
  }

  if (command === "example") {
    if (isDiminishing && specialOutputs.example) {
      return normalizeText(specialOutputs.example);
    }
    if (copy.exampleTemplate) {
      return normalizeText(copy.exampleTemplate).replace("{block}", blockText);
    }
    return `Example:\n${blockText}\n\nIllustration: Imagine a small team with one machine. Adding a second machine helps a lot at first, but adding a third helps less because the team is still the same size. The point is the balance between inputs.`;
  }

  if (command === "eli5") {
    return isDiminishing
      ? normalizeText(specialOutputs.eli5)
      : `ELI5:\n- ${blockText.split(".")[0].trim()}.\n- This means it helps people in simple, everyday ways.\n- Think of it as making things easier and cooler.`;
  }

  if (command === "ask") {
    if (!prompt) return "";
    if (copy.askTemplate) {
      return normalizeText(copy.askTemplate)
        .replace("{block}", blockText)
        .replace("{prompt}", prompt);
    }
    return `Answer (mock): Based on "${blockText}", the question "${prompt}" points to the core idea and its practical impact.`;
  }

  return "";
};

const isListLine = (line) =>
  /^(\s*)([-*+]|\d+\.)\s+/.test(line);

const normalizeBlocks = (blocks) => {
  const result = [];

  blocks.forEach((block) => {
    const trimmed = block.text.trim();
    if (!trimmed) return;

    // If this is a paragraph block with multiple lines that might contain headings, split it
    if (block.type === "paragraph" && trimmed.includes("\n")) {
      const lines = trimmed.split("\n");
      let buffer = [];

      lines.forEach((line) => {
        const isHeading = /^#{1,6}\s+/.test(line.trim());

        if (isHeading) {
          // Flush buffer before heading
          if (buffer.length > 0) {
            result.push({ type: "paragraph", text: buffer.join("\n").trim() });
            buffer = [];
          }
          // Add heading as separate block
          result.push({ type: "paragraph", text: line.trim() });
        } else {
          buffer.push(line);
        }
      });

      // Flush remaining buffer
      if (buffer.length > 0) {
        result.push({ type: "paragraph", text: buffer.join("\n").trim() });
      }
    } else {
      result.push({ type: block.type, text: trimmed });
    }
  });

  return result.filter((block) => block.text.length > 0);
};

export const splitIntoBlocks = (content) => {
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  const blocks = [];
  let buffer = [];
  let inCode = false;
  let codeFence = "";

  const flushParagraph = () => {
    if (!buffer.length) return;
    const text = buffer.join("\n").trim();
    if (text) {
      blocks.push({ type: "paragraph", text });
    }
    buffer = [];
  };

  const flushList = () => {
    if (!buffer.length) return;
    const text = buffer.join("\n").trim();
    if (text) {
      blocks.push({ type: "list", text });
    }
    buffer = [];
  };

  const flushCode = (text) => {
    const trimmed = text.trim();
    if (trimmed) {
      blocks.push({ type: "code", text: trimmed });
    }
  };

  let currentMode = "paragraph";
  let codeBuffer = [];

  lines.forEach((line, index) => {
    const fenceMatch = line.match(/^\s*(```|~~~)/);
    if (fenceMatch) {
      if (!inCode) {
        flushParagraph();
        flushList();
        inCode = true;
        codeFence = fenceMatch[1];
        codeBuffer = [line];
        return;
      }
      if (inCode && fenceMatch[1] === codeFence) {
        codeBuffer.push(line);
        flushCode(codeBuffer.join("\n"));
        codeBuffer = [];
        inCode = false;
        codeFence = "";
        currentMode = "paragraph";
        return;
      }
    }

    if (inCode) {
      codeBuffer.push(line);
      return;
    }

    const isBlank = line.trim() === "";
    const listLine = isListLine(line);
    const isHeading = /^#{1,6}\s+/.test(line.trim());

    if (isBlank) {
      if (currentMode === "list") {
        flushList();
      } else {
        flushParagraph();
      }
      currentMode = "paragraph";
      return;
    }

    if (isHeading) {
      if (currentMode === "list") {
        flushList();
      } else {
        flushParagraph();
      }
      blocks.push({ type: "paragraph", text: line.trim() });
      currentMode = "paragraph";
      return;
    }

    if (listLine) {
      if (currentMode !== "list") {
        flushParagraph();
        currentMode = "list";
      }
      buffer.push(line);
      return;
    }

    if (currentMode === "list") {
      flushList();
      currentMode = "paragraph";
    }
    buffer.push(line);

    if (index === lines.length - 1) {
      flushParagraph();
    }
  });

  if (inCode && codeBuffer.length) {
    flushCode(codeBuffer.join("\n"));
  }

  if (buffer.length) {
    if (currentMode === "list") {
      flushList();
    } else {
      flushParagraph();
    }
  }

  return normalizeBlocks(blocks);
};
