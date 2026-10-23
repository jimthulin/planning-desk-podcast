#!/usr/bin/env python3
"""Create the 10-second intro and outro music once and store them in assets/.

Tries the ElevenLabs Music API first and falls back to the Sound Effects API if
music generation isn't available on the account. Existing files are kept unless
--force is given, so the show keeps the same signature sound every week.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from podcast_lib import ROOT, ElevenLabsError, fit_length, load_config, post_audio, tone

ASSETS = ROOT / "assets"


def generate(kind: str, prompt: str, seconds: float, out: Path, fake: bool) -> str:
    raw = out.with_suffix(".raw.mp3")
    if fake:
        tone(raw, seconds, 330 if kind == "intro" else 262)
        source = "fake tone"
    else:
        try:
            post_audio("/music", {"prompt": prompt, "music_length_ms": int(seconds * 1000), "model_id": "music_v1"}, raw)
            source = "ElevenLabs Music"
        except ElevenLabsError as err:
            print(f"  Music API unavailable for {kind} ({err}); falling back to Sound Effects.")
            post_audio("/sound-generation", {"text": prompt, "duration_seconds": seconds, "prompt_influence": 0.6}, raw)
            source = "ElevenLabs Sound Effects"
    fit_length(raw, out, seconds)
    raw.unlink(missing_ok=True)
    return source


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--force", action="store_true", help="regenerate even if the files exist")
    ap.add_argument("--fake", action="store_true", help="write placeholder tones instead of calling ElevenLabs")
    args = ap.parse_args()

    cfg = load_config()["jingles"]
    ASSETS.mkdir(exist_ok=True)
    for kind in ("intro", "outro"):
        out = ASSETS / f"{kind}.mp3"
        if out.exists() and not args.force:
            print(f"{out.name} exists, keeping it (use --force to replace).")
            continue
        source = generate(kind, cfg[f"{kind}_prompt"], cfg["duration_sec"], out, args.fake)
        print(f"Wrote {out.relative_to(ROOT)} ({source}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
