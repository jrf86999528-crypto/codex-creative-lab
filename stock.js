const DEFAULT_SYMBOL = "601155.SH";
const RECENT_SYMBOLS_KEY = "pulsedeck-recent-symbols";

const state = {
  symbol: DEFAULT_SYMBOL,
  chartMode: "intraday",
  autoRefresh: true,
  refreshTimer: null,
  dashboard: null,
  prediction: null,
  charts: {},
};

const refs = {};

function initializeApp() {
  bindRefs();
  bindEvents();
  state.symbol = readInitialSymbol();
  renderRecentSymbols();
  loadSymbol(state.symbol, { replaceUrl: true }).catch((error) => {
    showWarning(error.message);
  });
  setAutoRefresh(true);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp, { once: true });
} else {
  initializeApp();
}

function bindRefs() {
  const ids = [
    "symbolForm",
    "symbolInput",
    "refreshButton",
    "autoRefreshButton",
    "engineBadge",
    "serverTime",
    "refreshMeta",
    "warningBanner",
    "heroTitle",
    "symbolBadge",
    "marketBadge",
    "heroPrice",
    "heroChange",
    "heroMiniGrid",
    "quoteMetrics",
    "confidenceBadge",
    "aiHeadline",
    "aiThesis",
    "scoreBadge",
    "scorecardGrid",
    "signalCards",
    "horizonGrid",
    "catalystList",
    "riskList",
    "invalidationList",
    "actionPlanList",
    "researchCards",
    "marketPulseLabel",
    "indexStrip",
    "industryHeat",
    "conceptHeat",
    "laggardHeat",
    "announcementSummary",
    "announcementTimeline",
    "tapeTable",
    "watchlistTable",
    "recentSymbols",
  ];

  ids.forEach((id) => {
    refs[id] = document.getElementById(id);
  });
}

function bindEvents() {
  refs.symbolForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await loadSymbol(refs.symbolInput.value, { replaceUrl: true });
  });

  refs.refreshButton.addEventListener("click", async () => {
    await loadSymbol(state.symbol, { replaceUrl: false });
  });

  refs.autoRefreshButton.addEventListener("click", () => {
    setAutoRefresh(!state.autoRefresh);
  });

  document.querySelectorAll(".chart-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".chart-toggle").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.chartMode = button.dataset.chart || "intraday";
      renderMainChart();
    });
  });

  window.addEventListener("resize", () => {
    Object.values(state.charts).forEach((chart) => chart?.resize?.());
  });
}

async function loadSymbol(rawSymbol, options = {}) {
  const symbol = normalizeSymbol(rawSymbol);
  if (!symbol) {
    throw new Error("请输入类似 601155.SH、SH600519 或 000001 的代码。");
  }

  refs.symbolInput.value = symbol;
  state.symbol = symbol;
  refs.refreshMeta.textContent = "刷新中…";
  refs.heroTitle.textContent = `${symbol} 载入中`;
  refs.heroPrice.textContent = "--";
  refs.aiHeadline.textContent = "正在生成结论";
  refs.aiThesis.textContent = "行情、资金和公告数据正在同步。";
  showWarning("");

  const query = new URLSearchParams({ symbol });
  const dashboardUrl = `/api/stock/dashboard?${query.toString()}`;
  const predictUrl = `/api/stock/predict?${query.toString()}`;

  const [dashboardResult, predictResult] = await Promise.allSettled([fetchJson(dashboardUrl), fetchJson(predictUrl)]);
  if (dashboardResult.status !== "fulfilled") {
    refs.refreshMeta.textContent = "刷新失败";
    throw dashboardResult.reason instanceof Error ? dashboardResult.reason : new Error("行情接口加载失败");
  }

  state.dashboard = dashboardResult.value;
  state.prediction = predictResult.status === "fulfilled" ? predictResult.value : null;
  renderAll();
  saveRecentSymbol(symbol);
  renderRecentSymbols();

  if (options.replaceUrl) {
    const path = location.pathname === "/stock" ? "/stock" : "/stock.html";
    history.replaceState(null, "", `${path}?symbol=${encodeURIComponent(symbol)}`);
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `请求失败: ${response.status}`);
  }
  return payload;
}

function renderAll() {
  const dashboard = state.dashboard || {};
  const prediction = state.prediction || {};
  const quote = dashboard.quote || {};
  const fundamentals = dashboard.fundamentals || {};
  const report = prediction.report || buildFallbackReport();

  const warnings = [...(dashboard.warnings || []), ...(prediction.warnings || [])].filter(Boolean);
  showWarning(warnings.join(" | "));

  refs.serverTime.textContent = formatServerTime(dashboard.serverTime || prediction.serverTime);
  refs.refreshMeta.textContent = `自动刷新 ${dashboard.refreshSeconds || 15}s`;
  refs.engineBadge.textContent =
    prediction.engine === "openai"
      ? `AI 已升级 · ${prediction.model || "GPT"}`
      : prediction.aiAvailable
      ? "本地引擎回退"
      : "本地预测引擎";

  renderHero(quote, fundamentals);
  renderMainChart();
  renderAi(report);
  renderResearch(report);
  renderMarketOverview(dashboard.marketOverview || {});
  renderAnnouncements(dashboard.announcements || [], report.announcementCard || {});
  renderTape(dashboard.tape || []);
  renderWatchlist(dashboard.watchlist || []);
}

function renderHero(quote, fundamentals) {
  const pctChange = Number(quote.pctChange || 0);
  const tone = pctChange > 0 ? "positive" : pctChange < 0 ? "negative" : "neutral";

  refs.heroTitle.textContent = `${quote.name || "--"} · ${fundamentals.industry || "未识别行业"}`;
  refs.symbolBadge.textContent = `${state.symbol}`;
  refs.marketBadge.textContent = fundamentals.listedDate ? `上市 ${fundamentals.listedDate}` : "A 股";
  refs.heroPrice.textContent = formatPrice(quote.price);
  refs.heroChange.innerHTML = `
    <span class="${tone}">${formatSigned(quote.change)} / ${formatSignedPercent(quote.pctChange)}</span>
  `;

  refs.heroMiniGrid.innerHTML = [
    miniCard("成交额", formatAmount(quote.amount)),
    miniCard("换手率", formatPercent(quote.turnoverPct)),
    miniCard("振幅", formatPercent(quote.amplitudePct)),
    miniCard("总市值", formatAmount(fundamentals.marketCap || quote.marketCap)),
  ].join("");

  refs.quoteMetrics.innerHTML = [
    metricCard("开盘", formatPrice(quote.open)),
    metricCard("最高", formatPrice(quote.high)),
    metricCard("最低", formatPrice(quote.low)),
    metricCard("均价", formatPrice(quote.averagePrice)),
    metricCard("昨收", formatPrice(quote.prevClose)),
    metricCard("涨停", formatPrice(quote.limitUp)),
    metricCard("跌停", formatPrice(quote.limitDown)),
    metricCard("PB", formatMultiple(fundamentals.pb)),
  ].join("");
}

function renderMainChart() {
  const dashboard = state.dashboard || {};
  const quote = dashboard.quote || {};
  const intraday = dashboard.intraday || [];
  const daily = dashboard.daily || [];
  const chart = ensureChart("mainChart");

  if (!chart) {
    return;
  }

  if (state.chartMode === "swing") {
    const sliced = daily.slice(-80);
    const dates = sliced.map((item) => item.date?.slice(5) || "");
    const values = sliced.map((item) => [item.open, item.close, item.low, item.high]);
    const closes = sliced.map((item) => item.close);
    const ma20 = movingAverage(closes, 20);
    const ma60 = movingAverage(closes, 60);

    chart.setOption(
      {
        backgroundColor: "transparent",
        animation: false,
        tooltip: { trigger: "axis" },
        legend: { top: 8, textStyle: { color: "#8ca3a6" } },
        grid: { left: 48, right: 18, top: 48, bottom: 32 },
        xAxis: { type: "category", data: dates, axisLine: { lineStyle: { color: "rgba(255,255,255,0.16)" } } },
        yAxis: {
          scale: true,
          axisLine: { show: false },
          splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
        },
        series: [
          {
            name: "K线",
            type: "candlestick",
            data: values,
            itemStyle: {
              color: "#1fd39a",
              color0: "#ff7b62",
              borderColor: "#1fd39a",
              borderColor0: "#ff7b62",
            },
          },
          {
            name: "MA20",
            type: "line",
            data: ma20,
            smooth: true,
            symbol: "none",
            lineStyle: { color: "#efc46d", width: 1.8 },
          },
          {
            name: "MA60",
            type: "line",
            data: ma60,
            smooth: true,
            symbol: "none",
            lineStyle: { color: "#7bd7d1", width: 1.8 },
          },
        ],
      },
      true,
    );
    return;
  }

  const times = intraday.map((item) => formatIntradayLabel(item.timestamp));
  const prices = intraday.map((item) => item.close);
  const averages = intraday.map((item) => item.avgPrice);

  chart.setOption(
    {
      backgroundColor: "transparent",
      animation: false,
      tooltip: { trigger: "axis" },
      legend: { top: 8, textStyle: { color: "#8ca3a6" } },
      grid: { left: 48, right: 18, top: 48, bottom: 32 },
      xAxis: {
        type: "category",
        data: times,
        boundaryGap: false,
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.16)" } },
      },
      yAxis: {
        scale: true,
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
      },
      series: [
        {
          name: "现价",
          type: "line",
          data: prices,
          smooth: true,
          symbol: "none",
          lineStyle: { color: toneColor(quote.pctChange), width: 2.2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(31,211,154,0.20)" },
              { offset: 1, color: "rgba(31,211,154,0.02)" },
            ]),
          },
          markLine: quote.prevClose
            ? {
                symbol: "none",
                label: { color: "#8ca3a6" },
                lineStyle: { color: "rgba(255,255,255,0.16)" },
                data: [{ yAxis: quote.prevClose, name: "昨收" }],
              }
            : undefined,
        },
        {
          name: "均价",
          type: "line",
          data: averages,
          smooth: true,
          symbol: "none",
          lineStyle: { color: "#efc46d", width: 1.8, type: "dashed" },
        },
      ],
    },
    true,
  );
}

function renderAi(report) {
  refs.confidenceBadge.textContent = `置信度 ${report.confidence ?? "--"}`;
  refs.scoreBadge.textContent = `总分 ${report.totalScore ?? "--"}`;
  refs.aiHeadline.textContent = report.headline || "暂无结论";
  refs.aiThesis.textContent = report.thesis || "等待更多数据。";

  refs.horizonGrid.innerHTML = (report.horizons || [])
    .map(
      (item) => `
        <article class="horizon-card">
          <header>
            <strong>${escapeHtml(item.label || "--")} · ${escapeHtml(item.bias || "--")}</strong>
            <span class="score ${toneClass(item.score, true)}">${item.score ?? "--"}</span>
          </header>
          <p class="panel-copy">${escapeHtml(item.summary || "")}</p>
          <div class="timeline-meta">
            <span class="timeline-tag">区间 ${escapeHtml(item.rangeText || "--")}</span>
            <span class="timeline-tag">置信 ${item.confidence ?? "--"}</span>
          </div>
        </article>
      `,
    )
    .join("");

  refs.catalystList.innerHTML = renderList(report.catalysts);
  refs.riskList.innerHTML = renderList(report.risks);
  refs.invalidationList.innerHTML = renderList(report.invalidation);
  refs.actionPlanList.innerHTML = renderList(report.actionPlan);

  refs.scorecardGrid.innerHTML = (report.scorecard || [])
    .map(
      (item) => `
        <article class="score-row">
          <header>
            <strong>${escapeHtml(item.label || "--")}</strong>
            <span class="${toneClass(item.score)}">${item.score ?? "--"}</span>
          </header>
          <div class="score-track">
            <div class="score-fill" style="width:${Math.max(0, Math.min(100, item.score || 0))}%"></div>
          </div>
          <p class="panel-copy">${escapeHtml(item.summary || "")}</p>
        </article>
      `,
    )
    .join("");

  refs.signalCards.innerHTML = (report.signalCards || [])
    .map(
      (item) => `
        <article class="signal-card">
          <span>${escapeHtml(item.title || "")}</span>
          <strong>${escapeHtml(item.value || "--")}</strong>
          <p class="panel-copy">${escapeHtml(item.detail || "")}</p>
        </article>
      `,
    )
    .join("");
}

function renderResearch(report) {
  const cards = [report.earningsCard, report.valuationCard, report.announcementCard, report.marketCard].filter(Boolean);
  refs.researchCards.innerHTML = cards
    .map((card) => {
      const items = (card.items || [])
        .map((item) => `<li>${escapeHtml(item.label || "")}：${escapeHtml(item.value || "--")}</li>`)
        .join("");
      const highlights = (card.highlights || [])
        .map((item) => `<li>${escapeHtml(item.type || item.column || "公告")}：${escapeHtml(item.title || "")}</li>`)
        .join("");

      return `
        <article class="research-card">
          <header>
            <strong>${escapeHtml(card.title || "--")}</strong>
          </header>
          <p class="panel-copy">${escapeHtml(card.summary || "")}</p>
          ${items ? `<ul>${items}</ul>` : ""}
          ${highlights ? `<ul>${highlights}</ul>` : ""}
        </article>
      `;
    })
    .join("");
}

function renderMarketOverview(marketOverview) {
  const breadth = marketOverview.breadth || {};
  const sectorHeat = marketOverview.sectorHeat || {};
  const indices = marketOverview.indices || [];
  refs.marketPulseLabel.textContent = `上涨占比 ${formatPercent(calcRiseRatio(breadth))}`;

  refs.indexStrip.innerHTML = indices
    .map((item) => {
      const pct = Number(item.pctChange || 0);
      return `
        <article class="index-card">
          <div class="name">${escapeHtml(item.name || item.symbol || "--")}</div>
          <div class="value">${formatPrice(item.price)}</div>
          <div class="${toneClass(pct, true)}">${formatSignedPercent(pct)}</div>
        </article>
      `;
    })
    .join("");

  renderHeatList(refs.industryHeat, sectorHeat.industries || []);
  renderHeatList(refs.conceptHeat, sectorHeat.concepts || []);
  renderHeatList(refs.laggardHeat, sectorHeat.laggards || []);

  renderBreadthChart(breadth);
  renderSectorChart((sectorHeat.industries || []).slice(0, 6));
}

function renderBreadthChart(breadth) {
  const chart = ensureChart("breadthChart");
  if (!chart) {
    return;
  }
  const buckets = breadth.buckets || [];
  chart.setOption(
    {
      backgroundColor: "transparent",
      animation: false,
      grid: { left: 32, right: 18, top: 20, bottom: 24 },
      xAxis: {
        type: "category",
        data: buckets.map((item) => item.label),
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.16)" } },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
      },
      series: [
        {
          type: "bar",
          data: buckets.map((item) => ({
            value: item.value,
            itemStyle: { color: bucketColor(item.tone) },
          })),
          barWidth: 24,
          borderRadius: [8, 8, 0, 0],
        },
      ],
    },
    true,
  );
}

function renderSectorChart(rows) {
  const chart = ensureChart("sectorChart");
  if (!chart) {
    return;
  }

  chart.setOption(
    {
      backgroundColor: "transparent",
      animation: false,
      grid: { left: 74, right: 18, top: 20, bottom: 24 },
      xAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
      },
      yAxis: {
        type: "category",
        data: rows.map((item) => item.name),
        axisLine: { show: false },
      },
      series: [
        {
          type: "bar",
          data: rows.map((item) => ({
            value: item.pctChange,
            itemStyle: { color: item.pctChange >= 0 ? "#1fd39a" : "#ff7b62" },
          })),
          barWidth: 16,
          borderRadius: 999,
        },
      ],
    },
    true,
  );
}

function renderAnnouncements(announcements, announcementCard) {
  refs.announcementSummary.innerHTML = (announcementCard.items || [])
    .map((item) => `<span class="status-pill subtle">${escapeHtml(item.label || "")} ${escapeHtml(item.value || "0")}</span>`)
    .join("");

  refs.announcementTimeline.innerHTML = announcements.length
    ? announcements
        .map((item) => {
          const tone = inferAnnouncementTone(item.title || "");
          return `
            <article class="timeline-item">
              <div class="timeline-time">${escapeHtml(item.time || "--")}</div>
              <div>
                <strong>${escapeHtml(item.title || "未命名公告")}</strong>
                <div class="timeline-meta">
                  <span class="timeline-tag">${escapeHtml(item.column || "公告")}</span>
                  <span class="timeline-tag ${toneClassName(tone)}">${toneLabel(tone)}</span>
                </div>
              </div>
              <div>
                ${item.url ? `<a class="timeline-link" href="${escapeAttr(item.url)}" target="_blank" rel="noreferrer">查看</a>` : ""}
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="loading">暂无公告数据。</div>`;
}

function renderTape(tapeRows) {
  const rows = tapeRows.slice(0, 12);
  const header = `
    <div class="tape-row header">
      <div>时间</div>
      <div>价格</div>
      <div>手数</div>
      <div>笔数</div>
      <div>方向</div>
    </div>
  `;
  const body = rows
    .map(
      (row) => `
        <div class="tape-row">
          <div>${escapeHtml(row.time || "--")}</div>
          <div>${formatPrice(row.price)}</div>
          <div>${formatInteger(row.lots)}</div>
          <div>${formatInteger(row.orders)}</div>
          <div class="${row.side === "buy" ? "positive" : row.side === "sell" ? "negative" : "neutral"}">
            ${row.side === "buy" ? "主动买" : row.side === "sell" ? "主动卖" : "中性"}
          </div>
        </div>
      `,
    )
    .join("");

  refs.tapeTable.innerHTML = header + (body || `<div class="loading">暂无逐笔数据。</div>`);
}

function renderWatchlist(rows) {
  const header = `
    <div class="watchlist-row header">
      <div>标的</div>
      <div>现价</div>
      <div>涨跌幅</div>
      <div>成交额</div>
      <div>总市值</div>
    </div>
  `;
  const body = rows
    .map(
      (row) => `
        <div class="watchlist-row" data-symbol="${escapeAttr(row.symbol || "")}">
          <div>
            <strong>${escapeHtml(row.name || row.symbol || "--")}</strong>
            <div class="panel-copy">${escapeHtml(row.symbol || "--")}</div>
          </div>
          <div>${formatPrice(row.price)}</div>
          <div class="${toneClass(row.pctChange, true)}">${formatSignedPercent(row.pctChange)}</div>
          <div>${formatAmount(row.amount)}</div>
          <div>${formatAmount(row.marketCap)}</div>
        </div>
      `,
    )
    .join("");

  refs.watchlistTable.innerHTML = header + body;
  refs.watchlistTable.querySelectorAll(".watchlist-row[data-symbol]").forEach((row) => {
    row.addEventListener("click", async () => {
      await loadSymbol(row.dataset.symbol, { replaceUrl: true });
    });
  });
}

function renderRecentSymbols() {
  const symbols = readRecentSymbols();
  refs.recentSymbols.innerHTML = symbols.length
    ? symbols
        .map((symbol) => `<button class="symbol-chip" type="button" data-symbol="${escapeAttr(symbol)}">${escapeHtml(symbol)}</button>`)
        .join("")
    : `<div class="loading">你查看过的标的会出现在这里。</div>`;

  refs.recentSymbols.querySelectorAll(".symbol-chip").forEach((button) => {
    button.addEventListener("click", async () => {
      await loadSymbol(button.dataset.symbol, { replaceUrl: true });
    });
  });
}

function buildFallbackReport() {
  return {
    confidence: null,
    totalScore: null,
    headline: "预测层暂不可用",
    thesis: "行情已载入，但结论层还在等待数据。",
    horizons: [],
    catalysts: [],
    risks: [],
    invalidation: [],
    actionPlan: [],
    scorecard: [],
    signalCards: [],
    earningsCard: null,
    valuationCard: null,
    announcementCard: { items: [] },
    marketCard: null,
  };
}

function ensureChart(id) {
  const dom = document.getElementById(id);
  if (!dom || typeof echarts === "undefined") {
    return null;
  }
  if (!state.charts[id]) {
    state.charts[id] = echarts.init(dom, null, { renderer: "canvas" });
  }
  return state.charts[id];
}

function movingAverage(values, windowSize) {
  return values.map((_, index) => {
    if (index + 1 < windowSize) {
      return null;
    }
    const slice = values.slice(index + 1 - windowSize, index + 1);
    const sum = slice.reduce((total, value) => total + Number(value || 0), 0);
    return Number((sum / windowSize).toFixed(2));
  });
}

function renderHeatList(container, rows) {
  container.innerHTML = rows.length
    ? rows
        .map(
          (row) => `
            <article class="heat-item">
              <div>
                <strong>${escapeHtml(row.name || "--")}</strong>
                <small>${formatAmount(row.marketCap)}</small>
              </div>
              <div class="${toneClass(row.pctChange, true)}">${formatSignedPercent(row.pctChange)}</div>
            </article>
          `,
        )
        .join("")
    : `<div class="loading">暂无板块热力数据。</div>`;
}

function showWarning(message) {
  if (!message) {
    refs.warningBanner.classList.add("hidden");
    refs.warningBanner.textContent = "";
    return;
  }
  refs.warningBanner.classList.remove("hidden");
  refs.warningBanner.textContent = message;
}

function setAutoRefresh(enabled) {
  state.autoRefresh = enabled;
  refs.autoRefreshButton.classList.toggle("active", enabled);
  refs.autoRefreshButton.textContent = enabled ? "自动刷新" : "手动模式";
  if (state.refreshTimer) {
    clearInterval(state.refreshTimer);
    state.refreshTimer = null;
  }
  if (enabled) {
    state.refreshTimer = setInterval(() => {
      loadSymbol(state.symbol, { replaceUrl: false }).catch((error) => showWarning(error.message));
    }, 15000);
  }
}

function readInitialSymbol() {
  const params = new URLSearchParams(location.search);
  const raw = params.get("symbol") || DEFAULT_SYMBOL;
  return normalizeSymbol(raw);
}

function normalizeSymbol(value) {
  const raw = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!raw) {
    return DEFAULT_SYMBOL;
  }
  if (/^(SH|SZ|BJ)\d{6}$/.test(raw)) {
    return `${raw.slice(2)}.${raw.slice(0, 2)}`;
  }
  if (/^\d{6}\.(SH|SZ|BJ)$/.test(raw)) {
    return raw;
  }
  if (/^\d{6}$/.test(raw)) {
    if (/^[569]/.test(raw)) {
      return `${raw}.SH`;
    }
    if (/^[48]/.test(raw)) {
      return `${raw}.BJ`;
    }
    return `${raw}.SZ`;
  }
  return "";
}

function saveRecentSymbol(symbol) {
  const next = [symbol, ...readRecentSymbols().filter((item) => item !== symbol)].slice(0, 8);
  localStorage.setItem(RECENT_SYMBOLS_KEY, JSON.stringify(next));
}

function readRecentSymbols() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_SYMBOLS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatPrice(value) {
  return value == null ? "--" : Number(value).toFixed(2);
}

function formatPercent(value) {
  return value == null ? "--" : `${Number(value).toFixed(2)}%`;
}

function formatSignedPercent(value) {
  if (value == null) {
    return "--";
  }
  const number = Number(value);
  return `${number >= 0 ? "+" : ""}${number.toFixed(2)}%`;
}

function formatSigned(value) {
  if (value == null) {
    return "--";
  }
  const number = Number(value);
  return `${number >= 0 ? "+" : ""}${number.toFixed(2)}`;
}

function formatAmount(value) {
  if (value == null) {
    return "--";
  }
  const number = Math.abs(Number(value));
  const sign = Number(value) < 0 ? "-" : "";
  if (number >= 100000000) {
    return `${sign}${(number / 100000000).toFixed(2)}亿`;
  }
  if (number >= 10000) {
    return `${sign}${(number / 10000).toFixed(2)}万`;
  }
  return `${sign}${number.toFixed(0)}`;
}

function formatInteger(value) {
  return value == null ? "--" : Number(value).toLocaleString("zh-CN");
}

function formatMultiple(value) {
  return value == null ? "--" : `${Number(value).toFixed(2)}x`;
}

function formatServerTime(value) {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : `服务器 ${date.toLocaleString("zh-CN")}`;
}

function formatIntradayLabel(value) {
  if (!value) {
    return "";
  }
  const parts = String(value).split(" ");
  return parts[1] ? parts[1].slice(0, 5) : String(value).slice(-5);
}

function calcRiseRatio(breadth) {
  const rising = Number(breadth.rising || 0);
  const falling = Number(breadth.falling || 0);
  const total = rising + falling;
  return total > 0 ? (rising / total) * 100 : null;
}

function renderList(items) {
  return (items || []).length
    ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : `<li>暂无</li>`;
}

function miniCard(label, value) {
  return `
    <article class="mini-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function metricCard(label, value) {
  return `
    <article class="metric-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function toneClass(value, numeric = false) {
  const number = numeric ? Number(value || 0) : Number(value || 0);
  if (number > 0) {
    return "positive";
  }
  if (number < 0) {
    return "negative";
  }
  return "neutral";
}

function toneClassName(tone) {
  if (tone === "positive") {
    return "positive";
  }
  if (tone === "negative") {
    return "negative";
  }
  return "neutral";
}

function toneColor(value) {
  const number = Number(value || 0);
  if (number > 0) {
    return "#1fd39a";
  }
  if (number < 0) {
    return "#ff7b62";
  }
  return "#efc46d";
}

function bucketColor(tone) {
  if (tone === "positive") {
    return "#1fd39a";
  }
  if (tone === "negative") {
    return "#ff7b62";
  }
  return "#efc46d";
}

function inferAnnouncementTone(title) {
  const text = String(title || "");
  if (/(回购|增持|中标|签订|受理|获批|通过|增长|分红|预增)/.test(text)) {
    return "positive";
  }
  if (/(减持|质押|诉讼|处罚|风险|亏损|终止|延期|冻结|违约)/.test(text)) {
    return "negative";
  }
  return "neutral";
}

function toneLabel(tone) {
  if (tone === "positive") {
    return "偏积极";
  }
  if (tone === "negative") {
    return "偏谨慎";
  }
  return "中性";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
