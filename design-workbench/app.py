#!/usr/bin/env python3
from __future__ import annotations

import base64
import json
import os
import re
import ssl
import subprocess
import textwrap
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any

from flask import Flask, Response, jsonify, render_template, request, stream_with_context


ROOT = Path("/Users/a123/Documents/codex")
ROUND_TABLE_SCRIPT = ROOT / "scripts" / "model_roundtable.py"
PYTHON_BIN = Path("/usr/local/bin/python3.11")
ENV_FILE = Path("/Users/a123/.openclaw/integrations/model-roundtable.env")
GENERATED_DIR = ROOT / "design-workbench" / "static" / "generated"

GEMINI_IMAGE_MODELS = [
    "gemini-3.1-flash-image-preview",
    "gemini-2.5-flash-image",
]
MINIMAX_IMAGE_MODELS = [
    "image-01-live",
    "image-01",
]
DEFAULT_NANO_CHAT_MODEL = "[官逆C]Nano banana(小香蕉)"
ARK_IMAGE_MODELS = [
    "seedream-4-0-250828",
    "doubao-seedream-3-0-t2i-250415",
]
RATIO_CHOICES = {
    "1:1": 1.0,
    "4:5": 4 / 5,
    "3:4": 3 / 4,
    "9:16": 9 / 16,
    "16:9": 16 / 9,
    "4:3": 4 / 3,
    "3:2": 3 / 2,
}
MINIMAX_RATIO_CHOICES = {
    "1:1": 1.0,
    "16:9": 16 / 9,
    "4:3": 4 / 3,
    "3:2": 3 / 2,
    "2:3": 2 / 3,
    "3:4": 3 / 4,
    "9:16": 9 / 16,
    "21:9": 21 / 9,
}

app = Flask(__name__, template_folder="templates", static_folder="static")
GENERATED_DIR.mkdir(parents=True, exist_ok=True)


def load_env_file() -> dict[str, str]:
    values: dict[str, str] = {}
    if not ENV_FILE.exists():
        return values
    for raw_line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("'").strip('"')
    return values


def validate_size(width_raw: object, height_raw: object) -> tuple[int, int]:
    width = int(width_raw or 1024)
    height = int(height_raw or 1024)
    if width < 256 or height < 256 or width > 4096 or height > 4096:
        raise ValueError("尺寸仅支持 256 到 4096 像素")
    return width, height


def nearest_ratio(width: int, height: int) -> str:
    target = width / height
    return min(RATIO_CHOICES, key=lambda key: abs(RATIO_CHOICES[key] - target))


def minimax_ratio(width: int, height: int) -> str:
    target = width / height
    return min(MINIMAX_RATIO_CHOICES, key=lambda key: abs(MINIMAX_RATIO_CHOICES[key] - target))


def gemini_image_size(width: int, height: int) -> str:
    longest = max(width, height)
    if longest <= 1408:
        return "1K"
    if longest <= 2816:
        return "2K"
    return "4K"


def request_json(
    url: str,
    payload: dict[str, Any],
    *,
    headers: dict[str, str],
    timeout: int = 180,
    proxy: str | None = None,
    insecure_tls: bool = False,
) -> dict[str, Any]:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    ssl_context = ssl._create_unverified_context() if insecure_tls else ssl.create_default_context()
    handlers: list[Any] = [urllib.request.HTTPSHandler(context=ssl_context)]
    handlers.append(urllib.request.ProxyHandler({"http": proxy, "https": proxy}) if proxy else urllib.request.ProxyHandler({}))
    opener = urllib.request.build_opener(*handlers)
    request_obj = urllib.request.Request(
        url,
        data=body,
        headers={**headers, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with opener.open(request_obj, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{exc.code} {detail}") from exc


def parse_openaiish_content(payload: dict[str, Any]) -> str:
    choices = payload.get("choices") or []
    if not choices:
        return ""
    message = choices[0].get("message") or {}
    content = message.get("content", "")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                parts.append(item.get("text", ""))
        return "\n".join(part.strip() for part in parts if part).strip()
    return str(content).strip()


def download_binary(url: str, *, timeout: int = 180, insecure_tls: bool = False) -> bytes:
    ssl_context = ssl._create_unverified_context() if insecure_tls else ssl.create_default_context()
    opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=ssl_context))
    request_obj = urllib.request.Request(url, method="GET")
    with opener.open(request_obj, timeout=timeout) as response:
        return response.read()


def save_generated_image(provider: str, image_bytes: bytes, ext: str = "png") -> str:
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    suffix = str(time.time_ns())[-6:]
    filename = f"{provider}-{timestamp}-{suffix}.{ext}"
    path = GENERATED_DIR / filename
    path.write_bytes(image_bytes)
    return f"/static/generated/{filename}"


def combine_prompt(prompt: str) -> str:
    return str(prompt or "").strip()


def extract_data_image(content: str) -> tuple[bytes, str] | None:
    match = re.search(r"data:(image/[-+.\w]+);base64,([A-Za-z0-9+/=]+)", content or "")
    if not match:
        return None
    mime_type = match.group(1)
    image_bytes = base64.b64decode(match.group(2))
    ext = mime_type.split("/")[-1] if "/" in mime_type else "png"
    return image_bytes, ext


def image_ext_from_bytes(image_bytes: bytes) -> str | None:
    if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if image_bytes.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if image_bytes.startswith(b"GIF87a") or image_bytes.startswith(b"GIF89a"):
        return "gif"
    if image_bytes.startswith(b"RIFF") and image_bytes[8:12] == b"WEBP":
        return "webp"
    return None


def decode_base64_image(value: object) -> tuple[bytes, str] | None:
    if not isinstance(value, str):
        return None
    extracted = extract_data_image(value)
    if extracted:
        return extracted
    normalized = re.sub(r"\s+", "", value.strip())
    if len(normalized) < 128 or not re.fullmatch(r"[A-Za-z0-9+/=]+", normalized):
        return None
    try:
        image_bytes = base64.b64decode(normalized, validate=True)
    except Exception:
        return None
    ext = image_ext_from_bytes(image_bytes)
    if not ext:
        return None
    return image_bytes, ext


def walk_strings(node: object):
    if isinstance(node, str):
        yield node
        return
    if isinstance(node, dict):
        for value in node.values():
            yield from walk_strings(value)
        return
    if isinstance(node, list):
        for value in node:
            yield from walk_strings(value)


def extract_image_from_payload(payload: object) -> tuple[bytes, str] | None:
    for candidate in walk_strings(payload):
        decoded = decode_base64_image(candidate)
        if decoded:
            return decoded
    return None


def extract_image_url(payload: object) -> str | None:
    for candidate in walk_strings(payload):
        if isinstance(candidate, str) and candidate.startswith(("http://", "https://")):
            return candidate
    return None


def prompt_with_size_hint(prompt: str, width: int, height: int) -> str:
    return (
        f"{prompt.strip()}\n\n"
        f"Preferred output size: {width}x{height} pixels.\n"
        f"Preferred aspect ratio: {nearest_ratio(width, height)}.\n"
        "Keep composition suitable for this canvas size."
    )


def simplify_nano_prompt(prompt: str, width: int, height: int) -> str:
    base = str(prompt or "").strip()
    return (
        f"{base}\n\n"
        f"Generate one image only. Target composition ratio {nearest_ratio(width, height)} "
        f"for a canvas close to {width}x{height}px."
    )


def request_json_via_curl(
    url: str,
    payload: dict[str, Any],
    *,
    api_key: str,
    insecure_tls: bool = False,
    timeout: int = 300,
) -> dict[str, Any]:
    cmd = [
        "curl",
        "-sS",
        url,
        "-H",
        f"Authorization: Bearer {api_key}",
        "-H",
        "Content-Type: application/json",
        "-d",
        json.dumps(payload, ensure_ascii=False),
    ]
    if insecure_tls:
        cmd.insert(1, "-k")
    proc = subprocess.run(
        cmd,
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or proc.stdout or "curl request failed").strip())
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"invalid curl json: {exc}") from exc


def generate_with_nano_chat(
    *,
    prompt: str,
    width: int,
    height: int,
    env_values: dict[str, str],
) -> dict[str, Any]:
    api_key = env_values.get("PANEL_NANO_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("Nano Banana API key 未配置")

    base_url = env_values.get("PANEL_NANO_BASE_URL", "").strip() or "https://new.apipudding.com/v1"
    model = env_values.get("PANEL_NANO_MODEL", "").strip() or DEFAULT_NANO_CHAT_MODEL
    attempts = [prompt_with_size_hint(prompt, width, height), simplify_nano_prompt(prompt, width, height)]
    for attempt_index, attempt_prompt in enumerate(attempts, start=1):
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": attempt_prompt}],
        }
        data = request_json_via_curl(
            f"{base_url.rstrip('/')}/chat/completions",
            payload,
            api_key=api_key,
            timeout=300,
            insecure_tls=env_values.get("PANEL_IMAGE_INSECURE_TLS", "").strip() == "1",
        )
        choices = data.get("choices") or []
        for choice in choices:
            message = choice.get("message") or {}
            content = message.get("content") or ""
            extracted = extract_data_image(content)
            if extracted:
                image_bytes, ext = extracted
                note = "当前 Nano Banana 走 chat 接口，尺寸作为 prompt 提示注入，不保证像即梦那样硬尺寸输出。"
                if attempt_index > 1:
                    note += " 首轮仅返回文字，系统已自动用简化 prompt 重试。"
                return {
                    "provider": "nano",
                    "providerLabel": "Nano Banana",
                    "model": model,
                    "requested_size": f"{width}x{height}",
                    "applied_size": f"chat hint · {nearest_ratio(width, height)}",
                    "note": note,
                    "image_url": save_generated_image("nano", image_bytes, ext),
                }
    raise RuntimeError("Nano Banana chat 返回中没有可解析的图片内容")


def generate_with_gemini(
    *,
    prompt: str,
    width: int,
    height: int,
    env_values: dict[str, str],
) -> dict[str, Any]:
    if env_values.get("PANEL_NANO_API_KEY", "").strip() and env_values.get("PANEL_NANO_BASE_URL", "").strip():
        return generate_with_nano_chat(prompt=prompt, width=width, height=height, env_values=env_values)

    api_key = env_values.get("PANEL_GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("Gemini 图像 API key 未配置")

    proxy = env_values.get("PANEL_GEMINI_PROXY", "").strip() or None
    insecure_tls = env_values.get("PANEL_IMAGE_INSECURE_TLS", "").strip() == "1"
    models = []
    preferred = env_values.get("PANEL_GEMINI_IMAGE_MODEL", "").strip()
    if preferred:
        models.append(preferred)
    for model in GEMINI_IMAGE_MODELS:
        if model not in models:
            models.append(model)

    last_error = "Gemini 图像模型不可用"
    for model in models:
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseModalities": ["TEXT", "IMAGE"],
                "imageConfig": {
                    "aspectRatio": nearest_ratio(width, height),
                    "imageSize": gemini_image_size(width, height),
                },
            },
        }
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{urllib.parse.quote(model)}:generateContent?key={urllib.parse.quote(api_key)}"
        )
        try:
            data = request_json(url, payload, headers={}, timeout=240, proxy=proxy, insecure_tls=insecure_tls)
        except RuntimeError as exc:
            last_error = str(exc)
            continue
        candidates = data.get("candidates") or []
        for candidate in candidates:
            content = candidate.get("content") or {}
            for part in content.get("parts") or []:
                inline = part.get("inlineData") or {}
                if inline.get("data"):
                    mime_type = inline.get("mimeType", "image/png")
                    ext = mime_type.split("/")[-1] if "/" in mime_type else "png"
                    image_bytes = base64.b64decode(inline["data"])
                    return {
                        "provider": "nano",
                        "providerLabel": "Nano Banana",
                        "model": model,
                        "requested_size": f"{width}x{height}",
                        "applied_size": f"{nearest_ratio(width, height)} · {gemini_image_size(width, height)}",
                        "note": "Gemini 图像接口按最近的宽高比和图像档位近似生成。",
                        "image_url": save_generated_image("nano", image_bytes, ext),
                    }
        last_error = "Gemini 返回中没有图像内容"
    raise RuntimeError(last_error)


def generate_with_seedream(
    *,
    prompt: str,
    width: int,
    height: int,
    env_values: dict[str, str],
) -> dict[str, Any]:
    api_key = env_values.get("PANEL_ARK_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("火山图像 API key 未配置")

    base_url = env_values.get("PANEL_ARK_IMAGE_BASE_URL", "").strip() or "https://ark.cn-beijing.volces.com/api/v3"
    insecure_tls = env_values.get("PANEL_IMAGE_INSECURE_TLS", "").strip() == "1"
    models = []
    preferred = env_values.get("PANEL_ARK_IMAGE_MODEL", "").strip()
    if preferred:
        models.append(preferred)
    for model in ARK_IMAGE_MODELS:
        if model not in models:
            models.append(model)

    last_error = "即梦图像模型不可用"
    for model in models:
        payload = {
            "model": model,
            "prompt": prompt,
            "size": f"{width}x{height}",
            "response_format": "b64_json",
            "n": 1,
        }
        try:
            data = request_json(
                f"{base_url.rstrip('/')}/images/generations",
                payload,
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=240,
                insecure_tls=insecure_tls,
            )
        except RuntimeError as exc:
            last_error = str(exc)
            continue
        for item in data.get("data") or []:
            if item.get("b64_json"):
                image_bytes = base64.b64decode(item["b64_json"])
                return {
                    "provider": "jimeng",
                    "providerLabel": "即梦",
                    "model": model,
                    "requested_size": f"{width}x{height}",
                    "applied_size": f"{width}x{height}",
                    "image_url": save_generated_image("jimeng", image_bytes, "png"),
                }
            if item.get("url"):
                image_bytes = download_binary(item["url"], insecure_tls=insecure_tls)
                return {
                    "provider": "jimeng",
                    "providerLabel": "即梦",
                    "model": model,
                    "requested_size": f"{width}x{height}",
                    "applied_size": f"{width}x{height}",
                    "image_url": save_generated_image("jimeng", image_bytes, "png"),
                }
        last_error = "即梦返回中没有图像内容"
    raise RuntimeError(last_error)


def generate_with_minimax(
    *,
    prompt: str,
    width: int,
    height: int,
    env_values: dict[str, str],
) -> dict[str, Any]:
    api_key = env_values.get("PANEL_MINIMAX_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("MiniMax 图像 API key 未配置")

    base_url = env_values.get("PANEL_MINIMAX_BASE_URL", "").strip() or "https://api.minimaxi.com/v1"
    insecure_tls = env_values.get("PANEL_IMAGE_INSECURE_TLS", "").strip() == "1"
    models = []
    preferred = env_values.get("PANEL_MINIMAX_IMAGE_MODEL", "").strip()
    if preferred:
        models.append(preferred)
    for model in MINIMAX_IMAGE_MODELS:
        if model not in models:
            models.append(model)

    last_error = "MiniMax 图像模型不可用"
    for model in models:
        payload = {
            "model": model,
            "prompt": prompt,
            "aspect_ratio": minimax_ratio(width, height),
            "response_format": "base64",
        }
        try:
            data = request_json(
                f"{base_url.rstrip('/')}/image_generation",
                payload,
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=240,
                insecure_tls=insecure_tls,
            )
        except RuntimeError as exc:
            last_error = str(exc)
            continue

        extracted = extract_image_from_payload(data)
        if extracted:
            image_bytes, ext = extracted
            return {
                "provider": "minimax",
                "providerLabel": "MiniMax",
                "model": model,
                "requested_size": f"{width}x{height}",
                "applied_size": f"{minimax_ratio(width, height)} · aspect ratio",
                "note": "MiniMax 官方图像接口按宽高比生成，尺寸会近似到所选比例。",
                "image_url": save_generated_image("minimax", image_bytes, ext),
            }

        image_url = extract_image_url(data)
        if image_url:
            image_bytes = download_binary(image_url, insecure_tls=insecure_tls)
            ext = image_ext_from_bytes(image_bytes) or "png"
            return {
                "provider": "minimax",
                "providerLabel": "MiniMax",
                "model": model,
                "requested_size": f"{width}x{height}",
                "applied_size": f"{minimax_ratio(width, height)} · aspect ratio",
                "note": "MiniMax 官方图像接口按宽高比生成，尺寸会近似到所选比例。",
                "image_url": save_generated_image("minimax", image_bytes, ext),
            }

        last_error = "MiniMax 返回中没有图像内容"
    raise RuntimeError(last_error)


def generate_images(payload: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    provider = str(payload.get("provider", "auto")).strip() or "auto"
    width, height = validate_size(payload.get("width"), payload.get("height"))
    prompts = payload.get("prompts") or {}
    custom_prompt = str(payload.get("prompt", "")).strip()
    env_values = load_env_file()
    final_prompt = str(prompts.get("finalPrompt", "")).strip()

    jobs: list[tuple[str, str]] = []
    if provider == "auto":
        jobs = [
            (
                "jimeng",
                final_prompt or str(prompts.get("jimengPrompt", "")).strip(),
            ),
            (
                "nano",
                final_prompt or str(prompts.get("nanoPrompt", "")).strip(),
            ),
            (
                "minimax",
                final_prompt or str(prompts.get("minimaxPrompt", "")).strip() or str(prompts.get("jimengPrompt", "")).strip(),
            ),
        ]
    elif provider == "jimeng":
        jobs = [("jimeng", custom_prompt or final_prompt or str(prompts.get("jimengPrompt", "")).strip())]
    elif provider == "nano":
        jobs = [("nano", custom_prompt or final_prompt or str(prompts.get("nanoPrompt", "")).strip())]
    elif provider == "minimax":
        jobs = [
            (
                "minimax",
                custom_prompt
                or final_prompt
                or str(prompts.get("minimaxPrompt", "")).strip()
                or str(prompts.get("jimengPrompt", "")).strip(),
            )
        ]
    else:
        raise ValueError("不支持的生图工具")

    results: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []
    for job_provider, base_prompt in jobs:
        if not base_prompt:
            error = {"provider": job_provider, "error": f"{job_provider} 对应的 prompt 为空"}
            if provider == "auto":
                errors.append(error)
                continue
            raise ValueError(error["error"])
        prompt_text = combine_prompt(base_prompt)
        try:
            if job_provider == "jimeng":
                result = generate_with_seedream(prompt=prompt_text, width=width, height=height, env_values=env_values)
            elif job_provider == "nano":
                result = generate_with_gemini(prompt=prompt_text, width=width, height=height, env_values=env_values)
            else:
                result = generate_with_minimax(prompt=prompt_text, width=width, height=height, env_values=env_values)
        except Exception as exc:
            error = {"provider": job_provider, "error": str(exc)}
            if provider == "auto":
                errors.append(error)
                continue
            raise
        result["prompt"] = base_prompt
        results.append(result)

    if not results and errors:
        raise RuntimeError("；".join(f"{item['provider']}: {item['error']}" for item in errors))
    return results, errors


def extract_json_block(raw_text: str) -> dict[str, Any]:
    text = str(raw_text or "").strip()
    if not text:
        raise RuntimeError("豆包建议为空")
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    candidate = fenced.group(1).strip() if fenced else text
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", candidate)
        if not match:
            raise RuntimeError("豆包建议不是有效 JSON")
        return json.loads(match.group(0))


def parse_string_list(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [line.strip("- ").strip() for line in value.splitlines() if line.strip()]
    return []


def build_doubao_project_suggestion(brief: dict[str, Any]) -> dict[str, Any]:
    env_values = load_env_file()
    api_key = env_values.get("PANEL_ARK_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("豆包 API key 未配置")

    model = env_values.get("PANEL_ARK_MODEL", "").strip() or "doubao-seed-2-0-lite-260215"
    prompt = textwrap.dedent(
        f"""
        你是品牌平面设计师的创意策划搭档。请根据下面这份 rough brief，专门为左侧“项目框架”和“创意输入”区域提出更专业、可执行、可直接回填的填写建议。

        项目名：{brief.get("projectName") or "未填写"}
        物料类型：{brief.get("deliverable") or "未填写"}
        目标受众：{brief.get("audience") or "未填写"}
        品牌调性：{brief.get("tone") or "未填写"}
        核心 brief：{brief.get("task") or "未填写"}
        必须出现：{brief.get("must") or "未填写"}
        明确避免：{brief.get("avoid") or "未填写"}
        标题/文案：{brief.get("copy") or "未填写"}
        风格参考：{brief.get("reference") or "未填写"}
        额外要求：{brief.get("focus") or "未填写"}

        请只输出 JSON，不要输出任何解释文字。JSON 格式必须严格如下：
        {{
          "projectSummary": "<一句话总结这个项目框架>",
          "suggestedProjectName": "<建议项目名>",
          "suggestedDeliverable": "<只能是 品牌海报 / KV 主视觉 / 包装视觉 / 社媒封面 / 活动 banner / 提案 moodboard 之一>",
          "suggestedAudience": "<建议写法>",
          "suggestedTone": "<建议写法>",
          "suggestedTask": "<建议写法，直接可回填到核心 brief>",
          "suggestedMust": ["<建议1>", "<建议2>", "<建议3>"],
          "suggestedAvoid": ["<建议1>", "<建议2>", "<建议3>"],
          "suggestedCopy": "<建议标题或文案，没有就写空字符串>",
          "suggestedReference": "<建议风格参考，没有就写空字符串>",
          "suggestedFocus": "<建议写法>",
          "checkpoint": ["<检查点1>", "<检查点2>", "<检查点3>"]
        }}

        要求：
        - 以品牌平面设计师的实际工作流为中心
        - 建议必须具体、能直接回填到表单
        - 如果用户只写了一个大概 brief，也要主动补出更完整的项目框架和创意输入
        - suggestedDeliverable 必须严格从给定选项里选
        - 不要空话，不要泛泛而谈
        """
    ).strip()

    data = request_json(
        "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
        {
            "model": model,
            "messages": [
                {"role": "system", "content": "你是专业的品牌平面设计创意策划与 prompt 顾问。默认使用简体中文。"},
                {"role": "user", "content": prompt},
            ],
        },
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=120,
        insecure_tls=env_values.get("PANEL_IMAGE_INSECURE_TLS", "").strip() == "1",
    )
    content = parse_openaiish_content(data)
    payload = extract_json_block(content)
    allowed_deliverables = {"品牌海报", "KV 主视觉", "包装视觉", "社媒封面", "活动 banner", "提案 moodboard"}
    suggested_deliverable = str(payload.get("suggestedDeliverable", "")).strip()
    if suggested_deliverable not in allowed_deliverables:
        suggested_deliverable = str(brief.get("deliverable") or "品牌海报").strip()
        if suggested_deliverable not in allowed_deliverables:
            suggested_deliverable = "品牌海报"
    return {
        "projectSummary": str(payload.get("projectSummary", "")).strip(),
        "suggestedProjectName": str(payload.get("suggestedProjectName", "")).strip(),
        "suggestedDeliverable": suggested_deliverable,
        "suggestedAudience": str(payload.get("suggestedAudience", "")).strip(),
        "suggestedTone": str(payload.get("suggestedTone", "")).strip(),
        "suggestedTask": str(payload.get("suggestedTask", "")).strip(),
        "suggestedMust": parse_string_list(payload.get("suggestedMust")),
        "suggestedAvoid": parse_string_list(payload.get("suggestedAvoid")),
        "suggestedCopy": str(payload.get("suggestedCopy", "")).strip(),
        "suggestedReference": str(payload.get("suggestedReference", "")).strip(),
        "suggestedFocus": str(payload.get("suggestedFocus", "")).strip(),
        "checkpoint": parse_string_list(payload.get("checkpoint")),
        "provider": "豆包",
        "model": model,
    }


def run_roundtable(task: str, rounds: int) -> dict:
    cmd = [
        str(PYTHON_BIN),
        str(ROUND_TABLE_SCRIPT),
        "--json",
        "--mode",
        "design",
        "--rounds",
        str(rounds),
        "--task",
        task,
    ]
    proc = subprocess.run(
        cmd,
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        timeout=420,
    )
    if proc.returncode != 0:
        message = (proc.stderr or proc.stdout or "roundtable failed").strip()
        raise RuntimeError(message)
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"invalid roundtable json: {exc}") from exc


def validate_rounds(raw_rounds: object) -> int:
    rounds = int(raw_rounds or 2)
    if rounds < 1 or rounds > 10:
        raise ValueError("轮数只支持 1 到 10")
    return rounds


def stream_roundtable(task: str, rounds: int):
    cmd = [
        str(PYTHON_BIN),
        str(ROUND_TABLE_SCRIPT),
        "--stream-jsonl",
        "--mode",
        "design",
        "--rounds",
        str(rounds),
        "--task",
        task,
    ]
    proc = subprocess.Popen(
        cmd,
        cwd=str(ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
        env={**os.environ, "PYTHONUNBUFFERED": "1"},
    )
    try:
        if not proc.stdout:
            raise RuntimeError("stream stdout unavailable")
        for raw_line in proc.stdout:
            line = raw_line.strip()
            if line:
                yield f"{line}\n"
        return_code = proc.wait(timeout=420)
        stderr_text = proc.stderr.read().strip() if proc.stderr else ""
        if return_code != 0:
            yield json.dumps(
                {
                    "event": "fatal_error",
                    "error": stderr_text or "roundtable stream failed",
                },
                ensure_ascii=False,
            ) + "\n"
    except GeneratorExit:
        if proc.poll() is None:
            proc.kill()
        raise
    except Exception as exc:
        if proc.poll() is None:
            proc.kill()
        yield json.dumps({"event": "fatal_error", "error": str(exc)}, ensure_ascii=False) + "\n"
    finally:
        if proc.stdout:
            proc.stdout.close()
        if proc.stderr:
            proc.stderr.close()


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "design-workbench"})


@app.post("/api/roundtable")
def api_roundtable():
    payload = request.get_json(silent=True) or {}
    task = str(payload.get("task", "")).strip()
    if not task:
        return jsonify({"ok": False, "error": "任务不能为空"}), 400
    try:
        rounds = validate_rounds(payload.get("rounds", 2))
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400
    try:
        result = run_roundtable(task, rounds)
    except subprocess.TimeoutExpired:
        return jsonify({"ok": False, "error": "讨论超时，请缩短 brief 后重试"}), 504
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500
    return jsonify({"ok": True, "result": result})


@app.post("/api/roundtable/stream")
def api_roundtable_stream():
    payload = request.get_json(silent=True) or {}
    task = str(payload.get("task", "")).strip()
    if not task:
        return jsonify({"ok": False, "error": "任务不能为空"}), 400
    try:
        rounds = validate_rounds(payload.get("rounds", 2))
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400

    headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    }
    return Response(
        stream_with_context(stream_roundtable(task, rounds)),
        mimetype="application/x-ndjson",
        headers=headers,
    )


@app.post("/api/images/generate")
def api_generate_images():
    payload = request.get_json(silent=True) or {}
    try:
        images, errors = generate_images(payload)
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500
    return jsonify({"ok": True, "images": images, "errors": errors})


@app.post("/api/project-suggestions")
def api_project_suggestions():
    payload = request.get_json(silent=True) or {}
    try:
        result = build_doubao_project_suggestion(payload)
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500
    return jsonify({"ok": True, "result": result})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=19011, debug=False, threaded=True)
