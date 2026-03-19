#!/usr/bin/env python3
"""Generate Tripo text-to-3D assets for extinct-lab specimens.

This script uses Tripo's official Python SDK, writes downloaded GLB assets
into assets/specimens, and updates the shared manifest so extinct-lab can
load the generated models automatically.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from tripo3d import TaskStatus, TripoClient


REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MANIFEST = REPO_ROOT / "assets" / "specimens" / "manifest.json"
DEFAULT_OUTPUT_ROOT = REPO_ROOT / "assets" / "specimens"
DEFAULT_MODEL_VERSION = "v2.5-20250123"


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
        help=f"Path to the specimen manifest. Default: {DEFAULT_MANIFEST}",
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=DEFAULT_OUTPUT_ROOT,
        help=f"Directory where downloaded GLBs should be saved. Default: {DEFAULT_OUTPUT_ROOT}",
    )
    parser.add_argument(
        "--api-key",
        help="Tripo API key. Defaults to the TRIPO_API_KEY environment variable.",
    )
    parser.add_argument(
        "--model-version",
        default=DEFAULT_MODEL_VERSION,
        help=f"Tripo model version. Default: {DEFAULT_MODEL_VERSION}",
    )
    parser.add_argument(
        "--face-limit",
        type=int,
        default=None,
        help="Optional maximum face count for generated models.",
    )
    parser.add_argument(
        "--geometry-quality",
        choices=("standard", "detailed"),
        default="standard",
        help="Geometry quality. Default: standard.",
    )
    parser.add_argument(
        "--texture-quality",
        choices=("standard", "detailed"),
        default="standard",
        help="Texture quality. Default: standard.",
    )
    parser.add_argument(
        "--no-texture",
        action="store_true",
        help="Generate geometry only without textures.",
    )
    parser.add_argument(
        "--no-pbr",
        action="store_true",
        help="Do not request PBR outputs.",
    )
    parser.add_argument(
        "--quad",
        action="store_true",
        help="Request quad topology.",
    )
    parser.add_argument(
        "--compress",
        action="store_true",
        help="Request compressed geometry output.",
    )
    parser.add_argument(
        "--auto-size",
        action="store_true",
        help="Let Tripo determine the model size automatically.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=1800.0,
        help="Maximum seconds to wait for each Tripo task. Default: 1800.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate specimens even if a localModel path already exists in the manifest.",
    )
    parser.add_argument(
        "--resume-task",
        help="Resume a previously created Tripo task id for a single specimen instead of creating a new one.",
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

    import os

    api_key = os.environ.get("TRIPO_API_KEY", "").strip()
    if api_key:
        return api_key

    raise SystemExit("Missing Tripo API key. Set TRIPO_API_KEY or pass --api-key.")


def normalize_site_path(path: Path) -> str:
    return f"./{path.relative_to(REPO_ROOT).as_posix()}"


def choose_download_path(downloads: dict[str, str | None], prefer_pbr: bool) -> Path:
    candidates = []
    if prefer_pbr:
        candidates.extend([downloads.get("pbr_model"), downloads.get("model"), downloads.get("base_model")])
    else:
        candidates.extend([downloads.get("model"), downloads.get("pbr_model"), downloads.get("base_model")])

    for candidate in candidates:
        if candidate:
            return Path(candidate)

    raise RuntimeError("Tripo task succeeded but returned no downloadable model file.")


def update_manifest_entry(
    manifest: dict[str, Any],
    specimen_id: str,
    task_id: str,
    model_path: Path,
    thumbnail_path: Path | None,
) -> None:
    entry = manifest["specimens"][specimen_id]
    entry["provider"] = "tripo"
    entry["providerTaskId"] = task_id
    entry["localModel"] = normalize_site_path(model_path)
    entry["localThumbnail"] = normalize_site_path(thumbnail_path) if thumbnail_path else ""
    entry["lastGeneratedAt"] = datetime.now(timezone.utc).isoformat()
    manifest["generatedAt"] = entry["lastGeneratedAt"]


async def ensure_balance(client: TripoClient) -> None:
    balance = await client.get_balance()
    print(f"[tripo] balance={balance.balance} frozen={balance.frozen}", flush=True)
    if balance.balance <= 0:
        raise SystemExit("Tripo account balance is 0. Top up the account before generating models.")


async def generate_one(
    client: TripoClient,
    specimen_id: str,
    manifest: dict[str, Any],
    output_root: Path,
    timeout: float,
    force: bool,
    args: argparse.Namespace,
    resume_task_id: str | None = None,
) -> None:
    entry = manifest["specimens"][specimen_id]
    if entry.get("localModel") and not force:
        print(f"[tripo] skip {specimen_id}: localModel already present. Use --force to replace it.", flush=True)
        return

    if resume_task_id:
        task_id = resume_task_id
        print(f"[tripo] resuming task for {specimen_id}: {task_id}", flush=True)
    else:
        print(f"[tripo] creating task for {specimen_id}", flush=True)
        task_id = await client.text_to_model(
            prompt=entry["prompt"],
            negative_prompt=entry.get("negativePrompt"),
            model_version=args.model_version,
            face_limit=args.face_limit,
            texture=not args.no_texture,
            pbr=not args.no_pbr,
            texture_quality=args.texture_quality,
            geometry_quality=args.geometry_quality,
            auto_size=args.auto_size,
            quad=args.quad,
            compress=args.compress,
        )
        print(f"[tripo] task_id={task_id}", flush=True)

    task = await client.wait_for_task(task_id, timeout=timeout, verbose=True)
    if task.status != TaskStatus.SUCCESS:
        raise RuntimeError(f"Tripo task {task_id} ended with {task.status}: {task.error_msg or 'unknown error'}")

    specimen_dir = output_root / specimen_id
    specimen_dir.mkdir(parents=True, exist_ok=True)

    downloads = await client.download_task_models(task, str(specimen_dir))
    downloaded_model = choose_download_path(downloads, prefer_pbr=not args.no_pbr)
    model_path = specimen_dir / "tripo.glb"
    shutil.copyfile(downloaded_model, model_path)

    thumbnail_path = None
    rendered = await client.download_rendered_image(task, str(specimen_dir), filename="thumbnail.jpg")
    if rendered:
        thumbnail_path = Path(rendered)

    update_manifest_entry(manifest, specimen_id, task_id, model_path, thumbnail_path)
    print(f"[tripo] saved {specimen_id} -> {model_path}", flush=True)


async def async_main(args: argparse.Namespace) -> int:
    manifest_path = args.manifest.resolve()
    output_root = args.output_root.resolve()
    manifest = load_json(manifest_path)
    specimens = manifest.get("specimens", {})
    selected_ids = args.specimens or list(specimens.keys())

    missing = [specimen_id for specimen_id in selected_ids if specimen_id not in specimens]
    if missing:
        raise SystemExit(f"Unknown specimen ids: {', '.join(missing)}")

    if args.resume_task and len(selected_ids) != 1:
        raise SystemExit("--resume-task requires exactly one --specimen.")

    client = TripoClient(resolve_api_key(args))
    try:
        await ensure_balance(client)
        for specimen_id in selected_ids:
            await generate_one(
                client=client,
                specimen_id=specimen_id,
                manifest=manifest,
                output_root=output_root,
                timeout=args.timeout,
                force=args.force,
                args=args,
                resume_task_id=args.resume_task,
            )
            save_json(manifest_path, manifest)
    finally:
        await client.close()

    print("[tripo] done", flush=True)
    return 0


def main() -> int:
    return asyncio.run(async_main(parse_args()))


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(130)
