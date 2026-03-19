#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import textwrap
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path("/Users/a123/Documents/codex")
OFFICE_STATE_PATH = Path("/Users/a123/.openclaw/integrations/model-roundtable.office.json")
ENV_FILE = Path("/Users/a123/.openclaw/integrations/model-roundtable.env")


@dataclass
class Provider:
    key: str
    label: str
    kind: str
    model: str
    api_key: str
    url: str
    proxy: str | None = None
    insecure: bool = False


@dataclass
class ProviderReply:
    provider: str
    label: str
    model: str
    ok: bool
    content: str = ""
    error: str = ""


@dataclass
class RoundRecord:
    round_number: int
    replies: list[ProviderReply]


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def load_env_file() -> None:
    if not ENV_FILE.exists():
        return
    for raw_line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        os.environ.setdefault(key, value)


def curl_json(
    *,
    url: str,
    headers: list[str],
    payload: dict[str, Any],
    proxy: str | None = None,
    insecure: bool = False,
    timeout: int = 90,
) -> tuple[int, str]:
    body = json.dumps(payload, ensure_ascii=False)
    cmd = ["curl", "-sS", "--max-time", str(timeout), url]
    if proxy:
        cmd.extend(["--proxy", proxy])
    if insecure:
        cmd.append("-k")
    for header in headers:
        cmd.extend(["-H", header])
    cmd.extend(
        [
            "--data-binary",
            "@-",
            "-w",
            "\n__HTTP_STATUS__:%{http_code}",
        ]
    )
    proc = subprocess.run(cmd, input=body, text=True, capture_output=True)
    if proc.returncode != 0 and "__HTTP_STATUS__:" not in proc.stdout:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or "curl failed")
    marker = "\n__HTTP_STATUS__:"
    if marker not in proc.stdout:
        raise RuntimeError(proc.stderr.strip() or "missing http status marker")
    raw_body, status = proc.stdout.rsplit(marker, 1)
    return int(status.strip()), raw_body.strip()


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


def parse_gemini_content(payload: dict[str, Any]) -> str:
    candidates = payload.get("candidates") or []
    if not candidates:
        return ""
    content = candidates[0].get("content") or {}
    parts = content.get("parts") or []
    texts = []
    for part in parts:
        if isinstance(part, dict) and part.get("text"):
            texts.append(part["text"])
    return "\n".join(text.strip() for text in texts if text).strip()


def office_request(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    office_url = env("PANEL_OFFICE_URL", "http://127.0.0.1:19000").rstrip("/")
    req = urllib.request.Request(
        f"{office_url}{path}",
        method="POST",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=8) as resp:
        return json.loads(resp.read().decode("utf-8"))


def load_office_state() -> dict[str, Any]:
    if OFFICE_STATE_PATH.exists():
        try:
            return json.loads(OFFICE_STATE_PATH.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_office_state(data: dict[str, Any]) -> None:
    OFFICE_STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    OFFICE_STATE_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def ensure_office_agent(provider: Provider) -> str | None:
    if env("PANEL_ENABLE_OFFICE", "1") not in {"1", "true", "yes", "on"}:
        return None
    join_key = env("PANEL_OFFICE_JOIN_KEY", "ocj_example_team_01")
    state = load_office_state()
    agents = state.setdefault("agents", {})
    cached = agents.get(provider.key)
    if isinstance(cached, dict) and cached.get("agentId"):
        return str(cached["agentId"])
    try:
        joined = office_request(
            "/join-agent",
            {
                "joinKey": join_key,
                "name": provider.label,
                "state": "idle",
                "detail": "等待圆桌开始",
            },
        )
        agent_id = joined.get("agentId")
        if agent_id:
            agents[provider.key] = {"agentId": agent_id, "name": provider.label}
            save_office_state(state)
            return str(agent_id)
    except Exception:
        return None
    return None


def push_office_state(provider: Provider, state_name: str, detail: str) -> None:
    agent_id = ensure_office_agent(provider)
    if not agent_id:
        return
    try:
        office_request(
            "/agent-push",
            {
                "agentId": agent_id,
                "joinKey": env("PANEL_OFFICE_JOIN_KEY", "ocj_example_team_01"),
                "name": provider.label,
                "state": state_name,
                "detail": detail[:80],
            },
        )
    except Exception:
        return


def build_providers() -> list[Provider]:
    providers: list[Provider] = []
    if env("PANEL_GEMINI_ENABLED", "1").lower() not in {"0", "false", "no", "off"} and env("PANEL_GEMINI_API_KEY"):
        providers.append(
            Provider(
                key="gemini",
                label="Gemini",
                kind="gemini",
                model=env("PANEL_GEMINI_MODEL", "gemini-2.5-flash"),
                api_key=env("PANEL_GEMINI_API_KEY"),
                url="https://generativelanguage.googleapis.com/v1beta/models",
                proxy=env("PANEL_GEMINI_PROXY", "http://127.0.0.1:15236"),
            )
        )
    if env("PANEL_DEEPSEEK_ENABLED", "1").lower() not in {"0", "false", "no", "off"} and env("PANEL_DEEPSEEK_API_KEY"):
        providers.append(
            Provider(
                key="deepseek",
                label="DeepSeek",
                kind="openaiish",
                model=env("PANEL_DEEPSEEK_MODEL", "deepseek-chat"),
                api_key=env("PANEL_DEEPSEEK_API_KEY"),
                url="https://api.deepseek.com/chat/completions",
            )
        )
    if env("PANEL_ARK_ENABLED", "1").lower() not in {"0", "false", "no", "off"} and env("PANEL_ARK_API_KEY"):
        providers.append(
            Provider(
                key="doubao",
                label="豆包",
                kind="openaiish",
                model=env("PANEL_ARK_MODEL", "doubao-seed-2-0-lite-260215"),
                api_key=env("PANEL_ARK_API_KEY"),
                url="https://ark.cn-beijing.volces.com/api/v3/chat/completions",
            )
        )
    if env("PANEL_OPENAI_ENABLED", "0").lower() not in {"0", "false", "no", "off"} and env("PANEL_OPENAI_API_KEY"):
        providers.append(
            Provider(
                key="openai",
                label="GPT",
                kind="openaiish",
                model=env("PANEL_OPENAI_MODEL", "gpt-5.3-chat-latest"),
                api_key=env("PANEL_OPENAI_API_KEY"),
                url="https://api.openai.com/v1/chat/completions",
                proxy=env("PANEL_OPENAI_PROXY", "http://127.0.0.1:15236"),
            )
        )
    return providers


def call_provider(provider: Provider, messages: list[dict[str, str]]) -> ProviderReply:
    push_office_state(provider, "researching", "正在阅读任务")
    try:
        if provider.kind == "openaiish":
            status, raw_body = curl_json(
                url=provider.url,
                headers=[
                    f"Authorization: Bearer {provider.api_key}",
                    "Content-Type: application/json",
                ],
                payload={"model": provider.model, "messages": messages},
                proxy=provider.proxy or None,
                insecure=provider.insecure,
                timeout=90,
            )
            data = json.loads(raw_body or "{}")
            if status >= 400 or data.get("error"):
                error = (data.get("error") or {}).get("message") or raw_body[:300]
                push_office_state(provider, "error", error)
                return ProviderReply(provider.key, provider.label, provider.model, False, error=error)
            content = parse_openaiish_content(data)
        elif provider.kind == "gemini":
            status, raw_body = curl_json(
                url=f"{provider.url}/{provider.model}:generateContent?key={provider.api_key}",
                headers=["Content-Type: application/json"],
                payload={
                    "contents": [
                        {
                            "parts": [{"text": "\n\n".join(msg["content"] for msg in messages if msg.get("content"))}]
                        }
                    ]
                },
                proxy=provider.proxy or None,
                insecure=provider.insecure,
                timeout=90,
            )
            data = json.loads(raw_body or "{}")
            if status >= 400 or data.get("error"):
                error = (data.get("error") or {}).get("message") or raw_body[:300]
                push_office_state(provider, "error", error)
                return ProviderReply(provider.key, provider.label, provider.model, False, error=error)
            content = parse_gemini_content(data)
        else:
            return ProviderReply(provider.key, provider.label, provider.model, False, error="unsupported provider")
    except Exception as exc:
        push_office_state(provider, "error", str(exc))
        return ProviderReply(provider.key, provider.label, provider.model, False, error=str(exc))

    if not content:
        push_office_state(provider, "error", "empty response")
        return ProviderReply(provider.key, provider.label, provider.model, False, error="empty response")
    push_office_state(provider, "syncing", "已经生成观点")
    return ProviderReply(provider.key, provider.label, provider.model, True, content=content.strip())


def initial_prompt(task: str, provider_name: str, *, mode: str = "generic") -> list[dict[str, str]]:
    if mode == "design":
        return [
            {
                "role": "system",
                "content": (
                    "你正在参加一个品牌平面设计圆桌。默认使用简体中文。"
                    "你要像资深品牌视觉设计师和提示词导演一样思考。"
                    "重点是把 brief 转成可以落地的图像生成方向，不要空泛。"
                ),
            },
            {
                "role": "user",
                "content": textwrap.dedent(
                    f"""
                    你的身份：{provider_name}
                    当前任务：
                    {task}

                    请先给出你的独立方案，包含：
                    1. 核心视觉方向
                    2. 为什么这个方向适合这个 brief
                    3. 对 Nanobanana / 即梦 最重要的提示词要素
                    4. 需要避免的画面误区

                    限制：
                    - 以平面设计落地为中心
                    - 不超过 260 字
                    """
                ).strip(),
            },
        ]
    return [
        {
            "role": "system",
            "content": (
                "你正在参加一个多模型圆桌讨论。默认使用简体中文。"
                "回答要短、清楚、可执行，不要写客套话。"
            ),
        },
        {
            "role": "user",
            "content": textwrap.dedent(
                f"""
                你的身份：{provider_name}
                用户任务：
                {task}

                请先给出你的独立观点，包含：
                1. 你的判断
                2. 关键理由
                3. 推荐动作

                限制：不超过 220 字。
                """
            ).strip(),
        },
    ]


def debate_prompt(
    task: str,
    provider_name: str,
    own_view: str,
    other_views: list[tuple[str, str]],
    *,
    round_number: int,
    total_rounds: int,
    mode: str = "generic",
) -> list[dict[str, str]]:
    others_block = "\n".join(f"{label}：{content}" for label, content in other_views)
    if mode == "design":
        return [
            {
                "role": "system",
                "content": (
                    "你正在参加品牌平面设计圆桌。默认使用简体中文。"
                    "你的任务是修正视觉概念和提示词策略，而不是重复摘要。"
                ),
            },
            {
                "role": "user",
                "content": textwrap.dedent(
                    f"""
                    你的身份：{provider_name}
                    设计 brief：
                    {task}

                    你上一轮观点：
                    {own_view}

                    其他模型上一轮观点：
                    {others_block}

                    请输出第 {round_number} 轮发言（总共 {total_rounds} 轮），包含：
                    1. 你最认同的视觉判断
                    2. 你最反对的提示词倾向
                    3. 你修正后的主画面方向
                    4. 你建议保留到最终 prompt 的关键词

                    限制：
                    - 面向平面设计出图
                    - 不超过 260 字
                    """
                ).strip(),
            },
        ]
    return [
        {
            "role": "system",
            "content": (
                "你正在参加一个多模型圆桌讨论。默认使用简体中文。"
                "请直接指出分歧并修正自己的观点，不要写寒暄。"
            ),
        },
        {
            "role": "user",
            "content": textwrap.dedent(
                f"""
                你的身份：{provider_name}
                用户任务：
                {task}

                你上一轮观点：
                {own_view}

                其他模型上一轮观点：
                {others_block}

                请输出第 {round_number} 轮发言（总共 {total_rounds} 轮），包含：
                1. 你最认同的一点
                2. 你最不同意的一点
                3. 你的修正版结论
                4. 你建议团队下一步做什么

                限制：不超过 220 字。
                """
            ).strip(),
        },
    ]


def summary_prompt(task: str, transcript: dict[str, list[str]], total_rounds: int, *, mode: str = "generic") -> list[dict[str, str]]:
    lines = []
    for label, rounds in transcript.items():
        for index, content in enumerate(rounds, start=1):
            lines.append(f"{label} 第{index}轮：{content}")
    transcript_block = "\n".join(lines)
    if mode == "design":
        return [
            {
                "role": "system",
                "content": (
                    "你是品牌设计团队里的创意总监兼提示词导演。默认使用简体中文。"
                    "你的职责是把多模型讨论收束成一段真正可以执行的最终生图 prompt。"
                    "请优先做统一收束，而不是给每个工具分别写一套 prompt。"
                ),
            },
            {
                "role": "user",
                "content": textwrap.dedent(
                    f"""
                    设计 brief：
                    {task}

                    讨论轮数：
                    {total_rounds}

                    讨论记录：
                    {transcript_block}

                    请严格按下面格式输出，所有部分都必须有内容：

                    设计结论：
                    <2-3句，说明最终视觉方向与适用场景>

                    最终执行 Prompt：
                    <1段完整主 prompt，作为最终统一执行版本。必须能直接用于即梦、Nano Banana、MiniMax。重点写清主体、构图、材质、光线、镜头、风格、色彩、排版留白和商业质感。>

                    工具适配建议：
                    - Nano Banana：<一句话说明这套统一 prompt 在 Nano Banana 上如何使用或要微调什么>
                    - 即梦：<一句话说明这套统一 prompt 在即梦上如何使用或要微调什么>
                    - MiniMax：<一句话说明这套统一 prompt 在 MiniMax 上如何使用或要微调什么>

                    版式与字体建议：
                    - <建议1>
                    - <建议2>
                    - <建议3>

                    后续微调建议：
                    - <建议1>
                    - <建议2>
                    - <建议3>

                    要求：
                    - 面向品牌平面设计师工作流
                    - 不要写空话
                    - 输出必须能直接指导生图和后续排版
                    - 最终执行 Prompt 必须是一段总结优化后的统一 prompt，不要再分别给三个工具写三段 prompt
                    """
                ).strip(),
            },
        ]
    return [
        {
            "role": "system",
            "content": (
                "你是圆桌主持人。默认使用简体中文。"
                "请把多模型讨论整理成高密度结论，不要复述废话。"
            ),
        },
        {
            "role": "user",
            "content": textwrap.dedent(
                f"""
                用户任务：
                {task}

                讨论轮数：
                {total_rounds}

                讨论记录：
                {transcript_block}

                请严格按下面格式输出，使用简体中文：

                最终结论：
                <1-2句>

                待办清单：
                - <事项1>
                - <事项2>
                - <事项3>

                风险项：
                - <风险1>
                - <风险2>
                - <风险3>

                总体控制在 320 字以内。
                """
            ).strip(),
        },
    ]


def render_text(
    *,
    task: str,
    rounds: list[RoundRecord],
    summary: ProviderReply | None,
    unavailable: list[ProviderReply],
) -> str:
    available_labels = " / ".join(reply.label for reply in rounds[0].replies if reply.ok)
    parts = [f"【圆桌任务】\n{task}", f"【参会模型】\n{available_labels or '无'}"]
    if unavailable:
        dedup_unavailable = {}
        for item in unavailable:
            dedup_unavailable[item.label] = item.error
        unavailable_lines = [f"{label}: {error}" for label, error in dedup_unavailable.items()]
        parts.append("【暂不可用】\n" + "\n".join(unavailable_lines))

    for record in rounds:
        parts.append(
            f"【第{record.round_number}轮】\n"
            + "\n\n".join(f"{item.label}：{item.content}" for item in record.replies if item.ok)
        )
    if summary and summary.ok:
        parts.append(f"【总结】\n{summary.content}")
    return "\n\n".join(part for part in parts if part.strip())


def provider_meta(provider: Provider) -> dict[str, str]:
    return {
        "key": provider.key,
        "label": provider.label,
        "model": provider.model,
    }


def build_result_payload(
    *,
    task: str,
    round_records: list[RoundRecord],
    summary: ProviderReply | None,
    unavailable: list[ProviderReply],
) -> dict[str, Any]:
    return {
        "task": task,
        "rounds": [
            {
                "round_number": record.round_number,
                "replies": [item.__dict__ for item in record.replies],
            }
            for record in round_records
        ],
        "summary": summary.__dict__ if summary else None,
        "unavailable": [item.__dict__ for item in unavailable],
    }


def emit_event(event: str, **payload: Any) -> None:
    print(json.dumps({"event": event, **payload}, ensure_ascii=False), flush=True)


def run_discussion(task: str, total_rounds: int, *, mode: str = "generic", stream: bool = False) -> dict[str, Any]:
    providers = build_providers()
    if not providers:
        raise RuntimeError("未配置任何圆桌模型。")

    provider_map = {provider.key: provider for provider in providers}
    round_records: list[RoundRecord] = []
    unavailable: list[ProviderReply] = []
    summary: ProviderReply | None = None

    if stream:
        emit_event(
            "session_start",
            task=task,
            total_rounds=total_rounds,
            providers=[provider_meta(provider) for provider in providers],
        )

    try:
        round1: list[ProviderReply] = []
        if stream:
            emit_event("round_start", round_number=1, phase="initial")
        for provider in providers:
            if stream:
                emit_event("provider_start", round_number=1, phase="initial", provider=provider_meta(provider))
            reply = call_provider(provider, initial_prompt(task, provider.label, mode=mode))
            round1.append(reply)
            if not reply.ok:
                unavailable.append(reply)
                if stream:
                    emit_event("provider_unavailable", round_number=1, reply=reply.__dict__)
            if stream:
                emit_event("provider_reply", round_number=1, phase="initial", reply=reply.__dict__)

        active_round1 = [item for item in round1 if item.ok]
        if len(active_round1) < 2:
            detail_lines = [f"- {item.label}: {item.error}" for item in unavailable]
            message = "可用模型少于 2 个，无法开始圆桌讨论。"
            if detail_lines:
                message = f"{message}\n" + "\n".join(detail_lines)
            if stream:
                emit_event("fatal_error", error=message)
            raise RuntimeError(message)

        round_records.append(RoundRecord(round_number=1, replies=round1))
        if stream:
            emit_event("round_complete", round_number=1, replies=[item.__dict__ for item in round1])

        transcript: dict[str, list[str]] = {item.label: [item.content] for item in active_round1}
        last_success_by_provider = {item.provider: item.content for item in active_round1}
        active_provider_keys = [item.provider for item in active_round1]

        for round_number in range(2, total_rounds + 1):
            current_replies: list[ProviderReply] = []
            if stream:
                emit_event("round_start", round_number=round_number, phase="debate")
            for provider_key in active_provider_keys:
                provider = provider_map[provider_key]
                own_view = last_success_by_provider[provider_key]
                other_views = [
                    (provider_map[other_key].label, last_success_by_provider[other_key])
                    for other_key in active_provider_keys
                    if other_key != provider_key
                ]
                if stream:
                    emit_event(
                        "provider_start",
                        round_number=round_number,
                        phase="debate",
                        provider=provider_meta(provider),
                    )
                reply = call_provider(
                    provider,
                    debate_prompt(
                        task,
                        provider.label,
                        own_view,
                        other_views,
                        round_number=round_number,
                        total_rounds=total_rounds,
                        mode=mode,
                    ),
                )
                if reply.ok:
                    last_success_by_provider[provider_key] = reply.content
                    transcript[provider.label].append(reply.content)
                else:
                    transcript[provider.label].append(f"第{round_number}轮失败：{reply.error}")
                    unavailable.append(reply)
                    if stream:
                        emit_event("provider_unavailable", round_number=round_number, reply=reply.__dict__)
                current_replies.append(reply)
                if stream:
                    emit_event("provider_reply", round_number=round_number, phase="debate", reply=reply.__dict__)
            round_records.append(RoundRecord(round_number=round_number, replies=current_replies))
            if stream:
                emit_event(
                    "round_complete",
                    round_number=round_number,
                    replies=[item.__dict__ for item in current_replies],
                )

        moderator = None
        moderator_order = ("doubao", "deepseek", "gemini", "openai") if mode == "design" else ("gemini", "deepseek", "doubao", "openai")
        for candidate_key in moderator_order:
            if candidate_key in active_provider_keys:
                moderator = provider_map[candidate_key]
                break

        if moderator:
            if stream:
                emit_event("summary_start", provider=provider_meta(moderator))
            push_office_state(moderator, "syncing", "正在整理最终结论")
            for candidate_key in [moderator.key] + [key for key in active_provider_keys if key != moderator.key]:
                candidate = provider_map[candidate_key]
                if stream:
                    emit_event("summary_attempt", provider=provider_meta(candidate))
                summary = call_provider(candidate, summary_prompt(task, transcript, total_rounds, mode=mode))
                if summary.ok:
                    if stream:
                        emit_event("summary_complete", reply=summary.__dict__)
                    break
                unavailable.append(summary)
                if stream:
                    emit_event("provider_unavailable", stage="summary", reply=summary.__dict__)
        payload = build_result_payload(
            task=task,
            round_records=round_records,
            summary=summary,
            unavailable=unavailable,
        )
        if stream:
            emit_event("done", result=payload)
        return payload
    finally:
        for provider in providers:
            push_office_state(provider, "idle", "圆桌结束，等待下一条任务")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a multi-model roundtable discussion.")
    parser.add_argument("--task", help="Roundtable task")
    parser.add_argument("--rounds", type=int, default=3, help="Discussion rounds before summary (1-10)")
    parser.add_argument("--mode", choices=("generic", "design"), default="generic", help="Roundtable operating mode")
    parser.add_argument("task_parts", nargs="*", help="Task when --task is omitted")
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of formatted text")
    parser.add_argument("--stream-jsonl", action="store_true", help="Emit newline-delimited JSON events while running")
    return parser.parse_args()


def main() -> int:
    load_env_file()
    args = parse_args()
    task = (args.task or " ".join(args.task_parts)).strip()
    if not task:
        print("用法: /panel <任务> 或 /panel2 <任务> 或 /panel3 <任务>", file=sys.stderr)
        return 1
    if args.rounds < 1 or args.rounds > 10:
        print("讨论轮数只支持 1 到 10。", file=sys.stderr)
        return 1

    try:
        result = run_discussion(task, args.rounds, mode=args.mode, stream=args.stream_jsonl)
    except RuntimeError as exc:
        if not args.stream_jsonl:
            print(str(exc), file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0

    if args.stream_jsonl:
        return 0

    print(
        render_text(
            task=task,
            rounds=[RoundRecord(round_number=item["round_number"], replies=[ProviderReply(**reply) for reply in item["replies"]]) for item in result["rounds"]],
            summary=ProviderReply(**result["summary"]) if result.get("summary") else None,
            unavailable=[ProviderReply(**item) for item in result["unavailable"]],
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
