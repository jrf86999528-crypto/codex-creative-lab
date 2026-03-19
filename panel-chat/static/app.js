const taskInput = document.getElementById("taskInput");
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

const DEFAULT_TASK = "请讨论：我们下一步应该优先完善 OpenClaw 的哪一部分，并展示完整讨论过程。";
const STORAGE_KEY = "panel-chat-state-v3";
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

let selectedRounds = 3;
let lastResultText = "";
let currentSession = null;
let streamController = null;

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

function compactErrorMessage(text) {
  const normalized = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "暂不可用";
  if (normalized.length <= 150) return normalized;
  return `${normalized.slice(0, 147)}...`;
}

function compactCopy(text, limit = 140) {
  const normalized = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "等待更多观点...";
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 3)}...`;
}

function avatarText(label) {
  const text = String(label || "").trim();
  if (!text) return "?";
  if (/^[A-Za-z]/.test(text)) {
    return text.slice(0, 2).toUpperCase();
  }
  return text.slice(0, 1);
}

function persistState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        task: taskInput.value,
        rounds: selectedRounds,
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
    if (typeof parsed.task === "string" && parsed.task.trim()) {
      taskInput.value = parsed.task;
    }
    if (parsed.rounds) {
      setRounds(parsed.rounds, { persist: false });
    }
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

function createSession(task, rounds) {
  return {
    task,
    totalRounds: rounds,
    providers: baseProviders(),
    rounds: [],
    summary: null,
    unavailable: [],
    status: "正在建立会话",
    activeRound: 0,
    complete: false,
    lastEvent: "刚刚开始",
    activity: ["正在准备模型席位"],
  };
}

function ensureRound(roundNumber) {
  if (!currentSession) return null;
  let round = currentSession.rounds.find((item) => item.round_number === roundNumber);
  if (!round) {
    round = {
      round_number: roundNumber,
      replies: [],
      pending: [],
    };
    currentSession.rounds.push(round);
    currentSession.rounds.sort((a, b) => a.round_number - b.round_number);
  }
  return round;
}

function trackActivity(message) {
  if (!currentSession) return;
  currentSession.activity = [message, ...currentSession.activity.filter((item) => item !== message)].slice(0, 5);
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

function parseSummarySections(content) {
  const text = String(content || "").trim();
  const match = text.match(
    /最终结论：\s*([\s\S]*?)(?:\n\s*待办清单：|\r\n\s*待办清单：|$)\s*[\r\n]*待办清单：\s*([\s\S]*?)(?:\n\s*风险项：|\r\n\s*风险项：|$)\s*[\r\n]*风险项：\s*([\s\S]*)/m,
  );
  if (!match) {
    return {
      conclusion: text,
      todos: [],
      risks: [],
    };
  }
  return {
    conclusion: match[1].trim(),
    todos: match[2]
      .split(/\r?\n/)
      .map((item) => item.replace(/^\s*-\s*/, "").trim())
      .filter(Boolean),
    risks: match[3]
      .split(/\r?\n/)
      .map((item) => item.replace(/^\s*-\s*/, "").trim())
      .filter(Boolean),
  };
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
        <h3>等待讨论启动</h3>
        <p>开始讨论后，这里会固定显示当前最重要的结论脉冲，优先让你看到核心判断。</p>
      </div>
      <div class="tldr-meta">
        <article><span>当前阶段</span><strong>空闲</strong></article>
        <article><span>最新更新</span><strong>未开始</strong></article>
      </div>
    `;
    return;
  }

  const latest = latestSuccessfulReply();
  const summarySections = currentSession.summary?.ok ? parseSummarySections(currentSession.summary.content) : null;
  const title = currentSession.summary?.ok ? "最终结论已生成" : latest ? "阶段性结论脉冲" : "正在等待首个观点";
  const body = currentSession.summary?.ok
    ? compactCopy(summarySections?.conclusion || currentSession.summary.content, 220)
    : latest
      ? compactCopy(`${latest.reply.label}：${latest.reply.content}`, 220)
      : "模型还在生成第一批观点，首条结论出现后会立即固定到这里。";
  const source = currentSession.summary?.ok
    ? `主持人总结`
    : latest
      ? `第 ${latest.round} 轮 · ${latest.reply.label}`
      : currentSession.lastEvent;

  tldrBar.innerHTML = `
    <div class="tldr-main">
      <p class="eyebrow">TL;DR</p>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
    </div>
    <div class="tldr-meta">
      <article>
        <span>当前阶段</span>
        <strong>${escapeHtml(currentSession.status)}</strong>
      </article>
      <article>
        <span>最新更新</span>
        <strong>${escapeHtml(source)}</strong>
      </article>
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
        <article><span>状态</span><strong>等待任务</strong></article>
        <article><span>轮数</span><strong>${selectedRounds} 轮</strong></article>
        <article><span>参会者</span><strong>3 位</strong></article>
        <article><span>异常</span><strong>0 项</strong></article>
        <article><span>摘要</span><strong>未生成</strong></article>
        <article><span>查看方式</span><strong>过程优先</strong></article>
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
      <article><span>摘要</span><strong>${currentSession.summary?.ok ? "已生成" : "生成中"}</strong></article>
      <article><span>查看方式</span><strong>流式过程</strong></article>
    </div>
  `;
}

function renderSummaryPanel() {
  if (!currentSession) {
    summaryPanel.innerHTML = `
      <div class="card-head">
        <p class="eyebrow">SUMMARY</p>
        <h3>摘要区</h3>
      </div>
      <article class="summary-placeholder">
        <strong>还没有本轮结果</strong>
        <p>开始讨论后，这里会拆分展示最终结论、待办清单和风险项，而不是只给一整段文本。</p>
      </article>
    `;
    return;
  }

  if (!currentSession.summary?.ok) {
    const latest = latestSuccessfulReply();
    summaryPanel.innerHTML = `
      <div class="card-head">
        <p class="eyebrow">SUMMARY</p>
        <h3>摘要区</h3>
      </div>
      <div class="summary-grid">
        <section class="summary-section conclusion">
          <h4>当前结论脉冲</h4>
          <p class="summary-copy">${escapeWithBreaks(
            latest ? `${latest.reply.label}：${compactCopy(latest.reply.content, 180)}` : "主持人还在等待更多材料，当前没有可收束的结论。",
          )}</p>
        </section>
        <section class="summary-section todo">
          <h4>待办清单</h4>
          <p class="summary-copy">总结生成后会自动整理出可执行动作。</p>
        </section>
        <section class="summary-section risk">
          <h4>风险项</h4>
          <p class="summary-copy">如果某个模型失败或分歧明显，这里会优先暴露风险。</p>
        </section>
      </div>
    `;
    return;
  }

  const sections = parseSummarySections(currentSession.summary.content);
  const todoHtml = sections.todos.length
    ? `<ul class="summary-list">${sections.todos.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : `<p class="summary-copy">暂无待办清单。</p>`;
  const riskHtml = sections.risks.length
    ? `<ul class="summary-list">${sections.risks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : `<p class="summary-copy">暂无风险项。</p>`;

  summaryPanel.innerHTML = `
    <div class="card-head">
      <p class="eyebrow">SUMMARY</p>
      <h3>摘要区</h3>
    </div>
    <div class="summary-grid">
      <section class="summary-section conclusion">
        <h4>最终结论</h4>
        <p class="summary-copy">${escapeWithBreaks(sections.conclusion || "未生成结论。")}</p>
      </section>
      <section class="summary-section todo">
        <h4>待办清单</h4>
        ${todoHtml}
      </section>
      <section class="summary-section risk">
        <h4>风险项</h4>
        ${riskHtml}
      </section>
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
        <li>写清楚讨论目标，输出会更稳定。</li>
        <li>1 轮适合快评，3 到 5 轮适合方案对打。</li>
        <li>现在支持边返回边渲染，不再整轮结束后一起刷出。</li>
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
    .map(
      (record) => `
        <button type="button" data-target="round-${record.round_number}">第 ${record.round_number} 轮</button>
      `,
    )
    .join("");

  [...roundNav.querySelectorAll("button")].forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.getElementById(button.dataset.target || "");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderUnavailable() {
  if (!currentSession?.unavailable?.length) return "";
  const dedup = new Map();
  currentSession.unavailable.forEach((item) => {
    if (!dedup.has(item.label)) {
      dedup.set(item.label, compactErrorMessage(item.error));
    }
  });
  const items = [...dedup.entries()]
    .map(([label, error]) => `<li><strong>${escapeHtml(label)}</strong><br />${escapeHtml(error)}</li>`)
    .join("");
  return `
    <section class="warning-block">
      <h3>当前会话异常</h3>
      <ul class="summary-list">${items}</ul>
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
          <div class="reply-title">
            <strong>${escapeHtml(provider.label)}</strong>
          </div>
          <span>${escapeHtml(provider.model || "")}</span>
        </div>
        <div class="reply-body">
          <div class="pending-dots"><span></span><span></span><span></span></div>
          <div class="pending-label">正在生成这一轮发言...</div>
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
      <div class="error-summary">${escapeHtml(compactErrorMessage(reply.error || "本轮失败"))}</div>
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
          <div class="reply-title">
            <strong>${escapeHtml(reply.label)}</strong>
          </div>
          <span>${escapeHtml(reply.model || "")}</span>
        </div>
        <div class="reply-body">${body}</div>
      </div>
    </article>
  `;
}

function renderRound(record) {
  const providerOrder = currentSession?.providers || [];
  const repliesByLabel = new Map(record.replies.map((reply) => [reply.label, reply]));
  const pendingLabels = new Set((record.pending || []).map((item) => item.label));
  const ordered = [];

  providerOrder.forEach((provider) => {
    if (repliesByLabel.has(provider.label)) {
      ordered.push(renderReply(repliesByLabel.get(provider.label)));
      repliesByLabel.delete(provider.label);
      return;
    }
    if (pendingLabels.has(provider.label)) {
      ordered.push(renderPendingReply(provider));
    }
  });
  repliesByLabel.forEach((reply) => ordered.push(renderReply(reply)));

  return `
    <section class="round-block" id="round-${record.round_number}">
      <div class="round-title">
        <span>第 ${record.round_number} 轮</span>
        <span class="round-subtitle">${record.replies.filter((item) => item.ok).length} 位已发言</span>
      </div>
      <div class="round-replies">${ordered.join("")}</div>
    </section>
  `;
}

function renderTimelineSummary() {
  if (!currentSession?.summary?.ok) return "";
  const sections = parseSummarySections(currentSession.summary.content);
  return `
    <section class="round-block final-summary">
      <div class="round-title">
        <span>最终总结</span>
        <span class="round-subtitle">主持人收束后的结果</span>
      </div>
      <div class="summary-grid">
        <section class="summary-section conclusion">
          <h4>最终结论</h4>
          <p class="summary-copy">${escapeWithBreaks(sections.conclusion || "未生成结论。")}</p>
        </section>
        <section class="summary-section todo">
          <h4>待办清单</h4>
          ${
            sections.todos.length
              ? `<ul class="summary-list">${sections.todos.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
              : `<p class="summary-copy">暂无待办清单。</p>`
          }
        </section>
        <section class="summary-section risk">
          <h4>风险项</h4>
          ${
            sections.risks.length
              ? `<ul class="summary-list">${sections.risks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
              : `<p class="summary-copy">暂无风险项。</p>`
          }
        </section>
      </div>
    </section>
  `;
}

function renderTimeline() {
  if (!currentSession || !currentSession.rounds.length) {
    timeline.innerHTML = `
      <article class="empty-state">
        <h3>这里会显示完整的讨论轮次</h3>
        <p>每一轮会像对话流一样逐条追加，不需要等整轮结束后一起刷出来。</p>
      </article>
    `;
    return;
  }

  const html = [renderUnavailable(), ...currentSession.rounds.map(renderRound), renderTimelineSummary()]
    .filter(Boolean)
    .join("");
  timeline.innerHTML = html;
}

function buildCopyTextFromSession() {
  if (!currentSession) return "";
  const parts = [`任务：${currentSession.task}`, `轮数：${currentSession.totalRounds}`];
  currentSession.rounds.forEach((record) => {
    parts.push(`\n第 ${record.round_number} 轮`);
    record.replies.forEach((reply) => {
      parts.push(`${reply.label}：${reply.ok ? reply.content : `[失败] ${reply.error || "本轮失败"}`}`);
    });
  });
  if (currentSession.summary?.ok) {
    parts.push(`\n总结\n${currentSession.summary.content}`);
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
  lastResultText = buildCopyTextFromSession();
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
  currentSession.complete = true;
  currentSession.status = "讨论完成";
  trackActivity("讨论完成，最终总结已生成");
}

function handleStreamEvent(event) {
  if (!currentSession) return;
  switch (event.event) {
    case "session_start":
      currentSession.task = event.task;
      currentSession.totalRounds = event.total_rounds;
      currentSession.providers = event.providers || currentSession.providers;
      currentSession.status = "任务已分发";
      trackActivity("任务已分发给三位模型");
      break;
    case "round_start": {
      const round = ensureRound(event.round_number);
      round.pending = [];
      currentSession.activeRound = event.round_number;
      currentSession.status = `第 ${event.round_number} 轮进行中`;
      trackActivity(`第 ${event.round_number} 轮开始`);
      break;
    }
    case "provider_start": {
      const round = ensureRound(event.round_number);
      const meta = event.provider || {};
      if (!round.pending.find((item) => item.label === meta.label)) {
        round.pending.push(meta);
      }
      currentSession.status = `${meta.label || "模型"} 正在发言`;
      trackActivity(`${meta.label || "模型"} 正在生成第 ${event.round_number} 轮发言`);
      break;
    }
    case "provider_reply": {
      const round = ensureRound(event.round_number);
      round.pending = round.pending.filter((item) => item.label !== event.reply.label);
      const nextReplies = round.replies.filter((item) => item.label !== event.reply.label);
      nextReplies.push(event.reply);
      round.replies = nextReplies;
      currentSession.status = `${event.reply.label} 已返回`;
      trackActivity(`${event.reply.label} 已完成第 ${event.round_number} 轮`);
      if (!event.reply.ok) {
        trackUnavailable(event.reply);
      }
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
      currentSession.status = "主持人正在整理结论";
      trackActivity(`${event.provider?.label || "主持人"} 开始整理 TL;DR`);
      break;
    case "summary_attempt":
      currentSession.status = `${event.provider?.label || "主持人"} 正在写总结`;
      trackActivity(`${event.provider?.label || "主持人"} 正在生成总结`);
      break;
    case "summary_complete":
      currentSession.summary = event.reply;
      currentSession.status = "总结已生成";
      trackActivity("总结已生成");
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
  if (event.event === "provider_reply" || event.event === "summary_complete" || event.event === "done") {
    timeline.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function consumeStream(response) {
  if (!response.body) {
    throw new Error("浏览器不支持流式响应");
  }
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
  renderTldr();
  renderOverview();
  renderSummaryPanel();
  renderActivityPanel();
  renderRoundNav();
  renderTimeline();
  setProviderStates([], []);
  copyButton.disabled = true;
}

function setRunningState(isRunning) {
  runButton.disabled = isRunning;
  clearButton.textContent = isRunning ? "停止并清空" : "清空";
}

async function copyLastResult() {
  if (!lastResultText) return;
  try {
    await navigator.clipboard.writeText(lastResultText);
    copyButton.textContent = "已复制";
    window.setTimeout(() => {
      copyButton.textContent = "复制结果";
    }, 1400);
  } catch {
    copyButton.textContent = "复制失败";
    window.setTimeout(() => {
      copyButton.textContent = "复制结果";
    }, 1400);
  }
}

async function runRoundtable() {
  const task = taskInput.value.trim();
  if (!task) {
    statusText.textContent = "请输入任务";
    taskInput.focus();
    return;
  }

  persistState();
  currentSession = createSession(task, selectedRounds);
  statusText.textContent = `正在进行 ${selectedRounds} 轮讨论...`;
  setRunningState(true);
  renderSession();
  timeline.scrollIntoView({ behavior: "smooth", block: "start" });
  streamController = new AbortController();

  try {
    const response = await fetch("/api/roundtable/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, rounds: selectedRounds }),
      signal: streamController.signal,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "请求失败");
    }
    await consumeStream(response);
    statusText.textContent = currentSession?.complete ? `已完成 ${selectedRounds} 轮讨论` : "讨论结束";
  } catch (error) {
    if (error.name === "AbortError") {
      statusText.textContent = "讨论已中止";
      resetUI();
      return;
    }
    statusText.textContent = "执行失败";
    if (currentSession) {
      currentSession.status = "执行失败";
      trackActivity("执行失败");
      renderSession();
    } else {
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

roundRange.addEventListener("input", (event) => setRounds(event.target.value));
roundNumber.addEventListener("input", (event) => setRounds(event.target.value));

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    taskInput.value = button.dataset.prompt || "";
    persistState();
    taskInput.focus();
  });
});

taskInput.addEventListener("input", persistState);
taskInput.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    runRoundtable();
  }
});

runButton.addEventListener("click", runRoundtable);
copyButton.addEventListener("click", copyLastResult);
clearButton.addEventListener("click", () => {
  if (streamController) {
    streamController.abort();
  }
  taskInput.value = "";
  setRounds(3);
  persistState();
  statusText.textContent = "等待任务";
  resetUI();
});

taskInput.value = DEFAULT_TASK;
setRounds(3, { persist: false });
restoreState();
if (!taskInput.value.trim()) {
  taskInput.value = DEFAULT_TASK;
}
resetUI();
