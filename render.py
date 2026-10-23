#!/usr/bin/env python3
"""Render a Planning Desk episode from a script JSON produced by the script writer agent.

Each spoken line is voiced with ElevenLabs text-to-speech (one take per line, cached so
re-runs don't spend credits twice), then intro music, dialogue and outro music are
stitched with ffmpeg, loudness-normalised and written as an MP3 with a transcript and
a timeline next to it.

Usage:
  python render.py episodes/scripts/script-2026-10-23.json
  python render.py episodes/scripts/script-2026-10-23.json --fake   # no API key, placeholder tones
"""
from __future__ import annotations

import argparse
import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from podcast_lib import (ROOT, ElevenLabsError, cache_key, duration, load_config, post_audio,
                         run, silence, to_wav, tone)

BUILD = ROOT / "build"
CACHE = BUILD / "cache"


def collect_lines(script: dict) -> list[dict]:
    lines = []
    for seg in script["segments"]:
        if seg.get("type") != "speech":
            continue
        for i, line in enumerate(seg["lines"]):
            text = line["text"].strip()
            if not text:
                continue
            lines.append({"segment": seg["id"], "first_in_segment": i == 0,
                          "speaker": line["speaker"], "text": text})
    if not lines:
        raise SystemExit("The script has no speech lines.")
    return lines


class Voicer:
    def __init__(self, cfg: dict, fake: bool):
        self.cfg = cfg
        self.fake = fake
        self.model = cfg["tts"]["model_id"]
        self.fallback = cfg["tts"].get("fallback_model_id")

    def voice(self, line: dict) -> Path:
        speaker = self.cfg["voices"][line["speaker"]]
        settings = self.cfg["tts"].get("voice_settings") or {}
        key = cache_key("fake" if self.fake else self.model, speaker["voice_id"], line["text"], settings)
        out = CACHE / f"{key}.mp3"
        if out.exists():
            return out
        if self.fake:
            words = len(line["text"].split())
            tone(out, max(words / 2.6, 0.6), 440 if line["speaker"] == "F" else 220)
            return out
        body = {"text": line["text"], "model_id": self.model}
        if settings:
            body["voice_settings"] = settings
        path = f"/text-to-speech/{speaker['voice_id']}"
        params = {"output_format": self.cfg["tts"]["output_format"]}
        try:
            post_audio(path, body, out, params=params)
        except ElevenLabsError as err:
            msg = str(err).lower()
            if "voice" in msg and ("not found" in msg or "not_found" in msg):
                raise ElevenLabsError(
                    f"{err}\nAdd the voice '{speaker['elevenlabs_voice']}' to My Voices in ElevenLabs, "
                    "or change its voice_id in config.json.") from err
            if self.fallback and "model" in msg and self.model != self.fallback:
                print(f"  Model {self.model} rejected, switching to {self.fallback} for the rest of the run.")
                self.model = self.fallback
                return self.voice(line)
            raise
        return out


def build_episode(script_path: Path, fake: bool) -> Path:
    cfg = load_config()
    mix = cfg["mix"]
    script = json.loads(script_path.read_text(encoding="utf-8"))
    stem = script_path.stem.replace("script-", "")
    work = BUILD / stem
    out_dir = BUILD / "out"
    for d in (CACHE, work, out_dir):
        d.mkdir(parents=True, exist_ok=True)

    intro, outro = ROOT / "assets" / "intro.mp3", ROOT / "assets" / "outro.mp3"
    for asset in (intro, outro):
        if not asset.exists():
            raise SystemExit(f"Missing {asset.relative_to(ROOT)}. Run make_jingles.py first.")

    lines = collect_lines(script)
    chars = sum(len(l["text"]) for l in lines)
    print(f"{len(lines)} lines, {chars} characters to voice ({'fake' if fake else cfg['tts']['model_id']}).")

    voicer = Voicer(cfg, fake)
    clips: list[Path | None] = [None] * len(lines)
    with ThreadPoolExecutor(max_workers=cfg["tts"].get("max_workers", 3)) as pool:
        futures = {pool.submit(voicer.voice, line): i for i, line in enumerate(lines)}
        for n, fut in enumerate(as_completed(futures), 1):
            clips[futures[fut]] = fut.result()
            if n % 10 == 0 or n == len(lines):
                print(f"  voiced {n}/{len(lines)}")

    # Normalise every piece to the same PCM format, then concatenate.
    gap_line, gap_seg = work / "gap_line.wav", work / "gap_seg.wav"
    gap_intro, gap_outro = work / "gap_intro.wav", work / "gap_outro.wav"
    silence(gap_line, mix["gap_between_lines_sec"])
    silence(gap_seg, mix["gap_between_segments_sec"])
    silence(gap_intro, mix["gap_after_intro_sec"])
    silence(gap_outro, mix["gap_before_outro_sec"])

    intro_len, outro_len = duration(intro), duration(outro)
    intro_wav, outro_wav = work / "intro.wav", work / "outro.wav"
    to_wav(intro, intro_wav, f"afade=t=out:st={max(intro_len - mix['intro_fade_out_sec'], 0):.2f}:d={mix['intro_fade_out_sec']}")
    to_wav(outro, outro_wav, f"afade=t=in:d={mix['outro_fade_in_sec']},"
                             f"afade=t=out:st={max(outro_len - mix['outro_fade_out_sec'], 0):.2f}:d={mix['outro_fade_out_sec']}")

    sequence: list[Path] = [intro_wav, gap_intro]
    timeline, t = [], duration(intro_wav) + mix["gap_after_intro_sec"]
    for i, (line, clip) in enumerate(zip(lines, clips)):
        if i > 0:
            gap = gap_seg if line["first_in_segment"] else gap_line
            sequence.append(gap)
            t += mix["gap_between_segments_sec"] if line["first_in_segment"] else mix["gap_between_lines_sec"]
        wav = work / f"line_{i:03d}.wav"
        tempo = float(mix.get("speech_tempo", 1.0))
        to_wav(clip, wav, f"atempo={tempo}" if abs(tempo - 1.0) > 0.001 else None)
        d = duration(wav)
        timeline.append({"start_sec": round(t, 2), "duration_sec": round(d, 2), "segment": line["segment"],
                         "speaker": cfg["voices"][line["speaker"]]["name"], "text": line["text"]})
        sequence.append(wav)
        t += d
    sequence += [gap_outro, outro_wav]

    concat_list = work / "concat.txt"
    concat_list.write_text("".join(f"file '{p.resolve()}'\n" for p in sequence), encoding="utf-8")
    joined = work / "joined.wav"
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(concat_list), "-c", "copy", str(joined)])

    week = script.get("week", "")
    week_no = week.split("-W")[-1] if "-W" in week else ""
    title = f"{cfg['show']}, Week {week_no}: {script.get('episode_title', '')}".strip()
    mp3 = out_dir / f"planning-desk-{stem}.mp3"
    run(["ffmpeg", "-y", "-v", "error", "-i", str(joined),
         "-af", f"loudnorm=I={mix['loudness_lufs']}:TP={mix['true_peak_db']}:LRA=11",
         "-ar", "44100", "-ac", "2", "-c:a", "libmp3lame", "-b:a", mix["mp3_bitrate"],
         "-id3v2_version", "3",
         "-metadata", f"title={title}", "-metadata", f"artist={cfg['artist']}",
         "-metadata", f"album={cfg['show']}", "-metadata", f"date={script.get('run_date', '')}",
         "-metadata", "genre=Podcast", str(mp3)])

    total = duration(mp3)
    (out_dir / f"planning-desk-{stem}.json").write_text(json.dumps({
        "title": title, "run_date": script.get("run_date"), "week": week, "duration_sec": round(total, 1),
        "lines": len(lines), "characters": chars, "model_id": "fake" if fake else voicer.model,
        "timeline": timeline}, indent=2, ensure_ascii=False), encoding="utf-8")
    transcript = [title, ""] + [f"[{int(e['start_sec'] // 60):02d}:{int(e['start_sec'] % 60):02d}] "
                                 f"{e['speaker'].upper()}: {e['text']}" for e in timeline]
    (out_dir / f"planning-desk-{stem}.txt").write_text("\n".join(transcript) + "\n", encoding="utf-8")

    print(f"Done: {mp3.relative_to(ROOT)}  {int(total // 60)}:{int(total % 60):02d}  ({title})")
    return mp3


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("script", type=Path, help="path to a script-YYYY-MM-DD.json file")
    ap.add_argument("--fake", action="store_true", help="placeholder tones instead of ElevenLabs (no credits)")
    args = ap.parse_args()
    build_episode(args.script.resolve(), args.fake)
    return 0


if __name__ == "__main__":
    sys.exit(main())
