const STATE = {
  data: null,
  selectedProvince: "全部",
  selectedPlaza: "",
  search: "",
  plazaTask: "risk",
  trendMetric: "net_sales",
  mapMetric: "decision_mtd_pct",
  mapView: "3d",
  dayDate: "",
  dateNotice: "",
  selectedInsight: "",
  plazaPage: 1,
  plazaSort: "priority",
  diagnosisExpanded: false,
};

const GEO_NAME_MAP = {
  "北京": "北京市",
  "上海": "上海市",
  "天津": "天津市",
  "重庆": "重庆市",
  "内蒙古": "内蒙古自治区",
  "广西": "广西壮族自治区",
  "西藏": "西藏自治区",
  "宁夏": "宁夏回族自治区",
  "新疆": "新疆维吾尔自治区",
  "香港": "香港特别行政区",
  "澳门": "澳门特别行政区",
};

const MAP_METRICS = { decision_7d_pct: "周校准变化", decision_mtd_pct: "月校准变化", mtd_net_sales: "当月体量" };
const TREND_METRICS = { net_sales: "净销售", paid_sales: "实付", order_count: "订单", member_active_count: "交易会员", refund_rate: "退款率", member_balance_yuan: "会员余额沉淀", new_customer_share: "新客占比" };
const INSIGHT_TYPES = {
  today: "单日净销售",
  rolling7d: "本周销售",
  mtd: "当月销售",
  members: "会员活跃",
  attention: "需关注广场数",
};

let dailyChart;
let monthlyChart;
let mapChart;
let aiWaterfallChart;
let aiRegionChart;
let aiScatterChart;
let geoCenters = {};
let lastInsightTrigger = null;
let geoPromise;
let chartLibraryPromise;
let map3DLibraryPromise;
let map3DLoaded = false;
let mapRenderer = "";
let mapRenderRequest = 0;
let mapCamera = null;
let webglSupported;
const moneyFormatter = new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat("zh-CN");

const $ = (id) => document.getElementById(id);
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
const icons = {
  yuan: '<svg viewBox="0 0 24 24" fill="none" class="icon"><path d="M7 4l5 7 5-7M8 11h8M8 15h8M12 11v9" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  trend: '<svg viewBox="0 0 24 24" fill="none" class="icon"><path d="M4 18h16M7 15l4-5 3 3 5-7" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" class="icon"><path d="M7 3v3m10-3v3M4 9h16M5 5h14v16H5z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" class="icon"><path d="M12 9v4m0 4h.01M10 3h4l8 16H2z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  store: '<svg viewBox="0 0 24 24" fill="none" class="icon"><path d="M4 20V8l8-4 8 4v12M9 20v-7h6v7" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" class="icon"><path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Zm0 0V3m6 18V6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" class="icon"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm17 10v-2a4 4 0 0 0-3-3.87M17 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

function currency(value) {
  return moneyFormatter.format(Number(value || 0));
}
function number(value) {
  return numberFormatter.format(Number(value || 0));
}
function compactCurrency(value) {
  const n = Number(value || 0);
  const abs = Math.abs(n);
  if (abs >= 100000000) return `¥${(n / 100000000).toFixed(2)}亿`;
  if (abs >= 10000) return `¥${(n / 10000).toFixed(1)}万`;
  return currency(n);
}
function percent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${(Number(value) * 100).toFixed(1)}%`;
}
function signedCurrency(value) {
  const n = Number(value || 0);
  return `${n >= 0 ? "+" : "-"}${currency(Math.abs(n))}`;
}
function signedNumber(value) {
  const n = Number(value || 0);
  return `${n >= 0 ? "+" : "-"}${number(Math.abs(n))}`;
}
function trendClass(value) {
  const n = Number(value || 0);
  if (n > 0) return "trend-up";
  if (n < 0) return "trend-down";
  return "trend-flat";
}
function decisionPct(row, period = "7d") {
  return row?.[`decision_${period}_pct`] ?? row?.[`delta_${period}_pct`];
}
function decisionAmount(row, period = "7d") {
  return row?.[`decision_${period}_amount`] ?? row?.[`delta_${period}_amount`] ?? 0;
}
function decisionBasisLabel(row, period = "7d") {
  return row?.[`decision_${period}_basis`] === "calendar_adjusted" ? "同类日校准" : "原始周期";
}
function metricChange(metric, pctKey = "calendar_adjusted_change_pct", amountKey = "calendar_adjusted_change_amount") {
  const useCalendar = metric && metric[pctKey] !== undefined && metric[pctKey] !== null;
  return {
    pct: useCalendar ? metric[pctKey] : metric?.change_pct,
    amount: useCalendar ? metric[amountKey] : metric?.change_amount,
    basis: useCalendar ? "同类日校准" : "原始周期",
  };
}
function shortRange(start, end) {
  if (!start || !end) return "";
  return `${start.slice(5)}-${end.slice(5)}`;
}
function periodRangeLabel(period) {
  if (!period?.start || !period?.end) return "";
  return `${period.start.slice(5)} 至 ${period.end.slice(5)}`;
}
function toGeoName(name) {
  if (!name || name === "待补充") return name;
  return GEO_NAME_MAP[name] || `${name}省`;
}
function toDisplayProvince(geoName) {
  const exact = Object.entries(GEO_NAME_MAP).find(([, full]) => full === geoName);
  if (exact) return exact[0];
  return String(geoName || "")
    .replace(/省$/u, "")
    .replace(/市$/u, "")
    .replace(/壮族自治区$/u, "")
    .replace(/回族自治区$/u, "")
    .replace(/维吾尔自治区$/u, "")
    .replace(/自治区$/u, "")
    .replace(/特别行政区$/u, "");
}
function badgeClass(trend) {
  if (trend === "增长") return "badge up";
  if (trend === "承压") return "badge down";
  return "badge";
}
function latestDayLabel() {
  const day = STATE.data.latest_day;
  if (!day?.date) return "暂无最新日";
  return day.is_partial ? `${day.date} 截至 ${day.cutoff_time}` : `${day.date} 全天`;
}
function availableDayDates() {
  return Object.keys(STATE.data?.daily_detail || {}).sort();
}
function selectedDayDetail() {
  return dayDetail(STATE.dayDate) || dayDetail(STATE.data.latest_day?.date) || null;
}
function selectedDayLabel() {
  const detail = selectedDayDetail();
  const date = STATE.dayDate || STATE.data.latest_day?.date || "";
  const isLatest = date === STATE.data.latest_day?.date;
  if (isLatest && STATE.data.latest_day?.is_partial) {
    return `${date} 截至 ${STATE.data.latest_day.cutoff_time}`;
  }
  const event = detail?.calendar?.event || detail?.calendar?.label || "单日";
  return `${date} ${event}`;
}
function periodPartialLabel() {
  const data = STATE.data;
  if (!data?.latest_day?.is_partial) return "";
  if (data.analysis_range?.partial_day_included !== data.latest_day.date) return "";
  return `含 ${data.latest_day.date} 部分日 · ${data.latest_day.cutoff_time || ""}`.trim();
}
function syncDateInput(input) {
  if (!input) return;
  const dates = availableDayDates();
  input.min = dates[0] || STATE.data.data_range?.start || "";
  input.max = dates[dates.length - 1] || STATE.data.data_range?.end || "";
  input.value = STATE.dayDate || "";
  input.title = dates.length ? `可回看 ${dates[0]} 至 ${dates[dates.length - 1]}，共 ${dates.length} 天` : "";
}

async function fetchResource(url, read, timeout = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { cache: "no-cache", signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await read(response);
  } finally { clearTimeout(timer); }
}
function validateDashboardData(data) {
  if (!data?.latest_day?.date || !data?.daily_detail?.[data.latest_day.date] || !Array.isArray(data.province_table) || !Array.isArray(data.plaza_table) || !data.rolling_7d || !data.mtd) {
    throw new Error("数据内容不完整");
  }
  return data;
}
async function loadDashboardData() {
  if (window.DASHBOARD_DATA) return validateDashboardData(window.DASHBOARD_DATA);
  if ("DecompressionStream" in window) {
    try {
      const data = await fetchResource("./dashboard-view-data.json.gz", async (response) => {
        const bytes = new Uint8Array(await response.arrayBuffer());
        // Servers may already decode a Content-Encoding: gzip response.
        if (bytes[0] === 31 && bytes[1] === 139) {
          const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
          return JSON.parse(await new Response(stream).text());
        }
        return JSON.parse(new TextDecoder().decode(bytes));
      });
      return validateDashboardData(data);
    } catch { /* Fall back to the compact plain JSON, never the 15 MB source file. */ }
  }
  return validateDashboardData(await fetchResource("./dashboard-view-data.json", response => response.json()));
}
async function ensureChinaGeo() {
  if (Object.keys(geoCenters).length) return;
  if (!geoPromise) geoPromise = fetchResource("./china-geo.json", response => response.json(), 10000).then(geoJson => {
    echarts.registerMap("china", geoJson);
    geoJson.features.forEach(feature => {
      const name = feature.properties?.name;
      const cp = feature.properties?.center || feature.properties?.cp;
      if (name && cp) geoCenters[name] = cp;
    });
  }).catch(error => { geoPromise = null; throw error; });
  return geoPromise;
}
async function ensureChartLibrary() {
  if (window.echarts) return;
  if (!chartLibraryPromise) chartLibraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = setTimeout(() => { script.remove(); reject(new Error("图表加载超时")); }, 12000);
    script.src = "./echarts.min.js";
    script.onload = () => { clearTimeout(timeout); resolve(); };
    script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error("图表加载失败")); };
    document.head.append(script);
  }).catch(error => { chartLibraryPromise = null; throw error; });
  return chartLibraryPromise;
}
const chartState = { map: false, trend: false };
function supportsMap3D() {
  if (webglSupported !== undefined) return webglSupported;
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    webglSupported = Boolean(context);
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch { webglSupported = false; }
  return webglSupported;
}
async function ensureMap3DLibrary() {
  if (map3DLoaded) return;
  if (!supportsMap3D()) throw new Error("当前设备不支持立体渲染");
  if (!map3DLibraryPromise) map3DLibraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = setTimeout(() => { script.remove(); reject(new Error("立体地图加载超时")); }, 12000);
    script.src = "./echarts-gl.min.js?v=2.0.9";
    script.onload = () => { clearTimeout(timeout); map3DLoaded = true; resolve(); };
    script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error("立体地图加载失败")); };
    document.head.append(script);
  }).catch(error => { map3DLibraryPromise = null; throw error; });
  return map3DLibraryPromise;
}
async function renderChartSection(kind) {
  const root = $(kind === "map" ? "china-map" : "daily-chart");
  try {
    await ensureChartLibrary();
    root.querySelector(".chart-error")?.remove();
    if (kind === "map") await renderMap(); else renderTrendCharts();
  } catch {
    root.innerHTML = `<div class="chart-error">图表暂时无法加载，经营数据仍可查看。<button class="text-button" type="button" data-retry-chart="${kind}">重新加载图表</button></div>`;
  }
}
function observeCharts() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const kind = entry.target.id === "china-map" ? "map" : "trend";
      chartState[kind] = true;
      observer.unobserve(entry.target);
      void renderChartSection(kind);
    });
  }, { rootMargin: "200px" });
  observer.observe($("china-map"));
  observer.observe($("daily-chart"));
}

function initCharts() {
  dailyChart ||= echarts.init($("daily-chart"));
  monthlyChart ||= echarts.init($("monthly-chart"));
}

function provinceRow(name = STATE.selectedProvince) {
  if (!name || name === "全部") return null;
  return STATE.data.province_table.find((item) => item.name === name) || null;
}
function plazaRow(name = STATE.selectedPlaza) {
  if (!name) return null;
  return STATE.data.plaza_table.find((item) => item.name === name) || null;
}
function scope() {
  const plaza = plazaRow();
  if (plaza) return { type: "plaza", name: plaza.name, province: plaza.province, row: plaza };
  const province = provinceRow();
  if (province) return { type: "province", name: province.name, province: province.name, row: province };
  return { type: "all", name: "全国", province: "全部", row: null };
}
function scopeLabel() {
  const s = scope();
  if (s.type === "plaza") return `${s.province} / ${s.name}`;
  return s.name;
}
function dayDetail(date = STATE.dayDate) {
  return STATE.data.daily_detail?.[date] || null;
}

function nationalCapsuleDayNet(dayDate, yuexingNetSales) {
  const dns = STATE.data?.daily_net_sales;
  const base = Number(yuexingNetSales || 0);
  if (!dns || dns.capsule_included !== true || dns.total_yuan == null || !dns.date || dns.date !== dayDate) {
    return { net_sales: base, capsuleIncluded: false, dns: null };
  }
  return { net_sales: Number(dns.total_yuan), capsuleIncluded: true, dns };
}
function bossSeriesRow(key, date) {
  const rows = STATE.data?.boss_kpis?.series?.[key] || [];
  return rows.find((row) => row?.date === date) || null;
}
function lookbackView() {
  const dates = availableDayDates();
  const detail = dayDetail(STATE.dayDate);
  const totals = detail?.totals || {};
  const latest = STATE.data?.latest_day?.date || "";
  const overlay = nationalCapsuleDayNet(STATE.dayDate, totals.net_sales);
  const dns = STATE.data?.daily_net_sales || null;
  const paid = Number(totals.paid_sales || 0);
  return {
    date: STATE.dayDate,
    isLatest: STATE.dayDate === latest,
    latestDate: latest,
    notice: STATE.dateNotice || "",
    calendar: detail?.calendar?.event || detail?.calendar?.label || "",
    isPartial: STATE.dayDate === latest && !!STATE.data.latest_day?.is_partial,
    cutoffTime: STATE.data?.latest_day?.cutoff_time || "",
    yuexingNet: Number(totals.net_sales || 0),
    netSales: overlay.net_sales,
    capsuleIncluded: overlay.capsuleIncluded,
    capsuleYuan: overlay.capsuleIncluded ? Number(overlay.dns?.capsule_yuan || 0) : 0,
    capsuleRuleDate: dns?.date || "",
    orderCount: Number(totals.order_count || 0),
    memberActive: Number(totals.member_active_count || 0),
    paidSales: paid,
    refundAmount: Number(totals.refund_amount || 0),
    refundRate: paid ? Number(totals.refund_amount || 0) / paid : null,
    newReturning: bossSeriesRow("new_returning", STATE.dayDate),
    memberBalance: bossSeriesRow("member_balance", STATE.dayDate),
    range: { min: dates[0] || "", max: dates[dates.length - 1] || "", count: dates.length },
  };
}
function publishLookback() {
  const view = lookbackView();
  window.__YUEXING_LOOKBACK = view;
  document.documentElement.dataset.lookbackMin = view.range.min;
  document.documentElement.dataset.lookbackMax = view.range.max;
  document.documentElement.dataset.lookbackCount = String(view.range.count);
  document.documentElement.dataset.analysisDate = view.date || "";
  const note = $("dashboard-date-note");
  if (note) {
    note.hidden = !view.notice;
    note.textContent = view.notice;
  }
  window.YuexingSalesLookback?.apply?.(view);
}
function nationalPeriodNetWithCapsule(period, yuexingNetSales) {
  return { net_sales: Number(yuexingNetSales || 0), capsuleIncluded: false, dns: null };
}
function todayForScope() {
  const s = scope();
  const detail = selectedDayDetail();
  if (!detail || s.type === "all") return detail?.totals || {};
  if (s.type === "province") {
    return (detail.province_table || []).find((row) => row.name === s.name) || {};
  }
  return (detail.plaza_table || []).find((row) => row.name === s.name) || {};
}
function scopeSevenDay() {
  const s = scope();
  if (s.row) {
    return {
      net_sales: s.row.current_7d_net_sales,
      order_count: s.row.current_7d_order_count,
      member_active_count: s.row.current_7d_member_active_count,
      member_active_count_basis: STATE.data.rolling_7d.member_active_count_basis,
      change_pct: decisionPct(s.row, "7d"),
      change_amount: decisionAmount(s.row, "7d"),
      raw_change_pct: s.row.delta_7d_pct,
      raw_change_amount: s.row.delta_7d_amount,
      basis: decisionBasisLabel(s.row, "7d"),
    };
  }
  const change = metricChange(STATE.data.rolling_7d);
  return { ...STATE.data.rolling_7d, change_pct: change.pct, change_amount: change.amount, basis: change.basis, raw_change_pct: STATE.data.rolling_7d.change_pct, raw_change_amount: STATE.data.rolling_7d.change_amount };
}
function scopeMonth() {
  const s = scope();
  if (s.row) {
    return {
      net_sales: s.row.mtd_net_sales,
      order_count: s.row.current_mtd_order_count,
      member_active_count: s.row.mtd_member_active_count,
      member_active_count_basis: STATE.data.mtd.member_active_count_basis,
      change_pct: decisionPct(s.row, "mtd"),
      change_amount: decisionAmount(s.row, "mtd"),
      raw_change_pct: s.row.delta_mtd_pct,
      raw_change_amount: s.row.delta_mtd_amount,
      basis: decisionBasisLabel(s.row, "mtd"),
    };
  }
  const change = metricChange(STATE.data.mtd);
  return { ...STATE.data.mtd, change_pct: change.pct, change_amount: change.amount, basis: change.basis, raw_change_pct: STATE.data.mtd.change_pct, raw_change_amount: STATE.data.mtd.change_amount };
}
function plazasInScope() {
  const q = STATE.search.trim().toLowerCase();
  return (STATE.data.plaza_table || [])
    .filter((row) => STATE.selectedProvince === "全部" || row.province === STATE.selectedProvince)
    .filter((row) => !STATE.selectedPlaza || row.name === STATE.selectedPlaza)
    .filter((row) => !q || `${row.name} ${row.province} ${row.trend}`.toLowerCase().includes(q));
}
function allPlazasForSelectedProvince() {
  return (STATE.data.plaza_table || []).filter((row) => STATE.selectedProvince === "全部" || row.province === STATE.selectedProvince);
}
function riskPlazas() {
  return allPlazasForSelectedProvince()
    .filter((row) => Number(decisionPct(row, "7d") || 0) < 0 || row.trend === "承压")
    .sort((a, b) => Number(decisionAmount(a, "7d") || 0) - Number(decisionAmount(b, "7d") || 0));
}
function growthPlazas() {
  return allPlazasForSelectedProvince()
    .filter((row) => Number(decisionPct(row, "7d") || 0) > 0 || row.trend === "增长")
    .sort((a, b) => Number(decisionAmount(b, "7d") || 0) - Number(decisionAmount(a, "7d") || 0));
}
function alertsInScope() {
  const s = scope();
  return (STATE.data.anomaly_alerts || []).filter((alert) => {
    if (s.type === "all") return true;
    if (s.type === "province") return alert.province === s.name;
    return alert.name === s.name;
  });
}
function setProvince(name) {
  STATE.plazaPage = 1;
  STATE.selectedProvince = STATE.selectedProvince === name ? "全部" : name;
  STATE.selectedPlaza = "";
  renderAll();
}
function setPlaza(name) {
  STATE.plazaPage = 1;
  const row = plazaRow(name) || STATE.data.plaza_table.find((item) => item.name === name);
  if (!row) return;
  STATE.selectedPlaza = STATE.selectedPlaza === name ? "" : name;
  STATE.selectedProvince = STATE.selectedPlaza ? row.province : "全部";
  renderAll();
}
function clearScope() {
  STATE.plazaPage = 1;
  STATE.selectedProvince = "全部";
  STATE.selectedPlaza = "";
  STATE.search = "";
  $("global-search").value = "";
  renderAll();
}

function metricValueMarkup(value) {
  const match = String(value).match(/^(¥?)([-+\d,.]+)\s*(.*)$/);
  if (!match) return escapeHtml(value);
  return `${match[1] ? '<span class="metric-currency">¥</span>' : ''}<span class="metric-number">${escapeHtml(match[2])}</span>${match[3] ? `<span class="metric-unit">${escapeHtml(match[3])}</span>` : ''}`;
}
function metricCard({ label, value, hint, icon, variant = "", trend, insight = "" }) {
  const active = insight && STATE.selectedInsight === insight;
  const insightAttrs = insight
    ? ` clickable-insight${active ? " insight-active" : ""}" role="button" tabindex="0" data-insight="${insight}" aria-label="查看${escapeHtml(label)}详情" aria-expanded="${active ? "true" : "false"}`
    : "";
  return `
    <article class="metric-card ${variant}${insightAttrs}">
      <div class="metric-top">
        <span>${label}</span>
        <span class="metric-icon" aria-hidden="true">${icons[icon] || icons.yuan}</span>
      </div>
      <div class="metric-value">${metricValueMarkup(value)}</div>
      <div class="metric-hint">${hint}</div>
      ${insight ? '<div class="metric-drill">查看详情</div>' : ""}
    </article>
  `;
}
function renderTopbar() {
  const data = STATE.data;
  syncDateInput($("dashboard-date-input"));
  $("current-scope").textContent = scopeLabel();
  $("province-select").value = STATE.selectedProvince;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const age = Math.round((parseDate(today) - parseDate(data.latest_day.date)) / 86400000);
  $("data-freshness").textContent = `数据截至 ${data.latest_day.date} ${data.latest_day.cutoff_time || ""}${age > 1 ? ` · 已滞后 ${age} 天` : ""}`;
  $("data-freshness").classList.toggle("stale", age > 1);
  $("dashboard-date-latest").disabled = STATE.dayDate === data.latest_day.date;
  const dates = availableDayDates();
  const prevBtn = $("dashboard-date-prev");
  const nextBtn = $("dashboard-date-next");
  if (prevBtn) prevBtn.disabled = !dates.length || STATE.dayDate === dates[0];
  if (nextBtn) nextBtn.disabled = !dates.length || STATE.dayDate === dates[dates.length - 1];
  $("clear-scope").disabled = STATE.selectedProvince === "全部" && !STATE.selectedPlaza && !STATE.search;
  $("sidebar-foot").textContent = `更新于 ${data.generated_at}\n净销售 = 实付 − 退款`;
  publishLookback();
}

function renderOverview() {
  const today = todayForScope();
  const seven = scopeSevenDay();
  const month = scopeMonth();
  const s = scope();
  const riskCount = s.type === "plaza" ? alertsInScope().length : riskPlazas().length;
  const monthMemberLabel = month.member_active_count_basis === "daily_sum" ? "月累计活跃人次" : "当月去重会员";
  const periodPartial = periodPartialLabel();
  let dayNet = Number(today.net_sales || 0);
  let sevenNet = Number(seven.net_sales || 0);
  let monthNet = Number(month.net_sales || 0);
  let dayCapsuleHint = "";
  let sevenCapsuleHint = "";
  let monthCapsuleHint = "";
  if (s.type === "all") {
    const dayOverlay = nationalCapsuleDayNet(STATE.dayDate, today.net_sales);
    dayNet = dayOverlay.net_sales;
    if (dayOverlay.capsuleIncluded) {
      const leyoyo = Number(dayOverlay.dns?.capsule_yuan || 0);
      const leyoyoTxt = new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(leyoyo);
      dayCapsuleHint = `｜含乐摇摇 ¥${leyoyoTxt}`;
    }
    sevenCapsuleHint = "<br>周/月暂不含扭蛋；最新日净销售含扭蛋（可用时）";
    monthCapsuleHint = sevenCapsuleHint;
    if (!dayOverlay.capsuleIncluded && STATE.dayDate === STATE.data.latest_day.date) dayCapsuleHint = "｜扭蛋未计入";
    if (!dayOverlay.capsuleIncluded && STATE.dayDate !== STATE.data.latest_day.date) {
      const ruleDate = STATE.data?.daily_net_sales?.date;
      dayCapsuleHint = ruleDate ? `｜不含乐摇摇（仅 ${ruleDate} 且已计入时叠加）` : "｜不含乐摇摇";
    }
    if (dayOverlay.capsuleIncluded) {
      const leyoyo = Number(dayOverlay.dns?.capsule_yuan || 0);
      const leyoyoTxt = new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(leyoyo);
      sevenCapsuleHint = `<br>周/月暂不含扭蛋；最新日含乐摇摇 ¥${leyoyoTxt}`;
      monthCapsuleHint = sevenCapsuleHint;
      dayCapsuleHint += `｜悦行截止 ${escapeHtml(STATE.data.latest_day?.cutoff_time || "未知")}`;
    }
    const sevenOverlay = nationalPeriodNetWithCapsule(STATE.data.rolling_7d, seven.net_sales);
    sevenNet = sevenOverlay.net_sales;
    if (sevenOverlay.capsuleIncluded) sevenCapsuleHint = "<br>含乐摇摇扭蛋";
    const monthOverlay = nationalPeriodNetWithCapsule(STATE.data.mtd, month.net_sales);
    monthNet = monthOverlay.net_sales;
    if (monthOverlay.capsuleIncluded) monthCapsuleHint = "<br>含乐摇摇扭蛋";
    if (STATE.dayDate !== STATE.data.latest_day.date) {
      const anchor = `<br><span class="lookback-anchor">仍按最新日 ${escapeHtml(STATE.data.latest_day.date)} 汇总，不是所选日所在周/月</span>`;
      sevenCapsuleHint += anchor;
      monthCapsuleHint += anchor;
    }
  }
  $("overview").innerHTML = [
    metricCard({
      label: STATE.dayDate === STATE.data.latest_day.date ? "最新日净销售" : "单日净销售",
      value: compactCurrency(dayNet),
      hint: `${selectedDayLabel()}｜${number(today.order_count || 0)} 单${dayCapsuleHint}`,
      icon: "yuan",
      variant: "primary",
      insight: "today",
    }),
    metricCard({
      label: "本周净销售",
      value: compactCurrency(sevenNet),
      hint: `${periodRangeLabel(STATE.data.rolling_7d)}<br><span class="${trendClass(seven.change_pct)}">${seven.basis || "同类日校准"} ${percent(seven.change_pct)}</span>${sevenCapsuleHint}`,
      icon: "trend",
      variant: "teal",
      trend: seven.change_pct,
      insight: "rolling7d",
    }),
    metricCard({
      label: "当月净销售",
      value: compactCurrency(monthNet),
      hint: `${periodRangeLabel(STATE.data.mtd)}<br><span class="${trendClass(month.change_pct)}">${month.basis || "同类日校准"} ${percent(month.change_pct)}</span>${monthCapsuleHint}`,
      icon: "calendar",
      variant: "blue",
      trend: month.change_pct,
      insight: "mtd",
    }),
    metricCard({
      label: "当日交易会员",
      value: number(today.member_active_count || 0),
      hint: `当日去重人数<br>${monthMemberLabel} ${number(month.member_active_count || 0)}`,
      icon: "users",
      variant: "teal",
      insight: "members",
    }),
    metricCard({
      label: s.type === "plaza" ? "相关关注" : "需关注广场数",
      value: `${number(riskCount)} ${s.type === "plaza" ? "项" : "个"}`,
      hint: s.type === "all" ? `全国需关注广场｜重点信号 ${number(STATE.data.executive_summary.high_alert_count)} 项` : `${scopeLabel()} 当前筛选结果`,
      icon: "alert",
      variant: "warn",
      insight: "attention",
    }),
  ].join("");
}
function renderScopeStrip() {
  const data = STATE.data;
  const historical = STATE.dayDate !== data.latest_day.date;
  const partial = data.latest_day.is_partial;
  $("scope-strip").innerHTML = `
    <div class="scope-context"><strong>${escapeHtml(scopeLabel())}</strong><span>单日 ${escapeHtml(STATE.dayDate)}</span><span>周/月截至 ${escapeHtml(data.analysis_range.end)}</span>${partial ? `<span class="partial-label">${escapeHtml(data.latest_day.date)} 为部分日</span>` : ""}</div>
    ${historical ? `<p class="date-notice">正在回看 ${escapeHtml(STATE.dayDate)}。单日净销售跟所选日；本周、当月仍按最新日 ${escapeHtml(data.latest_day.date)} 计算，不是所选日所在的周或月。</p>` : ''}
    ${STATE.search ? `<p class="search-feedback" role="status">“${escapeHtml(STATE.search)}”匹配 ${plazasInScope().length} 个广场 <button class="inline-button" type="button" data-show-results>查看结果</button> <button class="inline-button" type="button" data-clear-search>清除搜索</button></p>` : ''}`;
}

function normalizeInsight(type) {
  return INSIGHT_TYPES[type] ? type : "";
}
function insightFromHash() {
  const match = String(window.location.hash || "").match(/^#insight=([a-z0-9]+)/i);
  return normalizeInsight(match?.[1] || "");
}
function openInsight(type, trigger = null) {
  const next = normalizeInsight(type);
  if (!next) return;
  if (trigger) lastInsightTrigger = trigger;
  STATE.selectedInsight = next;
  if (window.location.hash !== `#insight=${next}`) {
    window.history.pushState({ insight: next }, "", `#insight=${next}`);
  }
  renderOverview();
  renderInsightPanel();
  $("insight-panel").querySelector("button")?.focus({preventScroll:true});
}
function closeInsight({ updateHash = true } = {}) {
  const focusInsight = lastInsightTrigger?.dataset?.insight || "";
  STATE.selectedInsight = "";
  if (updateHash && insightFromHash()) {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }
  renderOverview();
  renderInsightPanel();
  const focusTarget = focusInsight ? document.querySelector(`[data-insight="${focusInsight}"]`) : null;
  if (focusTarget) {
    focusTarget.focus({ preventScroll: true });
  }
}
function syncInsightFromLocation() {
  STATE.selectedInsight = insightFromHash();
  renderOverview();
  renderInsightPanel();
}
function averageTicketFromTotals(totals) {
  if (totals?.avg_ticket !== undefined && totals.avg_ticket !== null) return Number(totals.avg_ticket || 0);
  const denominator = Number(totals?.completed_order_count || totals?.order_count || 0);
  return denominator ? Number(totals?.net_sales || 0) / denominator : 0;
}
function scopedDayRows(detail) {
  const s = scope();
  if (!detail) return { rows: [], kind: "plaza" };
  if (s.type === "all") return { rows: detail.province_table || [], kind: "province" };
  if (s.type === "province") return { rows: (detail.plaza_table || []).filter((row) => row.province === s.name), kind: "plaza" };
  return { rows: (detail.plaza_table || []).filter((row) => row.name === s.name), kind: "plaza" };
}
function scopedPeriodRows() {
  const s = scope();
  if (s.type === "all") return { rows: STATE.data.province_table || [], kind: "province" };
  if (s.type === "province") return { rows: (STATE.data.plaza_table || []).filter((row) => row.province === s.name), kind: "plaza" };
  return { rows: s.row ? [s.row] : [], kind: "plaza" };
}
function rowClickAttrs(row, kind) {
  if (kind === "province") return `data-insight-province="${escapeHtml(row.name)}"`;
  if (kind === "plaza") return `data-insight-plaza="${escapeHtml(row.name)}"`;
  return "";
}
function makeBarRows(rows, { kind = "", valueKey = "net_sales", limit = 5, sort = "desc", valueFormatter = currency, metaFormatter = null, tone = "", signed = false } = {}) {
  const prepared = (rows || [])
    .map((row) => ({ row, raw: Number(row?.[valueKey] || 0) }))
    .filter((item) => Number.isFinite(item.raw));
  prepared.sort((a, b) => sort === "asc" ? a.raw - b.raw : b.raw - a.raw);
  const selected = prepared.slice(0, limit);
  const maxAbs = Math.max(...selected.map((item) => Math.abs(item.raw)), 0);
  return selected.map(({ row, raw }) => ({
    name: row.name || row.date || "未命名",
    meta: metaFormatter ? metaFormatter(row, raw) : (row.province || ""),
    value: signed ? signedCurrency(raw) : valueFormatter(raw),
    width: maxAbs ? Math.max(6, Math.round(Math.abs(raw) / maxAbs * 100)) : 0,
    tone,
    attrs: rowClickAttrs(row, kind),
  }));
}
function makeSeriesBars(points, valueKey = "net_sales", limit = 8) {
  const rows = (points || []).slice(-limit).map((point) => ({ ...point, name: point.date?.slice(5) || point.date || "" }));
  return makeBarRows(rows, {
    valueKey,
    limit,
    sort: "desc",
    tone: "teal",
    valueFormatter: ["order_count", "member_active_count"].includes(valueKey) ? number : compactCurrency,
    metaFormatter: (row) => `${number(row.order_count || 0)} 单｜会员 ${number(row.member_active_count || 0)}`,
  }).sort((a, b) => String(a.name).localeCompare(String(b.name)));
}
function parseDate(dateString) {
  const [year, month, day] = String(dateString || "").split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}
function isoDate(date) {
  return date ? date.toISOString().slice(0, 10) : "";
}
function addUtcDays(dateString, delta) {
  const date = parseDate(dateString);
  if (!date) return "";
  date.setUTCDate(date.getUTCDate() + delta);
  return isoDate(date);
}
function weekStart(dateString) {
  const date = parseDate(dateString);
  if (!date) return "";
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return isoDate(date);
}
function analysisCutoffDate() {
  return STATE.data.analysis_range?.end || STATE.data.latest_day?.date || STATE.data.data_range?.end || "";
}
function aggregatePeriod(points, getKey, makeSeed) {
  const grouped = new Map();
  (points || []).forEach((point) => {
    if (!point?.date) return;
    const key = getKey(point);
    if (!key) return;
    const row = grouped.get(key) || makeSeed(point, key);
    row.net_sales += Number(point.net_sales || 0);
    row.paid_sales += Number(point.paid_sales || 0);
    row.refund_amount += Number(point.refund_amount || 0);
    row.order_count += Number(point.order_count || 0);
    row.completed_order_count += Number(point.completed_order_count || 0);
    row.member_active_count += Number(point.member_active_count || 0);
    if (point.member_balance_yuan != null && point.member_balance_yuan !== "") {
      row.member_balance_yuan = Number(point.member_balance_yuan);
      row._balance_date = point.date;
    }
    if (point.new_customer_count != null) row.new_customer_count = Number(row.new_customer_count || 0) + Number(point.new_customer_count || 0);
    if (point.returning_customer_count != null) row.returning_customer_count = Number(row.returning_customer_count || 0) + Number(point.returning_customer_count || 0);
    grouped.set(key, row);
  });
  return [...grouped.values()]
    .sort((a, b) => String(a.key).localeCompare(String(b.key)))
    .map((row, index, rows) => {
      const denominator = Number(row.completed_order_count || row.order_count || 0);
      const previous = rows[index - 1];
      const traderDen = Number(row.new_customer_count || 0) + Number(row.returning_customer_count || 0);
      return {
        ...row,
        refund_rate: Number(row.paid_sales || 0) ? Number(row.refund_amount || 0) / Number(row.paid_sales || 0) : null,
        new_customer_share: traderDen ? Number(row.new_customer_count || 0) / traderDen : null,
        avg_ticket: denominator ? row.net_sales / denominator : 0,
        change_pct: previous?.net_sales ? (row.net_sales - previous.net_sales) / previous.net_sales : null,
        change_amount: previous ? row.net_sales - previous.net_sales : null,
      };
    });
}
function aggregateByWeek(points) {
  return aggregatePeriod(
    points,
    (point) => weekStart(point.date),
    (point, key) => ({ key, start: key, end: addUtcDays(key, 6), name: `${key.slice(5)}-${addUtcDays(key, 6).slice(5)}`, net_sales: 0, paid_sales: 0, refund_amount: 0, order_count: 0, completed_order_count: 0, member_active_count: 0, member_balance_yuan: null, new_customer_count: 0, returning_customer_count: 0 })
  );
}
function aggregateByMonth(points) {
  return aggregatePeriod(
    points,
    (point) => point.date.slice(0, 7),
    (point, key) => ({ key, month: key, name: key, net_sales: 0, paid_sales: 0, refund_amount: 0, order_count: 0, completed_order_count: 0, member_active_count: 0, member_balance_yuan: null, new_customer_count: 0, returning_customer_count: 0 })
  );
}
function makePeriodBars(periodRows, periodType) {
  const rows = (periodRows || []).slice(-12);
  const maxAbs = Math.max(...rows.map((row) => Math.abs(Number(row.net_sales || 0))), 0);
  const changeLabel = periodType === "week" ? "较上周" : "较上月";
  return rows.map((row) => ({
    name: row.name || row.month || row.start || "周期",
    value: compactCurrency(row.net_sales),
    width: maxAbs ? Math.max(6, Math.round(Math.abs(Number(row.net_sales || 0)) / maxAbs * 100)) : 0,
    tone: "teal",
    meta: `${number(row.order_count || 0)} 单｜会员 ${number(row.member_active_count || 0)}｜客单价 ${currency(row.avg_ticket)}｜${changeLabel} ${row.change_pct === null ? "—" : percent(row.change_pct)}`,
  }));
}
function renderInsightBars(rows, emptyText) {
  if (!rows?.length) return `<div class="insight-empty">${escapeHtml(emptyText)}</div>`;
  return `<div class="insight-bars">${rows.map((row) => `
    <div class="insight-bar ${row.attrs ? "clickable" : ""}" ${row.attrs || ""}>
      <div class="insight-bar-line">
        <strong>${escapeHtml(row.name)}</strong>
        <span>${escapeHtml(row.value)}</span>
      </div>
      <div class="insight-bar-track"><div class="insight-bar-fill ${row.tone || ""}" style="--bar-width:${row.width || 0}%"></div></div>
      ${row.meta ? `<div class="insight-bar-line"><span>${escapeHtml(row.meta)}</span><span></span></div>` : ""}
    </div>
  `).join("")}</div>`;
}
function insightSectionHtml(section) {
  return `
    <section class="insight-section">
      <div class="insight-section-title"><span>${escapeHtml(section.title)}</span><span>${escapeHtml(section.hint || "")}</span></div>
      ${renderInsightBars(section.rows, section.empty || "暂无匹配数据")}
    </section>
  `;
}
function periodPoints(start, end) {
  return dailyPointsForScope().filter((point) => (!start || point.date >= start) && (!end || point.date <= end));
}
function selectedInsightPeriodLabel(type) {
  if (type === "rolling7d") return `${STATE.data.rolling_7d.start} 至 ${STATE.data.rolling_7d.end}`;
  if (type === "mtd") return `${STATE.data.mtd.start} 至 ${STATE.data.mtd.end}`;
  return selectedDayLabel();
}
function buildTodayInsight() {
  const detail = selectedDayDetail();
  const totals = scopedDayTotals(detail);
  const rows = scopedDayRows(detail);
  const isLatest = STATE.dayDate === STATE.data.latest_day?.date;
  const partial = isLatest && STATE.data.latest_day?.is_partial;
  const national = scope().type === "all";
  const overlay = national ? nationalCapsuleDayNet(STATE.dayDate, totals.net_sales) : { net_sales: Number(totals.net_sales || 0), capsuleIncluded: false, dns: null };
  const shownNet = national ? overlay.net_sales : Number(totals.net_sales || 0);
  const ruleDate = STATE.data?.daily_net_sales?.date || "";
  const capsuleSentence = !national
    ? ""
    : overlay.capsuleIncluded
      ? `其中含乐摇摇，叠加规则与最新日相同（仅 ${ruleDate} 且已计入）。下方拆分仍是悦行广场明细，不含扭蛋。`
      : `未叠加乐摇摇。规则与最新日相同：仅 ${ruleDate || "扭蛋日"} 且已计入时才加入，历史日不会带上今日扭蛋。`;
  const topRows = makeBarRows(rows.rows, {
    kind: rows.kind,
    valueKey: "net_sales",
    limit: 6,
    valueFormatter: compactCurrency,
    metaFormatter: (row) => `${row.province || "全国"}｜${number(row.order_count || 0)} 单｜会员 ${number(row.member_active_count || 0)}`,
  });
  const refundRate = Number(totals.paid_sales || 0) ? Number(totals.refund_amount || 0) / Number(totals.paid_sales || 0) : 0;
  const actions = [
    partial ? `当前是日内数据，截止 ${STATE.data.latest_day.cutoff_time}，不要直接按全天判断。` : `当前日期为完整单日，可用于复盘当天表现。`,
    topRows[0] ? `先看贡献最高的 ${topRows[0].name}，确认客流、活动和转化是否匹配当天日历属性。` : "当前筛选范围没有可拆解的省份或广场明细。",
    refundRate > 0.05 ? `退款占实付约 ${percent(refundRate)}，建议优先核对异常退款和关闭订单。` : "退款占比未见明显异常，复盘重点可放在订单量和客单价。",
  ];
  return {
    title: STATE.dayDate === STATE.data.latest_day?.date ? "最新日净销售详情" : "单日净销售详情",
    kicker: `${scopeLabel()}｜${selectedDayLabel()}`,
    summary: `${scopeLabel()} ${selectedDayLabel()} 净销售 ${compactCurrency(shownNet)}，订单 ${number(totals.order_count || 0)} 单，会员日活 ${number(totals.member_active_count || 0)}。${capsuleSentence}`,
    stats: [
      { label: "净销售", value: compactCurrency(shownNet), hint: national && overlay.capsuleIncluded ? "悦行净销售 + 当日乐摇摇" : "实付 - 退款" },
      { label: "实付金额", value: compactCurrency(totals.paid_sales), hint: `退款 ${currency(totals.refund_amount)}` },
      { label: "订单数", value: number(totals.order_count || 0), hint: `完成 ${number(totals.completed_order_count || 0)} 单` },
      { label: "客单价", value: currency(averageTicketFromTotals(totals)), hint: "按完成订单计算" },
      { label: "会员日活", value: number(totals.member_active_count || 0), hint: "交易会员去重" },
    ],
    sections: [
      { title: rows.kind === "province" ? "省份贡献" : "广场贡献", hint: "按单日净销售排序", rows: topRows, empty: "当前筛选范围暂无单日贡献明细" },
      { title: "近日日趋势", hint: "当前范围最近 8 天", rows: makeSeriesBars(dailyPointsForScope(), "net_sales", 8), empty: "暂无趋势数据" },
    ],
    actions,
  };
}
function buildRollingInsight() {
  const seven = scopeSevenDay();
  const scopedRows = scopedPeriodRows();
  const pressure = makeBarRows(scopedRows.rows, {
    kind: scopedRows.kind,
    valueKey: "decision_7d_amount",
    limit: 5,
    sort: "asc",
    signed: true,
    tone: "danger",
    metaFormatter: (row) => `${row.province || "全国"}｜本周 ${compactCurrency(row.current_7d_net_sales)}｜${decisionBasisLabel(row, "7d")}`,
  });
  const growth = makeBarRows(scopedRows.rows, {
    kind: scopedRows.kind,
    valueKey: "decision_7d_amount",
    limit: 5,
    sort: "desc",
    signed: true,
    tone: "teal",
    metaFormatter: (row) => `${row.province || "全国"}｜本周 ${compactCurrency(row.current_7d_net_sales)}｜${decisionBasisLabel(row, "7d")}`,
  });
  const weekRows = aggregateByWeek(dailyPointsForScope({ allAvailable: true, cutoffDate: analysisCutoffDate() }));
  const actions = [];
  const periodPartial = periodPartialLabel();
  if (periodPartial) actions.push(`本周销售已同步包含今日部分日，${periodPartial}，和完整历史周对比时先看趋势再定性。`);
  if (Number(seven.change_pct || 0) < 0 && pressure[0]) actions.push(`优先复盘 ${pressure[0].name}，它是当前范围本周最明显的缺口对象。`);
  if (Number(seven.change_pct || 0) >= 0 && growth[0]) actions.push(`复用 ${growth[0].name} 的增长打法，先找同省或相似体量广场扩散。`);
  actions.push("本周默认使用同类日校准，周末和节假日不直接与普通平日混比。");
  return {
    title: "本周销售详情",
    kicker: `${scopeLabel()}｜${selectedInsightPeriodLabel("rolling7d")}`,
    summary: `${scopeLabel()} 本周净销售 ${compactCurrency(seven.net_sales)}，${seven.basis || "同类日校准"}后为 ${percent(seven.change_pct)}，变化额 ${signedCurrency(seven.change_amount)}。`,
    stats: [
      { label: "本周销售", value: compactCurrency(seven.net_sales), hint: selectedInsightPeriodLabel("rolling7d") },
      { label: "校准变化", value: percent(seven.change_pct), hint: seven.basis || "同类日校准", tone: seven.change_pct },
      { label: "变化金额", value: signedCurrency(seven.change_amount), hint: `原始周期 ${percent(seven.raw_change_pct)}`, tone: seven.change_amount },
      { label: "订单数", value: number(seven.order_count || 0), hint: `会员 ${number(seven.member_active_count || 0)}` },
    ],
    sections: [
      { title: "周度统计", hint: "最近最多 12 个自然周", rows: makePeriodBars(weekRows, "week"), empty: "暂无周度统计数据" },
      { title: "增长贡献", hint: "校准后变化额", rows: growth.filter((row) => !row.value.startsWith("-")), empty: "暂无明显增长对象" },
      { title: "承压对象", hint: "校准后变化额", rows: pressure.filter((row) => row.value.startsWith("-")), empty: "暂无明显承压对象" },
    ],
    actions,
  };
}
function buildMtdInsight() {
  const month = scopeMonth();
  const scopedRows = scopedPeriodRows();
  const top = makeBarRows(scopedRows.rows, {
    kind: scopedRows.kind,
    valueKey: "mtd_net_sales",
    limit: 6,
    valueFormatter: compactCurrency,
    metaFormatter: (row) => `${row.province || "全国"}｜月校准 ${percent(decisionPct(row, "mtd"))}`,
  });
  const pressure = makeBarRows(scopedRows.rows, {
    kind: scopedRows.kind,
    valueKey: "decision_mtd_amount",
    limit: 5,
    sort: "asc",
    signed: true,
    tone: "danger",
    metaFormatter: (row) => `${row.province || "全国"}｜当月 ${compactCurrency(row.mtd_net_sales)}｜${decisionBasisLabel(row, "mtd")}`,
  }).filter((row) => row.value.startsWith("-"));
  const monthRows = aggregateByMonth(dailyPointsForScope({ allAvailable: true, cutoffDate: analysisCutoffDate() }));
  const actions = [
    periodPartialLabel() ? `当月销售已同步包含今日部分日，${periodPartialLabel()}，月底复盘前不要把当前日内进度当成全天。` : "",
    pressure[0] ? `当月缺口优先看 ${pressure[0].name}，用月累计目标倒推剩余天数修复节奏。` : "当月暂无明显负向拖累对象，重点保持增长广场的动作复用。",
    "当月卡片不受顶部历史日期切换影响，始终展示最新 MTD 分析周期。",
  ].filter(Boolean);
  return {
    title: "当月销售详情",
    kicker: `${scopeLabel()}｜${selectedInsightPeriodLabel("mtd")}`,
    summary: `${scopeLabel()} 当月累计净销售 ${compactCurrency(month.net_sales)}，${month.basis || "同类日校准"}后为 ${percent(month.change_pct)}，变化额 ${signedCurrency(month.change_amount)}。`,
    stats: [
      { label: "当月销售", value: compactCurrency(month.net_sales), hint: selectedInsightPeriodLabel("mtd") },
      { label: "校准变化", value: percent(month.change_pct), hint: month.basis || "同类日校准", tone: month.change_pct },
      { label: "变化金额", value: signedCurrency(month.change_amount), hint: `原始周期 ${percent(month.raw_change_pct)}`, tone: month.change_amount },
      { label: "月活/日活累计", value: number(month.member_active_count || 0), hint: `订单 ${number(month.order_count || 0)}` },
    ],
    sections: [
      { title: "月度统计", hint: "最近最多 12 个月｜当前月截至趋势截止日", rows: makePeriodBars(monthRows, "month"), empty: "暂无月度统计数据" },
      { title: scopedRows.kind === "province" ? "省份贡献" : "广场贡献", hint: "按当月净销售排序", rows: top, empty: "暂无当月贡献明细" },
      { title: "当月拖累", hint: "校准后缺口", rows: pressure, empty: "暂无明显当月拖累对象" },
    ],
    actions,
  };
}
function buildMembersInsight() {
  const detail = selectedDayDetail();
  const totals = scopedDayTotals(detail);
  const month = scopeMonth();
  const dayRows = scopedDayRows(detail);
  const periodRows = scopedPeriodRows();
  const topDayMembers = makeBarRows(dayRows.rows, {
    kind: dayRows.kind,
    valueKey: "member_active_count",
    limit: 6,
    valueFormatter: number,
    tone: "teal",
    metaFormatter: (row) => `${row.province || "全国"}｜净销售 ${compactCurrency(row.net_sales)}｜${number(row.order_count || 0)} 单`,
  });
  const topMonthMembers = makeBarRows(periodRows.rows, {
    kind: periodRows.kind,
    valueKey: "mtd_member_active_count",
    limit: 6,
    valueFormatter: number,
    tone: "teal",
    metaFormatter: (row) => `${row.province || "全国"}｜当月 ${compactCurrency(row.mtd_net_sales)}｜订单 ${number(row.current_mtd_order_count || 0)}`,
  });
  return {
    title: "会员活跃详情",
    kicker: `${scopeLabel()}｜${selectedDayLabel()}`,
    summary: `${scopeLabel()} ${selectedDayLabel()} 交易会员 ${number(totals.member_active_count || 0)}，当月交易会员口径累计 ${number(month.member_active_count || 0)}。`,
    stats: [
      { label: "当日交易会员", value: number(totals.member_active_count || 0), hint: "会员ID去重，手机号兜底" },
      { label: "当月会员活跃", value: number(month.member_active_count || 0), hint: month.member_active_count_basis === "daily_sum" ? "月累计日活" : "月活" },
      { label: "会员关联订单", value: number(totals.order_count || 0), hint: "当前交易订单" },
      { label: "客单价", value: currency(averageTicketFromTotals(totals)), hint: "用于观察会员日质量" },
    ],
    sections: [
      { title: dayRows.kind === "province" ? "当日会员省份" : "当日会员广场", hint: "按交易会员数排序", rows: topDayMembers, empty: "暂无当日会员明细" },
      { title: periodRows.kind === "province" ? "当月会员省份" : "当月会员广场", hint: "按当月会员活跃排序", rows: topMonthMembers, empty: "暂无当月会员明细" },
    ],
    actions: [
      "当前会员活跃是交易会员活跃，不是小程序访问 DAU。",
      topDayMembers[0] ? `先看 ${topDayMembers[0].name} 的会员活跃与客单价是否同步提升。` : "当前范围暂无可拆解会员对象。",
      "如果要看会员销售贡献，需要后续在明细里增加会员/非会员销售分拆字段。",
    ],
  };
}
function buildAttentionInsight() {
  const s = scope();
  const alerts = alertsInScope();
  const scopedRows = s.type === "plaza" ? { rows: s.row ? [s.row] : [], kind: "plaza" } : scopedPeriodRows();
  const pressure = makeBarRows(scopedRows.rows, {
    kind: scopedRows.kind,
    valueKey: "decision_7d_amount",
    limit: 8,
    sort: "asc",
    signed: true,
    tone: "danger",
    metaFormatter: (row) => `${row.province || "全国"}｜本周 ${compactCurrency(row.current_7d_net_sales)}｜${decisionBasisLabel(row, "7d")}`,
  }).filter((row) => row.value.startsWith("-"));
  const alertRows = (alerts || []).slice(0, 6).map((alert) => ({
    name: alert.name || alert.category || "关注信号",
    meta: `${alert.level || "关注"}｜${alert.category || ""}｜${alert.summary || alert.detail || ""}`,
    value: alert.level || "关注",
    width: 100,
    tone: alert.level === "高" ? "danger" : "",
    attrs: alert.name ? `data-insight-plaza="${escapeHtml(alert.name)}"` : "",
  }));
  const gap = pressure.reduce((sum, row) => {
    const raw = Number(String(row.value).replace(/[^\d.-]/g, "")) || 0;
    return sum + raw;
  }, 0);
  return {
    title: s.type === "plaza" ? "相关关注详情" : "需关注广场详情",
    kicker: `${scopeLabel()}｜${STATE.data.rolling_7d.start} 至 ${STATE.data.rolling_7d.end}`,
    summary: `${scopeLabel()} 当前有 ${number(alerts.length || pressure.length)} 条关注信号，优先处理同类日校准后仍承压的广场。`,
    stats: [
      { label: "关注信号", value: `${number(alerts.length || pressure.length)} 项`, hint: "异常与承压对象合并观察" },
      { label: "重点信号", value: number(alerts.filter((item) => item.level === "高").length), hint: "高等级异常" },
      { label: "承压对象", value: number(pressure.length), hint: "本周校准后缺口" },
      { label: "缺口合计", value: signedCurrency(gap), hint: "按列表展示项估算", tone: gap },
    ],
    sections: [
      { title: "信号列表", hint: "点击广场下钻", rows: alertRows, empty: "当前范围暂无异常信号" },
      { title: "优先跟进", hint: "校准后缺口", rows: pressure, empty: "当前范围暂无明显承压广场" },
    ],
    actions: [
      pressure[0] ? `先复盘 ${pressure[0].name}，核对客流、活动场次、成交转化和退款。` : "当前暂无明显承压对象，继续观察即可。",
      "关注信号只做运营优先级，不等同于最终责任判定。",
      "处理完重点对象后，再到区域目标与考核核对进度缺口。",
    ],
    jump: { label: "去区域目标与考核", target: "#regional-assessment" },
  };
}
function buildInsightDetail(type) {
  if (type === "today") return buildTodayInsight();
  if (type === "rolling7d") return buildRollingInsight();
  if (type === "mtd") return buildMtdInsight();
  if (type === "members") return buildMembersInsight();
  if (type === "attention") return buildAttentionInsight();
  return null;
}
function renderInsightPanel() {
  const drawer = $("insight-drawer");
  const backdrop = $("insight-backdrop");
  const panel = $("insight-panel");
  const type = normalizeInsight(STATE.selectedInsight);
  const detail = type ? buildInsightDetail(type) : null;
  if (!detail) {
    drawer.hidden = true;
    backdrop.hidden = true;
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("insight-open");
    $("app").inert = false;
    panel.innerHTML = "";
    return;
  }
  drawer.hidden = false;
  backdrop.hidden = false;
  drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("insight-open");
  $("app").inert = true;
  panel.innerHTML = `
    <div class="insight-head">
      <div class="insight-title">
        <h2>${escapeHtml(detail.title || INSIGHT_TYPES[type])}</h2>
        <span class="insight-meta">${escapeHtml(detail.kicker || scopeLabel())}</span>
      </div>
      <button class="insight-close" type="button" data-insight-close aria-label="关闭指标详情">×</button>
    </div>
    <div class="insight-summary">${escapeHtml(detail.summary || "")}</div>
    <div class="insight-stat-grid">
      ${(detail.stats || []).map((stat) => `
        <div class="insight-stat">
          <span>${escapeHtml(stat.label)}</span>
          <strong class="${stat.tone === undefined ? "" : trendClass(stat.tone)}">${escapeHtml(stat.value)}</strong>
          ${stat.hint ? `<small>${escapeHtml(stat.hint).replace(/(\d{4}-\d{2}-\d{2})/g, '<span class="date-token">$1</span>')}</small>` : ""}
        </div>
      `).join("")}
    </div>
    ${(detail.sections || []).map(insightSectionHtml).join("")}
    <section class="insight-section">
      <div class="insight-section-title"><span>下一步动作</span><span>${escapeHtml(scopeLabel())}</span></div>
      <ul class="insight-actions">
        ${(detail.actions || ["继续观察。"]).map((action) => `<li>${escapeHtml(action)}</li>`).join("")}
      </ul>
      ${detail.jump ? `<button class="text-button insight-jump" type="button" data-insight-scroll="${escapeHtml(detail.jump.target)}">${escapeHtml(detail.jump.label)}</button>` : ""}
    </section>
  `;
}

function disposeAiCharts() {
  aiWaterfallChart?.dispose();
  aiRegionChart?.dispose();
  aiScatterChart?.dispose();
  aiWaterfallChart = null;
  aiRegionChart = null;
  aiScatterChart = null;
}
function waterfallRows(pack) {
  const bridge = pack.net_sales_bridge || {};
  const components = bridge.components || {};
  const baseline = Number(bridge.baseline_net_sales || 0);
  const current = Number(bridge.current_net_sales || 0);
  const rows = [{ name: "同类日基准", helper: 0, value: baseline, raw: baseline, type: "anchor" }];
  let running = baseline;
  [
    ["order_volume_effect", "订单量"],
    ["paid_ticket_effect", "客单价"],
    ["refund_effect", "退款"],
    ["residual", "其他"],
  ].forEach(([key, label]) => {
    const delta = Number(components[key] || 0);
    rows.push({
      name: label,
      helper: delta >= 0 ? running : running + delta,
      value: Math.abs(delta),
      raw: delta,
      type: delta >= 0 ? "up" : "down",
    });
    running += delta;
  });
  rows.push({ name: "最新日净销售", helper: 0, value: current || running, raw: current || running, type: "anchor" });
  return rows;
}
function signedTone(value) {
  const n = Number(value || 0);
  if (n > 0) return "#1c775b";
  if (n < 0) return "#b44347";
  return "#7b8494";
}
function renderAiCharts() {
  const pack = STATE.data.diagnostic_pack || {};
  const waterfallEl = $("ai-waterfall-chart");
  if (!waterfallEl || !window.echarts) return;
  aiWaterfallChart = echarts.init(waterfallEl);

  const waterfall = waterfallRows(pack);
  aiWaterfallChart.setOption({
    textStyle: { fontFamily: getComputedStyle(document.body).fontFamily, color: "#606d73" },
    animation: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    animationDuration: 350,
    grid: { left: 14, right: 18, top: 20, bottom: 22, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (items) => {
        const item = items.find((entry) => entry.seriesName === "贡献");
        const row = item?.data || waterfall[item?.dataIndex || 0] || {};
        const value = row.type === "anchor" ? compactCurrency(row.raw) : signedCurrency(row.raw);
        return `${escapeHtml(row.name || "")}<br>${value}`;
      },
    },
    xAxis: { type: "category", data: waterfall.map((row) => row.name), axisLabel: { color: "#606d73" }, axisLine: { lineStyle: { color: "#dfe5df" } } },
    yAxis: { type: "value", axisLabel: { color: "#606d73", formatter: (v) => compactCurrency(v) }, splitLine: { lineStyle: { color: "#edf0ec" } } },
    series: [
      { name: "辅助", type: "bar", stack: "total", data: waterfall.map((row) => row.helper), itemStyle: { color: "transparent" }, emphasis: { disabled: true }, silent: true },
      {
        name: "贡献",
        type: "bar",
        stack: "total",
        barMaxWidth: 42,
        data: waterfall,
        label: {
          show: true,
          position: "top",
          color: "#344054",
          fontSize: 11,
          formatter: (params) => params.data.type === "anchor" ? compactCurrency(params.data.raw) : signedCurrency(params.data.raw),
        },
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: (params) => params.data.type === "anchor" ? "#5b6b82" : signedTone(params.data.raw),
        },
      },
    ],
  });
}

function renderAiInsights() {
  disposeAiCharts();
  const ai = STATE.data.ai_analysis || {};
  const seven = scopeSevenDay();
  const month = scopeMonth();
  const follow = riskPlazas().filter(row => !STATE.selectedPlaza || row.name === STATE.selectedPlaza).slice(0, 3);
  const pack = STATE.data.diagnostic_pack || {};
  const bridge = pack.net_sales_bridge || {};
  const baseline = pack.baseline || {};
  const driverCards = Array.isArray(pack.driver_cards) ? pack.driver_cards.slice(0, 4) : [];
  const provinceContribution = pack.province_contribution || {};
  const plazaContribution = pack.plaza_contribution || {};
  const summary = Array.isArray(ai.summary) ? ai.summary.filter(Boolean).slice(0, 4) : [];
  const driverInsights = Array.isArray(ai.driver_insights) ? ai.driver_insights.filter(Boolean).slice(0, 5) : [];
  const actions = Array.isArray(ai.actions) ? ai.actions.filter(Boolean).slice(0, 5) : [];
  const watchItems = Array.isArray(ai.watch_items) ? ai.watch_items.filter(Boolean).slice(0, 4) : [];
  const followUps = Array.isArray(ai.follow_up_questions) ? ai.follow_up_questions.filter(Boolean).slice(0, 4) : [];
  const caveats = Array.isArray(ai.caveats) ? ai.caveats.filter(Boolean).slice(0, 3) : [];
  const calendarBasis = Array.isArray(ai.calendar_basis) ? ai.calendar_basis.filter(Boolean).slice(0, 3) : [];
  const holiday = STATE.data.holiday_context || {};
  const currentCalendar = holiday.current_7d || {};
  const previousCalendar = holiday.previous_7d || {};
  const scaledDetail = (holiday.same_type_baseline_7d?.details || []).find((item) => item.baseline_adjustment === "traffic_weight_scaled");
  const eventText = (currentCalendar.events || []).join("、") || "普通周/周末结构";
  const calendarLines = calendarBasis.length ? calendarBasis : [
    `本周包含${eventText}，峰值日 ${number(currentCalendar.peak_days || 0)} 天，已先做同类日校准。`,
    `日历客流权重 ${currentCalendar.traffic_weight_sum || "—"} vs 前一周期 ${previousCalendar.traffic_weight_sum || "—"}，差值 ${holiday.calendar_weight_delta ?? "—"}。`,
    scaledDetail ? `${scaledDetail.type || "峰值日"}缺少完全同类历史样本，已用 ${scaledDetail.weight_scale} 倍客流权重折算基准。` : "周末、节假日和亲子峰值日不直接与普通平日混比。",
  ];
  const fallbackActions = [{ title: "继续观察", detail: "跟踪同类日校准后的本周、当月和关注广场变化。", priority: "中", scope: "全国" }];
  const displayActions = actions.length ? actions : fallbackActions;
  const priorityClass = (priority) => priority === "高" ? "high" : priority === "低" ? "low" : "";
  const priorityText = (priority) => priority === "高" ? "今" : priority === "低" ? "观" : "周";
  const driverValue = (item) => item.unit === "count" ? signedNumber(item.value) : signedCurrency(item.value);
  const driverClass = (item) => item.tone === "up" ? "up" : item.tone === "down" ? "down" : "";
  const driverCompare = (item) => {
    if (item.name === "order_volume") return `完成单 ${number(item.current)} vs 基准 ${number(item.baseline)}`;
    if (item.name === "paid_ticket") return `实付客单 ${currency(item.current)} vs 基准 ${currency(item.baseline)}`;
    if (item.name === "refund") return `退款 ${currency(item.current)} vs 基准 ${currency(item.baseline)}`;
    if (item.name === "member_activity") return `会员 ${number(item.current)} vs 基准 ${number(item.baseline)}`;
    return `当前 ${number(item.current)} vs 基准 ${number(item.baseline)}`;
  };
  const evidenceLines = Array.isArray(pack.evidence_lines) ? pack.evidence_lines.filter(Boolean).slice(0, 3) : [];
  const dataQuality = Array.isArray(pack.data_quality) ? pack.data_quality.filter(Boolean).slice(0, 3) : [];
  const contribRows = (rows, emptyText) => {
    const list = Array.isArray(rows) ? rows.slice(0, 4) : [];
    if (!list.length) return `<div class="footnote">${escapeHtml(emptyText)}</div>`;
    return list.map((item) => `
      <div class="ai-contrib-row">
        <div>
          <strong>${escapeHtml(item.name || "未命名")}</strong>
          <span>${escapeHtml(item.province || "全国")}｜最新日 ${compactCurrency(item.current_net_sales)}｜基准 ${compactCurrency(item.baseline_net_sales)}</span>
        </div>
        <span class="delta ${trendClass(item.delta_net_sales)}">${signedCurrency(item.delta_net_sales)}</span>
      </div>
    `).join("");
  };
  const impactClass = (impact) => {
    const text = String(impact || "");
    if (text.includes("正") || text === "up") return "up";
    if (text.includes("负") || text === "down") return "down";
    return "brand";
  };
  const renderDriverInsight = (item) => {
    if (!item || typeof item !== "object") {
      return `<li>${escapeHtml(item)}</li>`;
    }
    const impact = item.impact || item.tone || "观察";
    const driver = item.driver || item.name || "驱动项";
    const finding = item.finding || item.summary || item.detail || "";
    const evidence = item.evidence || item.reason || "";
    const klass = impactClass(impact);
    return `
      <li class="ai-driver-insight ${klass === "down" ? "down" : klass === "up" ? "up" : ""}">
        <div class="ai-driver-insight-head">
          <strong>${escapeHtml(driver)}</strong>
          <span class="tag ${klass}">${escapeHtml(impact)}</span>
        </div>
        ${finding ? `<p>${escapeHtml(finding)}</p>` : ""}
        ${evidence ? `<small>${escapeHtml(evidence)}</small>` : ""}
      </li>
    `;
  };
  const displaySummary = summary.length ? summary : [
    `最新日净销售 ${compactCurrency(bridge.current_net_sales ?? STATE.data.latest_day?.net_sales)}，相对${baseline.basis || "同类日基准"} ${signedCurrency(bridge.delta_net_sales)}。`,
    "已按周末、节假日和亲子峰值日做同类日校准，避免把天然客流差异误判为经营异常。",
  ];
  $("ai-insights").innerHTML = `
    <div class="ai-head">
      <div class="ai-title">
        <p>${escapeHtml(scopeLabel())}本周净销售 <strong>${compactCurrency(seven.net_sales)}</strong>，${seven.basis || "同类日校准"} <span class="${trendClass(seven.change_pct)}">${percent(seven.change_pct)}</span>；当月变化 <span class="${trendClass(month.change_pct)}">${percent(month.change_pct)}</span>。</p>
      </div>
      <div class="ai-status-stack">
        <span class="tag">${escapeHtml(STATE.data.analysis_range.end)} 截止</span>
        <span class="tag">${ai.source === "llm" ? "AI 辅助分析" : "规则分析"}</span>
      </div>
    </div>
    <div class="diagnosis-actions"><span>优先跟进</span>${follow.length ? follow.map(row => `<button class="follow-button" type="button" data-plaza="${escapeHtml(row.name)}">${escapeHtml(row.name)} <span class="trend-down">${signedCurrency(decisionAmount(row, "7d"))}</span></button>`).join("") : '<span>当前范围暂无承压广场</span>'}<button class="inline-button" type="button" data-show-results>查看区域考核</button></div>
    <details class="diagnosis-details" id="diagnosis-details" ${STATE.diagnosisExpanded ? "open" : ""}><summary>诊断详情与依据 <span>截至 ${escapeHtml(STATE.data.latest_day.date)}，不随单日或区域筛选重算</span></summary><div class="diagnosis-content">
    <div class="ai-hero-metrics">
      <div class="ai-hero-metric"><span>最新日净销售</span><strong>${compactCurrency(bridge.current_net_sales ?? STATE.data.latest_day?.net_sales)}</strong></div>
      <div class="ai-hero-metric"><span>${escapeHtml(baseline.basis || "同类日基准")}</span><strong>${compactCurrency(bridge.baseline_net_sales)}</strong></div>
      <div class="ai-hero-metric"><span>相对基准差额</span><strong class="${trendClass(bridge.delta_net_sales)}">${signedCurrency(bridge.delta_net_sales)}</strong></div>
      <div class="ai-hero-metric"><span>样本与口径</span><strong>${number(baseline.sample_count ?? baseline.dates?.length ?? 0)} 天</strong></div>
    </div>
    <div class="ai-deep-grid">
      ${driverCards.map((item) => `
        <div class="ai-driver-card ${driverClass(item)}">
          <span>${escapeHtml(item.label || item.name || "驱动项")}</span>
          <strong class="${trendClass(item.value)}">${driverValue(item)}</strong>
          <small>${escapeHtml(driverCompare(item))}</small>
        </div>
      `).join("")}
    </div>
    <div class="ai-matrix">
      <div class="ai-section primary">
        <div class="ai-section-head"><span>诊断结论</span><span>${escapeHtml(ai.generated_at || STATE.data.generated_at || "")}</span></div>
        <ul class="ai-list check">
          ${displaySummary.map((text) => `<li>${escapeHtml(text)}</li>`).join("")}
        </ul>
        ${driverInsights.length ? `
          <div class="ai-section-head"><span>驱动解释</span><span>${driverInsights.length} 条</span></div>
          <ul class="ai-list">
            ${driverInsights.map(renderDriverInsight).join("")}
          </ul>
        ` : ""}
        <div class="ai-section-head"><span>口径提醒</span><span>避免误读</span></div>
        <ul class="ai-list">
          ${calendarLines.map((text) => `<li>${escapeHtml(text)}</li>`).join("")}
        </ul>
        ${evidenceLines.length ? `
          <div class="ai-section-head"><span>数据证据</span><span>${evidenceLines.length} 条</span></div>
          <ul class="ai-list">
            ${evidenceLines.map((text) => `<li>${escapeHtml(text)}</li>`).join("")}
          </ul>
        ` : ""}
      </div>
      <div class="ai-section">
        <div class="ai-section-head"><span>行动队列</span><span>${displayActions.length} 项</span></div>
        <div class="ai-list">
          ${displayActions.map((item) => `
            <div class="ai-action-row">
              <span class="priority-dot ${priorityClass(item.priority)}">${priorityText(item.priority)}</span>
              <div>
                <strong>${escapeHtml(item.title || "建议动作")}</strong>
                <p>${escapeHtml(item.detail || "结合现场客流、活动场次和转化链路复核。")}</p>
                <div class="ai-action-meta">
                  <span class="tag ${item.priority === "高" ? "down" : item.priority === "低" ? "" : "warn"}">${escapeHtml(item.priority || "中")}优先级</span>
                  <span class="badge">${escapeHtml(item.scope || "全国")}</span>
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
    <div class="ai-contribution-grid">
      <div class="ai-section compact">
        <div class="ai-section-head"><span>区域拉动</span><span>Top 4</span></div>
        ${contribRows(provinceContribution.positive, "暂无明显拉动区域")}
      </div>
      <div class="ai-section compact">
        <div class="ai-section-head"><span>区域缺口</span><span>Top 4</span></div>
        ${contribRows(provinceContribution.negative, "暂无明显缺口区域")}
      </div>
      <div class="ai-section compact">
        <div class="ai-section-head"><span>广场机会</span><span>Top 4</span></div>
        ${contribRows(plazaContribution.positive, "暂无明显机会广场")}
      </div>
      <div class="ai-section compact">
        <div class="ai-section-head"><span>广场跟进</span><span>Top 4</span></div>
        ${contribRows(plazaContribution.negative, "暂无明显跟进广场")}
      </div>
    </div>
    <div class="ai-watch-grid">
      ${(watchItems.length ? watchItems : [{ name: "暂无重点对象", reason: "当前继续观察即可。" }]).map((item) => `
        <div class="ai-watch-item">
          <strong>${escapeHtml(item.name || "关注项")}</strong>
          <span>${escapeHtml(item.reason || "")}</span>
        </div>
      `).join("")}
    </div>
    ${followUps.length ? `<div class="ai-caveat">下一步追问：${followUps.map(escapeHtml).join("；")}</div>` : ""}
    ${(caveats.length || dataQuality.length) ? `<div class="ai-caveat">${[...dataQuality, ...caveats].map(escapeHtml).join("；")}</div>` : ""}
    </div></details>
  `;
  $("diagnosis-details").addEventListener("toggle", (event) => { STATE.diagnosisExpanded = event.target.open; });
}

function renderRegionDetail() {
  const panel = $("regional-detail");
  const s = scope();
  if (s.type === "all") {
    panel.className = "panel pad detail-panel is-map-empty";
    panel.innerHTML = "";
    return;
  }

  const seven = scopeSevenDay();
  const month = scopeMonth();
  const risks = riskPlazas().slice(0, 3);
  const growth = growthPlazas().slice(0, 2);
  const top = [...risks, ...growth].slice(0, 4);
  const tone = Number(month.change_pct || seven.change_pct || 0) < 0 ? "down" : "up";
  const status = Number(month.change_pct || 0) < 0 ? "承压" : "改善";
  const line = `${scopeLabel()}｜月校准 ${percent(month.change_pct)}｜本周 ${compactCurrency(seven.net_sales)}｜当月 ${compactCurrency(month.net_sales)}`;

  panel.className = "panel pad detail-panel map-province-summary";
  panel.innerHTML = `
    <div class="detail-title">
      <div>
        <h3>${scopeLabel()}</h3>
        <p class="map-summary-line">${line}</p>
      </div>
      <span class="tag ${tone}">${status}</span>
    </div>
    ${top.length ? `<ul class="list map-top-plazas">${top.map((row) => plazaListItem(row, risks.includes(row) ? "risk" : "growth")).join("")}</ul>` : `<p class="map-summary-line">暂无重点广场</p>`}
  `;
  bindPlazaRowClicks(panel);
}
function plazaListItem(row, mode) {
  const risk = mode === "risk";
  const pct = decisionPct(row, "7d");
  return `
    <li class="row-card clickable ${STATE.selectedPlaza === row.name ? "active-row" : ""}" data-plaza="${escapeHtml(row.name)}">
      <span class="row-icon ${risk ? "risk" : ""}">${icons[risk ? "alert" : "trend"]}</span>
      <span class="row-main"><strong>${row.name}</strong><span>${row.province || "待补充"}｜本周 ${currency(row.current_7d_net_sales)}｜${decisionBasisLabel(row, "7d")}</span></span>
      <span class="row-value ${trendClass(pct)}">${percent(pct)}</span>
    </li>
  `;
}
function renderProvinceRank() {
  const metric = STATE.mapMetric;
  const rows = [...(STATE.data.province_table || [])]
    .filter((row) => row.name && row.name !== "待补充")
    .sort((a, b) => Number(a[metric] || 0) - Number(b[metric] || 0))
    .slice(0, 12);
  const formatValue = (row) => metric === "mtd_net_sales"
    ? compactCurrency(row.mtd_net_sales)
    : percent(row[metric]);
  const valueClass = (row) => metric === "mtd_net_sales" ? "" : trendClass(row[metric]);
  $("province-rank-list").innerHTML = rows.map((row) => `
    <li class="row-card clickable ${STATE.selectedProvince === row.name ? "active-row" : ""}" data-province="${escapeHtml(row.name)}">
      <span class="row-main"><strong>${row.name}</strong></span>
      <span class="row-value ${valueClass(row)}">${formatValue(row)}</span>
    </li>
  `).join("");
  $("province-rank-list").querySelectorAll("[data-province]").forEach((el) => {
    el.tabIndex = 0; el.setAttribute("role", "button"); el.setAttribute("aria-label", `查看 ${el.dataset.province} 区域`);
  });
}

function renderPlazaWork() {
  const filtered = plazasInScope();
  const names = new Set(filtered.map(row => row.name));
  const risks = riskPlazas().filter(row => names.has(row.name));
  const growth = growthPlazas().filter(row => names.has(row.name));
  const taskOptions = { risk: `需跟进 ${risks.length}`, growth: `可复制 ${growth.length}`, all: `全部 ${filtered.length}` };
  if (!taskOptions[STATE.plazaTask]) STATE.plazaTask = "risk";
  renderSwitches("plaza-task-switches", taskOptions, STATE.plazaTask, "plazaTask");
  const taskRows = sortPlazas(STATE.plazaTask === "risk" ? risks : STATE.plazaTask === "growth" ? growth : filtered);
  const taskTitle = STATE.plazaTask === "risk" ? "需跟进广场" : STATE.plazaTask === "growth" ? "可复制广场" : "全部广场";
  const taskHint = STATE.plazaTask === "risk"
    ? "按同类日校准后的缺口排序，优先用于今日跟进。"
    : STATE.plazaTask === "growth"
      ? "保留校准后仍增长的广场，用于复用活动和转化打法。"
      : "完整广场列表用于检索和下钻，不作为默认任务队列。";
  $("plaza-summary").textContent = `${scopeLabel()}｜${taskTitle}`;
  $("plaza-task-title").textContent = taskTitle;
  $("plaza-table-title").textContent = `${taskRows.length} 个对象｜点击广场下钻`;
  $("plaza-task-summary").innerHTML = `
    <h4>${scopeLabel()} 广场处理队列</h4>
    <p>${taskHint}</p>
    <div class="task-counts">
      <span>需跟进<strong>${number(risks.length)}</strong></span>
      <span>可复制<strong>${number(growth.length)}</strong></span>
      <span>匹配广场<strong>${number(filtered.length)}</strong></span>
    </div>
    <p>${STATE.search ? `当前已按“${escapeHtml(STATE.search)}”过滤。` : "可以在顶部搜索广场或省份，任务队列会同步缩小。"}</p>
  `;
  const pageSize = 20;
  const pages = Math.max(1, Math.ceil(taskRows.length / pageSize));
  STATE.plazaPage = Math.min(Math.max(1, STATE.plazaPage), pages);
  const start = (STATE.plazaPage - 1) * pageSize;
  $("plaza-table").innerHTML = listRows(taskRows.slice(start, start + pageSize));
  $("plaza-pagination").innerHTML = `<span role="status">${taskRows.length ? `${start + 1}–${Math.min(start + pageSize, taskRows.length)}` : "0"} / 共 ${taskRows.length} 个广场</span><div><button class="text-button" type="button" data-plaza-page="${STATE.plazaPage - 1}" ${STATE.plazaPage === 1 ? "disabled" : ""}>上一页</button><span> ${STATE.plazaPage} / ${pages} </span><button class="text-button" type="button" data-plaza-page="${STATE.plazaPage + 1}" ${STATE.plazaPage === pages ? "disabled" : ""}>下一页</button></div>`;
  $("export-plazas").disabled = !taskRows.length;
  bindPlazaRowClicks($("plaza-workbench").parentElement);
}
function listOrEmpty(html, text) {
  return html || `<li class="row-card"><span class="row-index">—</span><span class="row-main"><strong>${text}</strong><span>调整省份或搜索条件后再看</span></span><span></span></li>`;
}
function listRows(rows) {
  if (!rows.length) return `<tr><td colspan="7" class="empty-state"><strong>当前条件下没有匹配广场</strong><br>可切换“全部”查看其他状态，或清除搜索、重置区域筛选。</td></tr>`;
  return rows.map((row) => `
    <tr class="clickable ${STATE.selectedPlaza === row.name ? "active-row" : ""}" data-plaza="${escapeHtml(row.name)}">
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.province || "待补充")}</td>
      <td>${currency(row.current_7d_net_sales)}</td>
      <td class="${trendClass(decisionPct(row, "7d"))}">${percent(decisionPct(row, "7d"))}</td>
      <td>${currency(row.mtd_net_sales)}</td>
      <td class="${trendClass(decisionPct(row, "mtd"))}">${percent(decisionPct(row, "mtd"))}</td>
      <td><span class="${badgeClass(row.trend)}">${row.trend}</span><span class="badge">${decisionBasisLabel(row, "7d")}</span></td>
    </tr>
  `).join("");
}
function bindPlazaRowClicks(root = document) {
  root.querySelectorAll("[data-plaza]").forEach(el => {
    if (el.tagName !== "BUTTON") { el.tabIndex = 0; el.setAttribute("aria-label", `查看 ${el.dataset.plaza}`); }
  });
}
function sortPlazas(rows) {
  const list = rows.slice();
  if (STATE.plazaSort === "week") list.sort((a,b) => b.current_7d_net_sales - a.current_7d_net_sales);
  if (STATE.plazaSort === "month") list.sort((a,b) => b.mtd_net_sales - a.mtd_net_sales);
  if (STATE.plazaSort === "name") list.sort((a,b) => a.name.localeCompare(b.name, "zh-CN"));
  return list;
}
function currentTaskRows() {
  const names = new Set(plazasInScope().map(row => row.name));
  const rows = STATE.plazaTask === "risk" ? riskPlazas() : STATE.plazaTask === "growth" ? growthPlazas() : plazasInScope();
  return sortPlazas(rows.filter(row => names.has(row.name)));
}
function csvCell(value) {
  let text = String(value ?? "");
  if (typeof value === "string" && /^[=+@\-\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
function exportPlazas() {
  const rows = currentTaskRows();
  const records = [["广场", "省份", "本周净销售（元）", "周校准变化", "当月净销售（元）", "月校准变化", "状态", "分析截止日"]];
  rows.forEach(row => records.push([row.name, row.province, row.current_7d_net_sales, percent(decisionPct(row,"7d")), row.mtd_net_sales, percent(decisionPct(row,"mtd")), row.trend, STATE.data.analysis_range.end]));
  const blob = new Blob(["\uFEFF" + records.map(row => row.map(csvCell).join(",")).join("\r\n")], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = `悦行童玩-${scopeLabel()}-${STATE.plazaTask}-${STATE.data.analysis_range.end}.csv`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderSwitches(target, options, active, action) {
  $(target).innerHTML = Object.entries(options)
    .map(([key, label]) => `<button class="switch ${key === active ? "active" : ""}" type="button" aria-pressed="${key === active}" data-action="${action}" data-value="${key}">${label}</button>`)
    .join("");
}
function getMapRange() {
  const rows = STATE.data.province_table || [];
  if (STATE.mapMetric === "mtd_net_sales") {
    const values = rows.map((row) => Number(row.mtd_net_sales || 0));
    return [0, Math.max(...values, 1)];
  }
  const values = rows.map((row) => Number(row[STATE.mapMetric] || 0));
  const maxAbs = Math.max(...values.map((value) => Math.abs(value)), 0.1);
  return [-maxAbs, maxAbs];
}
function mapVisualColors() {
  return STATE.mapMetric === "mtd_net_sales"
    ? ["#326587", "#388faa", "#55c7d9", "#91f2ef"]
    : ["#dc8e9b", "#a18ea7", "#5786aa", "#53bacb", "#7aeee0"];
}
// A local studio panorama gives the glass softbox reflections without a network asset.
// This is transparent PBR glass styling, not a physical refraction simulation.
const MAP_GLASS_ENVIRONMENT = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="512" viewBox="0 0 1024 512">
  <defs>
    <linearGradient id="room" x2="0" y2="1"><stop stop-color="#6085a3"/><stop offset=".48" stop-color="#152e49"/><stop offset=".6" stop-color="#060f20"/><stop offset="1" stop-color="#1c3b50"/></linearGradient>
    <linearGradient id="softbox" x2="0" y2="1"><stop stop-color="#ffffff"/><stop offset=".65" stop-color="#d9f6ff"/><stop offset="1" stop-color="#669db9"/></linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="9"/></filter>
  </defs>
  <path fill="url(#room)" d="M0 0h1024v512H0z"/>
  <g filter="url(#soft)"><path fill="url(#softbox)" d="M160 46h195v150H160z"/><path fill="#69dfff" d="M690 92h50v225h-50z"/><path fill="#e6f9ff" d="M860 30h125v125H860z"/></g>
  <path fill="#a5eaff" opacity=".5" d="M0 325h1024v5H0z"/>
</svg>`);
function mapTooltip(params) {
  const name = params.data?.rawName || toDisplayProvince(params.name || "");
  const row = (STATE.data.province_table || []).find(item => item.name === name);
  if (!row) return `${escapeHtml(name || "区域")}<br>暂无经营数据`;
  return [`<strong>${escapeHtml(name)}</strong>`, `本周净销售：${currency(row.current_7d_net_sales)}`, `周校准变化：${percent(decisionPct(row,"7d"))}`, `当月净销售：${currency(row.mtd_net_sales)}`, `月校准变化：${percent(decisionPct(row,"mtd"))}`].join("<br>");
}
function resetMapView() {
  mapCamera = null;
  if (mapRenderer === "2d") { mapChart?.dispose(); mapChart = null; mapRenderer = ""; }
  void renderChartSection("map");
}
async function renderMap() {
  const request = ++mapRenderRequest;
  await ensureChinaGeo();
  let fallback = "";
  if (STATE.mapView === "3d") {
    if ($("map-gesture-hint")) $("map-gesture-hint").textContent = "";
    try { await ensureMap3DLibrary(); }
    catch (error) { fallback = `${error.message}，已显示平面地图。`; STATE.mapView = "2d"; }
  }
  if (request !== mapRenderRequest) return;
  if (mapRenderer !== STATE.mapView) {
    mapChart?.dispose(); mapChart = null;
    mapRenderer = STATE.mapView;
  }
  mapChart ||= echarts.init($("china-map"), null, {devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2)});
  renderSwitches("map-view-switches", {"3d":"立体", "2d":"平面"}, STATE.mapView, "mapView");
  $("map-stage").dataset.renderer = STATE.mapView;
  if (STATE.mapView === "3d") {
    try { renderMap3D(); return; }
    catch { STATE.mapView = "2d"; return renderMap(); }
  }
  renderMap2D();
  if ($("map-gesture-hint")) $("map-gesture-hint").textContent = "";
}
function renderMap3D() {
  const [minValue, maxValue] = getMapRange();
  const small = window.matchMedia("(max-width: 760px)").matches;
  const rows = (STATE.data.province_table || []).filter(row => row.name !== "待补充");
  const selected = toGeoName(STATE.selectedProvince);
  const data = rows.map(row => ({
    name: toGeoName(row.name), rawName: row.name, value: Number(row[STATE.mapMetric] || 0),
    height: toGeoName(row.name) === selected ? 7.2 : row.name === "海南" ? .6 : 5,
    label: {show: toGeoName(row.name) === selected},
  }));
  // Keep the source geometry intact; thin maritime outlines should remain fine lines.
  data.push({name:"", height:.04, itemStyle:{color:"#76c9e5", borderWidth:.8}, label:{show:false}, emphasis:{label:{show:false}}});
  if (!rows.some(row => row.name === "海南")) data.push({name:"海南省", height:.6, label:{show:false}});
  mapChart.setOption({
    backgroundColor: "transparent",
    animation: false,
    tooltip: {trigger: "item", confine: true, formatter: mapTooltip, backgroundColor: "#10273af2", borderColor: "#58819a", padding: 12, textStyle: {color:"#e0f1fb",fontSize:12}},
    visualMap: {
      type: "continuous", min: minValue, max: maxValue, seriesIndex: 0,
      right: small ? 8 : 16, bottom: small ? 42 : 34, itemHeight: small ? 66 : 86, itemWidth: 10,
      calculable: false, text: STATE.mapMetric === "mtd_net_sales" ? ["高", "低"] : ["改善", "承压"],
      textStyle: {color:"#bad9e9",fontSize:10},
      formatter: value => STATE.mapMetric === "mtd_net_sales" ? compactCurrency(value) : percent(value),
      inRange: {color: mapVisualColors()}, outOfRange: {color: "#426c8a"},
    },
    series: [{
      id: "province-relief", type: "map3D", map: "china", zlevel: -10,
      boxWidth: 100, regionHeight: 5, environment: "none",
      shading: "realistic", realisticMaterial: {roughness: .13, metalness: .08},
      groundPlane: {show: false},
      label: {show: false, distance: 1.8, formatter: p => toDisplayProvince(p.name), textStyle: {color: "#e6faff", fontSize: small ? 11 : 13, fontFamily: getComputedStyle(document.body).fontFamily, backgroundColor: "#10283dea", padding: [5,7], borderRadius: 4}},
      itemStyle: {color: "#477fa0", opacity: .56, borderColor: "#b1eeff", borderWidth: .8},
      emphasis: {itemStyle: {color: "#a7e9f3", opacity: .84}, label: {show: true}},
      light: {
        main: {color: "#e3f6ff", intensity: 1.0, alpha: 48, beta: -30, shadow: false},
        ambient: {color: "#83b6d3", intensity: .2},
        ambientCubemap: {texture: MAP_GLASS_ENVIRONMENT, diffuseIntensity: .32, specularIntensity: 2.2},
      },
      postEffect: {enable: true, bloom: {enable:false}, depthOfField: {enable:false}, SSAO: {enable:false}, FXAA: {enable:true}, colorCorrection: {enable:true, exposure:0, contrast:1.06, saturation:1.04}},
      temporalSuperSampling: {enable: !small},
      viewControl: {
        projection: "perspective", autoRotate: false,
        alpha: mapCamera?.alpha ?? 55, beta: mapCamera?.beta ?? 0, distance: mapCamera?.distance ?? (small ? 140 : 116),
        minAlpha: 25, maxAlpha: 80, minBeta: -45, maxBeta: 45, minDistance: 85, maxDistance: 220,
        panSensitivity: 0, rotateSensitivity: small ? 0 : .8, zoomSensitivity: small ? 0 : .8, damping: .7,
      },
      data,
    }],
  }, {notMerge:true});
  mapChart.off("click");
  mapChart.on("click", params => {
    const name = params.data?.rawName || toDisplayProvince(params.name || "");
    if (rows.some(row => row.name === name)) setProvince(name);
  });
  mapChart.off("map3dcamerachanged");
  mapChart.on("map3dcamerachanged", event => { mapCamera = {alpha:event.alpha,beta:event.beta,distance:event.distance}; });
  $("map-subtitle").textContent = MAP_METRICS[STATE.mapMetric] || "";
  if ($("map-gesture-hint")) $("map-gesture-hint").textContent = "";
}
function renderMap2D() {
  const rows = (STATE.data.province_table || []).filter((row) => row.name !== "待补充");
  const [minValue, maxValue] = getMapRange();
  const scaleMax = Math.max(...rows.map((item) => Number(item.mtd_net_sales || 0)), 1);
  const selectedGeo = STATE.selectedProvince === "全部" ? "" : toGeoName(STATE.selectedProvince);
  const selectedRegion = selectedGeo ? [{ name: selectedGeo, selected: true, itemStyle: { areaColor: "#ffb073", borderColor: "#bf4500", borderWidth: 1.6 } }] : [];
  const mapData = rows.map((row) => ({
    name: toGeoName(row.name),
    rawName: row.name,
    value: Number(row[STATE.mapMetric] || 0),
    current7d: row.current_7d_net_sales,
    mtd: row.mtd_net_sales,
    delta7d: decisionPct(row, "7d"),
    deltaMtd: decisionPct(row, "mtd"),
  }));
  const scatterData = rows
    .map((row) => ({
      name: toGeoName(row.name),
      rawName: row.name,
      value: [...(geoCenters[toGeoName(row.name)] || [0, 0]), Number(row.mtd_net_sales || 0)],
    }))
    .filter((item) => item.value[0] || item.value[1]);
  mapChart.setOption({
    textStyle: { fontFamily: getComputedStyle(document.body).fontFamily, color: "#606d73" },
    animation: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    animationDuration: 350,
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      formatter: (params) => {
        const row = params.data || {};
        const province = row.rawName || toDisplayProvince(params.name || "");
        return [`<strong>${province}</strong>`, `本周：${currency(row.current7d || 0)}`, `周校准变化：${percent(row.delta7d)}`, `当月：${currency(row.mtd || 0)}`, `月校准变化：${percent(row.deltaMtd)}`].join("<br>");
      },
    },
    visualMap: {
      type: "continuous",
      min: minValue,
      max: maxValue,
      right: 14,
      bottom: 16,
      itemHeight: 100,
      text: STATE.mapMetric === "mtd_net_sales" ? ["高", "低"] : ["改善", "承压"],
      textStyle: { color: "#606d73", fontSize: 11 },
      formatter: (value) => (STATE.mapMetric === "mtd_net_sales" ? compactCurrency(value) : percent(value)),
      inRange: STATE.mapMetric === "mtd_net_sales"
        ? { color: ["#f0f4f1", "#c5dfd4", "#73b4a2", "#167c76"] }
        : { color: ["#b85a56", "#ead2c8", "#f0f2eb", "#b4d4c5", "#2e8067"] },
      seriesIndex: 0,
    },
    geo: {
      map: "china",
      roam: true,
      layoutCenter: ["50%", "51%"],
      layoutSize: "103%",
      label: { show: false },
      itemStyle: { areaColor: "#f2f3ef", borderColor: "#d7deda", borderWidth: 1 },
      emphasis: {
        label: { show: true, color: "#151923", fontWeight: 800 },
        itemStyle: { areaColor: "#ffe3d2", borderColor: "#ff6b1a" },
      },
      regions: selectedRegion,
    },
    series: [
      { type: "map", map: "china", geoIndex: 0, selectedMode: "single", data: mapData, label: { show: false }, emphasis: { label: { show: true, color: "#151923", fontWeight: 800 } } },
    ],
  });
  mapChart.off("click");
  mapChart.on("click", (params) => {
    const name = params.data?.rawName || toDisplayProvince(params.name);
    if (name) setProvince(name);
  });
  $("map-subtitle").textContent = MAP_METRICS[STATE.mapMetric] || "";
}

function dailyPointsForScope({ allAvailable = false, cutoffDate = "" } = {}) {
  const s = scope();
  const applyWindow = (rows) => {
    const filtered = (rows || []).filter((row) => !cutoffDate || row.date <= cutoffDate);
    return allAvailable ? filtered : filtered.slice(-60);
  };
  if (s.type === "all") return applyWindow(STATE.data.daily_series || []);
  const rows = Object.keys(STATE.data.daily_detail || {})
    .sort()
    .map((date) => {
      const detail = STATE.data.daily_detail[date];
      const row = s.type === "province"
        ? (detail.province_table || []).find((item) => item.name === s.name)
        : (detail.plaza_table || []).find((item) => item.name === s.name);
      return {
        date,
        order_count: row?.order_count || 0,
        completed_order_count: row?.completed_order_count || 0,
        member_active_count: row?.member_active_count || 0,
        paid_sales: row?.paid_sales || 0,
        net_sales: row?.net_sales || 0,
        refund_amount: row?.refund_amount || 0,
      };
    });
  return applyWindow(rows);
}
function monthlyPointsForScope(points) {
  const source = points?.length
    ? points
    : dailyPointsForScope({ allAvailable: true, cutoffDate: analysisCutoffDate() });
  return aggregateByMonth(source);
}

function bossSeriesMap(key) {
  const rows = STATE.data?.boss_kpis?.series?.[key] || [];
  const map = new Map();
  rows.forEach((row) => { if (row?.date) map.set(row.date, row); });
  return map;
}
function withBossTrendFields(points) {
  const balanceMap = bossSeriesMap("member_balance");
  const nrMap = bossSeriesMap("new_returning");
  return (points || []).map((point) => {
    const next = { ...point };
    const bal = balanceMap.get(point.date);
    const nr = nrMap.get(point.date);
    if (next.member_balance_yuan == null && bal?.member_balance_yuan != null) next.member_balance_yuan = bal.member_balance_yuan;
    if (next.new_customer_share == null && nr?.new_customer_share != null) {
      next.new_customer_share = nr.new_customer_share;
      next.new_customer_count = nr.new_customer_count;
      next.returning_customer_count = nr.returning_customer_count;
    }
    if (next.refund_rate == null && Number(next.paid_sales || 0)) {
      next.refund_rate = Number(next.refund_amount || 0) / Number(next.paid_sales || 0);
    }
    return next;
  });
}
function renderTrendCharts() {
  initCharts();
  const points = withBossTrendFields(dailyPointsForScope());
  const metricLabel = TREND_METRICS[STATE.trendMetric];
  $("trend-scope").textContent = scopeLabel();
  $("trend-subtitle").textContent = `${points[0]?.date || ""} 至 ${points[points.length - 1]?.date || ""}`;
  dailyChart.setOption({
    textStyle: { fontFamily: getComputedStyle(document.body).fontFamily, color: "#606d73" },
    animation: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    animationDuration: 350,
    grid: { left: 12, right: 24, top: 28, bottom: 20, containLabel: true },
    tooltip: { trigger: "axis", formatter: (items) => {
      const item = items[0];
      const row = points[item.dataIndex] || {};
      const metricValue = ["order_count", "member_active_count"].includes(STATE.trendMetric)
        ? number(item.value)
        : ["refund_rate", "new_customer_share"].includes(STATE.trendMetric)
          ? percent(item.value)
          : currency(item.value);
      return `${row.date}<br>${metricLabel}: ${metricValue}<br>订单: ${number(row.order_count)}<br>交易会员: ${number(row.member_active_count || 0)}`;
    } },
    xAxis: { type: "category", data: points.map((p) => p.date.slice(5)), axisLine: { lineStyle: { color: "#dfe5df" } }, axisLabel: { color: "#606d73" } },
    yAxis: { type: "value", axisLabel: { color: "#606d73", formatter: (v) => ["order_count", "member_active_count"].includes(STATE.trendMetric) ? number(v) : ["refund_rate", "new_customer_share"].includes(STATE.trendMetric) ? percent(v) : compactCurrency(v) }, splitLine: { lineStyle: { color: "#edf0ec" } } },
    series: [{ type: "line", smooth: false, showSymbol: false, data: points.map((p) => Number(p[STATE.trendMetric] || 0)), lineStyle: { width: 2.5, color: "#167c76" }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "rgba(22,124,118,.13)" }, { offset: 1, color: "rgba(22,124,118,.01)" }]) } }],
  });
  const months = monthlyPointsForScope(withBossTrendFields(dailyPointsForScope({ allAvailable: true, cutoffDate: analysisCutoffDate() })));
  $("month-subtitle").textContent = scope().type === "all" ? "全局月度口径" : "当前下钻范围近 75 日聚合";
  monthlyChart.setOption({
    textStyle: { fontFamily: getComputedStyle(document.body).fontFamily, color: "#606d73" },
    animation: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    animationDuration: 350,
    grid: { left: 12, right: 18, top: 28, bottom: 20, containLabel: true },
    tooltip: { trigger: "axis", formatter: (items) => {
      const row = months[items[0].dataIndex] || {};
      const label = TREND_METRICS[STATE.trendMetric] || "净销售";
      const raw = ["refund_rate","new_customer_share","member_balance_yuan"].includes(STATE.trendMetric) ? row[STATE.trendMetric] : row.net_sales;
      const shown = ["refund_rate","new_customer_share"].includes(STATE.trendMetric) ? percent(raw) : currency(raw);
      return `${row.month}<br>${label}: ${shown}`;
    } },
    xAxis: { type: "category", data: months.map((m) => m.month.slice(2)), axisLine: { lineStyle: { color: "#dfe5df" } }, axisLabel: { color: "#606d73" } },
    yAxis: { type: "value", axisLabel: { color: "#606d73", formatter: (v) => ["refund_rate","new_customer_share"].includes(STATE.trendMetric) ? percent(v) : compactCurrency(v) }, splitLine: { lineStyle: { color: "#edf0ec" } } },
    series: [{ type: "bar", barMaxWidth: 34, data: months.map((m) => Number((["refund_rate","new_customer_share","member_balance_yuan"].includes(STATE.trendMetric) ? m[STATE.trendMetric] : m.net_sales) || 0)), itemStyle: { borderRadius: [4, 4, 0, 0], color: "#ed945b" } }],
  });
}

function addDays(dateString, delta) { return addUtcDays(dateString, delta); }
function clampDay(dateString) {
  const dates = availableDayDates();
  if (dates.includes(dateString)) return dateString;
  if (!dateString || !dates.length) return STATE.data.latest_day.date;
  return dates.reduce((closest, date) => Math.abs(parseDate(date)-parseDate(dateString)) < Math.abs(parseDate(closest)-parseDate(dateString)) ? date : closest, dates[0]);
}
function adjacentDay(delta) {
  const dates = availableDayDates();
  const i = dates.indexOf(STATE.dayDate);
  return dates[Math.max(0, Math.min(dates.length - 1, i + delta))];
}

function scopedDayTotals(detail) {
  const s = scope();
  if (!detail || s.type === "all") return detail?.totals || {};
  if (s.type === "province") return (detail.province_table || []).find((row) => row.name === s.name) || {};
  return (detail.plaza_table || []).find((row) => row.name === s.name) || {};
}
function setDashboardDate(dateString) {
  const dates = availableDayDates();
  const requested = String(dateString || "");
  const next = clampDay(requested);
  if (requested && requested !== next && dates.length) {
    STATE.dateNotice = `${requested} 没有逐日明细，已改到最近有数据的 ${next}。可回看 ${dates[0]} 至 ${dates[dates.length - 1]}。`;
  } else if (!requested) {
    STATE.dateNotice = `未选择日期，已回到 ${next}。`;
  } else {
    STATE.dateNotice = "";
  }
  STATE.dayDate = next;
  renderTopbar(); renderOverview(); renderScopeStrip(); renderDay(); renderInsightPanel();
}
function renderDay() {
  STATE.dayDate = clampDay(STATE.dayDate || STATE.data.latest_day.date);
  const detail = dayDetail(STATE.dayDate);
  if (!detail) return;
  const input = $("day-date-input");
  syncDateInput(input);
  const dates = availableDayDates();
  $("day-prev").disabled = STATE.dayDate === dates[0];
  $("day-next").disabled = STATE.dayDate === dates.at(-1);
  $("day-latest").disabled = STATE.dayDate === STATE.data.latest_day.date;
  const isLatest = STATE.dayDate === STATE.data.latest_day.date;
  $("day-context").textContent = `${scopeLabel()}｜${STATE.dayDate}｜${detail.calendar?.event || detail.calendar?.label || "单日"}${isLatest && STATE.data.latest_day.is_partial ? `｜截至 ${STATE.data.latest_day.cutoff_time}` : ""}`;
  const totals = scopedDayTotals(detail);
  const national = scope().type === "all";
  const overlay = national ? nationalCapsuleDayNet(STATE.dayDate, totals.net_sales) : { net_sales: Number(totals.net_sales || 0), capsuleIncluded: false, dns: null };
  const ruleDate = STATE.data?.daily_net_sales?.date || "";
  const capsuleHint = !national
    ? "当前范围为悦行口径"
    : overlay.capsuleIncluded
      ? `含乐摇摇 ${currency(Number(overlay.dns?.capsule_yuan || 0))}｜仅与 ${ruleDate} 相同且已计入时叠加`
      : `不含乐摇摇${ruleDate ? `｜仅 ${ruleDate} 且已计入时叠加` : ""}`;
  $("day-kpis").innerHTML = [
    metricCard({ label: "单日净销售", value: compactCurrency(overlay.net_sales), hint: `实付 ${currency(totals.paid_sales)}｜退款 ${currency(totals.refund_amount)}｜${capsuleHint}`, icon: "yuan", variant: "primary" }),
    metricCard({ label: "订单数", value: number(totals.order_count), hint: `完成 ${number(totals.completed_order_count)}｜关闭 ${number(totals.closed_order_count)}`, icon: "store", variant: "teal" }),
    metricCard({ label: "客单价", value: currency(totals.avg_ticket), hint: "按完成订单计算", icon: "trend", variant: "blue" }),
    metricCard({ label: "会员日活", value: number(totals.member_active_count || 0), hint: "交易会员去重", icon: "users", variant: "teal" }),
    metricCard({ label: "当前范围", value: scope().type === "all" ? number(detail.plaza_table?.length || 0) : scope().type === "province" ? number((detail.plaza_table || []).filter((row) => row.province === scope().name).length) : "1", hint: scope().type === "all" ? "当日广场数" : scopeLabel(), icon: "map", variant: "warn" }),
  ].join("");
  const provinceRows = scope().type === "all" ? (detail.province_table || []) : (detail.province_table || []).filter((row) => row.name === scope().province);
  const plazaRows = scope().type === "plaza"
    ? (detail.plaza_table || []).filter((row) => row.name === scope().name)
    : (detail.plaza_table || []).filter((row) => scope().type === "all" || row.province === scope().province);
  renderDayProvinceRows(provinceRows);
  renderDayPlazaRows(plazaRows);
}
function renderDayProvinceRows(rows) {
  $("day-province-table").innerHTML = rows.length ? rows.map((row) => `<tr><td>${escapeHtml(row.name)}</td><td>${currency(row.net_sales)}</td><td>${number(row.order_count)}</td><td>${number(row.member_active_count || 0)}</td><td>${currency(row.avg_ticket)}</td></tr>`).join("") : `<tr><td colspan="5">暂无匹配省份</td></tr>`;
}
function renderDayPlazaRows(rows) {
  $("day-plaza-table").innerHTML = rows.length ? rows.map((row) => `<tr class="clickable ${STATE.selectedPlaza === row.name ? "active-row" : ""}" data-plaza="${escapeHtml(row.name)}"><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.province || "待补充")}</td><td>${currency(row.net_sales)}</td><td>${number(row.order_count)}</td><td>${number(row.member_active_count || 0)}</td><td>${currency(row.avg_ticket)}</td></tr>`).join("") : `<tr><td colspan="6">暂无匹配广场</td></tr>`;
  bindPlazaRowClicks($("day-plaza-table"));
}
function renderFootnote() {
  const data = STATE.data;
  const notes = [];
  notes.push(`数据范围：${data.data_range.start} 至 ${data.data_range.end}；分析周期截至 ${data.analysis_range.end}。`);
  if (data.latest_day?.is_partial && data.analysis_range?.partial_day_included === data.latest_day.date) {
    notes.push(`最新日 ${data.latest_day.date} 为日内数据，本周销售和当月销售已同步包含该日数据，截止 ${data.latest_day.cutoff_time}。`);
  } else if (data.latest_day?.is_partial) {
    notes.push(`最新日 ${data.latest_day.date} 为日内数据，已展示至 ${data.latest_day.cutoff_time}。`);
  }
  const lookbackDates = availableDayDates();
  if (lookbackDates.length) {
    notes.push(`单日回看以广场明细为准：${lookbackDates[0]} 至 ${lookbackDates[lookbackDates.length - 1]}，共 ${lookbackDates.length} 天。区间外或没有明细的日期会改到最近有数据的一天。`);
  }
  if (data.unmapped_plazas?.length) notes.push(`仍有 ${data.unmapped_plazas.length} 个广场未识别省份。`);
  else notes.push("当前广场省份映射完整。");
  notes.push("核心口径：净销售额 = 实付金额 - 退款金额；默认周/月变化采用购物中心儿童游乐同类日校准，点击指标可查看详细比较依据。");
  notes.push("业态日历口径：悦行童玩属于购物中心儿童游乐，周末、法定节假日和儿童节等亲子峰值日会显著放大营收；AI 与规则诊断已优先做同类日校准。");
  notes.push("会员活跃口径：交易记录中按会员ID去重，会员ID缺失时用手机号兜底；这是交易会员活跃，不是小程序访问活跃。");
  $("footnote").innerHTML = notes.map((note) => `<div>${note}</div>`).join("");
}

async function renderAll() {
  renderTopbar();
  renderOverview();
  renderScopeStrip();
  renderAssessment();
  renderAiInsights();
  renderRegionDetail();
  renderProvinceRank();
  renderPlazaWork();
  if (chartState.trend) void renderChartSection("trend");
  renderDay();
  renderFootnote();
  renderInsightPanel();
  if (chartState.map) void renderChartSection("map");
}
function updateActiveNav() {
  const links = Array.from(document.querySelectorAll(".nav-link"));
  const current = links
    .map((link) => ({ link, target: document.querySelector(link.getAttribute("href")) }))
    .filter((item) => item.target)
    .reduce((active, item) => {
      const top = item.target.getBoundingClientRect().top;
      return top <= 160 ? item : active;
    }, null) || links.map((link) => ({ link })).at(0);
  links.forEach(link => { link.classList.toggle("active", link === current.link); if (link === current.link) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current"); });
}
function bindEvents() {
  bindAssessmentEvents();
  $("china-map").addEventListener("webglcontextlost", () => {
    if (mapRenderer !== "3d") return;
    webglSupported = false;
    STATE.mapView = "2d";
    void renderChartSection("map");
  }, true);
  $("province-select").addEventListener("change", event => { STATE.selectedProvince = event.target.value; STATE.selectedPlaza = ""; STATE.plazaPage = 1; void renderAll(); });
  $("plaza-sort").addEventListener("change", event => { STATE.plazaSort = event.target.value; STATE.plazaPage = 1; renderPlazaWork(); });
  $("export-plazas").addEventListener("click", exportPlazas);
  $("global-search").addEventListener("keydown", event => { if (event.key === "Enter") $("regional-assessment").scrollIntoView({block:"start"}); });
  $("refresh-button").addEventListener("click", () => window.location.reload());
  $("clear-scope").addEventListener("click", clearScope);
  $("dashboard-date-input").addEventListener("change", (event) => {
    setDashboardDate(event.target.value);
  });
  $("dashboard-date-prev")?.addEventListener("click", () => {
    setDashboardDate(adjacentDay(-1));
  });
  $("dashboard-date-next")?.addEventListener("click", () => {
    setDashboardDate(adjacentDay(1));
  });
  $("dashboard-date-latest").addEventListener("click", () => {
    setDashboardDate(STATE.data.latest_day.date);
  });
  $("global-search").addEventListener("input", (event) => {
    STATE.search = event.target.value || "";
    STATE.plazaPage = 1;
    if (STATE.search) STATE.plazaTask = "all";
    renderScopeStrip(); renderTopbar(); renderPlazaWork();
  });
  $("day-date-input").addEventListener("change", (event) => {
    setDashboardDate(event.target.value);
  });
  $("day-prev").addEventListener("click", () => {
    setDashboardDate(adjacentDay(-1));
  });
  $("day-next").addEventListener("click", () => {
    setDashboardDate(adjacentDay(1));
  });
  $("day-latest").addEventListener("click", () => {
    setDashboardDate(STATE.data.latest_day.date);
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest("#map-reset-view")) { resetMapView(); return; }
    const pageButton = event.target.closest("[data-plaza-page]");
    if (pageButton) { STATE.plazaPage = Number(pageButton.dataset.plazaPage); renderPlazaWork(); return; }
    const retryChart = event.target.closest("[data-retry-chart]");
    if (retryChart) { void renderChartSection(retryChart.dataset.retryChart); return; }
    if (event.target.closest("[data-clear-search]")) { STATE.search = ""; $("global-search").value = ""; STATE.plazaPage = 1; renderTopbar(); renderScopeStrip(); renderPlazaWork(); return; }
    if (event.target.closest("[data-show-results]")) { $("regional-assessment").scrollIntoView({block:"start"}); return; }
    const provinceRow = event.target.closest("[data-province]");
    if (provinceRow) { setProvince(provinceRow.dataset.province); return; }
    const plazaRow = event.target.closest("[data-plaza]");
    if (plazaRow) { setPlaza(plazaRow.dataset.plaza); return; }
    const card = event.target.closest("[data-insight]");
    if (card) {
      openInsight(card.dataset.insight, card);
      return;
    }
    if (event.target.closest("[data-insight-close]") || event.target === $("insight-backdrop")) {
      closeInsight();
      return;
    }
    const province = event.target.closest("[data-insight-province]");
    if (province) {
      setProvince(province.dataset.insightProvince);
      return;
    }
    const plaza = event.target.closest("[data-insight-plaza]");
    if (plaza) {
      setPlaza(plaza.dataset.insightPlaza);
      return;
    }
    const jump = event.target.closest("[data-insight-scroll]");
    if (jump) {
      const target = document.querySelector(jump.dataset.insightScroll);
      if (target) {
        closeInsight();
        STATE.plazaTask = "risk";
        renderPlazaWork();
        target.scrollIntoView({ block: "start" });
      }
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Tab" && STATE.selectedInsight) {
      const focusable = Array.from($("insight-panel").querySelectorAll('button:not([disabled]), [tabindex="0"], a[href], input, select'));
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    const row = event.target.closest?.("[data-plaza], [data-province]");
    if (row && row.tagName !== "BUTTON" && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); row.click(); return; }
    const card = event.target.closest?.("[data-insight]");
    if (card && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openInsight(card.dataset.insight, card);
      return;
    }
    if (event.key === "Escape" && STATE.selectedInsight) {
      closeInsight();
    }
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest(".switch");
    if (!button) return;
    if (button.dataset.action === "mapView") {
      STATE.mapView = button.dataset.value;
      void renderChartSection("map");
    }
    if (button.dataset.action === "map") {
      STATE.mapMetric = button.dataset.value;
      renderSwitches("map-switches", MAP_METRICS, STATE.mapMetric, "map");
      renderProvinceRank();
      void renderChartSection("map");
    }
    if (button.dataset.action === "trend") {
      STATE.trendMetric = button.dataset.value;
      renderSwitches("trend-switches", TREND_METRICS, STATE.trendMetric, "trend");
      void renderChartSection("trend");
    }
    if (button.dataset.action === "plazaTask") {
      STATE.plazaTask = button.dataset.value;
      STATE.plazaPage = 1;
      renderPlazaWork();
    }
  });
  let mapSmallScreen = window.matchMedia("(max-width: 760px)").matches;
  window.addEventListener("resize", () => {
    dailyChart?.resize();
    monthlyChart?.resize();
    mapChart?.resize();
    const nextMapSmallScreen = window.matchMedia("(max-width: 760px)").matches;
    if (mapChart && mapRenderer === "3d" && nextMapSmallScreen !== mapSmallScreen) {
      mapSmallScreen = nextMapSmallScreen;
      mapCamera = null;
      void renderChartSection("map");
    }
    aiWaterfallChart?.resize();
    aiRegionChart?.resize();
    aiScatterChart?.resize();
    updateActiveNav();
  });
  let navTicking = false;
  window.addEventListener("scroll", () => {
    if (navTicking) return;
    navTicking = true;
    window.requestAnimationFrame(() => {
      updateActiveNav();
      navTicking = false;
    });
  }, { passive: true });
  window.addEventListener("popstate", syncInsightFromLocation);
  window.addEventListener("hashchange", syncInsightFromLocation);
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ block: "start" });
        window.history.replaceState(null, "", link.getAttribute("href"));
      }
      document.querySelectorAll(".nav-link").forEach((item) => item.classList.toggle("active", item === link));
    });
  });
}
async function init() {
  try {
    window.__YUEXING_DASHBOARD_READY = false;
    window.__YUEXING_DASHBOARD_ERROR = null;
    document.documentElement.dataset.dashboardReady = "loading";
    document.documentElement.dataset.dashboardError = "";
    STATE.data = await loadDashboardData();
    window.DASHBOARD_DATA = STATE.data;
    STATE.dayDate = STATE.data.latest_day.date;
    $("province-select").innerHTML = `<option value="全部">全国全部区域</option>` + STATE.data.province_table.map(row => `<option value="${escapeHtml(row.name)}">${escapeHtml(row.name)}</option>`).join("");
    STATE.selectedInsight = insightFromHash();
    $("loading").hidden = true;
    $("app").hidden = false;
    renderSwitches("map-switches", MAP_METRICS, STATE.mapMetric, "map");
    renderSwitches("map-view-switches", {"3d":"立体", "2d":"平面"}, STATE.mapView, "mapView");
    renderSwitches("trend-switches", TREND_METRICS, STATE.trendMetric, "trend");
    bindEvents();
    $("assess-nav-icon").innerHTML = icons.calendar;
    await renderAll();
    observeCharts();
    if (STATE.selectedInsight) $("insight-panel").querySelector("button")?.focus({preventScroll:true});
    updateActiveNav();
    window.__YUEXING_DASHBOARD_READY = true;
    if (window.location.hash === "#regional-assessment") requestAnimationFrame(() => $("regional-assessment").scrollIntoView({block:"start"}));
    document.documentElement.dataset.dashboardReady = "true";
  } catch (error) {
    window.__YUEXING_DASHBOARD_READY = false;
    window.__YUEXING_DASHBOARD_ERROR = String(error.message || error);
    document.documentElement.dataset.dashboardReady = "false";
    document.documentElement.dataset.dashboardError = String(error.message || error);
    $("app").hidden = true;
    $("loading").hidden = false;
    $("loading").innerHTML = `<div class="error" role="alert"><h2>经营数据暂时无法加载</h2><p>请检查网络连接后重试。若仍未恢复，请稍后再次打开。</p><button class="text-button" type="button" id="retry-data">重新加载数据</button><details><summary>查看错误信息</summary>${escapeHtml(error.message || error)}</details></div>`;
    $("retry-data").addEventListener("click", () => location.reload());
  }
}
const ASSESS = { month: "", region: "", owner: "", search: "", sort: "gap" };
let assessmentChart;
let assessmentRenderVersion = 0;

function assessmentPlan() {
  const data = STATE.data?.regional_assessment;
  return data?.months?.find(row => row.month === ASSESS.month) || [...(data?.months || [])].sort((a, b) => String(b.month).localeCompare(String(a.month)))[0] || null;
}
function assessmentSourceRows(rows = assessmentRows(), plan = assessmentPlan()) {
  const ids = new Set(rows.map(row=>row.id));
  return (plan.source_rows || []).filter(row=>ids.has(row.project_id));
}
function assessmentMoney(value) {
  return `¥${Number(value).toLocaleString("zh-CN",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
}
function assessmentComponentValue(value, plan) {
  if (value === null) return "未填";
  if (value === 0 && plan.comparison_confirmation?.zero_component_meaning === "not_operated") return "无此业态（¥0）";
  return assessmentMoney(value);
}
function assessmentPlanDescription(plan) {
  return (plan.daily_target_policy?.rows || []).map(row=>`${row.label} ${percent(row.share)} / ${row.days} 天`).join("；");
}
function assessmentCutoffLabel(plan) {
  if (!plan.cutoff) return "尚无考核数据";
  return plan.partial_day_included ? `截至 ${plan.cutoff} ${plan.partial_day?.cutoff||"时间未知"} · 进行中` : `截至 ${plan.cutoff} 完整日`;
}
function assessmentTargetDetail(row, plan) {
  const entries = assessmentSourceRows([row], plan);
  if (!entries.length) return row.target === null ? "未下指标" : currency(row.target);
  return entries.map(entry=>`<div class="assess-target-entry"><strong>${assessmentMoney(entry.total)}</strong><small>${escapeHtml(entry.commercial_region)} · 第 ${entry.row} 行${entries.length>1?" · 待核对":""}</small><details class="assess-components"><summary>业态拆解</summary>${entry.is_simulated?`<small>原表：${escapeHtml(entry.name)}</small>`:""}${Object.entries(plan.categories).map(([key,label])=>`<small>${escapeHtml(label)} ${assessmentComponentValue(entry.components[key],plan)}</small>`).join("")}</details></div>`).join("");
}
function assessmentIncludesSales(row) {
  const approval = row.assessment_sales_inclusion;
  return !row.is_simulated && (row.target > 0 || (row.target === null
    && approval?.include_without_target === true && approval?.confirmed_by === "user"));
}
function assessmentTotals(rows, plan) {
  const targetRows = rows.filter(row => row.target !== null && row.target > 0);
  const comparableRows = targetRows.filter(row => !row.is_simulated);
  const salesRows = rows.filter(assessmentIncludesSales);
  const sum = key => rows.reduce((total, row) => total + Number(row[key] || 0), 0);
  const target = targetRows.reduce((total,row) => total + row.target,0);
  // Explicitly approved untargeted sales affect the numerator, never fabricate a target.
  const comparisonTarget = comparableRows.reduce((total,row) => total + row.target,0);
  const assessedActual = salesRows.reduce((total,row) => total + row.actual,0);
  const expected = comparisonTarget * plan.elapsed_ratio;
  const usable = Boolean(plan.comparison_ready !== false && plan.cutoff && !plan.missing_dates.length);
  const sourceTarget = plan.source_rows ? assessmentSourceRows(rows,plan).reduce((sum,row)=>sum+row.total,0) : target;
  return {target, sourceTarget, comparisonTarget, actual:sum("actual"), assessedActual, expected,
    gap: usable && comparisonTarget ? assessedActual-expected : null,
    achievement:usable && comparisonTarget ? assessedActual/comparisonTarget : null,
    progressAchievement:usable && expected > 0 ? assessedActual/expected : null,
    live:sum("live_sales"), targetCount:targetRows.length, assessedCount:salesRows.length, count:rows.length};
}
function assessmentRows({search = false} = {}) {
  const plan = assessmentPlan();
  if (!plan) return [];
  let rows = plan.projects.filter(row => !ASSESS.region || row.region_id === ASSESS.region);
  if (search && ASSESS.search) rows = rows.filter(row => [row.name,...row.plaza_names].some(name => name.includes(ASSESS.search.trim())));
  return rows;
}
function assessmentProjectExpected(row, plan) {
  return plan.cutoff && !row.is_simulated && row.target > 0 ? row.target*plan.elapsed_ratio : null;
}
function assessmentProjectGap(row, plan) {
  const expected = assessmentProjectExpected(row,plan);
  return expected !== null && !plan.missing_dates.length ? row.actual-expected : null;
}
function assessmentProjectProgress(row, plan) {
  const expected = assessmentProjectExpected(row,plan);
  return expected > 0 && !plan.missing_dates.length ? row.actual/expected : null;
}
function assessmentPace(value) {
  if (!Number.isFinite(value)) return '<span>待观察</span>';
  const met = value >= 1;
  return `<span class="assess-pace-value" title="${met?"已达当前计划":"尚未达当前计划"}" aria-label="进度达成率 ${percent(value)}，${met?"已达当前计划":"尚未达当前计划"}">${percent(value)}</span>`;
}
function assessmentPaceScale(values) {
  const valid = values.filter(Number.isFinite);
  return {min:Math.min(0,...valid.map(value=>Math.floor(value*4)/4)),max:Math.max(1.25,...valid.map(value=>Math.ceil(value*4)/4))};
}
function assessmentPaceGraphic(value, scale, labelled = false) {
  if (!Number.isFinite(value)) return "";
  const position = number => (number-scale.min)/(scale.max-scale.min)*100;
  const zero = position(0), current = position(value), target = position(1);
  const label = `进度达成率 ${percent(value)}；计划线 100%；共同刻度 ${percent(scale.min)} 至 ${percent(scale.max)}`;
  return `<div class="assess-pace-graphic${value<0?" is-negative":""}" role="img" aria-label="${label}" data-scale-min="${scale.min}" data-scale-max="${scale.max}" style="--pace-start:${Math.min(zero,current)}%;--pace-width:${Math.abs(current-zero)}%;--pace-zero:${zero}%;--pace-target:${target}%"><div class="assess-pace-track" aria-hidden="true"><i class="assess-pace-fill"></i>${scale.min<0?'<i class="assess-pace-zero"></i>':""}<i class="assess-pace-target"></i></div>${labelled?`<div class="assess-pace-axis" aria-hidden="true"><span>${percent(scale.min)}</span><span class="assess-pace-key">100% 计划线</span><span>${percent(scale.max)}</span></div>`:""}</div>`;
}
function assessmentSortedRows() {
  const plan = assessmentPlan();
  return [...assessmentRows({search:true})].sort((a,b) => {
    if (ASSESS.sort === "actual") return b.actual-a.actual;
    if (ASSESS.sort === "achievement" && plan.comparison_ready !== false) {
      const aValid = a.target > 0 && !a.is_simulated, bValid = b.target > 0 && !b.is_simulated;
      return Number(bValid)-Number(aValid) || (aValid && bValid ? b.actual/b.target-a.actual/a.target : a.name.localeCompare(b.name,"zh-CN"));
    }
    if (ASSESS.sort === "progress") {
      const aProgress = assessmentProjectProgress(a,plan), bProgress = assessmentProjectProgress(b,plan);
      return Number(bProgress!==null)-Number(aProgress!==null) || (aProgress!==null && bProgress!==null ? bProgress-aProgress : 0) || a.name.localeCompare(b.name,"zh-CN");
    }
    if (ASSESS.sort === "name") return a.name.localeCompare(b.name,"zh-CN");
    return (assessmentProjectGap(a,plan) ?? Infinity)-(assessmentProjectGap(b,plan) ?? Infinity) || a.name.localeCompare(b.name,"zh-CN");
  });
}
function assessmentGap(value) {
  return value === null ? '<span>待观察</span>' : `<span class="${value<0 ? "assess-negative" : "assess-positive"}">${escapeHtml(signedCurrency(value))}</span>`;
}
function assessmentProgress(value) {
  if (value === null) return "待定";
  return `${percent(value)}<span class="assess-progress" aria-hidden="true"><i style="--completion:${Math.max(0,Math.min(100,value*100))}%"></i></span>`;
}
function assessmentTeam(region) {
  return `主管 ${region.supervisor} · 监控岗 ${region.monitors.join("、")}`;
}
function renderAssessmentProjects() {
  const plan = assessmentPlan();
  if (!plan) return;
  const regions = STATE.data.regional_assessment.regions;
  const rows = assessmentSortedRows();
  const pending = plan.comparison_ready === false;
  const missing = pending || !plan.cutoff || plan.missing_dates.length > 0;
  $("assess-project-cutoff").textContent = assessmentCutoffLabel(plan);
  const counts = [[rows.length,"个项目"],[rows.filter(row=>row.is_simulated).length,"个模拟地名"],[rows.filter(row=>row.target_status==="duplicate").length,"个重复待核对"],[rows.filter(row=>row.target_status==="missing").length,"个未下指标"]];
  $("assess-project-count").textContent = counts.filter(([count],index)=>index===0||count>0).map(([count,label])=>`${count} ${label}`).join(" · ");
  $("assess-project-rows").innerHTML = rows.length ? rows.map(row => {
    const region = regions.find(item=>item.id===row.region_id);
    const liveName = row.plaza_names.find(name => STATE.data.plaza_table.some(item=>item.name===name));
    return `<tr><td><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(region.name)} · ${escapeHtml(region.manager)}</small></td>
      <td class="assess-priority-cell">${row.is_simulated || !(row.target>0)?assessmentIncludesSales(row)?"未下指标<small>销售计入汇总</small>":"不参与考核":pending?"扭蛋分场/映射待补":assessmentPace(assessmentProjectProgress(row,plan))}</td>
      <td class="assess-gap-cell">${pending || row.is_simulated || !row.target ? "暂不评价" : assessmentGap(missing ? null : assessmentProjectGap(row,plan))}</td>
      <td>${assessmentProjectExpected(row,plan)===null?"待定":currency(assessmentProjectExpected(row,plan))}</td>
      <td>${row.is_simulated?"未关联销售":currency(row.actual)}</td><td>${assessmentTargetDetail(row,plan)}</td>
      <td>${row.is_simulated?"模拟项目":row.target===null?"未下指标":row.target===0?"不参与考核":pending ? "扭蛋分场/映射待补" : missing ? "待观察" : assessmentProgress(row.actual/row.target)}</td>
      <td>${row.is_simulated?"未关联销售":`${currency(row.paid_sales)}<small>退款 ${currency(row.refund_amount)}</small>`}</td>
      <td><button class="assess-link" type="button" data-assess-plaza="${escapeHtml(liveName||"")}" ${liveName?"":"disabled"} title="${liveName?"查看该广场的最新经营数据":"当前经营列表暂无此广场"}">查看经营详情</button></td></tr>`;
  }).join("") : '<tr><td colspan="9">没有匹配的广场</td></tr>';
}
function renderAssessment() {
  const root = $("regional-assessment");
  if (!root) return;
  const data = STATE.data?.regional_assessment;
  const plan = assessmentPlan();
  if (!plan) { root.hidden = true; return; }
  root.hidden = false;
  ASSESS.month = plan.month;
  const regions = data.regions;
  const region = regions.find(row=>row.id===ASSESS.region);
  const rows = assessmentRows();
  const total = assessmentTotals(rows,plan);
  const regionTotals = regions.map(region=>({region,totals:assessmentTotals(plan.projects.filter(project=>project.region_id===region.id),plan)}));
  // Keep the same scale when switching region or owner; do not average regional rates.
  const paceScale = assessmentPaceScale([assessmentTotals(plan.projects,plan).progressAchievement,...regionTotals.map(row=>row.totals.progressAchievement)]);
  const provided = plan.mode === "provided";
  const pending = plan.comparison_ready === false;
  const exclusions = plan.excluded_source_rows || [];
  const periodNote = plan.include_partial_day ? "已录入的当日净销售计入考核；当天目标按整日计划累计，不按小时折算。部分日达成率和差额为进行中结果，不能当作全天最终结论。缺少日期明细时暂停进度评价。" : "部分日不计入考核，缺少完整日时暂停进度评价。";
  const simulatedCount = plan.projects.filter(row=>row.is_simulated).length;
  $("assess-status").textContent = provided ? pending ? "目标已导入 · 扭蛋分场/映射待补" : "净销售考核 · 口径已确认" : "模拟目标 · 非正式考核";
  $("assess-status").setAttribute("data-state",provided&&!pending?"confirmed":"pending");
  $("assess-region-target-label").textContent = provided ? "月度目标" : "模拟月目标";
  $("assess-region-actual-label").textContent = pending ? "部分考核实际" : "考核净销售";
  $("assess-project-target-label").textContent = provided ? "月目标 / 业态拆解" : "模拟月目标";
  $("assess-export").textContent = provided ? "导出指标明细" : "导出考核明细";
  $("assess-sort").querySelector('option[value="gap"]').disabled = pending;
  $("assess-sort").querySelector('option[value="achievement"]').disabled = pending;
  $("assess-sort").querySelector('option[value="progress"]').disabled = pending;
  if (pending && ["gap","achievement","progress"].includes(ASSESS.sort)) ASSESS.sort = "name";
  $("assess-sort").value = ASSESS.sort;
  $("assess-month").innerHTML = data.months.map(row=>`<option value="${row.month}">${row.month} · ${row.mode==="provided"?"已导入":"模拟"}</option>`).join("");
  $("assess-month").value = plan.month;
  $("assess-region").innerHTML = '<option value="">全国四大区</option>'+regions.map(row=>`<option value="${row.id}">${escapeHtml(row.name)}</option>`).join("");
  $("assess-region").value = ASSESS.region;
  $("assess-owner").innerHTML = '<option value="">全部负责人</option>'+regions.filter(row=>!ASSESS.region||row.id===ASSESS.region).map(row=>
    [{name:row.manager,role:"区域经理"},{name:row.supervisor,role:"主管"},...row.monitors.map(name=>({name,role:"监控岗"}))].map(person=>`<option value="${escapeHtml(person.name)}">${escapeHtml(person.name)} · ${person.role}</option>`).join("")).join("");
  $("assess-owner").value = ASSESS.owner;
  $("assess-subtitle").textContent = `${plan.month} · ${region ? region.name+" / "+(ASSESS.owner||region.manager) : "全国四大区"} · ${plan.target_version}`;
  $("assess-sync").innerHTML = `<span>数据更新 <strong>${escapeHtml(STATE.data.generated_at||"时间未知")}</strong></span><span>${pending?"交易参考":"考核"} <strong>${escapeHtml(assessmentCutoffLabel(plan))}</strong></span>`;
  $("assess-notice").textContent = plan.missing_dates.length ? `缺少 ${plan.missing_dates.join("、")} 的明细，进度评价暂停。` :
    `${plan.partial_day ? `${plan.partial_day.date} 部分日数据已同步：截至 ${plan.partial_day.cutoff||"未知时间"}，当前区域净销售 ${currency(total.live)}，${plan.partial_day_included?"其中考核范围内销售已计入累计考核；当天目标按整日计算，日内进度非最终结果":"尚未计入考核达成率"}。` : `当前考核范围：${plan.start} 至 ${plan.cutoff||"尚无考核数据"}。`}`;
  const capsuleGap = plan.capsule_assessment;
  if (capsuleGap && !capsuleGap.complete) {
    const missingSites = (capsuleGap.missing_site_dates || []).join("、") || "无";
    const unmatched = (capsuleGap.issues || []).map(x => `${x.date} ${x.source_name} ${x.revenue_yuan}元`).join("、") || "无";
    $("assess-notice").textContent += ` 扭蛋考核不完整；缺分场日期：${missingSites}；未匹配：${unmatched}。所示实际为部分值，达成率暂停。`;
  }
  if (pending) $("assess-notice").textContent += ` ${plan.comparison_note}`;
  else {
    const omitted = [[rows.filter(row=>row.is_simulated).length,"个模拟项目"],[rows.filter(row=>!row.is_simulated&&!assessmentIncludesSales(row)).length,"个未设有效目标项目"]].filter(([count])=>count>0).map(([count,label])=>`${count} ${label}`);
    $("assess-notice").textContent += ` 净销售＝实付－退款。${omitted.length?omitted.join("、")+"不参与考核。":""}`;
    const approved = rows.filter(row=>row.target===null&&assessmentIncludesSales(row));
    if (approved.length) $("assess-notice").textContent += ` ${approved.map(row=>row.name).join("、")}净销售 ${currency(approved.reduce((sum,row)=>sum+row.actual,0))} 已计入考核，月度目标未变，单广场达成率待下指标后计算。`;
  }
  if (plan.unmatched.length) $("assess-notice").textContent += ` 全国另有 ${plan.unmatched.length} 个未分配归属广场，净销售 ${currency(plan.unmatched.reduce((sum,row)=>sum+row.actual,0))}，未计入区域考核。`;
  $("assess-plan-note").hidden = !plan.daily_target_policy;
  $("assess-plan-note").textContent = plan.daily_target_policy ? `目标分摊：${assessmentPlanDescription(plan)}。节假日优先，调休归周中。` : "";
  const expectedReady = Boolean(plan.cutoff && total.comparisonTarget > 0);
  const cutoffLabel = assessmentCutoffLabel(plan);
  $("assess-region-cutoff").textContent = cutoffLabel;
  const metrics = [
    {key:"progress",label:"进度达成率",value:pending?"扭蛋分场/映射待补":total.progressAchievement===null?"待观察":percent(total.progressAchievement),hint:total.progressAchievement===null?"待数据完整且应完成金额大于 0 后评价":`净销售 ÷ 应完成 · ${total.progressAchievement>=1?"已达当前计划":"尚未达当前计划"}`,tone:total.progressAchievement===null?"":"assess-pace-value",graphic:assessmentPaceGraphic(total.progressAchievement,paceScale,true)},
    {key:"gap",label:"进度差额",value:pending?"暂不评价":total.gap===null ? "待观察" : signedCurrency(total.gap),hint:pending?"扭蛋分场或映射待补齐后再计算":"净销售 − 截至当日应完成",tone:total.gap===null?"":total.gap<0?"assess-negative":"assess-positive"},
    {key:"expected",label:"截至当日应完成",value:expectedReady?currency(total.expected):"待定",hint:`${cutoffLabel} · 计划进度 ${percent(plan.elapsed_ratio)}`},
    {key:"actual",label:pending?"现有交易净销售":"考核净销售",value:currency(pending?total.actual:total.assessedActual),hint:plan.cutoff ? `${cutoffLabel} · ${pending?"仅供参考":`${total.assessedCount} 个真实项目`}` : "等待考核数据"},
    {key:"target",label:provided?"月度目标":"模拟月目标",value:provided?compactCurrency(total.sourceTarget):currency(total.target),hint:provided?`${exclusions.length?"调整后合计":"原表合计"} ${assessmentMoney(total.sourceTarget)}`:`${total.targetCount} 个项目已分配目标`},
    {key:"monthly",label:"月度达成率",value:pending?"扭蛋分场/映射待补":total.achievement===null?"待观察":percent(total.achievement),hint:pending?"扭蛋分场或映射待补齐后再计算正式达成率":`累计净销售 ÷ 月度目标`},
  ];
  $("assess-metrics").innerHTML = [{name:"当前进度",className:"assess-current",items:metrics.slice(0,3)},{name:"月度数据",className:"assess-monthly",items:metrics.slice(3)}].map(group=>`<div class="assess-metric-group ${group.className}" role="group" aria-label="${group.name}">${group.items.map(item=>`<div class="assess-metric" data-metric="${item.key}"><span>${item.label}</span><strong class="${item.tone||""}">${escapeHtml(item.value)}</strong><small>${escapeHtml(item.hint)}</small>${item.graphic||""}</div>`).join("")}</div>`).join("");
  $("assess-region-rows").innerHTML = regionTotals.map(({region:row,totals:t})=>{
    return `<tr class="${row.id===ASSESS.region?"assess-selected":""}"><td><button class="assess-link" type="button" data-assess-region="${row.id}" aria-pressed="${row.id===ASSESS.region}">${escapeHtml(row.name)} / ${escapeHtml(row.manager)}</button></td><td class="assess-priority-cell">${pending?"扭蛋分场/映射待补":assessmentPace(t.progressAchievement)+assessmentPaceGraphic(t.progressAchievement,paceScale)}</td><td class="assess-gap-cell">${pending?"暂不评价":assessmentGap(t.gap)}</td><td>${plan.cutoff&&t.comparisonTarget>0?currency(t.expected):"待定"}</td><td>${currency(pending?t.actual:t.assessedActual)}</td><td>${provided?assessmentMoney(t.sourceTarget):currency(t.target)}${!pending&&Math.abs(t.sourceTarget-t.comparisonTarget)>.005?`<small>考核目标 ${assessmentMoney(t.comparisonTarget)}</small>`:""}</td><td>${pending?"扭蛋分场/映射待补":assessmentProgress(t.achievement)}</td></tr>`;
  }).join("");
  $("assess-owner-team").textContent = region ? `区域经理 ${region.manager} · ${assessmentTeam(region)}` : "按相对计划的缺口金额排序，优先核对广场销售与活动执行。";
  const actions = !pending && plan.cutoff && !plan.missing_dates.length ? [...rows].filter(row=>row.target && assessmentProjectGap(row,plan)<0).sort((a,b)=>assessmentProjectGap(a,plan)-assessmentProjectGap(b,plan)).slice(0,3) : [];
  $("assess-action-list").innerHTML = actions.length ? actions.map(row=>{
    const owner = regions.find(item=>item.id===row.region_id);
    return `<li><strong>${escapeHtml(row.name)} · 距计划 ${currency(-assessmentProjectGap(row,plan))}</strong><p>已完成 ${currency(row.actual)}，月目标 ${currency(row.target)}。建议由主管 ${escapeHtml(owner.supervisor)} 核对销售录入与现场活动执行。</p></li>`;
  }).join("") : '<li><strong>暂无需优先跟进的进度缺口</strong><p>目标待定或数据不完整的项目不参与进度判断。</p></li>';
  $("assess-action-title").textContent = pending ? "扭蛋分场/映射待补" : plan.partial_day_included ? "日内跟进重点" : "跟进重点";
  if (pending) {
    const duplicate = rows.filter(row=>row.target_status==="duplicate");
    const absent = rows.filter(row=>row.target_status==="missing");
    $("assess-owner-team").textContent = region ? `区域经理 ${region.manager} · ${assessmentTeam(region)}` : "目标保留原表，不自行删除、合并或补造指标。";
    $("assess-action-list").innerHTML = `<li><strong>确认交易覆盖范围</strong><p>${escapeHtml(plan.comparison_note)}</p></li>`+
      rows.filter(row=>row.is_simulated).map(row=>`<li><strong>${escapeHtml(row.name)}</strong><p>仅名称为模拟，原表第 ${assessmentSourceRows([row],plan).map(entry=>entry.row).join("、")} 行指标保持不变。未关联真实销售，不用于判断经营表现。</p></li>`).join("")+
      duplicate.map(row=>`<li><strong>${escapeHtml(row.name)} · 重复目标</strong><p>${assessmentSourceRows([row],plan).map(entry=>`${escapeHtml(entry.commercial_region)}（第 ${entry.row} 行）${assessmentMoney(entry.total)}`).join("；")}。两条均保留在原表汇总，尚未认定为一个或两个考核项目。</p></li>`).join("")+
      (absent.length?`<li><strong>${absent.length} 个项目未下指标</strong><p>${absent.map(row=>escapeHtml(row.name)).join("、")}。不沿用之前的模拟金额，也不视为目标为零。</p></li>`:"");
  }
  $("assess-chart-title").textContent = provided ? "业态指标拆解" : "目标进度";
  $("assess-chart-range").textContent = `${plan.start} 至 ${plan.end}`;
  $("assess-method-body").innerHTML = `<p>${escapeHtml(plan.basis)}</p><p>达成率 = 已定目标项目的累计净销售 / 模拟目标；进度差额 = 同范围净销售 − 日历加权应完成金额。模拟结果不代表正式评分。实际销售与现有看板口径一致。</p><p>分区名单：${escapeHtml(data.source.file)}，${escapeHtml(data.source.sheet)}；预览生效月 ${escapeHtml(data.effective_from.slice(0,7))}。主管与监控岗沿用同一区域范围，未模拟个人评分。</p>${data.notes.map(note=>`<p>${escapeHtml(note)}</p>`).join("")}${plan.unmatched.length?`<p>尚未分配归属：${plan.unmatched.map(row=>`${escapeHtml(row.name)} ${currency(row.actual)}`).join("、")}。此部分不计入区域考核。</p>`:""}`;
  if (provided) $("assess-method-body").innerHTML = `<p>指标来源：${escapeHtml(plan.source.file)} · ${escapeHtml(plan.source.sheet)}!${escapeHtml(plan.source.range)}，单位：元。</p><p>${escapeHtml(plan.basis)}</p><p>${escapeHtml(plan.comparison_note)}</p><p>考核净销售包括已设有效目标项目及经用户确认计入的未下指标项目；月度达成率＝考核净销售 ÷ 已设置的有效月目标合计；进度差额＝考核净销售－截至考核日期应完成金额。未下指标项目不补造目标。${plan.daily_target_policy?"应完成金额按周中、普通周五、周末、节假日分别分摊后累计。":"应完成金额沿用周末及节假日日历权重。"}${periodNote}</p><p>原表 ${plan.source_record_count||plan.source_rows.length} 行${exclusions.length?`，按确认删除 ${exclusions.length} 行`:""}；当前 ${new Set(plan.source_rows.map(row=>row.project_id)).size} 个目标项目。${simulatedCount?`其中 ${simulatedCount} 个使用模拟地名，目标仅展示、不纳入考核。`:""}分项空白保留为“未填”；计算保留原始精度，界面金额四舍五入显示两位小数。业态图仅展示目标，不代表各业态实际收入。</p>${exclusions.length?`<p>删除记录：${exclusions.map(row=>`原表第 ${row.row} 行 ${escapeHtml(row.commercial_region)} / ${escapeHtml(row.name)}，目标 ${assessmentMoney(row.total)}（${escapeHtml(row.reason)}）`).join("；")}。仅调整看板及导出内容，原 Excel 未修改。</p>`:""}<p>负责人名单：${escapeHtml(data.source.file)}。分区生效日暂按 ${escapeHtml(data.effective_from)}，待确认；主管与监控岗沿用同一区域，不输出个人评分。</p>`;
  if (plan.daily_target_policy) {
    const policy = plan.daily_target_policy;
    const corrections = policy.rows.filter(row=>row.source_days!==row.days).map(row=>`${row.label}从原表 ${row.source_days} 天改为实际 ${row.days} 天`);
    $("assess-method-body").innerHTML += `<p>日型分摊来源：${escapeHtml(policy.source.file)} · ${escapeHtml(policy.source.sheet)}!${escapeHtml(policy.source.range)}。每日目标＝月目标 × 该日类型占比 ÷ 该类型实际天数。${escapeHtml(corrections.join("；"))}；原表占比不变，整月日目标合计为月目标的 100%。每个日期只计一次，节假日优先，调休工作日归周中。原 Excel 未修改。</p>`;
  }
  if (provided && plan.unmatched.length) $("assess-method-body").innerHTML += `<p>尚未分配归属：${plan.unmatched.map(row=>`${escapeHtml(row.name)} ${currency(row.actual)}`).join("、")}。此部分保留在全国销售中，不计入区域考核。</p>`;
  $("assess-method-body").innerHTML += '<p>月度达成率＝累计净销售 ÷ 整月目标；进度达成率＝同范围累计净销售 ÷ 截至当日应完成金额，100% 表示已完成当前计划。应完成金额按每日目标累计，考核日期以销售数据的截止日期为准，不按电脑日期提前累计。区域和全国进度达成率用金额加总后计算，不平均广场达成率；应完成金额为 0、缺日、目标未确认或未设有效目标时不输出进度达成率。</p>';
  $("assess-method-body").innerHTML += `<p>各区考核范围：${regionTotals.map(({region,totals:t})=>`${escapeHtml(region.name)} ${t.assessedCount} 个考核项目、${t.count-t.assessedCount} 个不参与考核`).join("；")}。除经用户确认计入销售的项目外，未设有效目标或模拟项目不参与考核，不代表经营异常。未下指标的单广场不计算自身达成率。</p>`;
  renderAssessmentProjects();
  void drawAssessmentChart();
}
async function drawAssessmentChart() {
  const version = ++assessmentRenderVersion;
  const plan = assessmentPlan();
  if (!plan) return;
  try {
    await ensureChartLibrary();
    if (version!==assessmentRenderVersion) return;
    const rows = assessmentRows();
    const totals = assessmentTotals(rows,plan);
    const targetRows = rows.filter(row=>row.target&&!row.is_simulated);
    let actual=0, weight=0;
    const allWeight=plan.calendar.reduce((sum,day)=>sum+day.traffic_weight,0);
    const days=plan.calendar.map(day=>{
      weight+=day.target_share ?? day.traffic_weight/allWeight;
      actual+=targetRows.reduce((sum,row)=>sum+Number(row.daily[day.day]||0),0);
      return {date:day.day, label:day.label, planned:Math.round(totals.comparisonTarget*weight), actual:plan.cutoff && day.day<=plan.cutoff && !plan.missing_dates.length ? Math.round(actual) : null};
    });
    $("assess-chart").querySelector(".assess-empty")?.remove();
    assessmentChart ||= echarts.init($("assess-chart"));
    if (plan.mode === "provided") {
      const entries = assessmentSourceRows(rows,plan);
      const categories = Object.entries(plan.categories);
      const values = categories.map(([key])=>entries.reduce((sum,row)=>sum+Number(row.components[key]||0),0));
      $("assess-chart").setAttribute("aria-label",categories.map(([,label],i)=>`${label}目标${assessmentMoney(values[i])}`).join("，"));
      assessmentChart.setOption({animation:false,grid:{left:12,right:95,top:12,bottom:30,containLabel:true},
        tooltip:{trigger:"axis",axisPointer:{type:"shadow"},valueFormatter:assessmentMoney},
        xAxis:{type:"value",axisLabel:{formatter:compactCurrency,fontSize:11},splitLine:{lineStyle:{color:"#edf0ec"}}},
        yAxis:{type:"category",inverse:true,data:categories.map(([,label])=>label),axisTick:{show:false},axisLabel:{fontSize:12}},
        series:[{type:"bar",barMaxWidth:24,data:values.map((value,i)=>({value,itemStyle:{color:["#167c76","#506d86","#9a7447","#b44347"][i]}})),label:{show:true,position:"right",formatter:item=>compactCurrency(item.value),fontSize:12}}]},true);
      return;
    }
    assessmentChart.setOption({animation:false,textStyle:{fontFamily:getComputedStyle(document.body).fontFamily},
      grid:{left:12,right:14,top:40,bottom:24,containLabel:true},
      legend:{data:["累计净销售","日历加权计划"],left:0,top:0,textStyle:{color:"#606d73",fontSize:11}},
      tooltip:{trigger:"axis",formatter:items=>{const d=days[items[0].dataIndex];return `${d.date} · ${escapeHtml(d.label)}<br>计划 ${currency(d.planned)}<br>实际 ${d.actual===null?"待更新":currency(d.actual)}`;}},
      xAxis:{type:"category",data:days.map(day=>day.date.slice(5)),boundaryGap:false,axisLabel:{fontSize:11,color:"#606d73"},axisLine:{lineStyle:{color:"#dfe5df"}}},
      yAxis:{type:"value",axisLabel:{formatter:compactCurrency,fontSize:11,color:"#606d73"},splitLine:{lineStyle:{color:"#edf0ec"}}},
      series:[{name:"日历加权计划",type:"line",data:days.map(day=>day.planned),showSymbol:false,lineStyle:{type:"dashed",width:2,color:"#9a7447"},itemStyle:{color:"#9a7447"}},
      {name:"累计净销售",type:"line",data:days.map(day=>day.actual),showSymbol:false,connectNulls:false,lineStyle:{width:3,color:"#167c76"},itemStyle:{color:"#167c76"}}]},true);
  } catch { $("assess-chart").innerHTML='<div class="assess-empty">进度图暂时无法加载，表格数据仍可查看。<button type="button" class="text-button" data-assess-retry>重试</button></div>'; }
}
function exportAssessment() {
  const plan=assessmentPlan();
  if (!plan) return;
  const regions=STATE.data.regional_assessment.regions;
  let headers=["考核月份","数据截至","目标版本","区域","区域经理","主管","广场","模拟月目标","净销售","目标达成率","截至当前应完成","进度差额","实付","退款"];
  let rows=assessmentSortedRows().map(row=>{
    const region=regions.find(item=>item.id===row.region_id);
    const valid=plan.comparison_ready!==false&&plan.cutoff&&!plan.missing_dates.length;
    return [plan.month,plan.cutoff||"",plan.target_version,region.name,region.manager,region.supervisor,row.name,row.target??"待定",row.actual,valid&&row.target?percent(row.actual/row.target):"待观察",row.target?Math.round(row.target*plan.elapsed_ratio):"待定",valid&&row.target?Math.round(assessmentProjectGap(row,plan)):"待观察",row.paid_sales,row.refund_amount];
  });
  if (plan.mode === "provided") {
    const dayTypes = plan.daily_target_policy?.rows || [];
    headers=["月份","目标版本","来源文件","工作表行号","商管区域","运营大区","区域经理","主管","省份","展示项目","原表项目",...Object.values(plan.categories).map(label=>label+"指标（元）"),"原表总指标（元）","匹配状态","考核口径",...dayTypes.map(row=>row.label+"日均目标（日历修正，元）"),...(dayTypes.length?["日目标分摊规则"]:[])];
    rows=assessmentSortedRows().flatMap(project=>assessmentSourceRows([project],plan).map(entry=>{
      const region=regions.find(item=>item.id===entry.region_id);
      return [plan.month,plan.target_version,plan.source.file,entry.row,entry.commercial_region,region.name,region.manager,region.supervisor,entry.province,project.name,entry.name,...Object.keys(plan.categories).map(key=>entry.components[key]??""),entry.total,project.is_simulated?"模拟地名 · 不参与考核":project.target_status==="duplicate"?"重复待核对":"已匹配",plan.comparison_ready===false?"扭蛋分场/映射待补":"净销售＝实付－退款",...dayTypes.map(row=>entry.total*row.daily_share),...(dayTypes.length?[assessmentPlanDescription(plan)]:[])];
    }));
  }
  const blob=new Blob(["\uFEFF"+[headers,...rows].map(row=>row.map(csvCell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url;a.download=`${plan.mode==="provided"?(plan.excluded_source_rows?.length?"指标拆解-调整后":"指标拆解-原表"):"区域考核-模拟"}-${plan.month}-${ASSESS.region||"全国"}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function bindAssessmentEvents() {
  if (!$("regional-assessment")) return;
  $("assess-month").addEventListener("change",event=>{ASSESS.month=event.target.value;renderAssessment();});
  $("assess-region").addEventListener("change",event=>{ASSESS.region=event.target.value;ASSESS.owner="";renderAssessment();});
  $("assess-owner").addEventListener("change",event=>{
    ASSESS.owner=event.target.value;
    if (ASSESS.owner) ASSESS.region=STATE.data.regional_assessment.regions.find(row=>[row.manager,row.supervisor,...row.monitors].includes(ASSESS.owner))?.id||"";
    renderAssessment();
  });
  $("assess-reset").addEventListener("click",()=>{ASSESS.region="";ASSESS.owner="";ASSESS.search="";$("assess-search").value="";renderAssessment();});
  $("assess-search").addEventListener("input",event=>{ASSESS.search=event.target.value;renderAssessmentProjects();});
  $("assess-sort").addEventListener("change",event=>{ASSESS.sort=event.target.value;renderAssessmentProjects();});
  $("assess-export").addEventListener("click",exportAssessment);
  $("regional-assessment").addEventListener("click",event=>{
    const region=event.target.closest("[data-assess-region]");
    if (region) {ASSESS.region=ASSESS.region===region.dataset.assessRegion?"":region.dataset.assessRegion;ASSESS.owner="";renderAssessment();$("assess-region").focus({preventScroll:true});}
    const plaza=event.target.closest("[data-assess-plaza]");
    if (plaza?.dataset.assessPlaza) {
      if (STATE.selectedPlaza !== plaza.dataset.assessPlaza) setPlaza(plaza.dataset.assessPlaza);
      $("regional-workbench").scrollIntoView({block:"start"});
    }
    if (event.target.closest("[data-assess-retry]")) void drawAssessmentChart();
  });
  window.addEventListener("resize",()=>assessmentChart?.resize());
}

init();
