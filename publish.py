#!/usr/bin/env python3
"""Publish a rendered episode to the public podcast site in docs/ (served by GitHub Pages).

Copies the MP3 into docs/episodes/, records it in docs/episodes.json and rebuilds
docs/feed.xml (the RSS feed for Apple Podcasts and Spotify) and docs/index.html.

Usage:
  python publish.py 2026-10-25          # publish build/out/planning-desk-2026-10-25.mp3
  python publish.py --rebuild           # only regenerate feed.xml and index.html
"""
from __future__ import annotations

import argparse
import html
import json
import shutil
import sys
from datetime import datetime
from email.utils import format_datetime
from pathlib import Path
from xml.sax.saxutils import escape
from zoneinfo import ZoneInfo

from podcast_lib import ROOT, duration, load_config

DOCS = ROOT / "docs"
EP_DIR = DOCS / "episodes"
REGISTRY = DOCS / "episodes.json"
TZ = ZoneInfo("Europe/Stockholm")


def load_registry() -> list[dict]:
    return json.loads(REGISTRY.read_text(encoding="utf-8")) if REGISTRY.exists() else []


def cdata(text: str) -> str:
    return "<![CDATA[" + text.replace("]]>", "]]&gt;") + "]]>"


def episode_notes(script: dict, pod: dict) -> tuple[str, str]:
    """Return (plain summary, HTML notes) from the script's show_notes, or derive them."""
    notes = script.get("show_notes") or {}
    summary = (notes.get("summary") or "").strip()
    if not summary:
        for seg in script.get("segments", []):
            if seg.get("id") == "welcome" and seg.get("lines"):
                summary = max((l["text"] for l in seg["lines"]), key=len)
                break
    parts = [f"<p>{html.escape(summary)}</p>"] if summary else []
    sources = [s for s in notes.get("sources", []) if s.get("url")]
    if sources:
        items = "".join(f'<li><a href="{html.escape(s["url"], quote=True)}">{html.escape(s.get("title") or s["url"])}</a></li>'
                        for s in sources)
        parts.append(f"<p>Sources:</p><ul>{items}</ul>")
    parts.append(f"<p><em>{html.escape(pod['ai_disclosure'])}</em></p>")
    return summary, "".join(parts)


def add_episode(stem: str, cfg: dict) -> dict:
    pod = cfg["podcast"]
    out = ROOT / "build" / "out"
    mp3_src = out / f"planning-desk-{stem}.mp3"
    meta = json.loads((out / f"planning-desk-{stem}.json").read_text(encoding="utf-8"))
    script = json.loads((ROOT / "episodes" / "scripts" / f"script-{stem}.json").read_text(encoding="utf-8"))

    EP_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"planning-desk-{stem}.mp3"
    shutil.copyfile(mp3_src, EP_DIR / filename)

    registry = load_registry()
    guid = f"planning-desk-{stem}"
    existing = next((e for e in registry if e["guid"] == guid), None)
    number = existing["number"] if existing else max((e["number"] for e in registry), default=0) + 1

    run_date = script.get("run_date") or stem[:10]
    published = existing["pub_date"] if existing else datetime.fromisoformat(f"{run_date}T07:30:00").replace(tzinfo=TZ).isoformat()
    summary, notes_html = episode_notes(script, pod)
    week = script.get("week", "")
    week_no = week.split("-W")[-1] if "-W" in week else ""
    entry = {
        "guid": guid,
        "number": number,
        "title": f"Week {week_no}: {script.get('episode_title', '').strip()}".strip(": "),
        "summary": summary,
        "notes_html": notes_html,
        "file": f"episodes/{filename}",
        "bytes": (EP_DIR / filename).stat().st_size,
        "duration_sec": int(round(duration(EP_DIR / filename))),
        "pub_date": published,
        "transcript_lines": len(meta.get("timeline", [])),
    }
    registry = [e for e in registry if e["guid"] != guid] + [entry]
    registry.sort(key=lambda e: e["pub_date"])
    REGISTRY.write_text(json.dumps(registry, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Registered episode {number}: {entry['title']}")
    return entry


def build_feed(cfg: dict, registry: list[dict]) -> None:
    pod = cfg["podcast"]
    base = pod["base_url"].rstrip("/") + "/"
    now = format_datetime(datetime.now(TZ))
    channel_desc = f"{pod['description']} {pod['ai_disclosure']}"

    cat = pod["category"]
    category_xml = f'    <itunes:category text="{escape(cat["main"], {chr(34): "&quot;"})}">'
    if cat.get("sub"):
        category_xml += f'\n      <itunes:category text="{escape(cat["sub"], {chr(34): "&quot;"})}"/>\n    '
    category_xml += "</itunes:category>"
    if cat.get("secondary"):
        sec = cat["secondary"]
        category_xml += f'\n    <itunes:category text="{escape(sec["main"])}">'
        if sec.get("sub"):
            category_xml += f'<itunes:category text="{escape(sec["sub"])}"/>'
        category_xml += "</itunes:category>"

    owner_email = pod.get("owner_email", "").strip()
    owner_xml = (f"    <itunes:owner>\n      <itunes:name>{escape(pod['owner_name'])}</itunes:name>\n"
                 f"      <itunes:email>{escape(owner_email)}</itunes:email>\n    </itunes:owner>\n") if owner_email else ""
    if not owner_email:
        print("Warning: podcast.owner_email is empty in config.json. Spotify needs it to verify the show.")

    items = []
    for e in sorted(registry, key=lambda x: x["pub_date"], reverse=True):
        pub = format_datetime(datetime.fromisoformat(e["pub_date"]))
        items.append(f"""    <item>
      <title>{escape(e['title'])}</title>
      <description>{cdata(e['notes_html'])}</description>
      <content:encoded>{cdata(e['notes_html'])}</content:encoded>
      <enclosure url="{escape(base + e['file'])}" length="{e['bytes']}" type="audio/mpeg"/>
      <guid isPermaLink="false">{escape(e['guid'])}</guid>
      <pubDate>{pub}</pubDate>
      <itunes:duration>{e['duration_sec']}</itunes:duration>
      <itunes:episode>{e['number']}</itunes:episode>
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:explicit>false</itunes:explicit>
      <itunes:image href="{escape(base + 'cover.png')}"/>
    </item>""")

    feed = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>{escape(pod['title'])}</title>
    <link>{escape(base)}</link>
    <atom:link href="{escape(base + 'feed.xml')}" rel="self" type="application/rss+xml"/>
    <language>{escape(pod['language'])}</language>
    <copyright>{escape(pod['copyright'])}</copyright>
    <description>{cdata(channel_desc)}</description>
    <itunes:summary>{cdata(channel_desc)}</itunes:summary>
    <itunes:author>{escape(pod['author'])}</itunes:author>
{owner_xml}    <itunes:image href="{escape(base + 'cover.png')}"/>
    <image>
      <url>{escape(base + 'cover.png')}</url>
      <title>{escape(pod['title'])}</title>
      <link>{escape(base)}</link>
    </image>
{category_xml}
    <itunes:explicit>false</itunes:explicit>
    <itunes:type>episodic</itunes:type>
    <lastBuildDate>{now}</lastBuildDate>
    <generator>planning-desk-podcast</generator>
{chr(10).join(items)}
  </channel>
</rss>
"""
    (DOCS / "feed.xml").write_text(feed, encoding="utf-8")
    print(f"Wrote docs/feed.xml with {len(registry)} episode(s).")


def build_index(cfg: dict, registry: list[dict]) -> None:
    pod = cfg["podcast"]
    base = pod["base_url"].rstrip("/") + "/"
    links = [f'<a href="{html.escape(base)}feed.xml">RSS feed</a>']
    for name, key in (("Apple Podcasts", "apple_url"), ("Spotify", "spotify_url")):
        if pod.get(key):
            links.insert(0, f'<a href="{html.escape(pod[key], quote=True)}">{name}</a>')
    eps = []
    for e in sorted(registry, key=lambda x: x["pub_date"], reverse=True):
        when = datetime.fromisoformat(e["pub_date"]).strftime("%-d %B %Y")
        mins = f"{e['duration_sec'] // 60} min"
        eps.append(f"""<article><p class="meta">Episode {e['number']} · {when} · {mins}</p>
<h2>{html.escape(e['title'])}</h2>
<audio controls preload="none" src="{html.escape(e['file'])}"></audio>
<div class="notes">{e['notes_html']}</div></article>""")
    body = "\n".join(eps) if eps else '<p class="meta">The first episode arrives on Sunday.</p>'
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(pod['title'])}</title>
<link rel="alternate" type="application/rss+xml" title="{html.escape(pod['title'])}" href="feed.xml">
<style>
:root{{--bg:#0c1421;--card:#142236;--text:#f4f1ea;--muted:#8a98aa;--accent:#f2a33a}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--text);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}}
main{{max-width:760px;margin:0 auto;padding:32px 16px 64px}}
header{{display:flex;gap:24px;align-items:center;flex-wrap:wrap;margin-bottom:32px}}
header img{{width:180px;height:180px;border-radius:12px}}
h1{{margin:0 0 8px;font-size:28px}}h2{{margin:4px 0 12px;font-size:20px}}
a{{color:var(--accent)}}.links{{display:flex;gap:16px;flex-wrap:wrap}}
.meta{{color:var(--muted);margin:0;font-size:14px}}
article{{background:var(--card);border-radius:12px;padding:20px;margin-bottom:16px}}
audio{{width:100%;margin-bottom:8px}}.notes p{{margin:8px 0}}.notes ul{{padding-left:20px}}
</style></head><body><main>
<header><img src="cover.png" alt="The Planning Desk cover"><div>
<h1>{html.escape(pod['title'])}</h1><p class="meta">{html.escape(pod['description'])}</p>
<p class="meta"><em>{html.escape(pod['ai_disclosure'])}</em></p>
<p class="links">{" ".join(links)}</p></div></header>
{body}
</main></body></html>
"""
    (DOCS / "index.html").write_text(page, encoding="utf-8")
    print("Wrote docs/index.html.")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("stem", nargs="?", help="episode stem, e.g. 2026-10-25")
    ap.add_argument("--rebuild", action="store_true", help="only rebuild feed.xml and index.html")
    args = ap.parse_args()
    if not args.stem and not args.rebuild:
        ap.error("give an episode stem or --rebuild")
    cfg = load_config()
    DOCS.mkdir(exist_ok=True)
    (DOCS / ".nojekyll").touch()
    if args.stem:
        add_episode(args.stem, cfg)
    registry = load_registry()
    build_feed(cfg, registry)
    build_index(cfg, registry)
    return 0


if __name__ == "__main__":
    sys.exit(main())
