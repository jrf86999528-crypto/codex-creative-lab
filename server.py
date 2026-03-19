from __future__ import annotations

import json
import os
import re
import subprocess
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from http import HTTPStatus
from http.client import IncompleteRead
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent
PORT = 4173
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/123.0.0.0 Safari/537.36"
)

DEFAULT_SYMBOL = "601155.SH"
DEFAULT_PEERS = [
    "601155.SH",
    "600048.SH",
    "001979.SZ",
    "600325.SH",
    "002244.SZ",
    "600606.SH",
    "600383.SH",
]
MARKET_INDEX_SECIDS = [
    ("1.000001", "SH"),
    ("0.399001", "SZ"),
    ("0.399006", "CYB"),
    ("1.000300", "CSI300"),
    ("1.000905", "CSI500"),
]
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
OPENAI_MODEL = os.getenv("STOCK_AI_MODEL", "gpt-5.4")

ANNOUNCEMENT_CATEGORY_RULES = [
    ("财报/业绩", ("年度报告", "半年度报告", "季度报告", "业绩", "快报", "预告", "审计报告")),
    ("经营数据", ("经营简报", "销售简报", "产销", "运营数据", "订单", "月报", "交付")),
    ("融资/债务", ("债券", "融资", "借款", "授信", "担保", "票据", "回售", "发行", "偿还")),
    ("资本运作", ("回购", "增持", "减持", "分红", "质押", "解押", "股份", "股权", "员工持股")),
    ("重大事项", ("收购", "出售", "重组", "并购", "投资", "签订", "中标", "项目", "REIT", "受理", "获批")),
    ("合规/风险", ("诉讼", "仲裁", "处罚", "问询", "风险", "冻结", "违约", "延期", "终止")),
    ("治理/人事", ("董事", "监事", "高管", "辞职", "聘任", "换届")),
]
POSITIVE_ANNOUNCEMENT_KEYWORDS = (
    "增长",
    "回购",
    "增持",
    "中标",
    "签订",
    "预增",
    "分红",
    "受理",
    "获批",
    "通过",
    "解除质押",
    "开业",
    "提价",
)
NEGATIVE_ANNOUNCEMENT_KEYWORDS = (
    "减持",
    "质押",
    "诉讼",
    "处罚",
    "问询",
    "风险",
    "亏损",
    "预减",
    "终止",
    "延期",
    "冻结",
    "违约",
    "担保",
    "下调",
)

CACHE_LOCK = threading.Lock()
CACHE: dict[str, tuple[float, object]] = {}


class StockWorkbenchHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path == "/extinct-lab":
            self.path = "/extinct-lab.html"
            super().do_GET()
            return

        if parsed.path == "/stock":
            self.path = "/stock.html"
            super().do_GET()
            return

        if parsed.path == "/api/stock/health":
            self.send_json({"ok": True, "serverTime": datetime.now().isoformat(timespec="seconds")}, HTTPStatus.OK)
            return

        if parsed.path == "/api/stock/dashboard":
            self.handle_dashboard(parsed.query)
            return

        if parsed.path == "/api/stock/predict":
            self.handle_predict(parsed.query)
            return

        super().do_GET()

    def do_HEAD(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/extinct-lab":
            self.path = "/extinct-lab.html"
        if parsed.path == "/stock":
            self.path = "/stock.html"
        super().do_HEAD()

    def handle_dashboard(self, raw_query: str) -> None:
        try:
            symbol, watchlist = resolve_request_symbols(raw_query)
            payload = get_dashboard_payload(symbol, watchlist)
        except (HTTPError, URLError) as error:
            self.send_json({"error": f"Upstream fetch failed: {error}"}, HTTPStatus.BAD_GATEWAY)
            return
        except ValueError as error:
            self.send_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)
            return

        self.send_json(payload, HTTPStatus.OK)

    def handle_predict(self, raw_query: str) -> None:
        try:
            symbol, watchlist = resolve_request_symbols(raw_query)
            payload = build_prediction_payload(symbol, watchlist)
        except (HTTPError, URLError) as error:
            self.send_json({"error": f"Upstream fetch failed: {error}"}, HTTPStatus.BAD_GATEWAY)
            return
        except ValueError as error:
            self.send_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)
            return

        self.send_json(payload, HTTPStatus.OK)

    def send_json(self, payload: object, status: HTTPStatus) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def resolve_request_symbols(raw_query: str) -> tuple[str, list[str]]:
    params = parse_qs(raw_query)
    symbol = normalize_symbol(params.get("symbol", [DEFAULT_SYMBOL])[0])
    peer_symbols = params.get("peers", [])

    if peer_symbols:
        watchlist = [normalize_symbol(item) for item in peer_symbols[0].split(",") if item.strip()]
    else:
        watchlist = build_watchlist(symbol)

    if not symbol:
        raise ValueError("Invalid symbol")

    return symbol, watchlist


def get_dashboard_payload(symbol: str, watchlist: list[str]) -> dict[str, object]:
    cache_key = f"dashboard:{symbol}:{','.join(watchlist)}"
    return get_cached(cache_key, 15, lambda: build_dashboard_payload(symbol, watchlist))


def build_prediction_payload(symbol: str, watchlist: list[str]) -> dict[str, object]:
    dashboard = get_dashboard_payload(symbol, watchlist)
    local_engine = build_local_prediction(dashboard)
    warnings = list(dashboard.get("warnings") or [])
    report = local_engine
    overlay = None
    engine = "local"
    model = "local-heuristic-v1"

    if OPENAI_API_KEY:
        quote = dashboard.get("quote") or {}
        cache_key = f"predict:{symbol}:{quote.get('snapshotAt')}:{quote.get('price')}"
        try:
            overlay = get_cached(cache_key, 90, lambda: fetch_openai_overlay(build_ai_context(dashboard, local_engine)))
            report = merge_ai_overlay(local_engine, overlay)
            engine = "openai"
            model = overlay.get("model") or OPENAI_MODEL
        except Exception as error:  # noqa: BLE001
            warnings.append(f"ai: {error}")

    return {
        "symbol": symbol,
        "serverTime": datetime.now().isoformat(timespec="seconds"),
        "engine": engine,
        "model": model,
        "aiAvailable": bool(OPENAI_API_KEY),
        "warnings": warnings,
        "quoteSnapshot": dashboard.get("quote"),
        "report": report,
        "localEngine": local_engine,
        "overlay": overlay,
    }


def build_dashboard_payload(symbol: str, watchlist: list[str]) -> dict[str, object]:
    secid = symbol_to_secid(symbol)
    warnings: list[str] = []

    required_fetchers = {
        "quote": lambda: fetch_quote(secid),
        "intraday": lambda: fetch_intraday(secid),
        "daily": lambda: fetch_daily_klines(secid),
    }
    optional_fetchers = {
        "flow": lambda: fetch_flow(secid),
        "tape": lambda: fetch_trade_tape(secid),
        "announcements": lambda: get_cached(f"announcements:{symbol}", 120, lambda: fetch_announcements(symbol)),
        "watchlist": lambda: fetch_watchlist_quotes(watchlist),
        "fundamentals": lambda: get_cached(f"fundamentals:{symbol}", 600, lambda: fetch_fundamentals(secid)),
        "marketOverview": lambda: get_cached("market-overview", 60, fetch_market_overview),
    }
    results: dict[str, object] = {}

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {
            **{key: executor.submit(fetcher) for key, fetcher in required_fetchers.items()},
            **{key: executor.submit(fetcher) for key, fetcher in optional_fetchers.items()},
        }

        for key, future in futures.items():
            try:
                results[key] = future.result()
            except Exception as error:  # noqa: BLE001
                if key in required_fetchers:
                    raise
                warnings.append(f"{key}: {error}")
                results[key] = []

    quote = results["quote"]
    if not isinstance(quote, dict) or not quote.get("price"):
        raise ValueError("Quote data unavailable")

    return {
        "symbol": symbol,
        "secid": secid,
        "serverTime": datetime.now().isoformat(timespec="seconds"),
        "refreshSeconds": 15,
        "warnings": warnings,
        "quote": quote,
        "intraday": results["intraday"],
        "daily": results["daily"],
        "flow": results["flow"],
        "tape": results["tape"],
        "announcements": results["announcements"],
        "watchlist": results["watchlist"],
        "fundamentals": results["fundamentals"],
        "marketOverview": results["marketOverview"],
    }


def build_local_prediction(dashboard: dict[str, object]) -> dict[str, object]:
    quote = dashboard.get("quote") if isinstance(dashboard.get("quote"), dict) else {}
    intraday = dashboard.get("intraday") if isinstance(dashboard.get("intraday"), list) else []
    daily = dashboard.get("daily") if isinstance(dashboard.get("daily"), list) else []
    flow = dashboard.get("flow") if isinstance(dashboard.get("flow"), list) else []
    fundamentals = dashboard.get("fundamentals") if isinstance(dashboard.get("fundamentals"), dict) else {}
    announcements = dashboard.get("announcements") if isinstance(dashboard.get("announcements"), list) else []
    market_overview = dashboard.get("marketOverview") if isinstance(dashboard.get("marketOverview"), dict) else {}

    daily_stats = summarize_daily_series(daily)
    intraday_stats = summarize_intraday_series(quote, intraday)
    flow_stats = summarize_flow_series(flow, quote)
    market_stats = summarize_market_context(market_overview)
    announcement_stats = summarize_announcements(announcements)

    tech_score, tech_summary, tech_pos, tech_neg = score_technical_block(quote, daily_stats, intraday_stats)
    flow_score, flow_summary, flow_pos, flow_neg = score_flow_block(flow_stats)
    market_score, market_summary, market_pos, market_neg = score_market_block(market_stats)
    fundamental_score, fundamental_summary, fund_pos, fund_neg = score_fundamental_block(quote, fundamentals)
    news_score, news_summary, news_pos, news_neg = score_news_block(announcement_stats)

    scorecard = [
        scorecard_entry("技术位置", tech_score, tech_summary),
        scorecard_entry("资金脉冲", flow_score, flow_summary),
        scorecard_entry("市场风向", market_score, market_summary),
        scorecard_entry("基本面", fundamental_score, fundamental_summary),
        scorecard_entry("公告情绪", news_score, news_summary),
    ]

    total_score = clamp(round(tech_score * 0.30 + flow_score * 0.20 + market_score * 0.15 + fundamental_score * 0.20 + news_score * 0.15))
    one_day_score = clamp(round(tech_score * 0.35 + flow_score * 0.25 + market_score * 0.20 + news_score * 0.15 + fundamental_score * 0.05))
    five_day_score = clamp(round(tech_score * 0.25 + flow_score * 0.10 + market_score * 0.10 + news_score * 0.15 + fundamental_score * 0.40))

    completeness_flags = [
        bool(quote),
        bool(intraday),
        bool(daily),
        bool(flow),
        bool(fundamentals),
        bool(market_overview),
        bool(announcements),
    ]
    completeness = sum(1 for flag in completeness_flags if flag) / len(completeness_flags)
    confidence = int(clamp(round(42 + abs(total_score - 50) * 0.9 + completeness * 18), 35, 92))

    positive_drivers = dedupe_items(tech_pos + flow_pos + market_pos + fund_pos + news_pos)[:4]
    negative_drivers = dedupe_items(tech_neg + flow_neg + market_neg + fund_neg + news_neg)[:4]

    daily_vol = daily_stats.get("realizedVol10") or max(abs(quote.get("pctChange") or 0), 1.2)
    one_day_range = infer_range_text(one_day_score, daily_vol)
    five_day_range = infer_range_text(five_day_score, (daily_vol or 1.2) * 2.2)

    signal_cards = build_signal_cards(quote, daily_stats, intraday_stats, flow_stats, market_stats)
    earnings_card = build_earnings_card(fundamentals)
    valuation_card = build_valuation_card(quote, fundamentals)
    announcement_card = build_announcement_card(announcement_stats)
    market_card = build_market_card(market_stats)

    catalysts = dedupe_items(
        announcement_stats.get("catalysts", [])
        + positive_drivers[:2]
        + market_stats.get("catalysts", [])
    )[:4]
    risks = dedupe_items(
        negative_drivers[:3]
        + announcement_stats.get("risks", [])
        + market_stats.get("risks", [])
    )[:4]
    invalidation = build_invalidation_points(quote, daily_stats, intraday_stats)
    action_plan = build_action_plan(one_day_score, five_day_score, quote, daily_stats)

    return {
        "headline": build_headline(total_score, one_day_score, five_day_score),
        "thesis": build_thesis(total_score, positive_drivers, negative_drivers, quote, fundamentals),
        "confidence": confidence,
        "totalScore": total_score,
        "bias": bias_from_score(total_score),
        "scorecard": scorecard,
        "horizons": [
            {
                "label": "1日",
                "bias": bias_from_score(one_day_score),
                "score": one_day_score,
                "confidence": int(clamp(round(confidence * 0.92), 30, 90)),
                "rangeText": one_day_range,
                "summary": build_horizon_summary("短线", one_day_score, positive_drivers, negative_drivers),
            },
            {
                "label": "5日",
                "bias": bias_from_score(five_day_score),
                "score": five_day_score,
                "confidence": int(clamp(round(confidence * 0.96), 30, 92)),
                "rangeText": five_day_range,
                "summary": build_horizon_summary("波段", five_day_score, positive_drivers, negative_drivers),
            },
        ],
        "signalCards": signal_cards,
        "catalysts": catalysts or ["等待新的经营数据、财报或公告催化。"],
        "risks": risks or ["当前样本未显示显著新增风险，但仍需跟踪盘口和公告变化。"],
        "invalidation": invalidation,
        "actionPlan": action_plan,
        "confidenceNote": (
            "这是基于盘口、资金、市场宽度、公告和财务快照的盘中推演，不等同于收益承诺。"
        ),
        "earningsCard": earnings_card,
        "valuationCard": valuation_card,
        "announcementCard": announcement_card,
        "marketCard": market_card,
        "drivers": {
            "positive": positive_drivers[:4],
            "negative": negative_drivers[:4],
        },
    }


def build_ai_context(dashboard: dict[str, object], local_engine: dict[str, object]) -> dict[str, object]:
    daily = dashboard.get("daily") if isinstance(dashboard.get("daily"), list) else []
    intraday = dashboard.get("intraday") if isinstance(dashboard.get("intraday"), list) else []
    flow = dashboard.get("flow") if isinstance(dashboard.get("flow"), list) else []
    announcements = dashboard.get("announcements") if isinstance(dashboard.get("announcements"), list) else []
    market_overview = dashboard.get("marketOverview") if isinstance(dashboard.get("marketOverview"), dict) else {}

    return {
        "symbol": dashboard.get("symbol"),
        "serverTime": dashboard.get("serverTime"),
        "quote": dashboard.get("quote"),
        "fundamentals": dashboard.get("fundamentals"),
        "marketOverview": {
            "breadth": (market_overview.get("breadth") or {}),
            "indices": (market_overview.get("indices") or [])[:5],
            "sectorHeat": {
                "industries": ((market_overview.get("sectorHeat") or {}).get("industries") or [])[:5],
                "concepts": ((market_overview.get("sectorHeat") or {}).get("concepts") or [])[:5],
            },
        },
        "dailyTail": daily[-20:],
        "intradayTail": intraday[-20:],
        "flowTail": flow[-20:],
        "announcements": announcements[:6],
        "localEngine": {
            "headline": local_engine.get("headline"),
            "thesis": local_engine.get("thesis"),
            "totalScore": local_engine.get("totalScore"),
            "bias": local_engine.get("bias"),
            "horizons": local_engine.get("horizons"),
            "drivers": local_engine.get("drivers"),
            "earningsCard": local_engine.get("earningsCard"),
            "valuationCard": local_engine.get("valuationCard"),
            "announcementCard": local_engine.get("announcementCard"),
            "marketCard": local_engine.get("marketCard"),
        },
    }


def fetch_openai_overlay(context_payload: dict[str, object]) -> dict[str, object]:
    prompt = (
        "你是A股盘中研究助手。你只能基于给定数据做判断，先事实后推断，不要给个性化投资建议，不要承诺收益。"
        "输出一个JSON对象，字段固定为：headline、thesis、oneDayView、fiveDayView、catalysts、risks、"
        "invalidation、actionPlan、earningsView、valuationView、announcementView、marketView、confidenceNote。"
        "其中 headline 和 thesis 是字符串；oneDayView、fiveDayView、earningsView、valuationView、"
        "announcementView、marketView、confidenceNote 是字符串；catalysts、risks、invalidation、actionPlan"
        "是字符串数组，每项不超过30字。不要输出Markdown，不要输出代码块。"
    )
    body = {
        "model": OPENAI_MODEL,
        "reasoning": {"effort": "medium"},
        "max_output_tokens": 1400,
        "text": {
            "verbosity": "low",
            "format": {"type": "json_object"},
        },
        "input": [
            {
                "role": "developer",
                "content": [{"type": "input_text", "text": prompt}],
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": json.dumps(context_payload, ensure_ascii=False),
                    }
                ],
            },
        ],
    }
    payload = fetch_json(
        f"{OPENAI_BASE_URL}/responses",
        timeout=30,
        retries=1,
        method="POST",
        body=body,
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
    )
    text = extract_response_text(payload)
    parsed = json.loads(strip_json_fence(text))
    parsed["model"] = payload.get("model") or OPENAI_MODEL
    return parsed


def merge_ai_overlay(local_engine: dict[str, object], overlay: dict[str, object]) -> dict[str, object]:
    merged = json.loads(json.dumps(local_engine, ensure_ascii=False))

    for key in ("headline", "thesis", "catalysts", "risks", "invalidation", "actionPlan", "confidenceNote"):
        value = overlay.get(key)
        if value:
            merged[key] = value

    if overlay.get("oneDayView") and merged.get("horizons"):
        merged["horizons"][0]["summary"] = overlay["oneDayView"]
    if overlay.get("fiveDayView") and len(merged.get("horizons", [])) > 1:
        merged["horizons"][1]["summary"] = overlay["fiveDayView"]

    if overlay.get("earningsView") and merged.get("earningsCard"):
        merged["earningsCard"]["summary"] = overlay["earningsView"]
    if overlay.get("valuationView") and merged.get("valuationCard"):
        merged["valuationCard"]["summary"] = overlay["valuationView"]
    if overlay.get("announcementView") and merged.get("announcementCard"):
        merged["announcementCard"]["summary"] = overlay["announcementView"]
    if overlay.get("marketView") and merged.get("marketCard"):
        merged["marketCard"]["summary"] = overlay["marketView"]

    return merged


def summarize_daily_series(daily: list[dict[str, object]]) -> dict[str, float | None]:
    closes = [to_float(row.get("close")) for row in daily if row.get("close") not in (None, "")]
    highs = [to_float(row.get("high")) for row in daily if row.get("high") not in (None, "")]
    lows = [to_float(row.get("low")) for row in daily if row.get("low") not in (None, "")]
    pct_changes = [to_float(row.get("pctChange")) for row in daily if row.get("pctChange") not in (None, "")]

    latest_close = closes[-1] if closes else None
    ma20 = round(mean(closes[-20:]), 2) if closes else None
    ma60 = round(mean(closes[-60:]), 2) if closes else None
    high20 = max(highs[-20:]) if highs else None
    low20 = min(lows[-20:]) if lows else None
    realized_vol10 = round(mean(abs(change) for change in pct_changes[-10:]), 2) if pct_changes else None
    ret5 = pct_return(closes[-6], closes[-1]) if len(closes) >= 6 else None
    ret20 = pct_return(closes[-21], closes[-1]) if len(closes) >= 21 else None

    return {
        "latestClose": latest_close,
        "ma20": ma20,
        "ma60": ma60,
        "ma20GapPct": pct_return(ma20, latest_close) if ma20 and latest_close else None,
        "ma60GapPct": pct_return(ma60, latest_close) if ma60 and latest_close else None,
        "high20": round(high20, 2) if high20 is not None else None,
        "low20": round(low20, 2) if low20 is not None else None,
        "ret5": ret5,
        "ret20": ret20,
        "realizedVol10": realized_vol10,
    }


def summarize_intraday_series(quote: dict[str, object], intraday: list[dict[str, object]]) -> dict[str, float | None]:
    price = to_float(quote.get("price"))
    open_price = to_float(quote.get("open"))
    high = to_float(quote.get("high"))
    low = to_float(quote.get("low"))
    avg_price = to_float(quote.get("averagePrice"))
    closes = [to_float(row.get("close")) for row in intraday if row.get("close") not in (None, "")]
    recent_anchor = closes[-15] if len(closes) >= 15 else (closes[0] if closes else None)
    range_position = None

    if high is not None and low is not None and high > low and price is not None:
        range_position = round((price - low) / (high - low) * 100, 1)

    return {
        "avgGapPct": pct_return(avg_price, price) if avg_price and price else None,
        "openGapPct": pct_return(open_price, price) if open_price and price else None,
        "rangePosition": range_position,
        "microTrendPct": pct_return(recent_anchor, price) if recent_anchor and price else None,
    }


def summarize_flow_series(flow: list[dict[str, object]], quote: dict[str, object]) -> dict[str, float | None]:
    net5 = sum(to_float(item.get("mainNetInflow")) or 0 for item in flow[-5:])
    net20 = sum(to_float(item.get("mainNetInflow")) or 0 for item in flow[-20:])
    amount = to_float(quote.get("amount")) or 0
    outer_volume = to_float(quote.get("outerVolumeLots")) or 0
    inner_volume = to_float(quote.get("innerVolumeLots")) or 0
    turnover_pct = to_float(quote.get("turnoverPct"))
    dominance = None

    if outer_volume or inner_volume:
        dominance = round((outer_volume - inner_volume) / max(outer_volume + inner_volume, 1) * 100, 2)

    return {
        "net5": round(net5, 2),
        "net20": round(net20, 2),
        "net5RatioPct": round(net5 / amount * 100, 2) if amount else None,
        "net20RatioPct": round(net20 / amount * 100, 2) if amount else None,
        "dominancePct": dominance,
        "turnoverPct": turnover_pct,
    }


def summarize_market_context(market_overview: dict[str, object]) -> dict[str, object]:
    breadth = market_overview.get("breadth") if isinstance(market_overview.get("breadth"), dict) else {}
    indices = market_overview.get("indices") if isinstance(market_overview.get("indices"), list) else []
    sector_heat = market_overview.get("sectorHeat") if isinstance(market_overview.get("sectorHeat"), dict) else {}
    rising = to_int(breadth.get("rising"))
    falling = to_int(breadth.get("falling"))
    total_directional = max(rising + falling, 1)
    rising_ratio = round(rising / total_directional * 100, 2)
    limit_delta = to_int(breadth.get("limitUp")) - to_int(breadth.get("limitDown"))
    major_avg = round(
        mean((to_float(item.get("pctChange")) or 0) for item in indices[:5]),
        2,
    ) if indices else 0

    industries = (sector_heat.get("industries") or [])[:3]
    concepts = (sector_heat.get("concepts") or [])[:3]
    catalysts = [f"{item.get('name')}板块领涨" for item in industries[:2] if item.get("pctChange", 0) and item.get("pctChange") > 0]
    risks = [f"{item.get('name')}板块走弱" for item in (sector_heat.get("laggards") or [])[:2] if item.get("name")]

    return {
        "risingRatioPct": rising_ratio,
        "limitDelta": limit_delta,
        "majorIndexAvgPct": major_avg,
        "breadth": breadth,
        "indices": indices[:5],
        "hotIndustries": industries,
        "hotConcepts": concepts,
        "catalysts": catalysts,
        "risks": risks,
    }


def summarize_announcements(announcements: list[dict[str, str]]) -> dict[str, object]:
    type_counts: dict[str, int] = {}
    positive = 0
    negative = 0
    highlights: list[dict[str, str]] = []
    catalysts: list[str] = []
    risks: list[str] = []

    for item in announcements:
        title = item.get("title", "")
        column = item.get("column", "")
        category = classify_announcement_type(title, column)
        sentiment = classify_announcement_sentiment(title)
        type_counts[category] = type_counts.get(category, 0) + 1
        if sentiment > 0:
            positive += 1
        elif sentiment < 0:
            negative += 1
        highlights.append(
            {
                "title": title,
                "time": item.get("time", ""),
                "type": category,
                "column": column,
                "tone": "positive" if sentiment > 0 else "negative" if sentiment < 0 else "neutral",
                "url": item.get("url", ""),
            }
        )
        short_title = trim_text(title, 28)
        if sentiment > 0:
            catalysts.append(f"公告偏积极：{short_title}")
        elif sentiment < 0:
            risks.append(f"公告偏谨慎：{short_title}")

    dominant = max(type_counts.items(), key=lambda pair: pair[1])[0] if type_counts else "暂无明显主题"
    breakdown = [
        {"label": label, "value": value}
        for label, value in sorted(type_counts.items(), key=lambda pair: pair[1], reverse=True)
    ]
    summary = f"近{len(announcements)}条公告以{dominant}为主，正负面线索比 {positive}:{negative}。"

    return {
        "count": len(announcements),
        "dominantType": dominant,
        "positiveCount": positive,
        "negativeCount": negative,
        "breakdown": breakdown[:6],
        "highlights": highlights[:5],
        "summary": summary,
        "catalysts": dedupe_items(catalysts)[:3],
        "risks": dedupe_items(risks)[:3],
    }


def score_technical_block(
    quote: dict[str, object],
    daily_stats: dict[str, object],
    intraday_stats: dict[str, object],
) -> tuple[int, str, list[str], list[str]]:
    score = 50.0
    positive: list[str] = []
    negative: list[str] = []
    pct_change = to_float(quote.get("pctChange")) or 0
    avg_gap = to_float(intraday_stats.get("avgGapPct"))
    ma20_gap = to_float(daily_stats.get("ma20GapPct"))
    ret5 = to_float(daily_stats.get("ret5"))
    range_position = to_float(intraday_stats.get("rangePosition"))

    if pct_change >= 0:
        score += min(14, abs(pct_change) * 2.5)
        positive.append(f"现价较昨收上涨 {pct_change:.2f}%")
    else:
        score -= min(14, abs(pct_change) * 2.5)
        negative.append(f"现价较昨收回撤 {abs(pct_change):.2f}%")

    if avg_gap is not None:
        if avg_gap > 0.3:
            score += 8
            positive.append(f"现价高于均价 {avg_gap:.2f}%")
        elif avg_gap < -0.3:
            score -= 8
            negative.append(f"现价低于均价 {abs(avg_gap):.2f}%")

    if ma20_gap is not None:
        if ma20_gap > 1:
            score += 10
            positive.append(f"站上20日均线 {ma20_gap:.2f}%")
        elif ma20_gap < -1:
            score -= 10
            negative.append(f"跌破20日均线 {abs(ma20_gap):.2f}%")

    if ret5 is not None:
        if ret5 > 0:
            score += min(8, ret5 * 0.8)
            positive.append(f"近5日收益 {ret5:.2f}%")
        elif ret5 < 0:
            score -= min(8, abs(ret5) * 0.8)
            negative.append(f"近5日回撤 {abs(ret5):.2f}%")

    if range_position is not None:
        if range_position >= 75:
            score += 7
            positive.append("日内位置接近高位区")
        elif range_position <= 25:
            score -= 7
            negative.append("日内位置压在低位区")

    summary = positive[0] if score >= 55 and positive else negative[0] if negative else "技术面暂未形成强信号。"
    return clamp(round(score)), summary, positive, negative


def score_flow_block(flow_stats: dict[str, object]) -> tuple[int, str, list[str], list[str]]:
    score = 50.0
    positive: list[str] = []
    negative: list[str] = []
    net_ratio = to_float(flow_stats.get("net20RatioPct"))
    dominance = to_float(flow_stats.get("dominancePct"))
    turnover_pct = to_float(flow_stats.get("turnoverPct"))

    if net_ratio is not None:
        if net_ratio > 2:
            score += 18
            positive.append(f"近20分钟主力净流入占成交额 {net_ratio:.2f}%")
        elif net_ratio > 0:
            score += 9
            positive.append("近20分钟主力净流入保持正值")
        elif net_ratio < -2:
            score -= 18
            negative.append(f"近20分钟主力净流出占成交额 {abs(net_ratio):.2f}%")
        elif net_ratio < 0:
            score -= 9
            negative.append("近20分钟主力净流出占优")

    if dominance is not None:
        if dominance > 6:
            score += 10
            positive.append(f"外盘强于内盘 {dominance:.2f}%")
        elif dominance < -6:
            score -= 10
            negative.append(f"内盘抛压偏强 {abs(dominance):.2f}%")

    if turnover_pct is not None:
        if turnover_pct > 4:
            score += 6
            positive.append(f"换手率提升至 {turnover_pct:.2f}%")
        elif turnover_pct < 1:
            score -= 3
            negative.append("换手不足，弹性有限")

    summary = positive[0] if score >= 55 and positive else negative[0] if negative else "资金流暂未给出明确偏向。"
    return clamp(round(score)), summary, positive, negative


def score_market_block(market_stats: dict[str, object]) -> tuple[int, str, list[str], list[str]]:
    score = 50.0
    positive: list[str] = []
    negative: list[str] = []
    rising_ratio = to_float(market_stats.get("risingRatioPct")) or 50
    limit_delta = to_float(market_stats.get("limitDelta")) or 0
    index_avg = to_float(market_stats.get("majorIndexAvgPct")) or 0

    if rising_ratio >= 55:
        score += 10
        positive.append(f"全市场上涨家数占比 {rising_ratio:.1f}%")
    elif rising_ratio <= 45:
        score -= 10
        negative.append(f"全市场下跌占优，上涨占比仅 {rising_ratio:.1f}%")

    if limit_delta >= 10:
        score += 9
        positive.append(f"涨停数明显领先，差值 {limit_delta:.0f}")
    elif limit_delta <= -10:
        score -= 9
        negative.append(f"跌停数占优，差值 {abs(limit_delta):.0f}")

    if index_avg >= 0.5:
        score += 10
        positive.append(f"核心指数平均涨幅 {index_avg:.2f}%")
    elif index_avg <= -0.5:
        score -= 10
        negative.append(f"核心指数平均跌幅 {abs(index_avg):.2f}%")

    summary = positive[0] if score >= 55 and positive else negative[0] if negative else "市场宽度中性，指数未形成共振。"
    return clamp(round(score)), summary, positive, negative


def score_fundamental_block(
    quote: dict[str, object],
    fundamentals: dict[str, object],
) -> tuple[int, str, list[str], list[str]]:
    score = 50.0
    positive: list[str] = []
    negative: list[str] = []
    revenue_yoy = to_float(fundamentals.get("revenueYoy"))
    profit_yoy = to_float(fundamentals.get("netProfitYoy"))
    roe = to_float(fundamentals.get("roeWeighted"))
    pb = to_float(fundamentals.get("pb"))
    debt_ratio = to_float(fundamentals.get("debtAssetRatio"))
    cash_flow_per_share = to_float(fundamentals.get("cashFlowPerShare"))
    book_value = to_float(fundamentals.get("bookValuePerShare"))
    price = to_float(quote.get("price"))

    if revenue_yoy is not None:
        if revenue_yoy > 10:
            score += 12
            positive.append(f"营收同比增速 {revenue_yoy:.2f}%")
        elif revenue_yoy > 0:
            score += 6
            positive.append(f"营收同比保持正增长 {revenue_yoy:.2f}%")
        else:
            score -= 8
            negative.append(f"营收同比下滑 {abs(revenue_yoy):.2f}%")

    if profit_yoy is not None:
        if profit_yoy > 20:
            score += 14
            positive.append(f"净利同比弹性 {profit_yoy:.2f}%")
        elif profit_yoy > 0:
            score += 8
            positive.append(f"净利同比转正 {profit_yoy:.2f}%")
        else:
            score -= 12
            negative.append(f"净利同比承压 {abs(profit_yoy):.2f}%")

    if roe is not None:
        if roe >= 10:
            score += 8
            positive.append(f"ROE 维持在 {roe:.2f}%")
        elif roe <= 2:
            score -= 6
            negative.append(f"ROE 偏低，仅 {roe:.2f}%")

    if pb is not None:
        if pb < 1:
            score += 8
            positive.append(f"PB 仅 {pb:.2f}x，估值折价明显")
        elif pb > 4:
            score -= 6
            negative.append(f"PB 已抬升至 {pb:.2f}x")

    if debt_ratio is not None:
        if debt_ratio > 75:
            score -= 8
            negative.append(f"资产负债率偏高 {debt_ratio:.2f}%")
        elif debt_ratio < 60:
            score += 4
            positive.append(f"资产负债率控制在 {debt_ratio:.2f}%")

    if cash_flow_per_share is not None and cash_flow_per_share > 0:
        score += 3
        positive.append(f"每股经营现金流 {cash_flow_per_share:.2f}")

    if price is not None and book_value is not None and book_value > 0:
        price_to_book_live = price / book_value
        if price_to_book_live < 1:
            score += 4
            positive.append("现价低于每股净资产附近")

    summary = positive[0] if score >= 55 and positive else negative[0] if negative else "财务快照中性，缺乏显著边际变化。"
    return clamp(round(score)), summary, positive, negative


def score_news_block(announcement_stats: dict[str, object]) -> tuple[int, str, list[str], list[str]]:
    score = 50.0
    positive: list[str] = []
    negative: list[str] = []
    positive_count = to_int(announcement_stats.get("positiveCount"))
    negative_count = to_int(announcement_stats.get("negativeCount"))
    dominant_type = str(announcement_stats.get("dominantType") or "公告")

    if positive_count > negative_count:
        score += min(16, (positive_count - negative_count) * 6)
        positive.append(f"公告偏积极，主题集中在{dominant_type}")
    elif negative_count > positive_count:
        score -= min(18, (negative_count - positive_count) * 7)
        negative.append(f"公告偏谨慎，主题集中在{dominant_type}")
    else:
        positive.append(f"公告主线为{dominant_type}")

    summary = positive[0] if score >= 55 and positive else negative[0] if negative else "公告面偏中性。"
    return clamp(round(score)), summary, positive, negative


def build_signal_cards(
    quote: dict[str, object],
    daily_stats: dict[str, object],
    intraday_stats: dict[str, object],
    flow_stats: dict[str, object],
    market_stats: dict[str, object],
) -> list[dict[str, str]]:
    price = to_float(quote.get("price"))
    ma20 = to_float(daily_stats.get("ma20"))
    ma60 = to_float(daily_stats.get("ma60"))
    range_position = to_float(intraday_stats.get("rangePosition"))
    high20 = to_float(daily_stats.get("high20"))
    low20 = to_float(daily_stats.get("low20"))
    distance_high = pct_return(price, high20) if price and high20 else None
    distance_low = pct_return(low20, price) if low20 and price else None
    dominance = to_float(flow_stats.get("dominancePct"))
    rising_ratio = to_float(market_stats.get("risingRatioPct"))

    cards = [
        {
            "title": "价位位置",
            "value": "高位区" if range_position and range_position >= 70 else "低位区" if range_position is not None and range_position <= 30 else "中段",
            "detail": f"距20日高点 {distance_high:+.2f}% / 距20日低点 {distance_low:+.2f}%"
            if distance_high is not None and distance_low is not None
            else "等待更多日线样本。",
        },
        {
            "title": "均线结构",
            "value": "多头"
            if price and ma20 and ma60 and price >= ma20 >= ma60
            else "承压"
            if price and ma20 and ma60 and price <= ma20 <= ma60
            else "混合",
            "detail": f"MA20 {ma20 or '--'} / MA60 {ma60 or '--'}",
        },
        {
            "title": "盘口偏向",
            "value": "主动买盘"
            if dominance is not None and dominance > 6
            else "主动卖盘"
            if dominance is not None and dominance < -6
            else "均衡",
            "detail": f"外盘-内盘差 {dominance:+.2f}%" if dominance is not None else "逐笔分布暂不充分。",
        },
        {
            "title": "市场环境",
            "value": "顺风"
            if rising_ratio is not None and rising_ratio >= 55
            else "逆风"
            if rising_ratio is not None and rising_ratio <= 45
            else "中性",
            "detail": f"全市场上涨占比 {rising_ratio:.1f}%" if rising_ratio is not None else "市场宽度未知。",
        },
    ]
    return cards


def build_earnings_card(fundamentals: dict[str, object]) -> dict[str, object]:
    revenue_yoy = to_float(fundamentals.get("revenueYoy"))
    profit_yoy = to_float(fundamentals.get("netProfitYoy"))
    roe = to_float(fundamentals.get("roeWeighted"))
    gross_margin = to_float(fundamentals.get("grossMargin"))
    debt_ratio = to_float(fundamentals.get("debtAssetRatio"))

    summary = (
        f"营收同比 {format_signed_pct(revenue_yoy)}，净利同比 {format_signed_pct(profit_yoy)}，"
        f"ROE {format_plain_pct(roe)}，毛利率 {format_plain_pct(gross_margin)}。"
    )
    items = [
        {"label": "营收同比", "value": format_signed_pct(revenue_yoy)},
        {"label": "净利同比", "value": format_signed_pct(profit_yoy)},
        {"label": "ROE", "value": format_plain_pct(roe)},
        {"label": "毛利率", "value": format_plain_pct(gross_margin)},
        {"label": "资产负债率", "value": format_plain_pct(debt_ratio)},
    ]
    return {"title": "财报摘要", "summary": summary, "items": items}


def build_valuation_card(quote: dict[str, object], fundamentals: dict[str, object]) -> dict[str, object]:
    price = to_float(quote.get("price"))
    pb = to_float(fundamentals.get("pb"))
    pe = to_float(fundamentals.get("peTtm"))
    ps = to_float(fundamentals.get("priceToSales"))
    book_value = to_float(fundamentals.get("bookValuePerShare"))
    market_cap = to_float(fundamentals.get("marketCap"))
    price_to_book_live = round(price / book_value, 2) if price and book_value else None

    anchor_parts = []
    if pb is not None:
        anchor_parts.append(f"PB {pb:.2f}x")
    if pe is not None:
        anchor_parts.append(f"PE(TTM) {pe:.2f}x")
    if ps is not None:
        anchor_parts.append(f"PS {ps:.2f}x")
    summary = " / ".join(anchor_parts) if anchor_parts else "估值字段暂不完整。"
    if pb is not None and pb < 1:
        summary += " 资产折价明显，但需要盈利和现金流来验证修复。"
    elif pe is not None and pe > 40:
        summary += " 估值对未来改善已有较高预期。"

    items = [
        {"label": "PB", "value": format_multiple(pb)},
        {"label": "PE(TTM)", "value": format_multiple(pe)},
        {"label": "PS", "value": format_multiple(ps)},
        {"label": "每股净资产", "value": format_price(book_value)},
        {"label": "现价/每股净资产", "value": format_multiple(price_to_book_live)},
        {"label": "总市值", "value": format_large_amount(market_cap)},
    ]
    return {"title": "估值锚点", "summary": summary, "items": items}


def build_announcement_card(announcement_stats: dict[str, object]) -> dict[str, object]:
    items = [
        {"label": row.get("label", ""), "value": str(row.get("value", 0))}
        for row in (announcement_stats.get("breakdown") or [])[:5]
    ]
    return {
        "title": "公告类型",
        "summary": announcement_stats.get("summary") or "暂无公告摘要。",
        "items": items,
        "highlights": announcement_stats.get("highlights") or [],
    }


def build_market_card(market_stats: dict[str, object]) -> dict[str, object]:
    breadth = market_stats.get("breadth") if isinstance(market_stats.get("breadth"), dict) else {}
    summary = (
        f"全市场 {to_int(breadth.get('rising'))} 涨 / {to_int(breadth.get('falling'))} 跌，"
        f"涨停 {to_int(breadth.get('limitUp'))} / 跌停 {to_int(breadth.get('limitDown'))}，"
        f"核心指数均值 {format_signed_pct(to_float(market_stats.get('majorIndexAvgPct')))}。"
    )
    items = [
        {"label": "上涨占比", "value": format_plain_pct(to_float(market_stats.get("risingRatioPct")))},
        {"label": "涨停-跌停", "value": f"{to_int(market_stats.get('limitDelta')):+d}"},
        {"label": "领涨行业", "value": join_names(market_stats.get("hotIndustries"), 2)},
        {"label": "热门概念", "value": join_names(market_stats.get("hotConcepts"), 2)},
    ]
    return {"title": "市场背景", "summary": summary, "items": items}


def build_invalidation_points(
    quote: dict[str, object],
    daily_stats: dict[str, object],
    intraday_stats: dict[str, object],
) -> list[str]:
    items: list[str] = []
    low = to_float(quote.get("low"))
    avg_price = to_float(quote.get("averagePrice"))
    ma20 = to_float(daily_stats.get("ma20"))
    if low is not None:
        items.append(f"跌破日内低点 {low:.2f}，短线强度失效。")
    if avg_price is not None:
        items.append(f"回落到均价 {avg_price:.2f} 下方且无法收回，分时优势转弱。")
    if ma20 is not None:
        items.append(f"有效跌破 MA20 {ma20:.2f}，波段判断回到中性或偏弱。")
    if not items and intraday_stats.get("rangePosition") is not None:
        items.append("若日内位置持续滑向低位区，短线结论需要下修。")
    return items[:3]


def build_action_plan(one_day_score: int, five_day_score: int, quote: dict[str, object], daily_stats: dict[str, object]) -> list[str]:
    price = to_float(quote.get("price"))
    ma20 = to_float(daily_stats.get("ma20"))
    prev_close = to_float(quote.get("prevClose"))
    items: list[str] = []

    if one_day_score >= 60:
        items.append("盯住分时均价和主力净流入，确认强势是否延续到尾盘。")
    else:
        items.append("先观察尾盘承接，不要把盘中脉冲直接当成趋势反转。")

    if five_day_score >= 58 and price and ma20 and price >= ma20:
        items.append("若回踩 MA20 后仍能放量企稳，可继续按波段思路跟踪。")
    elif five_day_score <= 44 and price and prev_close:
        items.append(f"若再次跌破昨收 {prev_close:.2f} 且资金流转负，优先防守。")
    else:
        items.append("等待新的财报、经营简报或关键公告来强化中期方向。")

    items.append("结合板块热力观察是否有行业共振，单票逆风时谨慎提高仓位假设。")
    return items[:3]


def build_headline(total_score: int, one_day_score: int, five_day_score: int) -> str:
    if total_score >= 68:
        return f"盘中结论偏强，短线 {bias_from_score(one_day_score)}，波段 {bias_from_score(five_day_score)}。"
    if total_score <= 32:
        return f"盘中结论偏弱，短线 {bias_from_score(one_day_score)}，波段 {bias_from_score(five_day_score)}。"
    return f"盘中结论中性偏观察，短线 {bias_from_score(one_day_score)}，波段 {bias_from_score(five_day_score)}。"


def build_thesis(
    total_score: int,
    positive_drivers: list[str],
    negative_drivers: list[str],
    quote: dict[str, object],
    fundamentals: dict[str, object],
) -> str:
    price = to_float(quote.get("price"))
    pb = to_float(fundamentals.get("pb"))
    positive_text = positive_drivers[0] if positive_drivers else "当前没有形成明确强驱动"
    negative_text = negative_drivers[0] if negative_drivers else "主要风险暂时可控"
    valuation_text = f"，PB 约 {pb:.2f}x" if pb is not None else ""
    price_text = f"现价 {price:.2f}" if price is not None else "当前价格"

    if total_score >= 60:
        return f"{price_text} 附近的交易结构更偏右侧，主要支撑来自 {positive_text}；但仍要警惕 {negative_text}{valuation_text}。"
    if total_score <= 40:
        return f"{price_text} 附近的交易结构仍偏谨慎，压制因素是 {negative_text}；若想修复，需要先看到 {positive_text}{valuation_text}。"
    return f"{price_text} 附近尚未走出单边优势，亮点是 {positive_text}，掣肘是 {negative_text}{valuation_text}。"


def build_horizon_summary(prefix: str, score: int, positives: list[str], negatives: list[str]) -> str:
    if score >= 60:
        return f"{prefix}看点在于 {positives[0] if positives else '强势信号延续'}。"
    if score <= 40:
        return f"{prefix}风险主要来自 {negatives[0] if negatives else '弱势结构未修复'}。"
    return f"{prefix}更像震荡博弈，等待新的方向确认。"


def scorecard_entry(label: str, score: int, summary: str) -> dict[str, object]:
    return {
        "label": label,
        "score": score,
        "tone": tone_from_score(score),
        "summary": summary,
    }


def classify_announcement_type(title: str, column: str) -> str:
    combined = f"{column} {title}"
    for label, keywords in ANNOUNCEMENT_CATEGORY_RULES:
        if any(keyword in combined for keyword in keywords):
            return label
    return column or "其他公告"


def classify_announcement_sentiment(title: str) -> int:
    positive = sum(1 for keyword in POSITIVE_ANNOUNCEMENT_KEYWORDS if keyword in title)
    negative = sum(1 for keyword in NEGATIVE_ANNOUNCEMENT_KEYWORDS if keyword in title)
    if positive > negative:
        return 1
    if negative > positive:
        return -1
    return 0


def get_cached(key: str, ttl_seconds: int, fetcher):
    now = time.time()
    with CACHE_LOCK:
        cached = CACHE.get(key)
        if cached and now - cached[0] < ttl_seconds:
            return cached[1]

    value = fetcher()
    with CACHE_LOCK:
        CACHE[key] = (time.time(), value)
    return value


def fetch_market_overview() -> dict[str, object]:
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            "indices": executor.submit(fetch_market_indices),
            "breadth": executor.submit(fetch_market_breadth),
            "sectorHeat": executor.submit(fetch_sector_heat),
        }
        results = {key: future.result() for key, future in futures.items()}

    return {
        "fetchedAt": datetime.now().isoformat(timespec="seconds"),
        "indices": results["indices"],
        "breadth": results["breadth"],
        "sectorHeat": results["sectorHeat"],
    }


def fetch_market_indices() -> list[dict[str, object]]:
    secids = ",".join(secid for secid, _ in MARKET_INDEX_SECIDS)
    payload = fetch_json(
        f"https://push2.eastmoney.com/api/qt/ulist.np/get?secids={secids}&fields=f12,f14,f2,f3,f4,f6",
        timeout=6,
        retries=2,
    )
    rows = (payload.get("data") or {}).get("diff") or []
    by_code = {str(row.get("f12") or ""): row for row in rows}
    parsed: list[dict[str, object]] = []

    for secid, label in MARKET_INDEX_SECIDS:
        row = by_code.get(secid.split(".")[1], {})
        parsed.append(
            {
                "symbol": label,
                "code": row.get("f12", secid.split(".")[1]),
                "name": row.get("f14", label),
                "price": scale_price(row.get("f2")),
                "pctChange": scale_pct(row.get("f3")),
                "change": scale_price(row.get("f4")),
                "amount": to_float(row.get("f6")),
            }
        )

    return parsed


def fetch_sector_heat() -> dict[str, list[dict[str, object]]]:
    industry_url = (
        "https://push2.eastmoney.com/api/qt/clist/get"
        "?pn=1&pz=8&po=1&np=1&fltt=2&fid=f3&fs=m:90+t:2&fields=f12,f14,f2,f3,f4,f20"
    )
    concept_url = (
        "https://push2.eastmoney.com/api/qt/clist/get"
        "?pn=1&pz=8&po=1&np=1&fltt=2&fid=f3&fs=m:90+t:3&fields=f12,f14,f2,f3,f4,f20"
    )
    laggard_url = (
        "https://push2.eastmoney.com/api/qt/clist/get"
        "?pn=1&pz=6&po=0&np=1&fltt=2&fid=f3&fs=m:90+t:2&fields=f12,f14,f2,f3,f4,f20"
    )
    industries = parse_sector_rows((fetch_json(industry_url, timeout=5, retries=1).get("data") or {}).get("diff") or [])
    concepts = parse_sector_rows((fetch_json(concept_url, timeout=5, retries=1).get("data") or {}).get("diff") or [])
    laggards = parse_sector_rows((fetch_json(laggard_url, timeout=5, retries=1).get("data") or {}).get("diff") or [])
    return {
        "industries": industries,
        "concepts": concepts,
        "laggards": laggards,
    }


def parse_sector_rows(rows: list[dict[str, object]]) -> list[dict[str, object]]:
    return [
        {
            "code": row.get("f12", ""),
            "name": row.get("f14", ""),
            "last": to_float(row.get("f2")),
            "pctChange": to_float(row.get("f3")),
            "change": to_float(row.get("f4")),
            "marketCap": to_float(row.get("f20")),
        }
        for row in rows
    ]


def fetch_market_breadth() -> dict[str, object]:
    today = datetime.now().strftime("%Y%m%d")
    sh = fetch_json(
        "https://push2.eastmoney.com/api/qt/stock/get?secid=1.000001&fields=f57,f58,f113,f114,f115",
        timeout=5,
        retries=1,
    ).get("data") or {}
    sz = fetch_json(
        "https://push2.eastmoney.com/api/qt/stock/get?secid=0.399001&fields=f57,f58,f113,f114,f115",
        timeout=5,
        retries=1,
    ).get("data") or {}

    limit_up = fetch_limit_pool_count("ZTPool", today)
    limit_down = fetch_limit_pool_count("DTPool", today)

    rising = to_int(sh.get("f113")) + to_int(sz.get("f113"))
    falling = to_int(sh.get("f114")) + to_int(sz.get("f114"))
    flat = to_int(sh.get("f115")) + to_int(sz.get("f115"))
    total = rising + falling + flat

    buckets = [
        {"label": "上涨", "value": rising, "tone": "positive"},
        {"label": "下跌", "value": falling, "tone": "negative"},
        {"label": "平盘", "value": flat, "tone": "neutral"},
        {"label": "涨停", "value": limit_up, "tone": "positive"},
        {"label": "跌停", "value": limit_down, "tone": "negative"},
    ]

    return {
        "total": total,
        "rising": rising,
        "falling": falling,
        "flat": flat,
        "limitUp": limit_up,
        "limitDown": limit_down,
        "buckets": buckets,
    }


def fetch_limit_pool_count(kind: str, date_text: str) -> int:
    url = (
        f"https://push2ex.eastmoney.com/getTopic{kind}"
        f"?ut=7eea3edcaed734bea9cbfc24409ed989&dpt=wz.ztzt&Pageindex=0&pagesize=200&sort=fbt:asc&date={date_text}"
    )
    payload = fetch_json_via_curl(url, timeout=6, referer="https://data.eastmoney.com/")
    data = payload.get("data") or {}
    return to_int(data.get("tc"))


def fetch_fundamentals(secid: str) -> dict[str, object]:
    fields = ",".join(
        [
            "f57",
            "f58",
            "f127",
            "f162",
            "f167",
            "f173",
            "f183",
            "f184",
            "f185",
            "f186",
            "f187",
            "f188",
            "f189",
            "f190",
            "f191",
            "f192",
            "f193",
        ]
    )
    payload = fetch_json(
        f"https://push2.eastmoney.com/api/qt/stock/get?secid={secid}&fields={fields}",
        timeout=6,
        retries=2,
    )
    data = payload.get("data") or {}
    revenue = to_float(data.get("f183"))
    market_cap = None
    try:
        market_cap = fetch_quote(secid).get("marketCap")
    except Exception:
        market_cap = None

    return {
        "name": data.get("f58", ""),
        "industry": data.get("f127", ""),
        "peTtm": scale_pct(data.get("f162")),
        "pb": scale_pct(data.get("f167")),
        "roeWeighted": to_float(data.get("f173")),
        "revenue": revenue,
        "revenueYoy": to_float(data.get("f184")),
        "netProfitYoy": to_float(data.get("f185")),
        "grossMargin": to_float(data.get("f186")),
        "netMargin": to_float(data.get("f187")),
        "debtAssetRatio": to_float(data.get("f188")),
        "listedDate": format_listing_date(data.get("f189")),
        "bookValuePerShare": to_float(data.get("f190")),
        "undistributedProfitPerShare": scale_price(data.get("f191")),
        "capitalReservePerShare": scale_price(data.get("f192")),
        "cashFlowPerShare": scale_price(data.get("f193")),
        "marketCap": market_cap,
        "priceToSales": round(market_cap / revenue, 2) if market_cap and revenue else None,
    }


def fetch_quote(secid: str) -> dict[str, object]:
    fields = ",".join(
        [
            "f43",
            "f44",
            "f45",
            "f46",
            "f47",
            "f48",
            "f49",
            "f50",
            "f51",
            "f52",
            "f57",
            "f58",
            "f60",
            "f71",
            "f84",
            "f85",
            "f86",
            "f116",
            "f117",
            "f168",
            "f169",
            "f170",
            "f171",
        ]
    )
    payload = fetch_json(f"https://push2.eastmoney.com/api/qt/stock/get?secid={secid}&fields={fields}", timeout=6, retries=2)
    data = payload.get("data") or {}
    return parse_quote_payload(data)


def fetch_intraday(secid: str) -> list[dict[str, object]]:
    payload = fetch_json(
        "https://push2his.eastmoney.com/api/qt/stock/trends2/get"
        f"?secid={secid}&fields1=f1,f2,f3,f4,f5,f6,f7,f8&fields2=f51,f52,f53,f54,f55,f56,f57,f58&iscr=0&ndays=1",
        timeout=6,
        retries=2,
    )
    trends = (payload.get("data") or {}).get("trends") or []
    parsed: list[dict[str, object]] = []

    for entry in trends:
        parts = entry.split(",")
        if len(parts) < 8:
            continue
        parsed.append(
            {
                "timestamp": parts[0],
                "open": to_float(parts[1]),
                "close": to_float(parts[2]),
                "high": to_float(parts[3]),
                "low": to_float(parts[4]),
                "volumeLots": to_int(parts[5]),
                "amount": to_float(parts[6]),
                "avgPrice": to_float(parts[7]),
            }
        )

    return parsed


def fetch_daily_klines(secid: str) -> list[dict[str, object]]:
    payload = fetch_json(
        "https://push2his.eastmoney.com/api/qt/stock/kline/get"
        f"?secid={secid}&fields1=f1,f2,f3&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=1&beg=20240101&end=20500101",
        timeout=6,
        retries=2,
    )
    klines = (payload.get("data") or {}).get("klines") or []
    parsed: list[dict[str, object]] = []

    for entry in klines:
        parts = entry.split(",")
        if len(parts) < 11:
            continue
        parsed.append(
            {
                "date": parts[0],
                "open": to_float(parts[1]),
                "close": to_float(parts[2]),
                "high": to_float(parts[3]),
                "low": to_float(parts[4]),
                "volumeLots": to_int(parts[5]),
                "amount": to_float(parts[6]),
                "amplitudePct": to_float(parts[7]),
                "pctChange": to_float(parts[8]),
                "change": to_float(parts[9]),
                "turnoverPct": to_float(parts[10]),
            }
        )

    return parsed


def fetch_flow(secid: str) -> list[dict[str, object]]:
    payload = fetch_json(
        "https://push2.eastmoney.com/api/qt/stock/fflow/kline/get"
        f"?secid={secid}&lmt=60&klt=1&fields1=f1,f2,f3&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63",
        timeout=4,
        retries=1,
    )
    klines = (payload.get("data") or {}).get("klines") or []
    parsed: list[dict[str, object]] = []

    for entry in klines:
        parts = entry.split(",")
        if len(parts) < 6:
            continue
        parsed.append(
            {
                "timestamp": parts[0],
                "mainNetInflow": to_float(parts[1]),
                "bucketA": to_float(parts[2]),
                "bucketB": to_float(parts[3]),
                "bucketC": to_float(parts[4]),
                "bucketD": to_float(parts[5]),
            }
        )

    return parsed


def fetch_trade_tape(secid: str) -> list[dict[str, object]]:
    payload = fetch_json(
        f"https://push2.eastmoney.com/api/qt/stock/details/get?secid={secid}&fields1=f1,f2,f3&fields2=f51,f52,f53,f54,f55&pos=-40",
        timeout=4,
        retries=1,
    )
    details = (payload.get("data") or {}).get("details") or []
    parsed: list[dict[str, object]] = []

    for entry in details:
        parts = entry.split(",")
        if len(parts) < 5:
            continue
        side = "neutral"
        if parts[4] == "1":
            side = "sell"
        elif parts[4] == "2":
            side = "buy"

        parsed.append(
            {
                "time": parts[0],
                "price": to_float(parts[1]),
                "lots": to_int(parts[2]),
                "orders": to_int(parts[3]),
                "side": side,
            }
        )

    return parsed


def fetch_announcements(symbol: str) -> list[dict[str, str]]:
    code = symbol.split(".")[0]
    payload = fetch_json(
        "https://np-anotice-stock.eastmoney.com/api/security/ann"
        f"?sr=-1&page_size=8&page_index=1&ann_type=A&stock_list={code}",
        referer="https://data.eastmoney.com/",
        timeout=4,
        retries=1,
    )
    rows = (payload.get("data") or {}).get("list") or []
    parsed: list[dict[str, str]] = []

    for row in rows:
        art_code = row.get("art_code", "")
        columns = row.get("columns") or []
        parsed.append(
            {
                "title": row.get("title_ch") or row.get("title") or "未命名公告",
                "time": row.get("display_time") or row.get("notice_date") or "",
                "noticeDate": row.get("notice_date") or "",
                "column": (columns[0] or {}).get("column_name", "公告") if columns else "公告",
                "artCode": art_code,
                "url": f"https://data.eastmoney.com/notices/detail/{code}/{art_code}.html" if art_code else "",
            }
        )

    return parsed


def fetch_watchlist_quotes(symbols: list[str]) -> list[dict[str, object]]:
    secids = [symbol_to_secid(item) for item in symbols]
    fields = "f12,f14,f2,f3,f4,f6,f20"
    url = f"https://push2.eastmoney.com/api/qt/ulist.np/get?secids={','.join(secids)}&fields={fields}"
    try:
        payload = fetch_json(url, timeout=3, retries=1)
    except Exception:
        payload = fetch_json_via_curl(url, timeout=4)
    rows = (payload.get("data") or {}).get("diff") or []
    lookup = {str(row.get("f12") or ""): row for row in rows}

    parsed: list[dict[str, object]] = []
    for symbol in symbols:
        row = lookup.get(symbol.split(".")[0]) or {}
        parsed.append(
            {
                "symbol": symbol,
                "name": row.get("f14", symbol),
                "price": scale_price(row.get("f2")),
                "pctChange": scale_pct(row.get("f3")),
                "change": scale_price(row.get("f4")),
                "amount": to_float(row.get("f6")),
                "marketCap": to_float(row.get("f20")),
            }
        )

    return parsed


def fetch_json(
    url: str,
    referer: str | None = None,
    timeout: int = 6,
    retries: int = 2,
    method: str = "GET",
    body: object | None = None,
    headers: dict[str, str] | None = None,
) -> dict[str, object]:
    request_headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json, text/plain, */*",
        "Connection": "close",
    }
    if referer:
        request_headers["Referer"] = referer
    if headers:
        request_headers.update(headers)

    request_body = None
    if body is not None:
        request_body = json.dumps(body, ensure_ascii=False).encode("utf-8")
        request_headers.setdefault("Content-Type", "application/json")

    last_error: Exception | None = None

    for attempt in range(max(1, retries)):
        request = Request(url, headers=request_headers, data=request_body, method=method.upper())
        try:
            with urlopen(request, timeout=timeout) as response:
                payload = response.read().decode("utf-8", errors="ignore")
            return json.loads(payload)
        except (HTTPError, URLError, ConnectionError, TimeoutError, json.JSONDecodeError, IncompleteRead) as error:
            last_error = error
            time.sleep(0.25 * (attempt + 1))

    try:
        return fetch_json_via_curl(url, timeout=max(4, timeout), referer=referer)
    except Exception:
        pass

    if last_error is not None:
        raise last_error

    raise RuntimeError("Unknown upstream fetch error")


def fetch_json_via_curl(url: str, timeout: int = 4, referer: str | None = None) -> dict[str, object]:
    command = [
        "curl",
        "--http1.1",
        "-L",
        "--silent",
        "--show-error",
        "--retry",
        "2",
        "--retry-all-errors",
        "--max-time",
        str(timeout),
        "-A",
        USER_AGENT,
    ]
    if referer:
        command.extend(["-e", referer])
    command.append(url)

    result = subprocess.run(command, check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def extract_response_text(payload: dict[str, object]) -> str:
    output_text = payload.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    chunks: list[str] = []
    for item in payload.get("output") or []:
        if not isinstance(item, dict):
            continue
        for content in item.get("content") or []:
            if not isinstance(content, dict):
                continue
            text = content.get("text")
            if isinstance(text, str) and text.strip():
                chunks.append(text.strip())

    if chunks:
        return "\n".join(chunks)

    raise ValueError("OpenAI response did not contain text output")


def strip_json_fence(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```[a-zA-Z0-9_-]*\n?", "", stripped)
        stripped = re.sub(r"\n?```$", "", stripped)
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start != -1 and end != -1 and end > start:
        return stripped[start : end + 1]
    return stripped


def parse_quote_payload(data: dict[str, object]) -> dict[str, object]:
    return {
        "code": str(data.get("f57") or ""),
        "name": data.get("f58") or "",
        "price": scale_price(data.get("f43")),
        "high": scale_price(data.get("f44")),
        "low": scale_price(data.get("f45")),
        "open": scale_price(data.get("f46")),
        "volumeShares": to_int(data.get("f47")) * 100 if data.get("f47") is not None else None,
        "amount": to_float(data.get("f48")),
        "outerVolumeLots": to_int(data.get("f49")),
        "innerVolumeLots": to_int(data.get("f50")),
        "limitUp": scale_price(data.get("f51")),
        "limitDown": scale_price(data.get("f52")),
        "prevClose": scale_price(data.get("f60")),
        "averagePrice": scale_price(data.get("f71")),
        "freeFloatShares": to_float(data.get("f84")),
        "totalShares": to_float(data.get("f85")),
        "marketCap": to_float(data.get("f116")),
        "circulatingMarketCap": to_float(data.get("f117")),
        "turnoverPct": scale_pct(data.get("f168")),
        "change": scale_price(data.get("f169")),
        "pctChange": scale_pct(data.get("f170")),
        "amplitudePct": scale_pct(data.get("f171")),
        "snapshotAt": datetime.now().isoformat(timespec="seconds"),
    }


def normalize_symbol(value: str) -> str:
    cleaned = (value or "").strip().upper().replace(" ", "")
    if not cleaned:
        return DEFAULT_SYMBOL

    if re.fullmatch(r"(SH|SZ|BJ)\d{6}", cleaned):
        return f"{cleaned[2:]}.{cleaned[:2]}"

    if re.fullmatch(r"\d{6}\.(SH|SZ|BJ)", cleaned):
        return cleaned

    if re.fullmatch(r"\d{6}", cleaned):
        if cleaned.startswith(("5", "6", "9")):
            return f"{cleaned}.SH"
        if cleaned.startswith(("8", "4")):
            return f"{cleaned}.BJ"
        return f"{cleaned}.SZ"

    raise ValueError("Symbol must look like 601155.SH, SH601155, or 601155")


def symbol_to_secid(symbol: str) -> str:
    normalized = normalize_symbol(symbol)
    code, market = normalized.split(".")
    if market == "SH":
        return f"1.{code}"
    if market in {"SZ", "BJ"}:
        return f"0.{code}"
    raise ValueError(f"Unsupported market: {market}")


def build_watchlist(symbol: str) -> list[str]:
    ordered = [symbol] + DEFAULT_PEERS
    unique: list[str] = []
    seen: set[str] = set()

    for item in ordered:
        if item in seen:
            continue
        seen.add(item)
        unique.append(item)

    return unique


def mean(values) -> float:
    values_list = [value for value in values if value is not None]
    if not values_list:
        return 0.0
    return sum(values_list) / len(values_list)


def clamp(value: float, lower: int = 0, upper: int = 100) -> int:
    return int(max(lower, min(upper, value)))


def pct_return(base: float | None, target: float | None) -> float | None:
    if base in (None, 0) or target is None:
        return None
    return round((target / base - 1) * 100, 2)


def tone_from_score(score: int) -> str:
    if score >= 60:
        return "positive"
    if score <= 40:
        return "negative"
    return "neutral"


def bias_from_score(score: int) -> str:
    if score >= 70:
        return "强势偏多"
    if score >= 58:
        return "偏多震荡"
    if score >= 45:
        return "中性震荡"
    if score >= 32:
        return "偏空震荡"
    return "弱势承压"


def infer_range_text(score: int, base_vol: float) -> str:
    if score >= 58:
        floor = max(0.2, base_vol * 0.22)
        ceiling = max(floor + 0.2, base_vol * (0.65 + (score - 58) / 80))
        return f"{floor:+.1f}% ~ {ceiling:+.1f}%"
    if score <= 42:
        ceiling = -max(0.2, base_vol * 0.22)
        floor = -max(abs(ceiling) + 0.2, base_vol * (0.65 + (42 - score) / 80))
        return f"{floor:+.1f}% ~ {ceiling:+.1f}%"

    band = max(0.4, base_vol * 0.45)
    return f"{-band:+.1f}% ~ {band:+.1f}%"


def dedupe_items(items: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for item in items:
        cleaned = (item or "").strip()
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        result.append(cleaned)
    return result


def trim_text(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return f"{text[: max(0, limit - 1)]}…"


def format_price(value: float | None) -> str:
    if value is None:
        return "--"
    return f"{value:.2f}"


def format_multiple(value: float | None) -> str:
    if value is None:
        return "--"
    return f"{value:.2f}x"


def format_signed_pct(value: float | None) -> str:
    if value is None:
        return "--"
    return f"{value:+.2f}%"


def format_plain_pct(value: float | None) -> str:
    if value is None:
        return "--"
    return f"{value:.2f}%"


def format_large_amount(value: float | None) -> str:
    if value is None:
        return "--"
    absolute = abs(value)
    if absolute >= 100000000:
        return f"{value / 100000000:.2f}亿"
    if absolute >= 10000:
        return f"{value / 10000:.2f}万"
    return f"{value:.0f}"


def join_names(items: object, limit: int) -> str:
    if not isinstance(items, list):
        return "--"
    names = [str(item.get("name")) for item in items[:limit] if isinstance(item, dict) and item.get("name")]
    return " / ".join(names) if names else "--"


def scale_price(value: object) -> float | None:
    if value in (None, "-", ""):
        return None
    return round(float(value) / 100, 2)


def scale_pct(value: object) -> float | None:
    if value in (None, "-", ""):
        return None
    return round(float(value) / 100, 2)


def to_float(value: object) -> float | None:
    if value in (None, "-", ""):
        return None
    return float(value)


def to_int(value: object) -> int:
    if value in (None, "-", ""):
        return 0
    return int(float(value))


def format_listing_date(value: object) -> str | None:
    if value in (None, "-", ""):
        return None
    text = str(value)
    if len(text) != 8 or not text.isdigit():
        return text
    return f"{text[:4]}-{text[4:6]}-{text[6:]}"


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", PORT), StockWorkbenchHandler)
    print(f"Stock workbench running at http://127.0.0.1:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
