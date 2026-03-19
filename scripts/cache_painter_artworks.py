#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import ssl
import sys
import threading
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from http.client import IncompleteRead
from pathlib import Path
from urllib.parse import urlparse
from urllib.error import HTTPError, URLError


ROOT = Path("/Users/a123/Documents/codex")
TARGETS_PATH = ROOT / "tmp" / "artwork-targets.json"
PAINTERS_METADATA_PATH = ROOT / "tmp" / "painters-runtime.json"
OUTPUT_DIR = ROOT / "assets" / "artworks"
MANIFEST_PATH = OUTPUT_DIR / "manifest.json"
USER_AGENT = "PainterverseArtworkCache/1.0 (python downloader)"
PREVIEW_SIZE = 720
FULL_SIZE = 1600
REQUEST_DELAY_SECONDS = 0.18
MAX_RETRIES = 4
REQUEST_LOCK = threading.Lock()
LAST_REQUEST_AT_BY_HOST: dict[str, float] = {}
JSON_TIMEOUT_SECONDS = 12
IMAGE_TIMEOUT_SECONDS = 18
OG_IMAGE_PATTERN = re.compile(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', re.IGNORECASE)
PAINTERS_BY_ID: dict[str, dict] = {}
HOST_DELAY_OVERRIDES = {
    "wikipedia.org": 0.18,
    "wikimedia.org": 0.18,
    "commons.wikimedia.org": 0.18,
    "api.artic.edu": 0.05,
    "www.artic.edu": 0.05,
    "collectionapi.metmuseum.org": 0.05,
    "openaccess-api.clevelandart.org": 0.05,
    "openaccess-cdn.clevelandart.org": 0.05,
}

ARTWORK_PAGE_TITLE_PATCHES = {
    "alfred-sisley": {
        "塞纳河畔洪水": "The Flood at Port-Marly",
        "卢浮西安雪景": "Snow at Louveciennes",
    },
    "amedeo-modigliani": {
        "扶手椅上的裸女": "Nu couche",
        "珍妮·艾布特恩像": "Jeanne Hebuterne",
    },
    "artemisia-gentileschi": {
        "朱迪斯斩杀赫罗弗尼斯": "Judith Slaying Holofernes (Artemisia Gentileschi, Naples)",
        "自画像作为绘画寓言": "Self-Portrait as the Allegory of Painting",
    },
    "andy-warhol": {
        "金宝汤罐头": "Campbell's Soup Cans",
        "玛丽莲双联画": "Marilyn Diptych",
    },
    "anthony-van-dyck": {
        "查理一世骑马像": "Charles I at the Hunt",
    },
    "andrea-mantegna": {
        "死去的基督": "Lamentation of Christ (Mantegna)",
        "婚礼室壁画": "Camera degli Sposi",
    },
    "annibale-carracci": {
        "法尔内塞画廊壁画": "Farnese Gallery",
    },
    "bartolome-esteban-murillo": {
        "吃葡萄和甜瓜的孩子": "The Young Beggar",
    },
    "berthe-morisot": {
        "夏日": "Summer's Day",
    },
    "camille-pissarro": {
        "红屋顶": "The Red Roofs",
    },
    "camille-corot": {
        "莫特枫丹的回忆": "Souvenir of Mortefontaine",
    },
    "claude-lorrain": {
        "与以撒和利百加的婚礼风景": "Landscape with the Marriage of Isaac and Rebecca (The Mill)",
    },
    "correggio": {
        "牧羊人朝拜": "Adoration of the Shepherds (Correggio)",
        "木星与伊俄": "Jupiter and Io",
    },
    "diego-velazquez": {
        "宫娥": "Las Meninas",
        "教皇英诺森十世肖像": "Portrait of Innocent X",
    },
    "edgar-degas": {
        "舞蹈课": "The Dance Class",
        "苦艾酒": "L'Absinthe",
    },
    "edvard-munch": {
        "呐喊": "The Scream",
        "病中的孩子": "The Sick Child",
    },
    "edouard-manet": {
        "草地上的午餐": "Le Déjeuner sur l'herbe",
        "奥林匹亚": "Olympia (Manet)",
    },
    "egon-schiele": {
        "死神与少女": "Death and the Maiden (Schiele)",
    },
    "el-greco": {
        "奥尔加斯伯爵的葬礼": "The Burial of the Count of Orgaz",
        "拉奥孔": "Laocoön (El Greco)",
    },
    "eugene-delacroix": {
        "自由引导人民": "Liberty Leading the People",
    },
    "fra-angelico": {
        "天使报喜": "Annunciation (Fra Angelico, San Marco)",
    },
    "frans-hals": {
        "笑骑士": "The Laughing Cavalier",
        "圣乔治市民卫队宴会": "The Banquet of the Officers of the St George Militia Company in 1627",
    },
    "georges-de-la-tour": {
        "新生儿": "The Newborn Child",
    },
    "giovanni-bellini": {
        "众神的盛宴": "The Feast of the Gods (Bellini)",
        "圣弗朗西斯在沙漠中": "St. Francis in the Desert",
    },
    "giuseppe-arcimboldo": {
        "图书管理员": "The Librarian",
        "四季": "The Four Seasons (Arcimboldo)",
    },
    "gustave-courbet": {
        "石工": "The Stone Breakers",
        "画室": "The Painter's Studio",
    },
    "hans-holbein-the-younger": {
        "大使们": "The Ambassadors (Holbein)",
    },
    "jackson-pollock": {
        "秋韵": "Autumn Rhythm (Number 30)",
        "第 5 号": "No. 5, 1948",
    },
    "james-mcneill-whistler": {
        "灰与黑的安排：画家之母": "Arrangement in Grey and Black No. 1",
        "黑与金的夜曲": "Nocturne in Black and Gold – The Falling Rocket",
    },
    "jean-francois-millet": {
        "拾穗者": "The Gleaners",
        "晚钟": "The Angelus (Millet)",
    },
    "kazimir-malevich": {
        "黑方块": "Black Square",
        "白上之白": "White on White",
    },
    "li-gonglin": {
        "五马图": "Five Horses",
    },
    "liang-kai": {
        "泼墨仙人图": "Immortal in Splashed Ink",
    },
    "lucian-freud": {
        "睡着的救济金管理员": "Benefits Supervisor Sleeping",
    },
    "mary-cassatt": {
        "浴后的孩子": "The Child's Bath",
        "蓝色扶手椅中的小女孩": "Little Girl in a Blue Armchair",
    },
    "mark-rothko": {
        "橙与黄": "Orange and Yellow",
        "罗斯科礼拜堂组画": "Rothko Chapel",
    },
    "nicolas-poussin": {
        "阿卡迪亚的牧人": "Et in Arcadia ego",
        "萨宾妇女被掳": "The Abduction of the Sabine Women",
    },
    "peter-doig": {
        "白独木舟": "White Canoe",
    },
    "peter-paul-rubens": {
        "劫夺留西帕斯的女儿": "The Rape of the Daughters of Leucippus",
        "玛丽·德·美第奇组画": "Marie de' Medici cycle",
    },
    "perugino": {
        "把钥匙交给圣彼得": "Delivery of the Keys",
    },
    "piero-della-francesca": {
        "基督受洗": "The Baptism of Christ (Piero della Francesca)",
        "基督鞭笞": "The Flagellation of Christ",
    },
    "paolo-uccello": {
        "圣罗马诺之战": "The Battle of San Romano",
        "夜猎图": "The Hunt in the Forest",
    },
    "willem-de-kooning": {
        "女人 I": "Woman I",
        "挖掘": "Excavation (de Kooning)",
    },
    "zhang-xuan": {
        "捣练图": "Court Ladies Preparing Newly Woven Silk",
    },
    "zhou-fang": {
        "簪花仕女图": "Court Ladies Wearing Flowered Headdresses",
    },
    "emperor-huizong-of-song": {
        "瑞鹤图": "Auspicious Cranes",
    },
}


def normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9\u4e00-\u9fff\u3040-\u30ff\u3400-\u4dbf]+", "", re.sub(r"\([^)]*\)", "", (value or "").lower()))


def is_artwork_page_match(page_title: str, artwork_title: str) -> bool:
    normalized_page = normalize(page_title)
    normalized_artwork = normalize(artwork_title)
    return bool(normalized_artwork) and normalized_artwork in normalized_page


def word_tokens(value: str) -> set[str]:
    cleaned = re.sub(r"\([^)]*\)", "", value or "").lower()
    return {
        token
        for token in re.findall(r"[a-z0-9]+", cleaned)
        if len(token) >= 3 and token not in {"the", "and", "for", "with", "from", "this", "that"}
    }


def matches_target_page(page_title: str, target: dict) -> bool:
    normalized_page = normalize(page_title)
    candidates = [
        normalize(target.get("explicitPageTitle", "")),
        normalize(target.get("lookupTitle", "")),
        normalize(target.get("artworkTitle", "")),
    ]
    candidates = [value for value in candidates if value]
    for candidate in candidates:
        if candidate in normalized_page or normalized_page in candidate:
            shorter = max(1, min(len(candidate), len(normalized_page)))
            longer = max(len(candidate), len(normalized_page))
            if longer / shorter <= 1.8:
                return True

    page_words = word_tokens(page_title)
    for candidate in (
        target.get("explicitPageTitle", ""),
        target.get("lookupTitle", ""),
        target.get("artworkTitle", ""),
    ):
        candidate_words = word_tokens(candidate)
        overlap = page_words.intersection(candidate_words)
        extra_words = page_words - candidate_words
        if not candidate_words or not overlap:
            continue
        if len(candidate_words) == 1 and len(extra_words) == 0:
            return True
        if len(overlap) >= min(2, len(candidate_words)) and len(overlap) / max(len(candidate_words), 1) >= 0.6:
            return True
    return False


def exact_title_match(page_title: str, target: dict) -> bool:
    normalized_page = normalize(page_title)
    for candidate in (
        target.get("explicitPageTitle", ""),
        target.get("lookupTitle", ""),
        target.get("artworkTitle", ""),
    ):
        candidate_norm = normalize(candidate)
        if candidate_norm and candidate_norm == normalized_page:
            return True
    return False


def load_painters_metadata() -> dict[str, dict]:
    if not PAINTERS_METADATA_PATH.exists():
        return {}
    try:
        painters = json.loads(PAINTERS_METADATA_PATH.read_text("utf-8"))
    except Exception:
        return {}
    return {item["id"]: item for item in painters if item.get("id")}


def enrich_target(target: dict) -> dict:
    painter = PAINTERS_BY_ID.get(target.get("painterId"), {})
    enriched = dict(target)
    enriched["painterLatin"] = painter.get("latin", "")
    enriched["painterDeath"] = painter.get("death")
    patched_page_title = (ARTWORK_PAGE_TITLE_PATCHES.get(target.get("painterId"), {}) or {}).get(target.get("artworkTitle"))
    if patched_page_title:
        enriched["explicitPageTitle"] = patched_page_title
        enriched["lookupTitle"] = patched_page_title
    return enriched


def painter_reference_tokens(target: dict) -> set[str]:
    painter_name = target.get("painterName", "")
    painter_latin = target.get("painterLatin", "")
    return (
        {normalize(painter_name)}
        | word_tokens(painter_latin)
    ) - {""}


def artwork_reference_tokens(target: dict) -> set[str]:
    references = {
        normalize(target.get("artworkTitle", "")),
        normalize(target.get("lookupTitle", "")),
        normalize(target.get("explicitPageTitle", "")),
    }
    return {value for value in references if value}


def pending_priority(target: dict) -> tuple[int, int, str]:
    explicit_title = target.get("explicitPageTitle", "")
    lookup_title = target.get("lookupTitle", "")
    artwork_title = target.get("artworkTitle", "")
    has_ascii_lookup = bool(re.search(r"[A-Za-z]", lookup_title or explicit_title or ""))
    has_cjk_title = bool(re.search(r"[\u4e00-\u9fff]", artwork_title or lookup_title))
    painter_death = target.get("painterDeath")
    public_domain_bucket = 0 if isinstance(painter_death, (int, float)) and painter_death <= 1945 else 1
    return (
        public_domain_bucket,
        0 if explicit_title else 1,
        0 if has_ascii_lookup else (1 if has_cjk_title else 2),
        target.get("painterId", ""),
    )


def throttled_urlopen(url: str, timeout: int):
    host = urlparse(url).netloc.lower()
    delay = REQUEST_DELAY_SECONDS
    for domain, override in HOST_DELAY_OVERRIDES.items():
        if host == domain or host.endswith(f".{domain}"):
            delay = override
            break
    with REQUEST_LOCK:
        last_request_at = LAST_REQUEST_AT_BY_HOST.get(host, 0.0)
        wait_for = delay - (time.time() - last_request_at)
        if wait_for > 0:
            time.sleep(wait_for)
        LAST_REQUEST_AT_BY_HOST[host] = time.time()
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    return urllib.request.urlopen(request, timeout=timeout, context=ssl.create_default_context())


def fetch_json(url: str, timeout: int = JSON_TIMEOUT_SECONDS, retries: int = MAX_RETRIES) -> dict:
    for attempt in range(retries):
        try:
            with throttled_urlopen(url, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            if exc.code == 429 and attempt + 1 < retries:
                time.sleep(1.5 * (attempt + 1))
                continue
            raise
        except (URLError, TimeoutError, ssl.SSLError, IncompleteRead) as exc:
            if attempt + 1 < retries:
                time.sleep(1.2 * (attempt + 1))
                continue
            raise exc


def fetch_bytes(url: str, timeout: int = IMAGE_TIMEOUT_SECONDS, retries: int = MAX_RETRIES):
    for attempt in range(retries):
        try:
            with throttled_urlopen(url, timeout=timeout) as response:
                content_type = response.headers.get("content-type", "")
                return response.read(), content_type
        except HTTPError as exc:
            if exc.code == 429 and attempt + 1 < retries:
                time.sleep(1.8 * (attempt + 1))
                continue
            raise
        except (URLError, TimeoutError, ssl.SSLError, IncompleteRead) as exc:
            if attempt + 1 < retries:
                time.sleep(1.4 * (attempt + 1))
                continue
            raise exc


def fetch_text(url: str, timeout: int = JSON_TIMEOUT_SECONDS, retries: int = MAX_RETRIES) -> str:
    for attempt in range(retries):
        try:
            with throttled_urlopen(url, timeout=timeout) as response:
                charset = response.headers.get_content_charset() or "utf-8"
                return response.read().decode(charset, "ignore")
        except HTTPError as exc:
            if exc.code == 429 and attempt + 1 < retries:
                time.sleep(1.5 * (attempt + 1))
                continue
            raise
        except (URLError, TimeoutError, ssl.SSLError, IncompleteRead) as exc:
            if attempt + 1 < retries:
                time.sleep(1.2 * (attempt + 1))
                continue
            raise exc


def detect_extension(content_type: str, url: str) -> str:
    if "png" in content_type:
      return "png"
    if "webp" in content_type:
      return "webp"
    if "gif" in content_type:
      return "gif"
    suffix = Path(urllib.parse.urlparse(url).path).suffix.lower().lstrip(".")
    return suffix or "jpg"


def fetch_wiki_metadata(title: str, language: str, size: int) -> dict:
    params = urllib.parse.urlencode(
        {
            "action": "query",
            "prop": "pageimages|info",
            "piprop": "thumbnail|original",
            "pithumbsize": str(size),
            "titles": title,
            "inprop": "url",
            "redirects": "1",
            "format": "json",
            "origin": "*",
        }
    )
    payload = fetch_json(f"https://{language}.wikipedia.org/w/api.php?{params}")
    pages = list((payload.get("query") or {}).get("pages", {}).values())
    if not pages:
        raise RuntimeError("wiki page missing")
    page = pages[0]
    preview_url = (page.get("thumbnail") or {}).get("source")
    original_url = (page.get("original") or {}).get("source")
    page_url = page.get("fullurl") or f"https://{language}.wikipedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}"
    if not preview_url and not original_url:
        html = fetch_text(page_url)
        og_match = OG_IMAGE_PATTERN.search(html)
        if og_match:
            preview_url = og_match.group(1)
            original_url = og_match.group(1)
    if not preview_url and not original_url:
        raise RuntimeError("wiki image missing")
    return {
        "pageTitle": page.get("title") or title,
        "pageUrl": page_url,
        "previewUrl": preview_url or original_url,
        "originalUrl": original_url or preview_url,
        "language": language,
    }


def search_wiki_titles(query: str, language: str, limit: int = 5) -> list[str]:
    if not query:
        return []
    params = urllib.parse.urlencode(
        {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "srlimit": str(limit),
            "format": "json",
            "origin": "*",
        }
    )
    payload = fetch_json(f"https://{language}.wikipedia.org/w/api.php?{params}")
    results = (payload.get("query") or {}).get("search") or []
    return [item.get("title", "") for item in results if item.get("title")]


def fetch_page_extract(title: str, language: str) -> str:
    params = urllib.parse.urlencode(
        {
            "action": "query",
            "prop": "extracts",
            "exintro": "1",
            "explaintext": "1",
            "titles": title,
            "redirects": "1",
            "format": "json",
            "origin": "*",
        }
    )
    payload = fetch_json(f"https://{language}.wikipedia.org/w/api.php?{params}")
    pages = list((payload.get("query") or {}).get("pages", {}).values())
    if not pages:
        return ""
    return (pages[0].get("extract") or "").strip()


def page_mentions_painter(page_title: str, language: str, target: dict) -> bool:
    reference_tokens = painter_reference_tokens(target)
    if not reference_tokens:
        return True

    normalized_title = normalize(page_title)
    if target.get("painterName") and normalize(target["painterName"]) in normalized_title:
        return True
    if any(token in normalized_title for token in word_tokens(target.get("painterLatin", ""))):
        return True

    extract = fetch_page_extract(page_title, language)
    if not extract:
        return False
    normalized_extract = normalize(extract)
    extract_words = word_tokens(extract)
    if target.get("painterName") and normalize(target["painterName"]) in normalized_extract:
        return True
    latin_tokens = word_tokens(target.get("painterLatin", ""))
    if latin_tokens and latin_tokens.intersection(extract_words):
        return True
    return bool(reference_tokens.intersection(extract_words))


def page_mentions_artwork(page_title: str, language: str, target: dict) -> bool:
    if exact_title_match(page_title, target):
        return True

    references = artwork_reference_tokens(target)
    normalized_title = normalize(page_title)
    if any(reference and reference in normalized_title for reference in references):
        return True

    extract = fetch_page_extract(page_title, language)
    if not extract:
        return False

    normalized_extract = normalize(extract)
    if any(reference and reference in normalized_extract for reference in references):
        return True

    extract_words = word_tokens(extract)
    artwork_words = set()
    for candidate in (
        target.get("artworkTitle", ""),
        target.get("lookupTitle", ""),
        target.get("explicitPageTitle", ""),
    ):
        artwork_words.update(word_tokens(candidate))

    overlap = extract_words.intersection(artwork_words)
    return len(overlap) >= min(2, len(artwork_words)) if artwork_words else False


def build_search_queries(target: dict, language: str) -> list[str]:
    queries: list[str] = []
    painter_name = target.get("painterName", "")
    painter_latin = target.get("painterLatin", "")
    artwork_title = target.get("artworkTitle", "")
    lookup_title = target.get("lookupTitle", "")
    explicit_title = target.get("explicitPageTitle", "")

    def push(query: str):
        query = re.sub(r"\s+", " ", query or "").strip()
        if query:
            queries.append(query)

    def push_title_variants(title: str, allow_quoted: bool):
        title = re.sub(r"\s+", " ", title or "").strip()
        if not title:
            return
        stripped_title = re.sub(r"\([^)]*\)", "", title).strip()
        push(title)
        if stripped_title and stripped_title != title:
            push(stripped_title)
        if allow_quoted:
            push(f'"{title}"')
            if stripped_title and stripped_title != title:
                push(f'"{stripped_title}"')

    def push_pair(title: str, painter: str, allow_quoted: bool):
        title = re.sub(r"\s+", " ", title or "").strip()
        painter = re.sub(r"\s+", " ", painter or "").strip()
        if not title or not painter:
            return
        stripped_title = re.sub(r"\([^)]*\)", "", title).strip()
        push(f"{title} {painter}")
        push(f"{painter} {title}")
        if stripped_title and stripped_title != title:
            push(f"{stripped_title} {painter}")
            push(f"{painter} {stripped_title}")
        if allow_quoted:
            push(f'"{title}" "{painter}"')
            if stripped_title and stripped_title != title:
                push(f'"{stripped_title}" "{painter}"')

    if language == "en":
        for title in (explicit_title, lookup_title, artwork_title):
            push_pair(title, painter_latin, True)
            push_title_variants(title, True)
    else:
        for title in (artwork_title, lookup_title, explicit_title):
            push_pair(title, painter_name, False)
            push_title_variants(title, False)

    deduped: list[str] = []
    for query in queries:
        if query and query not in deduped:
            deduped.append(query)
    return deduped


def search_commons_files(query: str, limit: int = 6) -> list[dict]:
    params = urllib.parse.urlencode(
        {
            "action": "query",
            "generator": "search",
            "gsrsearch": query,
            "gsrnamespace": "6",
            "gsrlimit": str(limit),
            "prop": "imageinfo|info",
            "iiprop": "url",
            "iiurlwidth": "1200",
            "inprop": "url",
            "format": "json",
            "origin": "*",
        }
    )
    payload = fetch_json(f"https://commons.wikimedia.org/w/api.php?{params}")
    pages = list((payload.get("query") or {}).get("pages", {}).values())
    results = []
    for page in pages:
        image_info = (page.get("imageinfo") or [{}])[0]
        results.append(
            {
                "title": page.get("title", ""),
                "pageTitle": page.get("title", "").replace("File:", ""),
                "pageUrl": page.get("fullurl", ""),
                "previewUrl": image_info.get("thumburl") or image_info.get("url"),
                "fullImageUrl": image_info.get("url") or image_info.get("thumburl"),
                "language": "commons",
            }
        )
    return results


def search_cleveland_artworks(query: str, limit: int = 5) -> list[dict]:
    params = urllib.parse.urlencode({"q": query, "limit": str(limit)})
    payload = fetch_json(f"https://openaccess-api.clevelandart.org/api/artworks/?{params}")
    results = []
    for item in payload.get("data") or []:
        web_image = ((item.get("images") or {}).get("web") or {}).get("url")
        if not web_image:
            continue
        creator_description = " ".join(
            filter(
                None,
                [creator.get("description", "") for creator in item.get("creators") or []],
            )
        )
        results.append(
            {
                "title": item.get("title", ""),
                "pageTitle": item.get("title", ""),
                "pageUrl": item.get("url", ""),
                "previewUrl": web_image,
                "fullImageUrl": web_image,
                "artistText": creator_description,
                "language": "cleveland",
            }
        )
    return results


def search_aic_artworks(query: str, limit: int = 5) -> list[dict]:
    params = urllib.parse.urlencode(
        {"q": query, "limit": str(limit), "fields": "id,title,image_id,artist_title"}
    )
    payload = fetch_json(f"https://api.artic.edu/api/v1/artworks/search?{params}")
    results = []
    for item in payload.get("data") or []:
        image_id = item.get("image_id")
        if not image_id:
            continue
        image_url = f"https://www.artic.edu/iiif/2/{image_id}/full/843,/0/default.jpg"
        results.append(
            {
                "title": item.get("title", ""),
                "pageTitle": item.get("title", ""),
                "pageUrl": f"https://www.artic.edu/artworks/{item.get('id')}",
                "previewUrl": image_url,
                "fullImageUrl": image_url,
                "artistText": item.get("artist_title", ""),
                "language": "aic",
            }
        )
    return results


def search_met_artworks(query: str, limit: int = 6) -> list[dict]:
    params = urllib.parse.urlencode({"hasImages": "true", "q": query})
    payload = fetch_json(f"https://collectionapi.metmuseum.org/public/collection/v1/search?{params}")
    object_ids = (payload.get("objectIDs") or [])[:limit]
    results = []
    for object_id in object_ids:
        try:
            detail = fetch_json(
                f"https://collectionapi.metmuseum.org/public/collection/v1/objects/{object_id}"
            )
        except Exception:
            continue
        image_url = detail.get("primaryImageSmall") or detail.get("primaryImage")
        if not image_url:
            continue
        results.append(
            {
                "title": detail.get("title", ""),
                "pageTitle": detail.get("title", ""),
                "pageUrl": detail.get("objectURL", ""),
                "previewUrl": image_url,
                "fullImageUrl": detail.get("primaryImage") or image_url,
                "artistText": detail.get("artistDisplayName", ""),
                "language": "met",
            }
        )
    return results


def score_commons_result(result: dict, target: dict) -> tuple[int, int, int]:
    title_text = f"{result.get('title', '')} {result.get('pageTitle', '')}"
    normalized_title = normalize(title_text)
    title_tokens = word_tokens(title_text)

    artwork_tokens = set()
    for candidate in (
        target.get("explicitPageTitle", ""),
        target.get("lookupTitle", ""),
        target.get("artworkTitle", ""),
    ):
        artwork_tokens.update(word_tokens(candidate))

    painter_tokens = word_tokens(target.get("painterLatin", "")) | word_tokens(target.get("painterName", ""))
    direct_hits = 0
    for candidate in (
        target.get("explicitPageTitle", ""),
        target.get("lookupTitle", ""),
        target.get("artworkTitle", ""),
    ):
        candidate_norm = normalize(candidate)
        if candidate_norm and candidate_norm in normalized_title:
            direct_hits += 1

    return (
        direct_hits,
        len(title_tokens.intersection(artwork_tokens)),
        len(title_tokens.intersection(painter_tokens)),
    )


def score_museum_result(result: dict, target: dict) -> tuple[int, int, int]:
    title_text = f"{result.get('title', '')} {result.get('pageTitle', '')}"
    artist_text = result.get("artistText", "")
    title_tokens = word_tokens(title_text)
    artist_tokens = word_tokens(artist_text)

    artwork_tokens = set()
    for candidate in (
        target.get("explicitPageTitle", ""),
        target.get("lookupTitle", ""),
        target.get("artworkTitle", ""),
    ):
        artwork_tokens.update(word_tokens(candidate))

    painter_tokens = word_tokens(target.get("painterLatin", "")) | word_tokens(target.get("painterName", ""))
    direct_hits = 0
    normalized_title = normalize(title_text)
    for candidate in (
        target.get("explicitPageTitle", ""),
        target.get("lookupTitle", ""),
        target.get("artworkTitle", ""),
    ):
        candidate_norm = normalize(candidate)
        if candidate_norm and candidate_norm in normalized_title:
            direct_hits += 1

    return (
        direct_hits,
        len(title_tokens.intersection(artwork_tokens)),
        len(artist_tokens.intersection(painter_tokens)),
    )


def resolve_asset(target: dict, include_full: bool) -> dict | None:
    for language in ("en", "zh"):
        direct_titles: list[str] = []
        for candidate in (
            target.get("explicitPageTitle", ""),
            target.get("lookupTitle", ""),
            target.get("artworkTitle", ""),
        ):
            if candidate and candidate not in direct_titles:
                direct_titles.append(candidate)
        for candidate_title in direct_titles:
            try:
                preview_meta = fetch_wiki_metadata(candidate_title, language, PREVIEW_SIZE)
                title_ok = matches_target_page(preview_meta["pageTitle"], target)
                painter_ok = page_mentions_painter(preview_meta["pageTitle"], language, target)
                if not title_ok:
                    continue
                if not exact_title_match(preview_meta["pageTitle"], target) and not painter_ok:
                    continue
                if include_full:
                    try:
                        full_meta = fetch_wiki_metadata(candidate_title, language, FULL_SIZE)
                    except Exception:
                        full_meta = preview_meta
                else:
                    full_meta = preview_meta
                return {
                    "previewUrl": preview_meta["previewUrl"],
                    "fullImageUrl": full_meta["originalUrl"] if include_full else preview_meta["previewUrl"],
                    "pageUrl": preview_meta["pageUrl"],
                    "pageTitle": preview_meta["pageTitle"],
                }
            except Exception:
                continue

        for query in build_search_queries(target, language):
            try:
                commons_results = search_commons_files(query)
            except Exception:
                continue
            ranked_results = sorted(commons_results, key=lambda item: score_commons_result(item, target), reverse=True)
            for result in ranked_results:
                direct_hits, artwork_hits, painter_hits = score_commons_result(result, target)
                if painter_hits <= 0:
                    continue
                if direct_hits <= 0 and artwork_hits <= 0:
                    continue
                if not result.get("previewUrl") and not result.get("fullImageUrl"):
                    continue
                return result

        if language == "en" and target.get("painterLatin"):
            museum_searchers = (search_cleveland_artworks, search_aic_artworks, search_met_artworks)
            for query in build_search_queries(target, language):
                for searcher in museum_searchers:
                    try:
                        museum_results = searcher(query)
                    except Exception:
                        continue
                    ranked_results = sorted(
                        museum_results,
                        key=lambda item: score_museum_result(item, target),
                        reverse=True,
                    )
                    for result in ranked_results:
                        direct_hits, artwork_hits, painter_hits = score_museum_result(result, target)
                        if painter_hits <= 0:
                            continue
                        if direct_hits <= 0 and artwork_hits <= 0:
                            continue
                        if not result.get("previewUrl") and not result.get("fullImageUrl"):
                            continue
                        return result

        search_titles: list[str] = []
        for query in build_search_queries(target, language):
            try:
                for result_title in search_wiki_titles(query, language):
                    if result_title not in search_titles and result_title not in direct_titles:
                        search_titles.append(result_title)
            except Exception:
                continue
        for candidate_title in search_titles:
            try:
                preview_meta = fetch_wiki_metadata(candidate_title, language, PREVIEW_SIZE)
                painter_ok = page_mentions_painter(preview_meta["pageTitle"], language, target)
                artwork_ok = page_mentions_artwork(preview_meta["pageTitle"], language, target)
                if not (painter_ok and artwork_ok):
                    continue
                if include_full:
                    try:
                        full_meta = fetch_wiki_metadata(candidate_title, language, FULL_SIZE)
                    except Exception:
                        full_meta = preview_meta
                else:
                    full_meta = preview_meta
                return {
                    "previewUrl": preview_meta["previewUrl"],
                    "fullImageUrl": full_meta["originalUrl"] if include_full else preview_meta["previewUrl"],
                    "pageUrl": preview_meta["pageUrl"],
                    "pageTitle": preview_meta["pageTitle"],
                }
            except Exception:
                continue
    return None


def download_to_file(url: str, target_base: Path) -> Path:
    data, content_type = fetch_bytes(url)
    ext = detect_extension(content_type, url)
    target_path = target_base.with_suffix(f".{ext}")
    target_path.write_bytes(data)
    return target_path


def to_web_path(path_obj: Path) -> str:
    return "./" + path_obj.relative_to(ROOT).as_posix()


def cache_target(target: dict, include_full: bool) -> tuple[str, dict] | None:
    cache_key = f"{target['painterId']}:{target['lookupTitle']}"
    asset = resolve_asset(target, include_full=include_full)
    if not asset:
        return None

    painter_dir = OUTPUT_DIR / target["painterId"]
    painter_dir.mkdir(parents=True, exist_ok=True)

    preview_path = download_to_file(asset["previewUrl"], painter_dir / f"{target['fileStem']}-preview")
    if include_full and asset["fullImageUrl"]:
        full_path = download_to_file(asset["fullImageUrl"], painter_dir / f"{target['fileStem']}-full")
    else:
        full_path = preview_path

    return (
        cache_key,
        {
            "previewUrl": to_web_path(preview_path),
            "fullImageUrl": to_web_path(full_path),
            "pageUrl": asset["pageUrl"],
            "pageTitle": asset["pageTitle"],
        },
    )


def main():
    global PAINTERS_BY_ID, REQUEST_DELAY_SECONDS
    parser = argparse.ArgumentParser()
    parser.add_argument("--full", action="store_true", help="also download a larger full image")
    parser.add_argument("--limit", type=int, default=0, help="only cache the first N works")
    parser.add_argument("--pending-limit", type=int, default=0, help="only cache the first N missing works")
    parser.add_argument("--pending-offset", type=int, default=0, help="skip the first N missing works before processing")
    parser.add_argument("--delay", type=float, default=REQUEST_DELAY_SECONDS, help="seconds to wait between outbound requests")
    parser.add_argument("--workers", type=int, default=2)
    args = parser.parse_args()
    REQUEST_DELAY_SECONDS = max(0.0, args.delay)
    PAINTERS_BY_ID = load_painters_metadata()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if MANIFEST_PATH.exists():
        try:
            manifest = json.loads(MANIFEST_PATH.read_text("utf-8"))
        except Exception:
            manifest = {}
    else:
        manifest = {}

    targets = [enrich_target(target) for target in json.loads(TARGETS_PATH.read_text("utf-8"))]
    if args.limit > 0:
        targets = targets[: args.limit]

    pending = [target for target in targets if f"{target['painterId']}:{target['lookupTitle']}" not in manifest]
    pending = sorted(pending, key=pending_priority)
    if args.pending_offset > 0:
        pending = pending[args.pending_offset :]
    if args.pending_limit > 0:
        pending = pending[: args.pending_limit]
    print(f"pending={len(pending)} existing={len(manifest)} full={args.full}", flush=True)
    if not pending:
        print("Nothing to download.", flush=True)
        return

    cached = 0
    skipped = 0
    failed = 0
    start = time.time()

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(cache_target, target, args.full): target for target in pending}
        for future in as_completed(futures):
            target = futures[future]
            label = f"{target['painterName']} / {target['artworkTitle']}"
            try:
                result = future.result()
                if result is None:
                    skipped += 1
                    print(f"[skip] {label}", flush=True)
                    continue
                key, payload = result
                manifest[key] = payload
                cached += 1
                print(f"[cached] {label}", flush=True)
                MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", "utf-8")
            except Exception as exc:
                failed += 1
                print(f"[failed] {label}: {exc}", flush=True)

    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", "utf-8")
    elapsed = time.time() - start
    print(f"done cached={cached} skipped={skipped} failed={failed} seconds={elapsed:.1f}", flush=True)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(1)
