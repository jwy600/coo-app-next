import {
  createInitialState,
  setMode as coreSetMode,
  setHasInitialResponse,
  toggleSelectedBlock,
  clearSelectedBlock,
  getBlockById,
  getThreadById,
  setActiveThread,
  updateThreadTitle,
  createThread,
  addUserMessage,
  addAssistantMessage,
  addAssistantMessageToThread,
  addSelection,
  removeSelection,
  clearSelections,
  toggleRewrite,
  splitIntoBlocks
} from "./core/state.js";
import { createApi } from "./core/api.js";
import { initSupabase } from "./core/supabaseClient.js";

const thread = document.querySelector("#thread");
const threadList = document.querySelector("#thread-list");
const form = document.querySelector("#chat-form");
const promptInput = document.querySelector("#prompt");
const blockControls = document.querySelector("#blockControls");
const composerLabel = document.querySelector(".composer-label");
const composer = document.querySelector(".composer");
const body = document.body;
const logoButton = document.querySelector(".logo");
const sendButton = document.querySelector(".send");

const getCopyData = () => {
  const node = document.querySelector("#copy-data");
  if (!node) return {};
  try {
    return JSON.parse(node.textContent || "{}");
  } catch (error) {
    return {};
  }
};

const copy = getCopyData();
const api = createApi();
initSupabase().then((client) => {
  if (!client) {
    window.supabaseStatus = "missing-config";
    return;
  }
  window.supabase = client;
  window.supabaseStatus = "ready";
  window.supabaseCheck = async () => {
    const response = await client.from("threads").select("id").limit(1);
    return response;
  };
  renderThreadList();
});

const getSupabaseClient = () =>
  window.supabaseStatus === "ready" ? window.supabase : null;

const toIsoString = (timestamp) => new Date(timestamp).toISOString();

const mapSupabaseThread = (thread, messages, blocks) => {
  const messageOrder = new Map(
    messages.map((message, index) => [message.id, index])
  );
  const sortedBlocks = [...blocks].sort((a, b) => {
    const messageDiff =
      (messageOrder.get(a.message_id) ?? 0) -
      (messageOrder.get(b.message_id) ?? 0);
    if (messageDiff !== 0) return messageDiff;
    return (a.position ?? 0) - (b.position ?? 0);
  });

  const blocksByMessage = new Map();
  sortedBlocks.forEach((block) => {
    if (!blocksByMessage.has(block.message_id)) {
      blocksByMessage.set(block.message_id, []);
    }
    blocksByMessage.get(block.message_id).push(block);
  });

  const threadMessages = messages.map((message) => {
    const messageBlocks = blocksByMessage.get(message.id) || [];
    return {
      id: message.id,
      threadId: message.thread_id,
      role: message.role,
      createdAt: Date.parse(message.created_at),
      content: messageBlocks.map((block) => ({ blockId: block.id })),
      meta: message.meta || {}
    };
  });

  const threadBlocks = sortedBlocks.map((block) => ({
    id: block.id,
    messageId: block.message_id,
    type: block.type,
    text: block.text,
    edited: block.edited,
    selections: Array.isArray(block.selections) ? block.selections : [],
    prevText: block.prev_text,
    isRewritten: block.is_rewritten
  }));

  return {
    thread: {
      id: thread.id,
      title: thread.title,
      createdAt: Date.parse(thread.created_at),
      updatedAt: Date.parse(thread.updated_at),
      messages: threadMessages
    },
    blocks: threadBlocks
  };
};

const loadThreadFromSupabase = async (threadId) => {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data: thread, error: threadError } = await client
    .from("threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();
  if (threadError || !thread) return null;

  const { data: messages, error: messageError } = await client
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (messageError || !messages) return null;

  const { data: blocks, error: blockError } = await client
    .from("blocks")
    .select("*")
    .eq("thread_id", threadId)
    .order("position", { ascending: true });
  if (blockError || !blocks) return null;

  return mapSupabaseThread(thread, messages, blocks);
};

const mergeThreadIntoState = (state, hydratedThread, hydratedBlocks) => {
  const threads = [
    ...state.threads.filter((thread) => thread.id !== hydratedThread.id),
    hydratedThread
  ];
  const messageIds = new Set(hydratedThread.messages.map((message) => message.id));
  const blocks = [
    ...state.blocks.filter((block) => !messageIds.has(block.messageId)),
    ...hydratedBlocks
  ];
  return {
    ...state,
    threads,
    blocks,
    activeThreadId: hydratedThread.id,
    hasInitialResponse:
      state.hasInitialResponse ||
      hydratedThread.messages.some((message) => message.role === "assistant")
  };
};

const persistThreadSnapshot = async ({
  threadId,
  title,
  createdAt,
  updatedAt,
  message,
  blocks
}) => {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from("threads").insert(
      [
        {
          id: threadId,
          title,
          created_at: createdAt,
          updated_at: updatedAt
        }
      ],
      { onConflict: "id", ignoreDuplicates: true }
    );

    if (createdAt !== updatedAt || title) {
      await client
        .from("threads")
        .update({ title, updated_at: updatedAt })
        .eq("id", threadId);
    }

    await client.from("messages").insert([
      {
        id: message.id,
        thread_id: threadId,
        role: message.role,
        created_at: toIsoString(message.createdAt),
        meta: message.meta || {}
      }
    ]);

    const blockRows = blocks.map((block, index) => ({
      id: block.id,
      thread_id: threadId,
      message_id: message.id,
      position: index,
      type: block.type,
      text: block.text,
      edited: block.edited,
      selections: block.selections || [],
      prev_text: block.prevText,
      is_rewritten: block.isRewritten
    }));
    if (blockRows.length) {
      await client.from("blocks").insert(blockRows);
    }
  } catch (error) {
    console.warn("Supabase persistence failed", error);
  }
};

const persistBlockUpdate = async (block) => {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client
      .from("blocks")
      .update({
        text: block.text,
        edited: block.edited,
        selections: block.selections || [],
        prev_text: block.prevText,
        is_rewritten: block.isRewritten
      })
      .eq("id", block.id);
  } catch (error) {
    console.warn("Block update failed", error);
  }
};

const applyCopy = () => {
  const heroHeadline = document.querySelector(".hero-copy h1");
  const heroDescription = document.querySelector(".hero-copy p");
  const heroMeta = document.querySelector(".hero-meta");
  const composerHint = document.querySelector(".composer-hint");
  const blockButtons = blockControls.querySelectorAll("button[data-action]");

  if (heroHeadline && copy.heroHeadline) {
    heroHeadline.textContent = copy.heroHeadline;
  }
  if (heroDescription && copy.heroDescription) {
    heroDescription.textContent = copy.heroDescription;
  }
  if (heroMeta && Array.isArray(copy.heroBadges)) {
    heroMeta.innerHTML = "";
    copy.heroBadges.forEach((badgeText) => {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = badgeText;
      heroMeta.appendChild(badge);
    });
  }
  if (composerHint && copy.composerHint) {
    composerHint.textContent = copy.composerHint;
  }
  if (copy.promptPlaceholder) {
    promptInput.setAttribute("data-placeholder", copy.promptPlaceholder);
  }
  if (blockButtons.length && copy.blockButtons) {
    blockButtons.forEach((button) => {
      const key = button.dataset.action;
      if (key && copy.blockButtons[key]) {
        button.textContent = copy.blockButtons[key];
      }
    });
  }
};

let idCounter = 0;
const idFactory = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${idCounter++}`;
};
const nowFactory = () => Date.now();
let appState = createInitialState(idFactory, nowFactory);
let suppressHashSync = false;

const getPromptText = () =>
  promptInput.textContent.replace(/\u00a0/g, " ").trim();

const clearPromptMarks = () => {
  const marks = promptInput.querySelectorAll("mark.anno");
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize();
  });
};

const updateThreadPadding = () => {
  if (!composer) return;
  const height = composer.getBoundingClientRect().height;
  thread.style.paddingBottom = `${height + 16}px`;
};

let isAwaitingResponse = false;
const setComposerDisabled = (isDisabled) => {
  if (!sendButton) return;
  sendButton.disabled = isDisabled;
  sendButton.classList.toggle("is-loading", isDisabled);
  promptInput.setAttribute("contenteditable", isDisabled ? "false" : "true");
  promptInput.classList.toggle("is-disabled", isDisabled);
};

const saveState = () => {};

const parseThreadIdFromHash = () => {
  const match = window.location.hash.match(/^#\/t\/(.+)$/);
  return match ? match[1] : null;
};

const setHashForThread = (threadId) => {
  if (!threadId) return;
  const nextHash = `#/t/${threadId}`;
  if (window.location.hash === nextHash) return;
  window.location.hash = nextHash;
};

const loadThreadById = (state, threadId) => {
  const existing = getThreadById(state, threadId);
  if (existing) {
    return { state, thread: existing, created: false };
  }
  const created = createThread(state, threadId, nowFactory);
  return { state: created.state, thread: created.thread, created: true };
};

const syncThreadFromHash = async () => {
  const threadId = parseThreadIdFromHash();
  if (!threadId) {
    appState = coreSetMode(appState, "landing");
    appState = clearSelectedBlock(appState);
    syncModes();
    renderThreadFromState();
    return;
  }
  let loaded = loadThreadById(appState, threadId);
  const needsHydration =
    loaded.created || !loaded.thread.messages || !loaded.thread.messages.length;
  if (needsHydration) {
    const hydrated = await loadThreadFromSupabase(threadId);
    if (hydrated) {
      appState = mergeThreadIntoState(
        appState,
        hydrated.thread,
        hydrated.blocks
      );
      loaded = { state: appState, thread: hydrated.thread, created: false };
    } else {
      appState = loaded.state;
    }
  } else {
    appState = loaded.state;
  }
  appState = setActiveThread(appState, threadId);
  appState = coreSetMode(appState, "chat");
  appState = clearSelectedBlock(appState);
  syncModes();
  renderThreadFromState();
};

let threadListRequestId = 0;

const renderThreadList = async () => {
  if (!threadList) return;
  const requestId = (threadListRequestId += 1);
  threadList.textContent = "";
  const client = getSupabaseClient();
  if (!client) return;
  const { data, error } = await client
    .from("threads")
    .select("id,title,updated_at")
    .order("updated_at", { ascending: false });
  if (requestId !== threadListRequestId) return;
  if (error || !data) return;
  data.forEach((threadItem) => {
    const title = threadItem.title?.trim();
    if (!title) return;
    const pill = document.createElement("a");
    pill.className = "thread-pill";
    pill.href = `#/t/${threadItem.id}`;
    pill.textContent = title;
    threadList.appendChild(pill);
  });
};

const renderThreadFromState = () => {
  thread.textContent = "";
  const activeThread = getThreadById(appState, appState.activeThreadId);
  if (!activeThread) return;
  const blockLookup = new Map(
    appState.blocks.map((block) => [block.id, block])
  );
  activeThread.messages.forEach((message) => {
    if (message.role === "user") {
      thread.appendChild(renderUserMessage(message, blockLookup));
    } else {
      thread.appendChild(renderAssistantMessage(message, blockLookup));
    }
  });
  typesetMath(thread);
};

const syncModes = () => {
  body.setAttribute("data-mode", appState.mode);
  const blockModeActive =
    appState.mode === "chat" && !!appState.selectedBlockId;
  body.setAttribute("data-block-mode", blockModeActive ? "active" : "idle");
  blockControls.classList.toggle("hidden", !blockModeActive);
  composerLabel.textContent = blockModeActive
    ? copy.composerLabelBlock || "Ask about the selected paragraph"
    : copy.composerLabel || "Ask coo anything";
  if (!blockModeActive) {
    promptInput.textContent = "";
    clearPromptMarks();
  }
  updateThreadPadding();
};

const renderChipList = (block) => {
  const container = document.createElement("div");
  container.className = "block-chips";
  container.dataset.blockId = block.id;

  block.selections.forEach((text, index) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.title = text;

    const chipText = document.createElement("span");
    chipText.className = "chip-text";
    chipText.textContent = text;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "chip-remove";
    remove.dataset.index = String(index);
    remove.dataset.blockId = block.id;
    remove.setAttribute("aria-label", "Remove selection");
    remove.textContent = "×";

    chip.appendChild(chipText);
    chip.appendChild(remove);
    container.appendChild(chip);
  });

  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "chip-clear";
  clear.dataset.blockId = block.id;
  clear.textContent = "Clear";
  container.appendChild(clear);

  if (block.selections.length) {
    const rewrite = document.createElement("button");
    rewrite.type = "button";
    rewrite.className = "chip-rewrite";
    rewrite.dataset.blockId = block.id;
    const canUndo = block.isRewritten && block.prevText != null;
    rewrite.textContent = block.isRewritten ? "Undo" : "Rewrite";
    if (block.isRewritten && !canUndo) {
      rewrite.disabled = true;
      rewrite.title = "Cannot undo: original text is unavailable.";
      rewrite.setAttribute("aria-disabled", "true");
    }
    container.appendChild(rewrite);
  }
  return container;
};

const isListText = (text) => {
  const lines = text.split("\n").map((line) => line.trim());
  const nonEmpty = lines.filter((line) => line.length > 0);
  if (!nonEmpty.length) return false;
  return nonEmpty.every((line) => /^([-*+]|\d+\.)\s+/.test(line));
};

const renderParagraphBlock = (block) => {
  const row = document.createElement("div");
  row.className = "doc-block";
  row.dataset.blockId = block.id;

  const handle = document.createElement("button");
  handle.className = "gutter-handle";
  handle.type = "button";
  handle.setAttribute("aria-label", "Select paragraph");
  handle.title = "Select paragraph";

  const toggleSelection = () => {
    const previousId = appState.selectedBlockId;
    appState = toggleSelectedBlock(appState, block.id);
    if (previousId !== appState.selectedBlockId) {
      clearPromptMarks();
    }
    updateSelectedStyles();
    syncModes();
    promptInput.focus();
  };

  handle.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSelection();
  });

  handle.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleSelection();
    }
  });

  const content = document.createElement("div");
  content.className = "doc-content";

  if (block.type === "code" || block.text.trim().startsWith("```")) {
    const code = document.createElement("pre");
    code.className = "doc-code";
    const cleaned = block.text.replace(/^\s*```[a-zA-Z0-9]*\s*\n?/, "").replace(/```\s*$/, "");
    code.textContent = cleaned.trim();
    content.appendChild(code);
  } else if (block.type === "list" || isListText(block.text)) {
    const list = document.createElement("ul");
    list.className = "doc-list";
    block.text.split("\n").forEach((line) => {
      const cleaned = line.replace(/^(\s*)([-*+]|\d+\.)\s+/, "").trim();
      if (!cleaned) return;
      const item = document.createElement("li");
      appendInlineSegments(item, cleaned);
      list.appendChild(item);
    });
    content.appendChild(list);
  } else {
    content.appendChild(createParagraphElement(block.text));
  }
  typesetMath(content);
  if (block.selections.length && appState.selectedBlockId === block.id) {
    content.appendChild(renderChipList(block));
  }
  row.appendChild(handle);
  row.appendChild(content);
  if (block.edited) {
    row.classList.add("is-edited");
  }
  if (appState.selectedBlockId === block.id) {
    row.classList.add("is-selected");
  }
  if (appState.selectedBlockId && appState.selectedBlockId !== block.id) {
    row.classList.add("is-muted");
  }
  return row;
};

const renderAssistantMessage = (message, blockLookup) => {
  const wrapper = document.createElement("div");
  wrapper.className = "assistant-message";

  const label = document.createElement("span");
  label.className = "assistant-label";
  label.textContent = copy.assistantLabel || "Coo";

  const stack = document.createElement("div");
  stack.className = "block-stack";
  message.content.forEach((item) => {
    const block = blockLookup.get(item.blockId);
    if (block) {
      stack.appendChild(renderParagraphBlock(block));
    }
  });

  wrapper.appendChild(label);
  wrapper.appendChild(stack);
  return wrapper;
};

const createPendingAssistantMessage = () => {
  const wrapper = document.createElement("div");
  wrapper.className = "assistant-message assistant-message--pending";

  const label = document.createElement("span");
  label.className = "assistant-label";
  label.textContent = copy.assistantLabel || "Coo";

  const placeholder = document.createElement("div");
  placeholder.className = "assistant-placeholder";

  const thinking = document.createElement("span");
  thinking.className = "assistant-thinking";
  thinking.textContent = "Thinking…";

  const skeleton = document.createElement("div");
  skeleton.className = "assistant-skeleton";
  const lineCount = 3;
  for (let index = 0; index < lineCount; index += 1) {
    const line = document.createElement("span");
    line.className = "assistant-skeleton-line";
    if (index === lineCount - 1) {
      line.classList.add("is-short");
    }
    skeleton.appendChild(line);
  }

  placeholder.appendChild(thinking);
  placeholder.appendChild(skeleton);
  wrapper.appendChild(label);
  wrapper.appendChild(placeholder);
  return wrapper;
};

const createAssistantErrorMessage = ({ message, onRetry }) => {
  const wrapper = document.createElement("div");
  wrapper.className = "assistant-message assistant-message--error";

  const label = document.createElement("span");
  label.className = "assistant-label";
  label.textContent = copy.assistantLabel || "Coo";

  const bodyText = document.createElement("div");
  bodyText.className = "assistant-error";

  const errorText = document.createElement("p");
  errorText.textContent = message;

  const retryButton = document.createElement("button");
  retryButton.type = "button";
  retryButton.className = "assistant-retry";
  retryButton.textContent = "Retry";
  retryButton.addEventListener("click", () => {
    onRetry();
  });

  bodyText.appendChild(errorText);
  bodyText.appendChild(retryButton);
  wrapper.appendChild(label);
  wrapper.appendChild(bodyText);
  return wrapper;
};

const renderUserMessage = (message, blockLookup) => {
  const wrapper = document.createElement("div");
  wrapper.className = "user-message";

  const label = document.createElement("span");
  label.className = "user-label";
  label.textContent = copy.userLabel || "You";

  const bodyText = document.createElement("p");
  const blockRef = message.content && message.content[0];
  const block = blockRef ? blockLookup.get(blockRef.blockId) : null;
  bodyText.textContent = block ? block.text : "";

  wrapper.appendChild(label);
  wrapper.appendChild(bodyText);
  return wrapper;
};

const updateSelectedStyles = () => {
  const rows = thread.querySelectorAll(".doc-block");
  rows.forEach((row) => {
    const isSelected = row.dataset.blockId === appState.selectedBlockId;
    row.classList.toggle("is-selected", isSelected);
    row.classList.toggle("is-muted", !!appState.selectedBlockId && !isSelected);
  });
  if (!appState.selectedBlockId) {
    const chips = thread.querySelectorAll(".block-chips");
    chips.forEach((chip) => chip.remove());
  }
};

const updateBlockDOM = (block) => {
  const row = thread.querySelector(`[data-block-id="${block.id}"]`);
  if (!row) return;
  const content = row.querySelector(".doc-content");
  if (content) {
    const firstChild = content.firstChild;
    if (firstChild && !firstChild.classList?.contains("block-chips")) {
      firstChild.remove();
    }
    const newContent = createParagraphElement(block.text);
    content.insertBefore(newContent, content.firstChild);
    typesetMath(content);
  }
  row.classList.toggle("is-edited", block.edited);
};

const updateChipList = (block) => {
  const row = thread.querySelector(`[data-block-id="${block.id}"]`);
  if (!row) return;
  const content = row.querySelector(".doc-content");
  if (!content) return;
  const existing = content.querySelector(".block-chips");
  if (existing) existing.remove();
  if (block.selections.length && appState.selectedBlockId === block.id) {
    content.appendChild(renderChipList(block));
  }
};

const appendUserMessage = (message, blocks) => {
  const lookup = new Map(blocks.map((block) => [block.id, block]));
  thread.appendChild(renderUserMessage(message, lookup));
};

const appendAssistantMessage = (message, blocks) => {
  const lookup = new Map(blocks.map((block) => [block.id, block]));
  const node = renderAssistantMessage(message, lookup);
  thread.appendChild(node);
  typesetMath(node);
};

const scrollToLatest = () => {
  const last = thread.lastElementChild;
  if (!last) return;
  requestAnimationFrame(() => {
    last.scrollIntoView({ behavior: "smooth", block: "end" });
  });
};

const setResultInTextbox = (text) => {
  promptInput.textContent = text;
};

const typesetMath = (root) => {
  if (!root || !window.katex) return;
  const nodes = root.querySelectorAll("[data-tex]");
  nodes.forEach((node) => {
    const tex = node.dataset.tex;
    if (!tex) return;
    try {
      window.katex.render(tex, node, {
        displayMode: node.classList.contains("doc-math-block"),
        throwOnError: false
      });
    } catch (error) {
      node.textContent = tex;
    }
  });
};

const appendInlineSegments = (container, text) => {
  const pushTextWithBold = (value) => {
    const parts = value.split("\n");
    parts.forEach((part, index) => {
      let lastIndex = 0;
      const boldRegex = /\*\*(.+?)\*\*/g;
      let match = boldRegex.exec(part);
      while (match) {
        if (match.index > lastIndex) {
          container.appendChild(
            document.createTextNode(part.slice(lastIndex, match.index))
          );
        }
        const strong = document.createElement("strong");
        strong.textContent = match[1];
        container.appendChild(strong);
        lastIndex = match.index + match[0].length;
        match = boldRegex.exec(part);
      }
      if (lastIndex < part.length) {
        container.appendChild(
          document.createTextNode(part.slice(lastIndex))
        );
      }
      if (index < parts.length - 1) {
        container.appendChild(document.createElement("br"));
      }
    });
  };

  const regex = /(\\\[.*?\\\]|\\\(.*?\\\))/gs;
  let lastIndex = 0;
  let match = regex.exec(text);
  while (match) {
    const before = text.slice(lastIndex, match.index);
    if (before) {
      pushTextWithBold(before);
    }
    const raw = match[0];
    const isBlock = raw.startsWith("\\[");
    const tex = raw.slice(2, -2).trim();
    const mathNode = document.createElement(isBlock ? "div" : "span");
    mathNode.className = isBlock ? "doc-math-block" : "doc-math-inline";
    mathNode.dataset.tex = tex;
    mathNode.textContent = tex;
    container.appendChild(mathNode);
    lastIndex = match.index + raw.length;
    match = regex.exec(text);
  }
  if (lastIndex < text.length) {
    pushTextWithBold(text.slice(lastIndex));
  }
};

const createParagraphElement = (blockText) => {
  const headingMatch = blockText.match(/^(#{1,6})\s+(.*)$/);
  if (headingMatch) {
    const level = Math.min(6, headingMatch[1].length + 1);
    const heading = document.createElement(`h${level}`);
    heading.className = "doc-paragraph doc-heading";
    appendInlineSegments(heading, headingMatch[2]);
    return heading;
  }
  const paragraph = document.createElement("p");
  paragraph.className = "doc-paragraph";
  appendInlineSegments(paragraph, blockText);
  return paragraph;
};

const buildRewritePrompt = (block) => {
  if (!block?.selections?.length) return "";
  const uniqueSelections = Array.from(new Set(block.selections));
  return uniqueSelections.map((text) => `- ${text}`).join("\n");
};

const handleBlockCommand = async (command, prompt = "") => {
  const block = getBlockById(appState, appState.selectedBlockId);
  if (!block) return;
  if (isAwaitingResponse) return;
  setComposerDisabled(true);
  isAwaitingResponse = true;
  try {
    const result = await api.fetchBlockAction({
      blockText: block.text,
      action: command,
      prompt
    });
    setResultInTextbox(result.outputText || "");
  } catch (error) {
    setResultInTextbox(
      error?.message || "We hit a snag getting that response. Try again."
    );
  } finally {
    isAwaitingResponse = false;
    setComposerDisabled(false);
  }
};

const captureSelection = () => {
  if (!appState.selectedBlockId) return;
  const block = getBlockById(appState, appState.selectedBlockId);
  if (!block) return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  const anchorNode = selection.anchorNode;
  const focusNode = selection.focusNode;
  if (
    !anchorNode ||
    !focusNode ||
    !promptInput.contains(anchorNode) ||
    !promptInput.contains(focusNode)
  ) {
    return;
  }
  if (range.collapsed || !promptInput.contains(range.commonAncestorContainer)) {
    return;
  }
  if (range.commonAncestorContainer.parentElement) {
    const markParent = range.commonAncestorContainer.parentElement.closest(
      "mark.anno"
    );
    if (markParent) return;
  }
  const selectedText = selection.toString().trim();
  if (!selectedText || selectedText.length < 2) return;
  const mark = document.createElement("mark");
  mark.className = "anno";
  const fragment = range.extractContents();
  mark.appendChild(fragment);
  range.insertNode(mark);
  selection.removeAllRanges();
  const result = addSelection(appState, block.id, selectedText);
  appState = result.state;
  updateChipList(result.block);
  if (result.block) {
    void persistBlockUpdate(result.block);
  }
  saveState();
};

const respondToPrompt = () => {
  const prompt = getPromptText();
  if (isAwaitingResponse) return;
  if (appState.selectedBlockId) {
    if (!prompt) return;
    void handleBlockCommand("ask", prompt);
    promptInput.focus();
    return;
  }
  if (!prompt) return;
  if (appState.mode === "landing") {
    const created = createThread(appState, idFactory(), nowFactory);
    appState = created.state;
    appState = coreSetMode(appState, "chat");
    syncModes();
    renderThreadFromState();
    suppressHashSync = true;
    setHashForThread(appState.activeThreadId);
  } else {
    const hashThreadId = parseThreadIdFromHash();
    if (!hashThreadId) {
      suppressHashSync = true;
      setHashForThread(appState.activeThreadId);
    }
  }
  const activeThread = getThreadById(appState, appState.activeThreadId);
  const isFirstMessage =
    activeThread && activeThread.messages && activeThread.messages.length === 0;
  const userResult = addUserMessage(appState, prompt, idFactory, nowFactory);
  appState = userResult.state;
  if (isFirstMessage) {
    appState = updateThreadTitle(
      appState,
      appState.activeThreadId,
      prompt,
      nowFactory
    );
  }
  appendUserMessage(userResult.message, userResult.blocks);
  const pendingMessage = createPendingAssistantMessage();
  thread.appendChild(pendingMessage);
  setComposerDisabled(true);
  isAwaitingResponse = true;
  renderThreadList();
  saveState();
  const persistedThread = getThreadById(appState, appState.activeThreadId);
  if (persistedThread) {
    void persistThreadSnapshot({
      threadId: persistedThread.id,
      title: persistedThread.title,
      createdAt: toIsoString(persistedThread.createdAt),
      updatedAt: toIsoString(persistedThread.updatedAt),
      message: userResult.message,
      blocks: userResult.blocks
    });
  }
  if (appState.mode === "chat" && !window.location.hash) {
    setHashForThread(appState.activeThreadId);
  }
  scrollToLatest();
  promptInput.textContent = "";
  appState = clearSelectedBlock(appState);
  updateSelectedStyles();
  syncModes();

  const requestThreadId = appState.activeThreadId;
  const requestAssistantReply = async (pendingNode) => {
    try {
      const response = await api.fetchAssistantReply({
        prompt,
        threadId: requestThreadId
      });
      const blocks = splitIntoBlocks(response.text || "");
      if (!blocks.length) {
        throw new Error("No response returned. Please try again.");
      }
      const assistantResult = addAssistantMessageToThread(
        appState,
        requestThreadId,
        blocks,
        idFactory,
        nowFactory
      );
      appState = assistantResult.state;
      if (!appState.hasInitialResponse) {
        appState = setHasInitialResponse(appState, true);
      }
      const lookup = new Map(
        assistantResult.blocks.map((block) => [block.id, block])
      );
      const assistantNode = renderAssistantMessage(
        assistantResult.message,
        lookup
      );
      pendingNode.replaceWith(assistantNode);
      typesetMath(assistantNode);
      renderThreadList();
      saveState();
      const updatedThread = getThreadById(appState, requestThreadId);
      if (updatedThread) {
        void persistThreadSnapshot({
          threadId: updatedThread.id,
          title: updatedThread.title,
          createdAt: toIsoString(updatedThread.createdAt),
          updatedAt: toIsoString(updatedThread.updatedAt),
          message: assistantResult.message,
          blocks: assistantResult.blocks
        });
      }
      scrollToLatest();
    } catch (error) {
      const errorNode = createAssistantErrorMessage({
        message:
          error?.message || "We hit a snag getting that response. Try again.",
        onRetry: () => {
          if (isAwaitingResponse) return;
          const retryPending = createPendingAssistantMessage();
          errorNode.replaceWith(retryPending);
          setComposerDisabled(true);
          isAwaitingResponse = true;
          scrollToLatest();
          requestAssistantReply(retryPending);
        }
      });
      pendingNode.replaceWith(errorNode);
    } finally {
      isAwaitingResponse = false;
      setComposerDisabled(false);
    }
  };

  requestAssistantReply(pendingMessage);
};

blockControls.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  void handleBlockCommand(button.dataset.action);
});

thread.addEventListener("click", async (event) => {
  const remove = event.target.closest(".chip-remove");
  if (remove) {
    const blockId = remove.dataset.blockId;
    const index = Number(remove.dataset.index);
    if (Number.isNaN(index)) return;
    const result = removeSelection(appState, blockId, index);
    appState = result.state;
    if (result.block) {
      updateChipList(result.block);
      void persistBlockUpdate(result.block);
    }
    saveState();
    return;
  }
  const clear = event.target.closest(".chip-clear");
  if (clear) {
    const blockId = clear.dataset.blockId;
    const result = clearSelections(appState, blockId);
    appState = result.state;
    if (result.block) {
      updateChipList(result.block);
      void persistBlockUpdate(result.block);
    }
    saveState();
    return;
  }
  const rewrite = event.target.closest(".chip-rewrite");
  if (rewrite) {
    const blockId = rewrite.dataset.blockId;
    const block = getBlockById(appState, blockId);
    if (!block) return;
    if (block.isRewritten) {
      if (block.prevText != null) {
        const result = toggleRewrite(appState, blockId, block.prevText);
        appState = result.state;
        if (result.block) {
          updateBlockDOM(result.block);
          updateChipList(result.block);
          void persistBlockUpdate(result.block);
        }
        saveState();
      } else {
        setResultInTextbox(
          "Can't undo this rewrite because the original text isn't available."
        );
      }
      return;
    }
    if (!block.selections.length || isAwaitingResponse) return;
    const rewritePrompt = buildRewritePrompt(block);
    if (!rewritePrompt) return;
    setComposerDisabled(true);
    isAwaitingResponse = true;
    try {
      const response = await api.fetchBlockAction({
        blockText: block.text,
        action: "rewrite",
        prompt: rewritePrompt
      });
      const result = toggleRewrite(
        appState,
        blockId,
        response.outputText || block.text
      );
      appState = result.state;
      if (result.block) {
        updateBlockDOM(result.block);
        updateChipList(result.block);
        void persistBlockUpdate(result.block);
      }
      saveState();
    } catch (error) {
      setResultInTextbox(
        error?.message || "We hit a snag getting that response. Try again."
      );
    } finally {
      isAwaitingResponse = false;
      setComposerDisabled(false);
    }
  }
});

promptInput.addEventListener("mouseup", () => {
  captureSelection();
});

promptInput.addEventListener("keyup", (event) => {
  if (event.key.includes("Arrow") || event.key === "Shift") {
    captureSelection();
  }
});

promptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    respondToPrompt();
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  respondToPrompt();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && appState.selectedBlockId) {
    appState = clearSelectedBlock(appState);
    updateSelectedStyles();
    syncModes();
  }
});

document.addEventListener("mousedown", (event) => {
  if (!appState.selectedBlockId) return;
  const target = event.target;
  if (target.closest(".composer") || target.closest(".doc-block")) {
    return;
  }
  appState = clearSelectedBlock(appState);
  updateSelectedStyles();
  syncModes();
});

if (composer && typeof ResizeObserver !== "undefined") {
  const observer = new ResizeObserver(() => updateThreadPadding());
  observer.observe(composer);
}

window.addEventListener("resize", () => {
  updateThreadPadding();
});

if (logoButton) {
  logoButton.addEventListener("click", () => {
    appState = coreSetMode(appState, "landing");
    appState = clearSelectedBlock(appState);
    syncModes();
    window.location.hash = "";
  });
}

window.addEventListener("hashchange", () => {
  if (suppressHashSync) {
    suppressHashSync = false;
    return;
  }
  void syncThreadFromHash();
});

applyCopy();
const initialThreadId = parseThreadIdFromHash();
if (initialThreadId) {
  void syncThreadFromHash();
} else {
  appState = coreSetMode(appState, "landing");
}
renderThreadList();
syncModes();
promptInput.textContent =
  copy.prefillPrompt ||
  "Explain Cobb-Douglas function, and how does it describe capital/labour substitution.";
