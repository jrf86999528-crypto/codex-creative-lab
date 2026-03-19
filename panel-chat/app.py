#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

from flask import Flask, Response, jsonify, render_template, request, stream_with_context


ROOT = Path("/Users/a123/Documents/codex")
ROUND_TABLE_SCRIPT = ROOT / "scripts" / "model_roundtable.py"
PYTHON_BIN = Path("/usr/local/bin/python3.11")

app = Flask(__name__, template_folder="templates", static_folder="static")


def run_roundtable(task: str, rounds: int) -> dict:
    cmd = [
        str(PYTHON_BIN),
        str(ROUND_TABLE_SCRIPT),
        "--json",
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
        timeout=360,
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
        return_code = proc.wait(timeout=360)
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
    return jsonify({"ok": True, "service": "panel-chat"})


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
        return jsonify({"ok": False, "error": "讨论超时，请缩短任务描述后重试"}), 504
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


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=19010, debug=False, threaded=True)
