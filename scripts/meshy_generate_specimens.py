#!/usr/bin/env python3
"""Generate Meshy text-to-3D assets for extinct-lab specimens.

This script follows Meshy's official preview -> refine workflow and writes
downloaded GLB assets back into assets/specimens plus the shared manifest.
"""

from __future__ import annotations

import argparse
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MANIFEST = REPO_ROOT / "assets" / "specimens" / "manifest.json"
DEFAULT_OUTPUT_ROOT = REPO_ROOT / "assets" / "specimens"
API_BASE = "https://api.meshy.ai/openapi/v2/text-to-3d"
TEST_API_KEY = "msy_dummy_api_key_for_test_mode_12345678"
SUCCESS_STATES = {"SUCCEEDED", "SUCCESS"}
FAIL_STATES = {"FAILED", "CANCELED", "CANCELLED", "ERROR"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--specimen",
        action="append",
        dest="specimens",
        help="Specimen id from the manifest. Repeat to generate multiple ids. Defaults to all specimens.",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=DEFAULT_MANIFEST,
        help=f"Path to the Meshy specimen manifest. Default: {DEFAULT_MANIFEST}",
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=DEFAULT_OUTPUT_ROOT,
        help=f"Directory where downloaded GLBs should be saved. Default: {DEFAULT_OUTPUT_ROOT}",
    )
    parser.add_argument(
        "--api-key",
        help="Meshy API key. Defaults to the MESHY_API_KEY environment variable.",
    )
    parser.add_argument(
        "--test-mode",
        action="store_true",
        help="Use Meshy's official dummy API key so you can validate the integration without spending credits.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate specimens even if a localModel path already exists in the manifest.",
    )
    parser.add_argument(
        "--poll-interval",
        type=float,
        default=12.0,
        help="Seconds to wait between task polls. Default: 12",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=1800.0,
        help="Maximum seconds to wait for each Meshy task. Default: 1800",
    )
    return parser.parse_args()


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def save_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def resolve_api_key(args: argparse.Namespace) -> str:
    if args.api_key:
        return args.api_key.strip()
    if args.test_mode:
        return TEST_API_KEY

    api_key = os.environ.get("MESHY_API_KEY", "").strip()
    if api_key:
        return api_key

    raise SystemExit(
        "Missing Meshy API key. Set MESHY_API_KEY, pass --api-key, or use --test-mode for Meshy's official dummy key."
    )


def request_json(method: str, url: str, api_key: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    body = None
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }

    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Meshy API error {exc.code} for {url}: {detail}") from exc


def download_file(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url, timeout=240) as response, destination.open("wb") as handle:
        handle.write(response.read())


def wait_for_task(task_id: str, api_key: str, poll_interval: float, timeout: float) -> dict[str, Any]:
    deadline = time.time() + timeout
    while time.time() < deadline:
        task = request_json("GET", f"{API_BASE}/{task_id}", api_key)
        status = str(task.get("status", "")).upper()
        print(f"[meshy] task {task_id} -> {status}", flush=True)
        if status in SUCCESS_STATES:
            return task
        if status in FAIL_STATES:
            raise RuntimeError(
                f"Meshy task {task_id} failed with status {status}: {json.dumps(task, ensure_ascii=False)}"
            )
        time.sleep(poll_interval)

    raise TimeoutError(f"Timed out waiting for Meshy task {task_id} after {timeout} seconds.")


def normalize_site_path(path: Path) -> str:
    return f"./{path.relative_to(REPO_ROOT).as_posix()}"


def create_preview_task(specimen_id: str, specimen: dict[str, Any], api_key: str) -> str:
    payload = {
        "mode": "preview",
        "prompt": specimen["prompt"],
        "negative_prompt": specimen.get("negativePrompt"),
        "should_remesh": specimen.get("shouldRemesh", True),
        "target_polycount": specimen.get("targetPolycount", 48000),
        "ai_model": specimen.get("aiModel", "latest"),
        "topology": specimen.get("topology", "triangle"),
    }
    payload = {key: value for key, value in payload.items() if value not in (None, "")}
    response = request_json("POST", API_BASE, api_key, payload)
    preview_id = response.get("result")
    if not preview_id:
        raise RuntimeError(f"Meshy preview request for {specimen_id} returned no task id: {response}")
    return str(preview_id)


def create_refine_task(specimen_id: str, specimen: dict[str, Any], preview_task_id: str, api_key: str) -> str:
    payload = {
        "mode": "refine",
        "preview_task_id": preview_task_id,
        "texture_prompt": specimen.get("texturePrompt"),
        "negative_prompt": specimen.get("negativePrompt"),
        "enable_pbr": specimen.get("enablePbr", True),
        "ai_model": specimen.get("aiModel", "latest"),
    }
    payload = {key: value for key, value in payload.items() if value not in (None, "")}
    response = request_json("POST", API_BASE, api_key, payload)
    refine_id = response.get("result")
    if not refine_id:
        raise RuntimeError(f"Meshy refine request for {specimen_id} returned no task id: {response}")
    return str(refine_id)


def update_manifest_entry(
    manifest: dict[str, Any],
    specimen_id: str,
    preview_id: str,
    refine_id: str,
    model_path: Path,
    thumbnail_path: Path | None,
) -> None:
    entry = manifest["specimens"][specimen_id]
    entry["previewTaskId"] = preview_id
    entry["refineTaskId"] = refine_id
    entry["localModel"] = normalize_site_path(model_path)
    entry["localThumbnail"] = normalize_site_path(thumbnail_path) if thumbnail_path else ""
    entry["lastGeneratedAt"] = datetime.now(timezone.utc).isoformat()
    manifest["generatedAt"] = entry["lastGeneratedAt"]


def generate_one(
    specimen_id: str,
    manifest: dict[str, Any],
    api_key: str,
    output_root: Path,
    poll_interval: float,
    timeout: float,
    force: bool,
) -> None:
    entry = manifest["specimens"][specimen_id]
    if entry.get("localModel") and not force:
        print(f"[meshy] skip {specimen_id}: localModel already present. Use --force to replace it.", flush=True)
        return

    print(f"[meshy] creating preview task for {specimen_id}", flush=True)
    preview_id = create_preview_task(specimen_id, entry, api_key)
    wait_for_task(preview_id, api_key, poll_interval, timeout)

    print(f"[meshy] creating refine task for {specimen_id}", flush=True)
    refine_id = create_refine_task(specimen_id, entry, preview_id, api_key)
    refine_task = wait_for_task(refine_id, api_key, poll_interval, timeout)

    model_urls = refine_task.get("model_urls") or {}
    glb_url = model_urls.get("glb") or model_urls.get("gltf")
    if not glb_url:
        raise RuntimeError(f"Meshy refine task for {specimen_id} succeeded but returned no GLB URL: {refine_task}")

    specimen_dir = output_root / specimen_id
    specimen_dir.mkdir(parents=True, exist_ok=True)

    model_path = specimen_dir / "meshy.glb"
    print(f"[meshy] downloading GLB for {specimen_id} -> {model_path}", flush=True)
    download_file(glb_url, model_path)

    thumbnail_path = None
    thumbnail_url = refine_task.get("thumbnail_url")
    if thumbnail_url:
        thumbnail_path = specimen_dir / "thumbnail.png"
        print(f"[meshy] downloading thumbnail for {specimen_id} -> {thumbnail_path}", flush=True)
        download_file(thumbnail_url, thumbnail_path)

    update_manifest_entry(manifest, specimen_id, preview_id, refine_id, model_path, thumbnail_path)


def main() -> int:
    args = parse_args()
    manifest_path = args.manifest.resolve()
    output_root = args.output_root.resolve()
    manifest = load_json(manifest_path)
    specimens = manifest.get("specimens", {})
    selected_ids = args.specimens or list(specimens.keys())

    missing = [specimen_id for specimen_id in selected_ids if specimen_id not in specimens]
    if missing:
        raise SystemExit(f"Unknown specimen ids: {', '.join(missing)}")

    api_key = resolve_api_key(args)
    if api_key == TEST_API_KEY:
        print("[meshy] using Meshy's official test-mode key. All requests will return the same sample result.", flush=True)

    for specimen_id in selected_ids:
        generate_one(
            specimen_id=specimen_id,
            manifest=manifest,
            api_key=api_key,
            output_root=output_root,
            poll_interval=args.poll_interval,
            timeout=args.timeout,
            force=args.force,
        )
        save_json(manifest_path, manifest)

    print("[meshy] done", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(130)
