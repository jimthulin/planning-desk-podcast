"""Shared helpers for The Planning Desk render pipeline: ElevenLabs calls and ffmpeg utilities."""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import time
from pathlib import Path

import requests

API = "https://api.elevenlabs.io/v1"
ROOT = Path(__file__).resolve().parent
RETRY_STATUS = {429, 500, 502, 503, 504}


class ElevenLabsError(RuntimeError):
    pass


def load_config() -> dict:
    return json.loads((ROOT / "config.json").read_text(encoding="utf-8"))


def api_key() -> str:
    key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not key:
        raise SystemExit("ELEVENLABS_API_KEY is not set. Add it as a repository secret (Settings > Secrets and variables > Actions).")
    return key


def post_audio(path: str, body: dict, out: Path, *, params: dict | None = None, attempts: int = 6) -> None:
    """POST to an ElevenLabs endpoint that returns audio bytes, with backoff on rate limits and server errors."""
    headers = {"xi-api-key": api_key(), "accept": "audio/mpeg", "content-type": "application/json"}
    delay = 4.0
    for attempt in range(1, attempts + 1):
        r = requests.post(f"{API}{path}", headers=headers, json=body, params=params, timeout=300)
        if r.status_code == 200 and r.content:
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_bytes(r.content)
            return
        if r.status_code in RETRY_STATUS and attempt < attempts:
            wait = float(r.headers.get("retry-after", delay))
            print(f"  ElevenLabs {r.status_code} on {path}, retrying in {wait:.0f}s ({attempt}/{attempts})")
            time.sleep(wait)
            delay = min(delay * 2, 60)
            continue
        raise ElevenLabsError(f"{path} failed with HTTP {r.status_code}: {r.text[:600]}")


def cache_key(*parts) -> str:
    return hashlib.sha256(json.dumps(parts, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:24]


def run(cmd: list[str]) -> None:
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd[:6])}...\n{res.stderr[-1500:]}")


def duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return float(out)


def to_wav(src: Path, dst: Path, filters: str | None = None) -> None:
    """Decode to 44.1 kHz stereo PCM so every piece concatenates cleanly."""
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(src)]
    if filters:
        cmd += ["-af", filters]
    cmd += ["-ar", "44100", "-ac", "2", "-c:a", "pcm_s16le", str(dst)]
    run(cmd)


def silence(dst: Path, seconds: float) -> None:
    run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
         "-t", f"{seconds:.3f}", "-c:a", "pcm_s16le", str(dst)])


def fit_length(src: Path, dst: Path, seconds: float) -> None:
    """Trim or pad a clip to exactly `seconds`."""
    run(["ffmpeg", "-y", "-v", "error", "-i", str(src), "-af", f"apad=whole_dur={seconds},atrim=0:{seconds}",
         "-ar", "44100", "-ac", "2", "-b:a", "192k", str(dst)])


def tone(dst: Path, seconds: float, freq: int) -> None:
    """Placeholder audio for dry runs without an API key."""
    run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"sine=frequency={freq}:sample_rate=44100",
         "-t", f"{seconds:.3f}", "-af", "volume=0.25", "-b:a", "128k", str(dst)])
