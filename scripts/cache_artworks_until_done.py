#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path("/Users/a123/Documents/codex")
TARGETS_PATH = ROOT / "tmp" / "artwork-targets.json"
MANIFEST_PATH = ROOT / "assets" / "artworks" / "manifest.json"
DOWNLOADER = ROOT / "scripts" / "cache_painter_artworks.py"
LOG_PATH = ROOT / "tmp" / "artwork-cache-runner.log"
BATCH_SIZE = 10
DELAY_SECONDS = 0.18
WORKERS = 4


def read_manifest_count() -> int:
    if not MANIFEST_PATH.exists():
        return 0
    try:
        return len(json.loads(MANIFEST_PATH.read_text("utf-8")))
    except Exception:
        return 0


def read_total_targets() -> int:
    return len(json.loads(TARGETS_PATH.read_text("utf-8")))


def log(line: str):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    text = f"[{timestamp}] {line}"
    print(text, flush=True)
    with LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(text + "\n")


def run_batch(offset: int) -> tuple[int, int]:
    before = read_manifest_count()
    command = [
        "python3",
        "-u",
        str(DOWNLOADER),
        "--pending-offset",
        str(offset),
        "--pending-limit",
        str(BATCH_SIZE),
        "--workers",
        str(WORKERS),
        "--delay",
        str(DELAY_SECONDS),
    ]
    log(f"run batch offset={offset} before={before}")
    process = subprocess.run(command, cwd=str(ROOT), check=False)
    after = read_manifest_count()
    log(f"batch exit={process.returncode} after={after} delta={after - before}")
    return before, after


def main():
    total = read_total_targets()
    offset = 0
    idle_passes = 0
    max_idle_passes = 3
    pass_progress = False

    log(f"runner start total={total}")

    while True:
        cached = read_manifest_count()
        missing = total - cached
        if missing <= 0:
            log("all artworks cached")
            return

        if offset >= missing:
            offset = 0
            if pass_progress:
                idle_passes = 0
                pass_progress = False
                log("completed pass with progress; restarting from beginning")
            else:
                idle_passes += 1
                log(f"completed idle pass {idle_passes}/{max_idle_passes}")
                if idle_passes >= max_idle_passes:
                    log("no more progress after repeated passes; stopping runner")
                    return

        before, after = run_batch(offset)
        if after > before:
            pass_progress = True

        offset += BATCH_SIZE

        time.sleep(2)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(1)
