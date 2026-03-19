const projectNameInput = document.getElementById("projectNameInput");
const deliverableInput = document.getElementById("deliverableInput");
const audienceInput = document.getElementById("audienceInput");
const toneInput = document.getElementById("toneInput");
const taskInput = document.getElementById("taskInput");
const mustIncludeInput = document.getElementById("mustIncludeInput");
const avoidInput = document.getElementById("avoidInput");
const copyInput = document.getElementById("copyInput");
const styleReferenceInput = document.getElementById("styleReferenceInput");
const outputFocusInput = document.getElementById("outputFocusInput");
const runButton = document.getElementById("runButton");
const clearButton = document.getElementById("clearButton");
const copyButton = document.getElementById("copyButton");
const timeline = document.getElementById("timeline");
const statusText = document.getElementById("statusText");
const roundRange = document.getElementById("roundRange");
const roundNumber = document.getElementById("roundNumber");
const roundCount = document.getElementById("roundCount");
const roundBadge = document.getElementById("roundBadge");
const roundNav = document.getElementById("roundNav");
const overviewPanel = document.getElementById("overviewPanel");
const summaryPanel = document.getElementById("summaryPanel");
const activityPanel = document.getElementById("activityPanel");
const tldrBar = document.getElementById("tldrBar");
const providerChips = [...document.querySelectorAll(".chip")];
const presetButtons = [...document.querySelectorAll(".preset")];
const imageProviderSelect = document.getElementById("imageProviderSelect");
const sizePresetSelect = document.getElementById("sizePresetSelect");
const imageWidthInput = document.getElementById("imageWidthInput");
const imageHeightInput = document.getElementById("imageHeightInput");
const imagePromptInput = document.getElementById("imagePromptInput");
const imagePromptHint = document.getElementById("imagePromptHint");
const generateImageButton = document.getElementById("generateImageButton");
const syncPromptButton = document.getElementById("syncPromptButton");
const imageResults = document.getElementById("imageResults");
const imageStatusText = document.getElementById("imageStatusText");
const autoGenerateInput = document.getElementById("autoGenerateInput");
const generateAdviceButton = document.getElementById("generateAdviceButton");
const applyAdviceButton = document.getElementById("applyAdviceButton");
const advisorStatus = document.getElementById("advisorStatus");
const advisorContent = document.getElementById("advisorContent");

const STORAGE_KEY = "design-workbench-state-v1";
const IMAGE_STORAGE_KEY = "design-workbench-image-state-v2";
const providerClass = {
  DeepSeek: "deepseek",
  豆包: "doubao",
  Gemini: "gemini",
};
const providerLane = {
  DeepSeek: "lane-left",
  豆包: "lane-right",
  Gemini: "lane-left soft",
};

const DEFAULTS = {
  projectName: "春季新品主视觉",
  deliverable: "品牌海报",
  audience: "25-35 岁都市审美消费人群",
  tone: "高级、克制、轻盈、现代商业感",
  task: "做一张新品上市海报，强调主产品质感、品牌调性和可后续排版的主视觉空间。",
  must: "主产品、品牌 logo 区域、留白标题区、核心卖点视觉符号",
  avoid: "廉价电商感、元素堆满、低质感材质、过度 AI 痕迹",
  copy: "Spring Forward",
  reference: "品牌商业海报 / 高级摄影棚拍 / 瑞士排版",
  focus: "需要优先考虑后续文案排版和二次精修空间",
};

const SIZE_PRESETS = {
  "1024x1024": { width: 1024, height: 1024, label: "1:1 方图" },
  "1024x1280": { width: 1024, height: 1280, label: "4:5 竖版" },
  "1200x1600": { width: 1200, height: 1600, label: "3:4 竖版" },
  "864x1536": { width: 864, height: 1536, label: "9:16 封面" },
  "1536x864": { width: 1536, height: 864, label: "16:9 横图" },
  "1792x1024": { width: 1792, height: 1024, label: "Banner" },
};

let selectedRounds = 3;
let currentSession = null;
let streamController = null;
let lastResultText = "";
let imageGenerationController = null;
let latestPromptPack = null;
let imageStudioState = {
  provider: "auto",
  sizePreset: "1024x1280",
  width: 1024,
  height: 1280,
  autoGenerate: false,
  results: [],
  running: false,
  autoDispatched: false,
};
let latestProjectAdvice = null;

function clampRounds(rounds) {
  return Math.min(10, Math.max(1, Number(rounds) || 1));
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeWithBreaks(text) {
  return escapeHtml(text).replaceAll("\n", "<br />");
}

function compactText(text, limit = 180) {
  const normalized = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "等待更多内容...";
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 3)}...`;
}

function avatarText(label) {
  const text = String(label || "").trim();
  if (!text) return "?";
  if (/^[A-Za-z]/.test(text)) return text.slice(0, 2).toUpperCase();
  return text.slice(0, 1);
}

function readBriefFields() {
  return {
    projectName: projectNameInput.value.trim(),
    deliverable: deliverableInput.value,
    audience: audienceInput.value.trim(),
    tone: toneInput.value.trim(),
    task: taskInput.value.trim(),
    must: mustIncludeInput.value.trim(),
    avoid: avoidInput.value.trim(),
    copy: copyInput.value.trim(),
    reference: styleReferenceInput.value.trim(),
    focus: outputFocusInput.value.trim(),
  };
}

function writeBriefFields(fields) {
  projectNameInput.value = fields.projectName ?? "";
  deliverableInput.value = fields.deliverable ?? "品牌海报";
  audienceInput.value = fields.audience ?? "";
  toneInput.value = fields.tone ?? "";
  taskInput.value = fields.task ?? "";
  mustIncludeInput.value = fields.must ?? "";
  avoidInput.value = fields.avoid ?? "";
  copyInput.value = fields.copy ?? "";
  styleReferenceInput.value = fields.reference ?? "";
  outputFocusInput.value = fields.focus ?? "";
}

function setFieldValue(input, value) {
  if (!input || value == null) return;
  const nextValue = String(value).trim();
  if (!nextValue) return;
  input.value = nextValue;
}

function applyDefaults() {
  writeBriefFields(DEFAULTS);
}

function persistState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        rounds: selectedRounds,
        fields: readBriefFields(),
      }),
    );
  } catch {
    return;
  }
}

function restoreState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.rounds) {
      setRounds(parsed.rounds, { persist: false });
    }
    if (parsed.fields) {
      writeBriefFields({ ...DEFAULTS, ...parsed.fields });
    }
  } catch {
    return;
  }
}

function persistImageState() {
  try {
    localStorage.setItem(
      IMAGE_STORAGE_KEY,
      JSON.stringify({
        provider: imageStudioState.provider,
        sizePreset: imageStudioState.sizePreset,
        width: imageStudioState.width,
        height: imageStudioState.height,
        autoGenerate: imageStudioState.autoGenerate,
        prompt: imagePromptInput.value,
      }),
    );
  } catch {
    return;
  }
}

function restoreImageState() {
  try {
    const raw = localStorage.getItem(IMAGE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    imageStudioState.provider = parsed.provider || "auto";
    imageStudioState.sizePreset = parsed.sizePreset || "1024x1280";
    imageStudioState.width = Number(parsed.width) || 1024;
    imageStudioState.height = Number(parsed.height) || 1280;
    imageStudioState.autoGenerate = Boolean(parsed.autoGenerate);
    imageProviderSelect.value = imageStudioState.provider;
    sizePresetSelect.value = SIZE_PRESETS[imageStudioState.sizePreset] ? imageStudioState.sizePreset : "custom";
    imageWidthInput.value = String(imageStudioState.width);
    imageHeightInput.value = String(imageStudioState.height);
    autoGenerateInput.checked = imageStudioState.autoGenerate;
    imagePromptInput.value = parsed.prompt || "";
  } catch {
    return;
  }
}

function setRounds(rounds, options = {}) {
  selectedRounds = clampRounds(rounds);
  roundRange.value = String(selectedRounds);
  roundNumber.value = String(selectedRounds);
  roundCount.textContent = String(selectedRounds);
  roundBadge.textContent = `${selectedRounds} 轮`;
  if (options.persist !== false) {
    persistState();
  }
}

function baseProviders() {
  return providerChips.map((chip) => ({
    key: chip.textContent?.trim().toLowerCase() || "",
    label: chip.textContent?.trim() || "",
    model: "",
  }));
}

function createSession(task, rounds, brief) {
  return {
    task,
    brief,
    totalRounds: rounds,
    providers: baseProviders(),
    rounds: [],
    summary: null,
    unavailable: [],
    status: "正在建立设计会话",
    complete: false,
    lastEvent: "刚刚开始",
    activity: ["正在准备品牌设计席位"],
  };
}

function ensureRound(roundNumber) {
  if (!currentSession) return null;
  let round = currentSession.rounds.find((item) => item.round_number === roundNumber);
  if (!round) {
    round = { round_number: roundNumber, replies: [], pending: [] };
    currentSession.rounds.push(round);
    currentSession.rounds.sort((a, b) => a.round_number - b.round_number);
  }
  return round;
}

function trackActivity(message) {
  if (!currentSession) return;
  currentSession.activity = [message, ...currentSession.activity.filter((item) => item !== message)].slice(0, 6);
  currentSession.lastEvent = message;
}

function trackUnavailable(reply) {
  if (!currentSession || !reply) return;
  const key = `${reply.provider || reply.label}-${reply.error || ""}`;
  const next = currentSession.unavailable.filter((item) => `${item.provider || item.label}-${item.error || ""}` !== key);
  next.unshift(reply);
  currentSession.unavailable = next.slice(0, 8);
}

function setProviderStates(activeLabels = [], unavailableLabels = []) {
  providerChips.forEach((chip) => {
    const label = chip.textContent?.trim() || "";
    chip.classList.toggle("active", activeLabels.includes(label));
    chip.classList.toggle("muted", unavailableLabels.includes(label));
    chip.title = unavailableLabels.includes(label) ? "当前会话中不可用" : "";
  });
}

function buildDesignTask(brief) {
  const lines = [
    "你们现在在为品牌平面设计师共同生成生图 prompt 包。",
    "",
    `项目名：${brief.projectName || "未命名项目"}`,
    `物料类型：${brief.deliverable || "品牌海报"}`,
    `目标受众：${brief.audience || "请结合品牌审美人群推断"}`,
    `品牌调性：${brief.tone || "请根据 brief 推断"}`,
    "",
    "核心 brief：",
    brief.task || "请根据当前物料类型补全一个可落地的商业主视觉方向。",
    "",
    "必须出现：",
    brief.must || "品牌主体、可排版区域、核心视觉符号",
    "",
    "明确避免：",
    brief.avoid || "廉价电商感、元素堆满、低质感材质",
    "",
    `标题/文案：${brief.copy || "无固定标题，请预留标题区"}`,
    `风格参考：${brief.reference || "请按高级商业平面方向处理"}`,
    `额外要求：${brief.focus || "优先考虑后续排版和商业落地"}`,
    "",
    "最终必须产出：",
    "1. 设计结论",
    "2. 最终统一执行 Prompt",
    "3. 工具适配建议",
    "4. 版式与字体建议",
    "5. 后续微调建议",
  ];
  return lines.join("\n");
}

function parseBulletList(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((item) => item.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}

function renderAdvisorCard() {
  if (!latestProjectAdvice) {
    advisorContent.innerHTML = `
      <article class="advisor-empty">
        <strong>还没有建议</strong>
        <p>适合在项目刚起步时先用它补全项目框架和创意输入，把一个粗略 brief 变成更完整的设计工作单。</p>
      </article>
    `;
    applyAdviceButton.disabled = true;
    return;
  }

  advisorContent.innerHTML = `
    <article class="advisor-panel">
      <span class="advisor-kicker">${escapeHtml(latestProjectAdvice.provider || "豆包")} · ${escapeHtml(latestProjectAdvice.model || "")}</span>
      <h4>项目框架与创意输入建议</h4>
      <p>${escapeWithBreaks(latestProjectAdvice.projectSummary || "已生成建议。")}</p>
    </article>
    <div class="advisor-grid">
      <section class="advisor-group">
        <h4>建议项目名</h4>
        <p>${escapeWithBreaks(latestProjectAdvice.suggestedProjectName || "未给出")}</p>
      </section>
      <section class="advisor-group">
        <h4>建议物料类型</h4>
        <p>${escapeWithBreaks(latestProjectAdvice.suggestedDeliverable || "未给出")}</p>
      </section>
      <section class="advisor-group">
        <h4>建议受众</h4>
        <p>${escapeWithBreaks(latestProjectAdvice.suggestedAudience || "未给出")}</p>
      </section>
      <section class="advisor-group">
        <h4>建议调性</h4>
        <p>${escapeWithBreaks(latestProjectAdvice.suggestedTone || "未给出")}</p>
      </section>
      <section class="advisor-group advisor-span-2">
        <h4>建议核心 brief</h4>
        <p>${escapeWithBreaks(latestProjectAdvice.suggestedTask || "未给出")}</p>
      </section>
      <section class="advisor-group">
        <h4>建议必须出现</h4>
        ${
          (latestProjectAdvice.suggestedMust || []).length
            ? `<ul class="advisor-list">${latestProjectAdvice.suggestedMust.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
            : "<p>未给出</p>"
        }
      </section>
      <section class="advisor-group">
        <h4>建议明确避免</h4>
        ${
          (latestProjectAdvice.suggestedAvoid || []).length
            ? `<ul class="advisor-list">${latestProjectAdvice.suggestedAvoid.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
            : "<p>未给出</p>"
        }
      </section>
      <section class="advisor-group">
        <h4>建议标题/文案</h4>
        <p>${escapeWithBreaks(latestProjectAdvice.suggestedCopy || "未给出")}</p>
      </section>
      <section class="advisor-group">
        <h4>建议风格参考</h4>
        <p>${escapeWithBreaks(latestProjectAdvice.suggestedReference || "未给出")}</p>
      </section>
      <section class="advisor-group">
        <h4>关注重点</h4>
        <p>${escapeWithBreaks(latestProjectAdvice.suggestedFocus || "未给出")}</p>
      </section>
      <section class="advisor-group">
        <h4>执行检查点</h4>
        ${
          (latestProjectAdvice.checkpoint || []).length
            ? `<ul class="advisor-list">${latestProjectAdvice.checkpoint.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
            : "<p>未给出</p>"
        }
      </section>
    </div>
  `;
  applyAdviceButton.disabled = false;
}

async function generateProjectAdvice() {
  generateAdviceButton.disabled = true;
  applyAdviceButton.disabled = true;
  advisorStatus.textContent = "豆包正在根据你当前的 rough brief 整理项目框架和创意输入...";
  try {
    const response = await fetch("/api/project-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(readBriefFields()),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "生成建议失败");
    }
    latestProjectAdvice = data.result || null;
    renderAdvisorCard();
    advisorStatus.textContent = "豆包建议已生成。你可以先看建议，再一键回填左侧全部字段。";
  } catch (error) {
    advisorStatus.textContent = error.message || "生成建议失败";
  } finally {
    generateAdviceButton.disabled = false;
    if (latestProjectAdvice) {
      applyAdviceButton.disabled = false;
    }
  }
}

function applyProjectAdvice() {
  if (!latestProjectAdvice) return;
  setFieldValue(projectNameInput, latestProjectAdvice.suggestedProjectName);
  setFieldValue(deliverableInput, latestProjectAdvice.suggestedDeliverable);
  setFieldValue(audienceInput, latestProjectAdvice.suggestedAudience);
  setFieldValue(toneInput, latestProjectAdvice.suggestedTone);
  setFieldValue(taskInput, latestProjectAdvice.suggestedTask);
  setFieldValue(mustIncludeInput, (latestProjectAdvice.suggestedMust || []).join("、"));
  setFieldValue(avoidInput, (latestProjectAdvice.suggestedAvoid || []).join("、"));
  setFieldValue(copyInput, latestProjectAdvice.suggestedCopy);
  setFieldValue(styleReferenceInput, latestProjectAdvice.suggestedReference);
  setFieldValue(outputFocusInput, latestProjectAdvice.suggestedFocus);
  persistState();
  advisorStatus.textContent = "已把豆包建议回填到左侧的项目框架和创意输入。";
}

function extractSection(text, startLabel, nextLabels) {
  const escaped = startLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!nextLabels.length) {
    const regex = new RegExp(`${escaped}：\\s*([\\s\\S]*)$`);
    const match = String(text || "").match(regex);
    return match ? match[1].trim() : "";
  }
  const nextPattern = nextLabels
    .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const regex = new RegExp(`${escaped}：\\s*([\\s\\S]*?)(?=\\n(?:${nextPattern})：|$)`);
  const match = String(text || "").match(regex);
  return match ? match[1].trim() : "";
}

function parseDesignPack(content) {
  const labels = [
    "设计结论",
    "最终执行 Prompt",
    "工具适配建议",
    "版式与字体建议",
    "后续微调建议",
    "Nanobanana Prompt",
    "即梦 Prompt",
    "MiniMax Prompt",
  ];
  const conclusion = extractSection(content, "设计结论", labels.slice(1));
  const finalPrompt =
    extractSection(content, "最终执行 Prompt", labels.slice(2))
    || extractSection(content, "Nanobanana Prompt", labels.slice(5))
    || extractSection(content, "即梦 Prompt", labels.slice(6))
    || extractSection(content, "MiniMax Prompt", labels.slice(7));
  const toolAdaptation = parseBulletList(extractSection(content, "工具适配建议", labels.slice(3)));
  const nanoPrompt = extractSection(content, "Nanobanana Prompt", labels.slice(6)) || finalPrompt;
  const jimengPrompt = extractSection(content, "即梦 Prompt", labels.slice(7)) || finalPrompt;
  const minimaxPrompt = extractSection(content, "MiniMax Prompt", []) || finalPrompt;
  const layoutTips = parseBulletList(extractSection(content, "版式与字体建议", labels.slice(4)));
  const refineTips = parseBulletList(extractSection(content, "后续微调建议", []));
  return {
    conclusion,
    finalPrompt,
    toolAdaptation,
    nanoPrompt,
    jimengPrompt,
    minimaxPrompt,
    layoutTips,
    refineTips,
    raw: content,
  };
}

function activeImageProvider() {
  return imageProviderSelect.value || imageStudioState.provider || "auto";
}

function setImageSize(width, height, preset = "custom", options = {}) {
  imageStudioState.width = Math.max(256, Math.min(4096, Number(width) || 1024));
  imageStudioState.height = Math.max(256, Math.min(4096, Number(height) || 1024));
  imageStudioState.sizePreset = preset;
  imageWidthInput.value = String(imageStudioState.width);
  imageHeightInput.value = String(imageStudioState.height);
  sizePresetSelect.value = SIZE_PRESETS[preset] ? preset : "custom";
  if (options.persist !== false) {
    persistImageState();
  }
}

function syncSizePresetFromInputs() {
  const width = Number(imageWidthInput.value) || 1024;
  const height = Number(imageHeightInput.value) || 1024;
  const match = Object.entries(SIZE_PRESETS).find(([, value]) => value.width === width && value.height === height);
  setImageSize(width, height, match ? match[0] : "custom");
}

function populateImagePromptFromPack(options = {}) {
  if (!latestPromptPack) {
    if (!options.silent) {
      imageStatusText.textContent = "还没有可用的 Prompt 包，先运行上面的讨论。";
    }
    return;
  }
  const provider = activeImageProvider();
  if (provider === "auto") {
    imagePromptInput.value = [
      "全自动模式会执行同一段最终统一 Prompt：",
      "",
      latestPromptPack.finalPrompt || latestPromptPack.jimengPrompt || latestPromptPack.nanoPrompt || "未生成",
    ].join("\n");
    imagePromptInput.disabled = true;
    imagePromptHint.textContent = "全自动模式会把豆包最终收束的一段统一 Prompt 投给即梦、Nano Banana 和 MiniMax。";
  } else {
    imagePromptInput.disabled = false;
    imagePromptInput.value = latestPromptPack.finalPrompt || latestPromptPack.jimengPrompt || latestPromptPack.nanoPrompt || "";
    imagePromptHint.textContent = "这里默认带入豆包最后收束的一段统一执行 Prompt。你可以继续手工微调后再发给所选生图工具。";
  }
  if (options.persist !== false) {
    persistImageState();
  }
}

function renderImageResults() {
  if (!imageStudioState.results.length) {
    imageResults.innerHTML = `
      <article class="image-empty-state">
        <strong>还没有图片</strong>
        <p>先生成 Prompt 包，或者直接手动指定工具、尺寸和 prompt 后点击“开始生图”。</p>
      </article>
    `;
    return;
  }
  imageResults.innerHTML = imageStudioState.results
    .map(
      (item, index) => `
        <article class="image-result-card provider-${escapeHtml((item.provider || "").toLowerCase())}">
          <div class="image-result-media">
            <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.providerLabel)} 生成结果" loading="lazy" />
            <div class="image-result-overlay">
              <span class="result-index">0${index + 1}</span>
              <span class="result-chip">${escapeHtml(item.providerLabel)}</span>
            </div>
          </div>
          <div class="image-result-meta">
            <div class="image-result-head">
              <div>
                <span class="result-badge">${escapeHtml(item.providerLabel)}</span>
                <strong>${escapeHtml(item.model || "")}</strong>
              </div>
              <span class="result-size-pill">${escapeHtml(item.applied_size || "-")}</span>
            </div>
            <p class="result-size">请求尺寸：${escapeHtml(item.requested_size || "-")}</p>
            ${item.note ? `<p class="result-note">${escapeHtml(item.note)}</p>` : ""}
            <details class="result-prompt">
              <summary>查看执行 Prompt</summary>
              <p>${escapeWithBreaks(item.prompt || "")}</p>
            </details>
            <div class="prompt-tools">
              <button type="button" class="prompt-copy" data-image-copy="${escapeHtml(item.image_url)}">复制图片地址</button>
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

function setImageRunningState(isRunning) {
  imageStudioState.running = isRunning;
  generateImageButton.disabled = isRunning;
  syncPromptButton.disabled = isRunning;
  generateImageButton.textContent = isRunning ? "生图中..." : "开始生图";
}

function latestSuccessfulReply() {
  if (!currentSession) return null;
  const rounds = [...currentSession.rounds].sort((a, b) => b.round_number - a.round_number);
  for (const round of rounds) {
    for (const reply of [...round.replies].reverse()) {
      if (reply.ok) {
        return { round: round.round_number, reply };
      }
    }
  }
  return null;
}

function renderTldr() {
  if (!currentSession) {
    tldrBar.innerHTML = `
      <div class="tldr-main">
        <p class="eyebrow">TL;DR</p>
        <h3>等待生成 prompt 包</h3>
        <p>开始后，这里会先显示当前最值得采纳的视觉方向，避免你一上来就被长 prompt 淹没。</p>
      </div>
      <div class="tldr-meta">
        <article><span>当前阶段</span><strong>空闲</strong></article>
        <article><span>最新更新</span><strong>未开始</strong></article>
      </div>
    `;
    return;
  }

  const latest = latestSuccessfulReply();
  const pack = currentSession.summary?.ok ? parseDesignPack(currentSession.summary.content) : null;
  const title = currentSession.summary?.ok ? "最终 prompt 方向已收束" : latest ? "阶段性视觉方向" : "等待首个观点";
  const body = currentSession.summary?.ok
    ? compactText(pack?.conclusion || currentSession.summary.content, 220)
    : latest
      ? compactText(`${latest.reply.label}：${latest.reply.content}`, 220)
      : "模型还在根据 brief 梳理视觉方向，首条有效判断出现后会固定到这里。";
  const source = currentSession.summary?.ok ? "最终结论" : latest ? `第 ${latest.round} 轮 · ${latest.reply.label}` : currentSession.lastEvent;

  tldrBar.innerHTML = `
    <div class="tldr-main">
      <p class="eyebrow">TL;DR</p>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
    </div>
    <div class="tldr-meta">
      <article><span>当前阶段</span><strong>${escapeHtml(currentSession.status)}</strong></article>
      <article><span>最新更新</span><strong>${escapeHtml(source)}</strong></article>
    </div>
  `;
}

function renderOverview() {
  if (!currentSession) {
    overviewPanel.innerHTML = `
      <div class="card-head">
        <p class="eyebrow">OVERVIEW</p>
        <h3>会话概览</h3>
      </div>
      <div class="overview-grid">
        <article><span>状态</span><strong>等待 brief</strong></article>
        <article><span>轮数</span><strong>${selectedRounds} 轮</strong></article>
        <article><span>参会者</span><strong>3 位</strong></article>
        <article><span>输出</span><strong>Prompt 包</strong></article>
      </div>
    `;
    return;
  }

  const activeLabels = [...new Set(currentSession.rounds.flatMap((round) => round.replies.filter((item) => item.ok).map((item) => item.label)))];
  const unavailableLabels = [...new Set(currentSession.unavailable.map((item) => item.label))];
  setProviderStates(activeLabels, unavailableLabels);
  overviewPanel.innerHTML = `
    <div class="card-head">
      <p class="eyebrow">OVERVIEW</p>
      <h3>会话概览</h3>
    </div>
    <div class="overview-grid">
      <article><span>状态</span><strong>${escapeHtml(currentSession.status)}</strong></article>
      <article><span>轮数</span><strong>${escapeHtml(String(currentSession.totalRounds))} 轮</strong></article>
      <article><span>参会者</span><strong>${escapeHtml(String(activeLabels.length || currentSession.providers.length))} 位</strong></article>
      <article><span>异常</span><strong>${escapeHtml(String(unavailableLabels.length))} 项</strong></article>
      <article><span>项目</span><strong>${escapeHtml(currentSession.brief.projectName || "未命名")}</strong></article>
      <article><span>输出</span><strong>${currentSession.summary?.ok ? "Prompt 包已完成" : "Prompt 包生成中"}</strong></article>
    </div>
  `;
}

function renderPromptCard(title, badge, text, copyKey) {
  const tone = badge.toLowerCase().replace(/\s+/g, "-");
  return `
    <section class="prompt-card tone-${escapeHtml(tone)}">
      <div class="prompt-card-head">
        <span class="prompt-badge">${escapeHtml(badge)}</span>
        <button type="button" class="prompt-copy prompt-copy-inline" data-copy-key="${escapeHtml(copyKey)}">复制</button>
      </div>
      <h4>${escapeHtml(title)}</h4>
      <p class="prompt-text">${escapeWithBreaks(text || "暂未生成")}</p>
    </section>
  `;
}

function renderListSection(title, items) {
  const tone = title.includes("版式") ? "layout" : title.includes("后续") ? "refine" : "neutral";
  return `
    <section class="summary-section tone-${escapeHtml(tone)}">
      <h4>${escapeHtml(title)}</h4>
      ${
        items.length
          ? `<ul class="summary-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
          : `<p class="summary-copy">暂未生成。</p>`
      }
    </section>
  `;
}

function renderSummaryPanel() {
  if (!currentSession) {
    summaryPanel.innerHTML = `
      <div class="card-head">
        <p class="eyebrow">PROMPT PACK</p>
        <h3>Prompt 包</h3>
      </div>
      <article class="summary-placeholder">
        <strong>还没有设计输出</strong>
        <p>开始后，这里会生成一段统一执行 Prompt，并补上工具适配建议、版式建议和后续微调方向。</p>
      </article>
    `;
    return;
  }

  if (!currentSession.summary?.ok) {
    const latest = latestSuccessfulReply();
    summaryPanel.innerHTML = `
      <div class="card-head">
        <p class="eyebrow">PROMPT PACK</p>
        <h3>Prompt 包</h3>
      </div>
      <div class="summary-grid">
        <section class="summary-section conclusion summary-hero">
          <h4>当前方向</h4>
          <p class="summary-copy">${escapeWithBreaks(
            latest ? `${latest.reply.label}：${compactText(latest.reply.content, 200)}` : "模型还在先整理视觉方向和提示词关键词。",
          )}</p>
        </section>
        <section class="summary-section tone-neutral">
          <h4>最终执行 Prompt</h4>
          <p class="summary-copy">等待豆包对多模型讨论做最后一轮总结和优化。</p>
        </section>
        <section class="summary-section tone-layout">
          <h4>工具适配建议</h4>
          <p class="summary-copy">收束完成后，这里会给出即梦、Nano Banana、MiniMax 的使用提醒。</p>
        </section>
      </div>
    `;
    return;
  }

  const pack = parseDesignPack(currentSession.summary.content);
  summaryPanel.innerHTML = `
    <div class="card-head">
      <p class="eyebrow">PROMPT PACK</p>
      <h3>Prompt 包</h3>
    </div>
    <div class="summary-grid">
      <section class="summary-section conclusion summary-hero">
        <div class="summary-hero-top">
          <span class="summary-kicker">Creative Direction</span>
          <span class="summary-glow"></span>
        </div>
        <h4>设计结论</h4>
        <p class="summary-copy">${escapeWithBreaks(pack.conclusion || "未生成结论。")}</p>
      </section>
      ${renderPromptCard("最终执行 Prompt", "Unified", pack.finalPrompt || pack.jimengPrompt || pack.nanoPrompt, "finalPrompt")}
      ${renderListSection("工具适配建议", pack.toolAdaptation || [])}
      ${renderListSection("版式与字体建议", pack.layoutTips)}
      ${renderListSection("后续微调建议", pack.refineTips)}
    </div>
  `;
}

function renderActivityPanel() {
  if (!currentSession) {
    activityPanel.innerHTML = `
      <div class="card-head">
        <p class="eyebrow">ACTIVITY</p>
        <h3>运行提示</h3>
      </div>
      <ul class="activity-list">
        <li>必须出现和明确避免写得越具体，越容易出商业可用图。</li>
        <li>Nanobanana 更吃细节控制，即梦更吃中文氛围表达。</li>
        <li>MiniMax 走官方图像接口，当前按比例近似尺寸，不是逐像素硬尺寸。</li>
        <li>如果你后续还要排版，记得提前要求留白和文案区。</li>
      </ul>
    `;
    return;
  }

  activityPanel.innerHTML = `
    <div class="card-head">
      <p class="eyebrow">ACTIVITY</p>
      <h3>运行流</h3>
    </div>
    <ul class="activity-list">
      ${currentSession.activity.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function renderRoundNav() {
  if (!currentSession || !currentSession.rounds.length) {
    roundNav.innerHTML = "";
    return;
  }
  roundNav.innerHTML = currentSession.rounds
    .map((record) => `<button type="button" data-target="round-${record.round_number}">第 ${record.round_number} 轮</button>`)
    .join("");
  [...roundNav.querySelectorAll("button")].forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById(button.dataset.target || "")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderUnavailable() {
  if (!currentSession?.unavailable?.length) return "";
  const dedup = new Map();
  currentSession.unavailable.forEach((item) => {
    if (!dedup.has(item.label)) {
      dedup.set(item.label, compactText(item.error, 160));
    }
  });
  return `
    <section class="warning-block">
      <h3>当前会话异常</h3>
      <ul class="summary-list">
        ${[...dedup.entries()].map(([label, error]) => `<li><strong>${escapeHtml(label)}</strong><br />${escapeHtml(error)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderPendingReply(provider) {
  const klass = providerClass[provider.label] || "";
  const lane = providerLane[provider.label] || "lane-left";
  return `
    <article class="reply pending ${klass} ${lane}">
      <div class="reply-avatar">${escapeHtml(avatarText(provider.label))}</div>
      <div class="reply-bubble">
        <div class="reply-head">
          <strong>${escapeHtml(provider.label)}</strong>
          <span>${escapeHtml(provider.model || "")}</span>
        </div>
        <div class="reply-body">
          <div class="pending-dots"><span></span><span></span><span></span></div>
          <div class="pending-label">正在生成这一轮设计判断...</div>
        </div>
      </div>
    </article>
  `;
}

function renderReply(reply) {
  const klass = providerClass[reply.label] || "";
  const lane = providerLane[reply.label] || "lane-left";
  const body = reply.ok
    ? escapeWithBreaks(reply.content)
    : `
      <div class="error-summary">${escapeHtml(compactText(reply.error, 160))}</div>
      <details class="error-detail">
        <summary>查看完整错误</summary>
        <p>${escapeHtml(reply.error || "本轮失败")}</p>
      </details>
    `;
  return `
    <article class="reply ${klass} ${lane} ${reply.ok ? "" : "error"}">
      <div class="reply-avatar">${escapeHtml(avatarText(reply.label))}</div>
      <div class="reply-bubble">
        <div class="reply-head">
          <strong>${escapeHtml(reply.label)}</strong>
          <span>${escapeHtml(reply.model || "")}</span>
        </div>
        <div class="reply-body">${body}</div>
      </div>
    </article>
  `;
}

function renderRound(record) {
  const order = currentSession?.providers || [];
  const repliesByLabel = new Map(record.replies.map((reply) => [reply.label, reply]));
  const pendingLabels = new Set((record.pending || []).map((item) => item.label));
  const nodes = [];
  order.forEach((provider) => {
    if (repliesByLabel.has(provider.label)) {
      nodes.push(renderReply(repliesByLabel.get(provider.label)));
      repliesByLabel.delete(provider.label);
      return;
    }
    if (pendingLabels.has(provider.label)) {
      nodes.push(renderPendingReply(provider));
    }
  });
  repliesByLabel.forEach((reply) => nodes.push(renderReply(reply)));
  return `
    <section class="round-block" id="round-${record.round_number}">
      <div class="round-title">
        <span>第 ${record.round_number} 轮</span>
        <span class="round-subtitle">${record.replies.filter((item) => item.ok).length} 位已发言</span>
      </div>
      <div class="round-replies">${nodes.join("")}</div>
    </section>
  `;
}

function renderTimelineSummary() {
  if (!currentSession?.summary?.ok) return "";
  const pack = parseDesignPack(currentSession.summary.content);
  return `
    <section class="round-block">
      <div class="round-title">
        <span>最终 Prompt 包</span>
        <span class="round-subtitle">主持人收束后的最终版</span>
      </div>
      <div class="summary-grid">
        <section class="summary-section conclusion summary-hero">
          <h4>设计结论</h4>
          <p class="summary-copy">${escapeWithBreaks(pack.conclusion || "未生成结论。")}</p>
        </section>
        ${renderPromptCard("最终执行 Prompt", "Unified", pack.finalPrompt || pack.jimengPrompt || pack.nanoPrompt, "finalPrompt")}
        ${renderListSection("工具适配建议", pack.toolAdaptation || [])}
      </div>
    </section>
  `;
}

function renderTimeline() {
  if (!currentSession || !currentSession.rounds.length) {
    timeline.innerHTML = `
      <article class="empty-state">
        <h3>这里会显示 prompt 共创过程</h3>
        <p>DeepSeek 和豆包会先讨论视觉方向，再由主持模型收束成可直接投喂给 Nanobanana / 即梦的 prompt 包。</p>
      </article>
    `;
    return;
  }
  timeline.innerHTML = [renderUnavailable(), ...currentSession.rounds.map(renderRound), renderTimelineSummary()].filter(Boolean).join("");
}

function buildPromptPackText() {
  if (!currentSession) return "";
  const parts = [
    `项目名：${currentSession.brief.projectName || "未命名项目"}`,
    `物料类型：${currentSession.brief.deliverable || ""}`,
    `轮数：${currentSession.totalRounds}`,
    "",
    `核心 brief：${currentSession.brief.task || ""}`,
  ];
  currentSession.rounds.forEach((record) => {
    parts.push(`\n第 ${record.round_number} 轮`);
    record.replies.forEach((reply) => {
      parts.push(`${reply.label}：${reply.ok ? reply.content : `[失败] ${reply.error || "本轮失败"}`}`);
    });
  });
  if (currentSession.summary?.ok) {
    parts.push(`\n最终 Prompt 包\n${currentSession.summary.content}`);
  }
  return parts.join("\n");
}

function renderSession() {
  renderTldr();
  renderOverview();
  renderSummaryPanel();
  renderActivityPanel();
  renderRoundNav();
  renderTimeline();
  renderImageResults();
  lastResultText = buildPromptPackText();
  copyButton.disabled = !lastResultText;
}

function applyFinalResult(result) {
  if (!currentSession) return;
  currentSession.task = result.task;
  currentSession.rounds = (result.rounds || []).map((record) => ({
    round_number: record.round_number,
    replies: [...(record.replies || [])],
    pending: [],
  }));
  currentSession.summary = result.summary;
  currentSession.unavailable = [...(result.unavailable || [])];
  currentSession.status = "Prompt 包完成";
  currentSession.complete = true;
  trackActivity("最终 Prompt 包已生成");
  latestPromptPack = currentSession.summary?.ok ? parseDesignPack(currentSession.summary.content) : latestPromptPack;
  if (latestPromptPack) {
    populateImagePromptFromPack({ persist: false, silent: true });
  }
}

function handleStreamEvent(event) {
  if (!currentSession) return;
  switch (event.event) {
    case "session_start":
      currentSession.task = event.task;
      currentSession.totalRounds = event.total_rounds;
      currentSession.providers = event.providers || currentSession.providers;
      currentSession.status = "brief 已分发";
      trackActivity("brief 已分发给模型席位");
      break;
    case "round_start":
      ensureRound(event.round_number).pending = [];
      currentSession.status = `第 ${event.round_number} 轮方向讨论中`;
      trackActivity(`第 ${event.round_number} 轮开始`);
      break;
    case "provider_start": {
      const round = ensureRound(event.round_number);
      const meta = event.provider || {};
      if (!round.pending.find((item) => item.label === meta.label)) {
        round.pending.push(meta);
      }
      currentSession.status = `${meta.label || "模型"} 正在提出方向`;
      trackActivity(`${meta.label || "模型"} 正在生成第 ${event.round_number} 轮设计判断`);
      break;
    }
    case "provider_reply": {
      const round = ensureRound(event.round_number);
      round.pending = round.pending.filter((item) => item.label !== event.reply.label);
      const next = round.replies.filter((item) => item.label !== event.reply.label);
      next.push(event.reply);
      round.replies = next;
      currentSession.status = `${event.reply.label} 已返回`;
      trackActivity(`${event.reply.label} 已完成第 ${event.round_number} 轮`);
      if (!event.reply.ok) trackUnavailable(event.reply);
      break;
    }
    case "provider_unavailable":
      if (event.reply) {
        trackUnavailable(event.reply);
        trackActivity(`${event.reply.label} 当前不可用`);
      }
      break;
    case "round_complete":
      currentSession.status = `第 ${event.round_number} 轮完成`;
      trackActivity(`第 ${event.round_number} 轮已收齐`);
      break;
    case "summary_start":
      currentSession.status = "正在整合 Prompt 包";
      trackActivity(`${event.provider?.label || "主持模型"} 开始整理最终 prompt`);
      break;
    case "summary_attempt":
      currentSession.status = `${event.provider?.label || "主持模型"} 正在写总结`;
      trackActivity(`${event.provider?.label || "主持模型"} 正在生成 Prompt 包`);
      break;
    case "summary_complete":
      currentSession.summary = event.reply;
      currentSession.status = "Prompt 包已生成";
      trackActivity("最终 Prompt 包已生成");
      latestPromptPack = event.reply?.ok ? parseDesignPack(event.reply.content) : latestPromptPack;
      if (latestPromptPack) {
        populateImagePromptFromPack({ persist: false, silent: true });
      }
      break;
    case "done":
      applyFinalResult(event.result);
      break;
    case "fatal_error":
      currentSession.status = "执行失败";
      trackActivity("执行失败");
      timeline.innerHTML = `
        <section class="warning-block">
          <h3>执行失败</h3>
          <div class="warning-body">${escapeHtml(event.error || "未知错误")}</div>
        </section>
      `;
      renderTldr();
      renderOverview();
      renderSummaryPanel();
      renderActivityPanel();
      throw new Error(event.error || "未知错误");
    default:
      break;
  }
  renderSession();
}

async function consumeStream(response) {
  if (!response.body) throw new Error("浏览器不支持流式响应");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      handleStreamEvent(JSON.parse(trimmed));
    }
  }
  if (buffer.trim()) {
    handleStreamEvent(JSON.parse(buffer.trim()));
  }
}

function resetUI() {
  currentSession = null;
  lastResultText = "";
  renderSession();
  setProviderStates([], []);
  copyButton.disabled = true;
}

function setRunningState(isRunning) {
  runButton.disabled = isRunning;
  clearButton.textContent = isRunning ? "停止并清空" : "清空";
}

async function copyText(text, button) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    if (button) {
      const original = button.textContent;
      button.textContent = "已复制";
      window.setTimeout(() => {
        button.textContent = original;
      }, 1200);
    }
  } catch {
    if (button) {
      const original = button.textContent;
      button.textContent = "复制失败";
      window.setTimeout(() => {
        button.textContent = original;
      }, 1200);
    }
  }
}

async function generateImages(options = {}) {
  if (imageStudioState.running) return;
  const provider = activeImageProvider();
  const width = Number(imageWidthInput.value) || 1024;
  const height = Number(imageHeightInput.value) || 1024;
  if (width < 256 || height < 256 || width > 4096 || height > 4096) {
    imageStatusText.textContent = "尺寸只支持 256 到 4096 像素。";
    return;
  }

  const prompts = latestPromptPack
      ? {
        finalPrompt: latestPromptPack.finalPrompt,
        nanoPrompt: latestPromptPack.nanoPrompt,
        jimengPrompt: latestPromptPack.jimengPrompt,
        minimaxPrompt: latestPromptPack.minimaxPrompt,
      }
      : {
        finalPrompt: "",
        nanoPrompt: "",
        jimengPrompt: "",
        minimaxPrompt: "",
      };

  if (provider !== "auto" && !imagePromptInput.value.trim()) {
    imageStatusText.textContent = "当前执行 Prompt 为空，请先同步 Prompt 包或手动输入。";
    imagePromptInput.focus();
    return;
  }

  imageStatusText.textContent =
    provider === "auto" ? "正在同时调用即梦、Nano Banana 和 MiniMax 生图..." : "正在生成图片...";
  setImageRunningState(true);
  persistImageState();
  try {
    const response = await fetch("/api/images/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        width,
        height,
        prompt: imagePromptInput.value.trim(),
        prompts,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "生图请求失败");
    }
    imageStudioState.results = data.images || [];
    renderImageResults();
    const providerLabels = {
      jimeng: "即梦",
      nano: "Nano Banana",
      minimax: "MiniMax",
    };
    const errorText = (data.errors || [])
      .map((item) => `${providerLabels[item.provider] || item.provider}：${item.error}`)
      .join("；");
    imageStatusText.textContent = errorText
      ? `已返回 ${data.images?.length || 0} 张图片，部分通道失败。${errorText}`
      : provider === "auto"
        ? "三路生图都已完成，可以直接对比。"
        : `${data.images?.[0]?.providerLabel || "图片"} 已生成完成。`;
    if (!options.silentScroll) {
      document.getElementById("imageStudio")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (error) {
    imageStatusText.textContent = error.message || "生图失败";
  } finally {
    setImageRunningState(false);
  }
}

async function runRoundtable() {
  const brief = readBriefFields();
  if (!brief.task) {
    statusText.textContent = "请先填写核心 brief";
    taskInput.focus();
    return;
  }

  const builtTask = buildDesignTask(brief);
  persistState();
  currentSession = createSession(builtTask, selectedRounds, brief);
  latestPromptPack = null;
  imageStudioState.results = [];
  imageStudioState.autoDispatched = false;
  imagePromptInput.value = "";
  renderImageResults();
  populateImagePromptFromPack({ silent: true });
  statusText.textContent = `正在生成 ${selectedRounds} 轮 Prompt 包...`;
  setRunningState(true);
  renderSession();
  timeline.scrollIntoView({ behavior: "smooth", block: "start" });
  streamController = new AbortController();

  try {
    const response = await fetch("/api/roundtable/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: builtTask, rounds: selectedRounds }),
      signal: streamController.signal,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "请求失败");
    }
    await consumeStream(response);
    statusText.textContent = currentSession?.complete ? "Prompt 包已完成" : "会话结束";
    if (currentSession?.complete && autoGenerateInput.checked && !imageStudioState.autoDispatched) {
      imageStudioState.autoDispatched = true;
      await generateImages({ silentScroll: true });
    }
  } catch (error) {
    if (error.name === "AbortError") {
      statusText.textContent = "已中止";
      resetUI();
      return;
    }
    statusText.textContent = "执行失败";
    if (!currentSession) {
      timeline.innerHTML = `
        <section class="warning-block">
          <h3>执行失败</h3>
          <div class="warning-body">${escapeHtml(error.message || String(error))}</div>
        </section>
      `;
    }
  } finally {
    streamController = null;
    setRunningState(false);
  }
}

function applyPreset(button) {
  writeBriefFields({
    projectName: button.dataset.project || "",
    deliverable: button.dataset.deliverable || "品牌海报",
    audience: button.dataset.audience || "",
    tone: button.dataset.tone || "",
    task: button.dataset.task || "",
    must: button.dataset.must || "",
    avoid: button.dataset.avoid || "",
    copy: button.dataset.copy || "",
    reference: button.dataset.ref || "",
    focus: button.dataset.focus || "",
  });
  persistState();
}

summaryPanel.addEventListener("click", (event) => {
  const button = event.target.closest("[data-copy-key]");
  if (!button || !currentSession?.summary?.ok) return;
  const pack = parseDesignPack(currentSession.summary.content);
  const copyMap = {
    finalPrompt: pack.finalPrompt || pack.jimengPrompt || pack.nanoPrompt,
    nanoPrompt: pack.nanoPrompt,
    jimengPrompt: pack.jimengPrompt,
    minimaxPrompt: pack.minimaxPrompt || pack.jimengPrompt,
  };
  copyText(copyMap[button.dataset.copyKey], button);
});

imageResults.addEventListener("click", (event) => {
  const button = event.target.closest("[data-image-copy]");
  if (!button) return;
  copyText(button.dataset.imageCopy, button);
});

[projectNameInput, deliverableInput, audienceInput, toneInput, taskInput, mustIncludeInput, avoidInput, copyInput, styleReferenceInput, outputFocusInput].forEach((field) => {
  field.addEventListener("input", persistState);
  field.addEventListener("change", persistState);
});

roundRange.addEventListener("input", (event) => setRounds(event.target.value));
roundNumber.addEventListener("input", (event) => setRounds(event.target.value));
imageProviderSelect.addEventListener("change", () => {
  imageStudioState.provider = activeImageProvider();
  populateImagePromptFromPack({ silent: true });
  persistImageState();
});
sizePresetSelect.addEventListener("change", () => {
  const preset = sizePresetSelect.value;
  if (preset === "custom") {
    syncSizePresetFromInputs();
    return;
  }
  const next = SIZE_PRESETS[preset];
  if (next) {
    setImageSize(next.width, next.height, preset);
  }
});
imageWidthInput.addEventListener("input", syncSizePresetFromInputs);
imageHeightInput.addEventListener("input", syncSizePresetFromInputs);
autoGenerateInput.addEventListener("change", () => {
  imageStudioState.autoGenerate = autoGenerateInput.checked;
  persistImageState();
});
imagePromptInput.addEventListener("input", persistImageState);
presetButtons.forEach((button) => {
  button.addEventListener("click", () => applyPreset(button));
});

taskInput.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    runRoundtable();
  }
});

runButton.addEventListener("click", runRoundtable);
copyButton.addEventListener("click", () => copyText(lastResultText, copyButton));
generateImageButton.addEventListener("click", () => generateImages());
syncPromptButton.addEventListener("click", () => {
  populateImagePromptFromPack();
  imageStatusText.textContent = "已同步当前 Prompt 包到生图面板。";
});
generateAdviceButton.addEventListener("click", () => {
  generateProjectAdvice();
});
applyAdviceButton.addEventListener("click", () => {
  applyProjectAdvice();
});
clearButton.addEventListener("click", () => {
  if (streamController) {
    streamController.abort();
  }
  imageStudioState.results = [];
  latestPromptPack = null;
  latestProjectAdvice = null;
  populateImagePromptFromPack({ silent: true });
  renderImageResults();
  renderAdvisorCard();
  applyDefaults();
  setRounds(3);
  persistState();
  imageProviderSelect.value = "auto";
  imageStudioState.provider = "auto";
  setImageSize(1024, 1280, "1024x1280");
  autoGenerateInput.checked = false;
  imageStudioState.autoGenerate = false;
  imagePromptInput.value = "";
  persistImageState();
  imageStatusText.textContent = "等待 Prompt 包，或者直接手动填写 Prompt 后生图。";
  advisorStatus.textContent = "你先写一个大概 brief，豆包会把项目框架和下面的创意输入一起整理成更像平面设计师会交付的写法。";
  statusText.textContent = "等待 brief";
  resetUI();
});

applyDefaults();
setRounds(3, { persist: false });
restoreState();
restoreImageState();
syncSizePresetFromInputs();
renderAdvisorCard();
renderImageResults();
renderSession();
