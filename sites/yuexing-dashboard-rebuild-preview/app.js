(function () {
  'use strict';
  var data = JSON.parse(document.getElementById('dashboard-data').textContent);
  var period = 'month', unit = 'wan', region = 'all';
  var storageKey = 'yuexing-dashboard-followups-v1';
  var records = {}, storageAvailable = true;
  var labels = {trade:'交易金额', revenue:'营业收入', profit:'总利润'};
  var $ = function (id) { return document.getElementById(id); };
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function amount(value) { return new Intl.NumberFormat('zh-CN',{minimumFractionDigits:unit === 'wan' ? 2 : 0,maximumFractionDigits:unit === 'wan' ? 2 : 0}).format(value / (unit === 'wan' ? 10000 : 1)); }
  function wan(value) { return new Intl.NumberFormat('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value / 10000); }
  function wanShort(value) {
    var n = value / 10000;
    if (Math.abs(n) >= 100) return new Intl.NumberFormat('zh-CN',{minimumFractionDigits:1,maximumFractionDigits:1}).format(n);
    return new Intl.NumberFormat('zh-CN',{minimumFractionDigits:1,maximumFractionDigits:1}).format(n);
  }
  function pct(value) { return (value * 100).toFixed(2) + '%'; }
  function pct1(value) { return (value * 100).toFixed(1) + '%'; }
  function suffix() { return unit === 'wan' ? '万元' : '元'; }
  function delta(value) { return (value < 0 ? '−' : '+') + amount(Math.abs(value)); }
  function difference(value) { return (value < 0 ? '低于预算 ' : '高于预算 ') + amount(Math.abs(value)) + suffix(); }
  function detailURL(row) { return '?plaza=' + encodeURIComponent(row.plaza_names[0] || row.name) + '#regional-workbench'; }
  function fmtDate(iso) { return String(iso || '').replaceAll('-', '.'); }
  function fmtRange(start, end) {
    function md(v) { var p = String(v).split('-'); return p[1] + '-' + p[2]; }
    return md(start) + ' 至 ' + md(end);
  }
  function int(n) { return new Intl.NumberFormat('zh-CN').format(n || 0); }
  try {
    records = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (!records || typeof records !== 'object' || Array.isArray(records)) records = {};
  } catch (error) {
    records = {}; storageAvailable = false;
  }

  function hero() {
    var c = data.cumulative;
    var tradeAsOf = c.tradeAsOf || data.asOf || data.reportDate || '';
    var profitAsOf = c.profitAsOf || '2026-09-30';
    var cash = c.cashFlow == null
      ? '<article class="hero-card cash"><div class="hero-card-head"><h3>净现金流</h3><span>待补数据</span></div><div class="hero-cash">暂无法核算</div><p>缺实际收付款与资金往来明细</p></article>'
      : '<article class="hero-card cash"><div class="hero-card-head"><h3>净现金流</h3><span>累计</span></div><div class="hero-value"><span class="yen">¥</span><strong>' + amount(c.cashFlow) + '</strong><em>' + suffix() + '</em></div></article>';
    $('hero-metrics').innerHTML =
      '<article class="hero-card primary trade">' +
        '<div class="hero-card-head"><h3>总流水<span class="hero-cutoff">截至 ' + esc(tradeAsOf) + '</span></h3><span>含税交易金额</span></div>' +
        '<div class="hero-value"><span class="yen">¥</span><strong>' + amount(c.trade) + '</strong><em>' + suffix() + '</em></div>' +
        '<p class="hero-micro">' + esc(c.tradeNote || '含税 · 开业累计 · 后台交易记录') + '</p>' +
      '</article>' +
      '<article class="hero-card primary profit">' +
        '<div class="hero-card-head"><h3>总利润<span class="hero-cutoff">截至 ' + esc(profitAsOf) + '</span></h3><span>表列 · 待复核</span></div>' +
        '<div class="hero-value"><span class="yen">¥</span><strong>' + amount(c.profit) + '</strong><em>' + suffix() + '</em></div>' +
        '<p class="hero-micro">重算 ' + amount(c.recomputedProfit) + ' · 差额 ' + amount(Math.abs(c.profitDifference)) + ' ' + suffix() + '</p>' +
      '</article>' + cash;
  }

  var lookback = null;
  window.YuexingSalesLookback = {
    apply: function (view) {
      lookback = view && view.date ? view : null;
      sales();
    }
  };
  function leyoyoText(value) {
    return new Intl.NumberFormat('zh-CN',{minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(value || 0));
  }
  function sales() {
    var salesData = data.sales || {};
    var embeddedDay = salesData.latest_day || data.latest || {};
    var week = salesData.rolling_7d || {};
    var mtd = salesData.mtd || {};
    var usingLookback = !!(lookback && lookback.date);
    var historical = usingLookback && !lookback.isLatest;
    var day = usingLookback ? {
      date: lookback.date,
      cutoff_time: lookback.isPartial ? lookback.cutoffTime : '',
      is_partial: !!lookback.isPartial,
      net_sales: lookback.yuexingNet,
      order_count: lookback.orderCount,
      member_active_count: lookback.memberActive,
      paid_sales: lookback.paidSales,
      refund_amount: lookback.refundAmount,
      refund_rate: lookback.refundRate
    } : embeddedDay;
    var members = day.member_active_count || 0;
    var monthMembers = mtd.member_active_count;
    var dns = data.daily_net_sales || null;
    var capsuleIncluded = usingLookback
      ? !!lookback.capsuleIncluded
      : !!(dns && dns.capsule_included === true && dns.total_yuan != null && dns.date && dns.date === day.date);
    var capsuleYuan = usingLookback
      ? Number(lookback.capsuleYuan || 0)
      : (capsuleIncluded && dns.capsule_yuan != null ? Number(dns.capsule_yuan) : 0);
    var ruleDate = usingLookback ? (lookback.capsuleRuleDate || '') : ((dns && dns.date) || '');
    var dayNet = usingLookback ? Number(lookback.netSales || 0) : Number(day.net_sales || 0);
    if (!usingLookback && capsuleIncluded) dayNet = Number(dns.total_yuan);
    var dayCapsuleNote = capsuleIncluded
      ? (' · 含乐摇摇 ¥' + leyoyoText(capsuleYuan))
      : (historical ? ' · 不含乐摇摇' : ' · 扭蛋未计入');
    var weekNet = Number(week.net_sales || 0);
    var mtdNet = Number(mtd.net_sales || 0);
    var weekCapsuleNote = ' · 周/月暂不含扭蛋';
    var mtdCapsuleNote = weekCapsuleNote;
    var anchorPlain = historical ? ('仍按最新日 ' + (lookback.latestDate || '') + ' 汇总') : '';
    var anchorHtml = anchorPlain ? ('<span class="sales-anchor">' + esc(anchorPlain) + '</span>') : '';
    var capsuleRule = ruleDate
      ? ('乐摇摇仅当所选日为 ' + ruleDate + ' 且已计入时叠加，与最新日同一规则')
      : '乐摇摇暂无可用日期';
    if (historical) {
      $('sales-sub').textContent = '正在回看 ' + lookback.date + '。当日净销售和当日会员跟这一天。' + capsuleRule + '。';
    } else if (capsuleIncluded) {
      $('sales-sub').textContent = '全国 · 最新日净销售含乐摇摇 ¥' + leyoyoText(capsuleYuan) + ' · ' + capsuleRule + ' · 周/月暂不含扭蛋 · 详情及变化率为悦行口径';
    } else {
      $('sales-sub').textContent = '全国 · 扭蛋未计入 · ' + capsuleRule + ' · 周/月暂不含扭蛋 · 详情及变化率为悦行口径';
    }
    var lookbackNote = $('sales-lookback-note');
    if (lookbackNote) {
      if (historical) {
        lookbackNote.hidden = false;
        lookbackNote.textContent = '回看 ' + lookback.date + '：当日净销售和当日会员跟这一天。本周、当月仍按最新日 ' + (lookback.latestDate || '') + ' 计算，不是所选日所在的周或月。' + (lookback.notice ? lookback.notice : '');
      } else if (lookback && lookback.notice) {
        lookbackNote.hidden = false;
        lookbackNote.textContent = lookback.notice;
      } else {
        lookbackNote.hidden = true;
        lookbackNote.textContent = '';
      }
    }
    function adj(block) {
      if (block.calendar_adjusted_change_pct == null) return '';
      var v = block.calendar_adjusted_change_pct;
      var cls = v < 0 ? 'down' : 'up';
      var sign = v < 0 ? '' : '+';
      return '<div class="sales-adj ' + cls + '">同类日校准 ' + sign + pct1(v) + '</div>';
    }
    function money(v) {
      return '<div class="sales-value"><span class="yen">¥</span><strong>' + amount(v) + '</strong><em>' + suffix() + '</em></div>';
    }
    var weekSame = !!(week.start && week.end && week.start === week.end);
    var weekTitle = weekSame ? '本周（仅含今日）' : '本周净销售';
    var weekMeta = weekSame
      ? esc(week.start || week.end || '') + ' · 非完整周' + weekCapsuleNote
      : esc(fmtRange(week.start, week.end)) + weekCapsuleNote;
    if (anchorHtml) weekMeta += '<br>' + anchorHtml;
    var monthMeta = esc(fmtRange(mtd.start, mtd.end)) + esc(mtdCapsuleNote) + (anchorHtml ? '<br>' + anchorHtml : '');
    var partial = day.is_partial ? ' · 部分日' : (historical ? ' · 全天' : '');
    var dayTitle = historical ? '单日净销售' : '最新日净销售';
    var dayWhen = historical
      ? (esc(day.date) + (lookback.calendar ? ' ' + esc(lookback.calendar) : '') + ' · ' + int(day.order_count) + ' 单' + partial + esc(dayCapsuleNote))
      : (esc(day.date) + ' 悦行截至 ' + esc(day.cutoff_time || '未知') + ' · ' + int(day.order_count) + ' 单' + partial + esc(dayCapsuleNote));
    $('sales-strip').innerHTML =
      '<article class="sales-card dark">' +
        '<div class="sales-card-head"><h3>' + dayTitle + '</h3><span class="sales-icon yen-icon" aria-hidden="true">¥</span></div>' +
        money(dayNet) +
        '<p class="sales-meta">' + dayWhen + '</p>' +
      '</article>' +
      '<article class="sales-card' + (weekSame ? ' partial-week' : '') + '">' +
        '<div class="sales-card-head"><h3>' + weekTitle + '</h3><span class="sales-icon chart-icon" aria-hidden="true">↗</span></div>' +
        money(weekNet) +
        '<p class="sales-meta">' + weekMeta + '</p>' +
        adj(week) +
        '<a class="sales-link" href="#trend-validation">趋势 →</a>' +
      '</article>' +
      '<article class="sales-card">' +
        '<div class="sales-card-head"><h3>当月净销售</h3><span class="sales-icon cal-icon" aria-hidden="true">日</span></div>' +
        money(mtdNet) +
        '<p class="sales-meta">' + monthMeta + '</p>' +
        adj(mtd) +
        '<a class="sales-link" href="#trend-validation">趋势 →</a>' +
      '</article>' +
      '<article class="sales-card">' +
        '<div class="sales-card-head"><h3>当日交易会员</h3><span class="sales-icon user-icon" aria-hidden="true">人</span></div>' +
        '<div class="sales-value"><strong>' + int(members) + '</strong><em>人</em></div>' +
        '<p class="sales-meta">' + (historical ? '所选日去重' : '当日去重') + '</p>' +
        (monthMembers != null ? '<div class="sales-secondary">月累计活跃 ' + int(monthMembers) + (historical ? ' · 仍按最新日' : '') + '</div>' : '') +
      '</article>';
    var foot = [];
    if (day.date) foot.push((historical ? '回看 ' : '单日 ') + day.date);
    if (weekSame) foot.push('本周仅含 ' + (week.start || day.date));
    else if (week.end) foot.push((historical ? '周仍截至 ' : '周截至 ') + week.end);
    if (mtd.end) foot.push((historical ? '月仍截至 ' : '月截至 ') + mtd.end);
    if (day.is_partial && day.date) foot.push(day.date + ' 部分日');

    $('sales-foot').textContent = foot.join('  ·  ');
    bossKpis();
  }

  function bossKpis() {
    var root = $('boss-strip');
    if (!root) return;
    var salesData = data.sales || {};
    var boss = salesData.boss_kpis || data.boss_kpis || {};
    var embeddedDay = salesData.latest_day || data.latest || {};
    var usingLookback = !!(lookback && lookback.date);
    var historical = usingLookback && !lookback.isLatest;
    var day = usingLookback ? {
      date: lookback.date,
      paid_sales: lookback.paidSales,
      refund_amount: lookback.refundAmount,
      refund_rate: lookback.refundRate
    } : embeddedDay;
    var bal = boss.member_balance || {};
    var ref = boss.refund_rate || {};
    var nr = boss.new_returning || {};
    var asOf = (bal.as_of_day || embeddedDay.date || data.asOf || '');
    function rateText(v) {
      if (v == null || !isFinite(Number(v))) return '—';
      return pct(Number(v));
    }
    function moneyText(v) {
      if (v == null || !isFinite(Number(v))) return null;
      return amount(Number(v));
    }
    var balCard;
    if (historical) {
      var balDay = lookback.memberBalance;
      var balDayVal = balDay ? moneyText(balDay.member_balance_yuan) : null;
      balCard = balDayVal == null
        ? ('<article class="boss-card missing">' +
            '<div class="boss-card-head"><h3>会员余额沉淀</h3><span class="boss-tag">回看 ' + esc(day.date) + '</span></div>' +
            '<div class="boss-value"><strong>所选日暂无余额快照</strong></div>' +
            '<p class="boss-meta">不沿用最新日余额</p></article>')
        : ('<article class="boss-card">' +
            '<div class="boss-card-head"><h3>会员余额沉淀</h3><span class="boss-tag">截至 ' + esc(day.date) + '</span></div>' +
            '<div class="boss-value"><span class="yen">¥</span><strong>' + balDayVal + '</strong><em>' + suffix() + '</em></div>' +
            '<p class="boss-meta">未核销兔币人民币价值（含赠币）</p>' +
            (balDay.total_coin_value != null ? '<div class="boss-secondary">兔币总量 ' + int(balDay.total_coin_value) + '</div>' : '') +
          '</article>');
    } else {
      var balVal = moneyText(bal.yuan);
      balCard = balVal == null
        ? ('<article class="boss-card missing">' +
            '<div class="boss-card-head"><h3>会员余额沉淀</h3><span class="boss-tag">待接通</span></div>' +
            '<div class="boss-value"><strong>暂无可靠源</strong></div>' +
            '<p class="boss-meta">需后台币值总览接口</p></article>')
        : ('<article class="boss-card">' +
            '<div class="boss-card-head"><h3>会员余额沉淀</h3><span class="boss-tag">截至 ' + esc(asOf) + '</span></div>' +
            '<div class="boss-value"><span class="yen">¥</span><strong>' + balVal + '</strong><em>' + suffix() + '</em></div>' +
            '<p class="boss-meta">未核销兔币人民币价值（含赠币）</p>' +
            (bal.total_coin_value != null ? '<div class="boss-secondary">兔币总量 ' + int(bal.total_coin_value) + '</div>' : '') +
          '</article>');
    }
    var refLatest = historical
      ? day.refund_rate
      : (ref.latest_day != null ? ref.latest_day : (day.paid_sales ? (Number(day.refund_amount || 0) / Number(day.paid_sales)) : null));
    var refCard =
      '<article class="boss-card">' +
        '<div class="boss-card-head"><h3>退款率</h3><span class="boss-tag">金额口径</span></div>' +
        '<div class="boss-value"><strong>' + rateText(refLatest) + '</strong></div>' +
        '<p class="boss-meta">退款÷实付 · ' + (historical ? '回看 ' : '单日 ') + esc(day.date || '') + '</p>' +
        '<div class="boss-secondary">近7日 ' + rateText(ref.rolling_7d) + ' · 当月 ' + rateText(ref.mtd) + (historical ? ' · 仍按最新日' : '') + '</div>' +
      '</article>';
    var nrCard;
    var nrDay = historical ? lookback.newReturning : null;
    if (historical && !nrDay) {
      nrCard =
        '<article class="boss-card missing">' +
          '<div class="boss-card-head"><h3>新客 / 复购</h3><span class="boss-tag">回看 ' + esc(day.date) + '</span></div>' +
          '<div class="boss-value"><strong>所选日暂无新客拆分</strong></div>' +
          '<p class="boss-meta">不沿用其他日期的人数</p>' +
        '</article>';
    } else if (historical && nrDay) {
      nrCard =
        '<article class="boss-card">' +
          '<div class="boss-card-head"><h3>新客 / 复购</h3><span class="boss-tag">回看 ' + esc(day.date) + '</span></div>' +
          '<div class="boss-value"><strong>' + rateText(nrDay.new_customer_share) + '</strong><em>新客占比</em></div>' +
          '<p class="boss-meta">新客 ' + int(nrDay.new_customer_count) + ' · 复购 ' + int(nrDay.returning_customer_count) + ' · 共 ' + int(nrDay.trading_member_count) + ' 人</p>' +
          '<div class="boss-secondary">新客＝当日新注册且有交易；复购＝其余交易会员</div>' +
        '</article>';
    } else if (nr.available) {
      nrCard =
        '<article class="boss-card">' +
          '<div class="boss-card-head"><h3>新客 / 复购</h3><span class="boss-tag">交易会员</span></div>' +
          '<div class="boss-value"><strong>' + rateText(nr.new_customer_share) + '</strong><em>新客占比</em></div>' +
          '<p class="boss-meta">新客 ' + int(nr.new_customer_count) + ' · 复购 ' + int(nr.returning_customer_count) + ' · 共 ' + int(nr.trading_member_count) + ' 人</p>' +
          '<div class="boss-secondary">新客＝当日新注册且有交易；复购＝其余交易会员</div>' +
        '</article>';
    } else {
      nrCard =
        '<article class="boss-card missing">' +
          '<div class="boss-card-head"><h3>新客 / 复购</h3><span class="boss-tag">部分可得</span></div>' +
          '<div class="boss-value"><strong>' + (nr.new_registered_count != null ? int(nr.new_registered_count) : '—') + '</strong><em>当日新注册</em></div>' +
          '<p class="boss-meta">' + esc(nr.reason || '缺订单明细交叉，暂不展示新客/复购占比') + '</p>' +
        '</article>';
    }
    root.innerHTML = balCard + refCard + nrCard;
  }

  function financial() {
    var p = data.periods[period], trade = p.metrics.trade, profit = p.metrics.profit;
    var resultTitle = $('result-title'), resultCopy = $('result-copy'), gapPeriod = $('gap-period'), kpis = $('kpis');
    var budgetChart = $('budget-chart'), businessUnit = $('business-unit'), businessChart = $('business-chart');
    var profitBridgeTitle = $('profit-bridge-title'), profitBridgeContent = $('profit-bridge-content');
    // Period-finance UI is hidden; fill only when stubs exist (data kept unused otherwise).
    if (resultTitle) resultTitle.textContent = (trade.actual < trade.budget ? '流水低于预算' : '流水达到预算') + '，' + (profit.actual >= profit.budget ? '利润高于预算' : '利润低于预算');
    if (resultCopy) resultCopy.textContent = p.label + '交易金额' + difference(trade.actual - trade.budget) + '；表列总利润' + difference(profit.actual - profit.budget) + '。';
    if (gapPeriod) gapPeriod.textContent = p.start.replaceAll('-', '.') + '—' + p.end.replaceAll('-', '.') + ' · 金额单位：' + suffix();
    if (kpis) kpis.innerHTML = ['trade','revenue','profit'].map(function (key) {
      var m = p.metrics[key], gap = m.actual - m.budget;
      return '<article class="kpi"><div class="kpi-head"><h3>' + labels[key] + '</h3><span>' + (key === 'trade' ? '含税' : key === 'revenue' ? '不含税' : '表列 · 待复核') + '</span></div><div class="metric-number"><strong>' + amount(m.actual) + '</strong><span>' + suffix() + '</span></div><p>预算完成 <b class="' + (gap < 0 ? 'negative' : 'positive') + '">' + pct(m.actual / m.budget) + '</b></p><small>' + difference(gap) + '</small></article>';
    }).join('') + '<article class="kpi cash"><div class="kpi-head"><h3>净现金流</h3><span>待补数据</span></div><div class="cash-value">暂无法核算</div><p>待补实际收付款</p><small>含设备采购、押金及资金往来</small></article>';
    if (budgetChart) {
      var scale = Math.max(1.25, Math.ceil(Math.max.apply(null, Object.values(p.metrics).map(function(m) { return m.actual / m.budget; })) * 4) / 4);
      budgetChart.innerHTML = ['trade','revenue','profit'].map(function(key) {
        var m=p.metrics[key], rate=m.actual/m.budget;
        return '<div class="budget-row"><div class="budget-label"><strong>' + labels[key] + '</strong><b class="' + (rate<1?'negative':'positive') + '">' + pct(rate) + '</b></div><div class="budget-track" role="img" aria-label="' + labels[key] + '预算完成' + pct(rate) + '，预算标线100%"><span class="budget-fill ' + (rate<1?'short':'met') + '" style="width:' + (rate/scale*100) + '%"></span><i style="left:' + (1/scale*100) + '%"></i></div><div class="budget-values"><span>' + amount(m.actual) + ' / ' + amount(m.budget) + ' ' + suffix() + '</span><span>' + (rate<1?'少 ':'多 ') + amount(Math.abs(m.actual-m.budget)) + '</span></div></div>';
      }).join('') + '<div class="budget-axis"><span>0%</span><span style="left:' + (1/scale*100) + '%">100% 预算</span><span>' + (scale*100).toFixed(0) + '%</span></div>';
    }
    if (businessUnit || businessChart) {
      var business = p.business.slice().sort(function(a,b) { return a.actual-a.budget-(b.actual-b.budget); });
      var max = Math.max.apply(null,business.map(function(r) { return Math.abs(r.actual-r.budget); })) || 1;
      if (businessUnit) businessUnit.textContent = '差额 · ' + suffix();
      if (businessChart) businessChart.innerHTML = business.map(function(r) {
        var gap=r.actual-r.budget, width=Math.abs(gap)/max*47;
        return '<div class="business-row"><div class="business-label"><strong>' + r.name + '</strong><b class="' + (gap<0?'negative':'positive') + '">' + delta(gap) + '</b></div><div class="delta-plot" role="img" aria-label="' + esc(r.name+difference(gap)) + '"><span class="delta-bar ' + (gap<0?'short':'met') + '" style="width:' + width + '%;' + (gap<0?'right:50%':'left:50%') + '"></span></div><div class="business-values">实际 ' + amount(r.actual) + ' · 预算 ' + amount(r.budget) + '</div></div>';
      }).join('') + '<div class="delta-axis"><span>低于预算</span><span>0</span><span>高于预算</span></div>';
    }
    if (profitBridgeTitle) profitBridgeTitle.textContent = '表列利润' + difference(profit.actual-profit.budget);
    if (profitBridgeContent) profitBridgeContent.innerHTML = p.profitDrivers.map(function(r) {return '<div><span>' + r.name + '</span><strong class="' + (r.impact<0?'negative':'positive') + '">' + delta(r.impact) + ' ' + suffix() + '</strong></div>';}).join('') + '<p>科目重算与表列差额相差 ' + Math.abs(p.profitResidual).toFixed(0) + ' 元（原表取整）。</p>';
    document.body.classList.toggle('yuan',unit==='yuan');
    hero();
    sales();
  }

  function visibleProjects() { return data.projects.filter(function(p) { return p.gap < 0 && (region === 'all' || p.region_id === region); }).slice(0,5); }
  function operational() {
    var total=data.assessment, gap=total.target-total.actual;
    var summary=$('regional-summary'), regionRows=$('region-rows'), regionFilter=$('region-filter');
    if (summary) summary.innerHTML = '<p><strong>四大区净销售目标完成 ' + pct(total.actual/total.target) + '</strong><span>距离月度目标还差 ' + wan(gap) + ' 万元</span></p><span>' + total.assessedCount + ' 个真实项目计入考核</span>';
    if (regionRows) regionRows.innerHTML = data.regions.slice().sort(function(a,b) { return a.gap-b.gap; }).map(function(r) {
      return '<tr><th scope="row"><strong>' + r.name + '</strong><small>' + r.manager + '</small></th><td>' + wan(r.actual) + '<small>万元</small></td><td>' + wan(r.target) + '<small>万元</small></td><td class="negative">' + wan(-r.gap) + '<small>万元</small></td><td><div class="region-rate"><strong>' + pct(r.actual/r.target) + '</strong><span><i style="width:' + Math.min(100,r.actual/r.target*100) + '%"></i></span></div></td></tr>';
    }).join('');
    if (regionFilter && regionFilter.options.length <= 1) data.regions.forEach(function(r) { var option=document.createElement('option');option.value=r.id;option.textContent=r.name;regionFilter.append(option); });
    projects();
  }
  function projects() {
    var rows=visibleProjects();
    var count=data.projects.filter(function(p) { return p.gap<0 && (region==='all'||p.region_id===region); }).length;
    var projectCount=$('project-count'), projectRows=$('project-rows');
    if (projectCount) projectCount.textContent = '从' + count + '个未达目标的有指标项目中，按缺口金额选取前' + rows.length + '个 · 金额：万元';
    if (projectRows) projectRows.innerHTML = rows.map(function(p) {
      return '<tr><th scope="row"><a class="project-name" href="' + detailURL(p) + '">' + esc(p.name) + '</a><small>' + esc(p.region + ' · ' + p.manager) + '</small></th><td>' + wan(p.actual) + '</td><td class="negative">' + wan(-p.gap) + '</td><td>' + pct(p.actual/p.target) + '</td><td class="direction">核对销售记录与现场执行<small>归属主管：' + esc(p.supervisor) + '</small></td><td><button class="text-button" type="button" data-follow="' + p.id + '">登记跟进</button></td></tr>';
    }).join('');
    actions();
  }
  function actions() {
    var rows=visibleProjects(), done=rows.filter(function(p) { return records[p.id] && records[p.id].status === '已完成'; }).length;
    $('action-count').textContent = '当前' + rows.length + '项 · 已登记完成' + done + '项';
    $('action-list').innerHTML = rows.map(function(p) {
      var r=records[p.id] || {}, status=['未登记','待处理','处理中','已完成'].includes(r.status) ? r.status : '未登记';
      return '<details class="action-item" id="action-' + p.id + '"><summary><div><strong>' + esc(p.name) + '</strong><span>9月目标缺口 ' + wan(-p.gap) + ' 万元 · ' + esc(p.region) + '</span></div><div class="action-meta"><span class="status ' + (status==='已完成'?'green':status==='未登记'?'neutral':'amber') + '">' + status + '</span><span>' + esc(r.owner || '跟进人待确认') + '</span><span>' + esc(r.due || '截止时间待定') + '</span><b class="edit-label">' + (r.status ? '查看 / 编辑' : '登记跟进') + '</b></div></summary><form data-project="' + p.id + '"><p class="form-context">建议核对销售记录与现场活动执行。原归属主管：' + esc(p.supervisor) + '；具体跟进人请在此确认。</p><div class="form-grid"><label>跟进人<input name="owner" maxlength="40" value="' + esc(r.owner || '') + '" placeholder="填写确认后的负责人"></label><label>截止日期<input type="date" name="due" value="' + esc(r.due || '') + '"></label><label>处理状态<select name="status">' + ['未登记','待处理','处理中','已完成'].map(function(s) {return '<option' + (s===status?' selected':'') + '>' + s + '</option>';}).join('') + '</select></label></div><label>处理记录与结果<textarea name="note" rows="3" maxlength="1000" placeholder="填写已核实原因、措施或处理结果">' + esc(r.note || '') + '</textarea></label><div class="form-bottom"><span>' + (r.updated ? '本机记录更新于 ' + esc(r.updated) : '尚无执行记录') + '</span><div class="form-buttons">' + (r.status ? '<button class="text-button" type="button" data-clear-record="' + p.id + '">清除本机记录</button>' : '') + '<button class="button" type="submit">保存跟进记录</button></div></div></form></details>';
    }).join('');
    if (!storageAvailable) $('save-status').textContent='当前浏览器存储不可用，跟进记录暂时仅保留在本次打开的页面中。';
  }
  $('period').addEventListener('change',function(e) {period=e.target.value;financial();});
  document.querySelectorAll('[data-unit]').forEach(function(button) {
    button.addEventListener('click',function() {unit=button.dataset.unit;document.querySelectorAll('[data-unit]').forEach(function(b) {b.setAttribute('aria-pressed',String(b===button));});financial();});
  });
  var regionFilter=$('region-filter'); if(regionFilter) regionFilter.addEventListener('change',function(e) {region=e.target.value;projects();});
  var projectRows=$('project-rows'); if(projectRows) projectRows.addEventListener('click',function(e) {
    var button=e.target.closest('[data-follow]');
    if (!button) return;
    var target=$('action-'+button.dataset.follow); if(!target) return; target.open=true;target.scrollIntoView({behavior:'smooth',block:'center'}); var input=target.querySelector('input'); if(input) input.focus({preventScroll:true});
  });
  $('action-list').addEventListener('submit',function(e) {
    e.preventDefault();
    var form=e.target, values=new FormData(form), status=values.get('status'), note=String(values.get('note')).trim(), owner=String(values.get('owner')).trim();
    var ownerInput=form.elements.owner, noteInput=form.elements.note;
    ownerInput.setCustomValidity(['处理中','已完成'].includes(status) && !owner ? '请填写已确认的跟进人。' : '');
    noteInput.setCustomValidity(status==='已完成' && !note ? '请记录处理结果后标为已完成。' : '');
    if (!form.reportValidity()) return;
    records[form.dataset.project]={owner:owner,due:values.get('due'),status:status,note:note,updated:new Date().toLocaleString('zh-CN',{hour12:false})};
    try {localStorage.setItem(storageKey,JSON.stringify(records));storageAvailable=true;} catch(error) {storageAvailable=false;}
    var id=form.dataset.project;
    actions();$('action-'+id).open=true;
    $('save-status').textContent=storageAvailable?'已保存到当前浏览器。':'浏览器存储不可用，记录仅保留在本次页面中。';
  });
  $('action-list').addEventListener('input',function(e) {if (e.target.setCustomValidity) e.target.setCustomValidity('');});
  $('action-list').addEventListener('click',function(e) {
    var clear=e.target.closest('[data-clear-record]');
    if (!clear) return;
    delete records[clear.dataset.clearRecord];
    try {localStorage.setItem(storageKey,JSON.stringify(records));} catch(error) {storageAvailable=false;}
    actions();$('save-status').textContent='已清除这项本机跟进记录，恢复为未登记。';
  });
  $('export').addEventListener('click',function() {
    var p=data.periods[period], rows=[['悦行童玩经营汇总',p.label,'人民币元'],['财务指标','实际','预算','差额','预算完成率']];
    ['trade','revenue','profit'].forEach(function(k) {var m=p.metrics[k];rows.push([labels[k]+(k==='profit'?'（表列待复核）':''),m.actual,m.budget,m.actual-m.budget,pct(m.actual/m.budget)]);});
    rows.push(['净现金流','待补实际收付款数据'],[],['业态营业收入（不含税）','实际','预算','差额']);
    p.business.forEach(function(r) {rows.push([r.name,r.actual,r.budget,r.actual-r.budget]);});
    rows.push([],['2026年9月重点广场净销售考核','实际','目标','缺口','区域']);
    visibleProjects().forEach(function(r) {rows.push([r.name,r.actual,r.target,-r.gap,r.region]);});
    rows.push([],['说明','财务与区域净销售考核口径独立；总利润为原表列数，待复核。']);
    var csv='\uFEFF'+rows.map(function(row) {return row.map(function(v) {return '"'+String(v).replaceAll('"','""')+'"';}).join(',');}).join('\r\n');
    var url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
    a.href=url;a.download='悦行童玩经营汇总_'+(period==='month'?'202609':'202601-09')+'.csv';a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);
  });
  hero();sales();financial();operational();
  var navLinks=Array.from(document.querySelectorAll('.sidebar nav a'));
  var observer=new IntersectionObserver(function(entries) {entries.forEach(function(entry) {if(entry.isIntersecting)navLinks.forEach(function(a){a.classList.toggle('active',a.hash==='#'+entry.target.id);});});},{rootMargin:'-5% 0px -65% 0px'});
  ['summary','sales','regional-assessment','regional-workbench','trend-validation'].forEach(function(id){var node=$(id); if(node) observer.observe(node);});
}());
