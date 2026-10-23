#!/usr/bin/env python3
"""Upload an episode video to YouTube with chapters, captions, a thumbnail and the synthetic-media flag.

Needs these repository secrets (see README, "YouTube"):
  YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN

Usage: python youtube_upload.py 2026-10-25
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

from podcast_lib import ROOT, load_config

OUT = ROOT / "build" / "out"


def ts(sec: float) -> str:
    sec = int(sec)
    return f"{sec // 3600}:{sec % 3600 // 60:02d}:{sec % 60:02d}" if sec >= 3600 else f"{sec // 60}:{sec % 60:02d}"


def srt_time(sec: float) -> str:
    ms = int(round(sec * 1000))
    return f"{ms // 3600000:02d}:{ms % 3600000 // 60000:02d}:{ms % 60000 // 1000:02d},{ms % 1000:03d}"


SEGMENT_NAMES = {
    "cold_open": "Top story", "welcome": "This week", "lead_stories": "Lead stories", "ai_tech": "AI and tech",
    "nordics_dach": "Nordics and DACH", "market_moves": "Market moves", "use_cases": "Use cases",
    "macro": "Macro and trade", "numbers": "The numbers", "events_ahead": "Events ahead",
    "quick_hits": "Quick hits", "sign_off": "Sign-off",
}


def chapters(timeline: list[dict]) -> list[str]:
    rows, seen = ["0:00 Intro"], set()
    for e in timeline:
        seg = e["segment"]
        if seg in seen or seg in ("cold_open", "welcome"):
            seen.add(seg)
            continue
        seen.add(seg)
        rows.append(f"{ts(e['start_sec'])} {SEGMENT_NAMES.get(seg, seg.replace('_', ' ').title())}")
    return rows if len(rows) >= 3 else []


def build_srt(timeline: list[dict]) -> str:
    blocks = []
    for i, e in enumerate(timeline, 1):
        start, end = e["start_sec"], e["start_sec"] + e["duration_sec"]
        blocks.append(f"{i}\n{srt_time(start)} --> {srt_time(end)}\n{e['speaker']}: {e['text']}\n")
    return "\n".join(blocks)


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    stem = sys.argv[1]
    cfg = load_config()
    pod, yt = cfg["podcast"], cfg.get("youtube", {})
    meta = json.loads((OUT / f"planning-desk-{stem}.json").read_text(encoding="utf-8"))
    script = json.loads((ROOT / "episodes" / "scripts" / f"script-{stem}.json").read_text(encoding="utf-8"))
    notes = script.get("show_notes") or {}

    desc = [notes.get("summary", "").strip(), ""]
    ch = chapters(meta["timeline"])
    if ch:
        desc += ["Chapters"] + ch + [""]
    sources = [s for s in notes.get("sources", []) if s.get("url")]
    if sources:
        desc += ["Sources"] + [f"{s.get('title') or s['url']}: {s['url']}" for s in sources] + [""]
    desc += [pod["ai_disclosure"], "Made in partnership with Optilon.", "",
             f"Podcast feed: {pod['base_url'].rstrip('/')}/feed.xml"]
    description = "\n".join(desc).strip()[:4900]

    creds = Credentials(
        None,
        refresh_token=os.environ["YOUTUBE_REFRESH_TOKEN"],
        client_id=os.environ["YOUTUBE_CLIENT_ID"],
        client_secret=os.environ["YOUTUBE_CLIENT_SECRET"],
        token_uri="https://oauth2.googleapis.com/token",
        scopes=["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.force-ssl"],
    )
    yt_api = build("youtube", "v3", credentials=creds, cache_discovery=False)

    body = {
        "snippet": {
            "title": meta["title"][:100],
            "description": description,
            "tags": yt.get("tags", []),
            "categoryId": str(yt.get("category_id", 25)),
            "defaultLanguage": "en",
            "defaultAudioLanguage": "en",
        },
        "status": {
            "privacyStatus": os.environ.get("YOUTUBE_PRIVACY") or yt.get("privacy", "public"),
            "selfDeclaredMadeForKids": False,
            "containsSyntheticMedia": True,
        },
    }
    video = MediaFileUpload(str(OUT / f"planning-desk-{stem}.mp4"), mimetype="video/mp4", resumable=True, chunksize=16 * 1024 * 1024)
    req = yt_api.videos().insert(part="snippet,status", body=body, media_body=video)
    resp = None
    while resp is None:
        status, resp = req.next_chunk()
        if status:
            print(f"  uploaded {int(status.progress() * 100)}%")
    vid = resp["id"]
    print(f"Uploaded https://youtu.be/{vid}")

    srt = OUT / f"planning-desk-{stem}.srt"
    srt.write_text(build_srt(meta["timeline"]), encoding="utf-8")
    try:
        yt_api.captions().insert(part="snippet", body={"snippet": {"videoId": vid, "language": "en", "name": "English", "isDraft": False}},
                                 media_body=MediaFileUpload(str(srt), mimetype="application/octet-stream")).execute()
        print("Captions added.")
    except Exception as err:  # captions are a nice-to-have
        print(f"Captions skipped: {err}")

    thumb = ROOT / "build" / "stills" / f"{stem}-0008s.png"
    if thumb.exists():
        try:
            yt_api.thumbnails().set(videoId=vid, media_body=MediaFileUpload(str(thumb), mimetype="image/png")).execute()
            print("Thumbnail set.")
        except Exception as err:  # custom thumbnails need a verified channel
            print(f"Thumbnail skipped: {err}")

    (OUT / f"planning-desk-{stem}.youtube.txt").write_text(f"https://youtu.be/{vid}\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
