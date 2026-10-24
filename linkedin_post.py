#!/usr/bin/env python3
"""Share the Sunday episode on the owner's own LinkedIn profile ("Share on LinkedIn", w_member_social).

Posts the script's linkedin.profile_post text with a link card to the YouTube video (or the
episode page when there's no video). Self-serve LinkedIn tokens last 60 days and can't be
refreshed by the app, so the run warns when LINKEDIN_TOKEN_SET_ON (a repository variable,
YYYY-MM-DD) is more than 50 days old.

Needs the LINKEDIN_TOKEN secret (scopes: openid, profile, w_member_social).
Usage: python linkedin_post.py 2026-11-08
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import date

from podcast_lib import ROOT, load_config

OUT = ROOT / "build" / "out"


def call(method: str, url: str, token: str, data: dict | None = None) -> tuple[dict, dict]:
    req = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else None, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("X-Restli-Protocol-Version", "2.0.0")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read()
            return (json.loads(body) if body else {}), dict(resp.headers)
    except urllib.error.HTTPError as err:
        msg = err.read().decode(errors="replace")[:600]
        if err.code == 401:
            raise SystemExit("LinkedIn token expired or revoked. Make a new one with LinkedIn's token generator "
                             "and update the LINKEDIN_TOKEN secret and the LINKEDIN_TOKEN_SET_ON variable.") from err
        raise SystemExit(f"LinkedIn API {err.code}: {msg}") from err


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    stem = sys.argv[1]
    cfg = load_config()
    token = os.environ["LINKEDIN_TOKEN"]
    set_on = os.environ.get("LINKEDIN_TOKEN_SET_ON", "")
    if set_on:
        age = (date.today() - date.fromisoformat(set_on)).days
        if age > 50:
            print(f"::warning::The LinkedIn token is {age} days old and stops working at 60. Renew it soon.")

    script = json.loads((ROOT / "episodes" / "scripts" / f"script-{stem}.json").read_text(encoding="utf-8"))
    text = ((script.get("linkedin") or {}).get("profile_post") or "").strip()
    if not text:
        print("No linkedin.profile_post in the script; nothing to share.")
        return 0
    yt = OUT / f"planning-desk-{stem}.youtube.txt"
    pod = cfg["podcast"]
    url = yt.read_text().strip() if yt.exists() else f"{pod['base_url'].rstrip('/')}/e/{stem}.html"
    meta = json.loads((OUT / f"planning-desk-{stem}.json").read_text(encoding="utf-8"))

    me, _ = call("GET", "https://api.linkedin.com/v2/userinfo", token)
    body = {
        "author": f"urn:li:person:{me['sub']}",
        "lifecycleState": "PUBLISHED",
        "specificContent": {"com.linkedin.ugc.ShareContent": {
            "shareCommentary": {"text": text[:2900]},
            "shareMediaCategory": "ARTICLE",
            "media": [{"status": "READY", "originalUrl": url, "title": {"text": meta.get("title", pod["title"])[:200]}}],
        }},
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
    }
    _, headers = call("POST", "https://api.linkedin.com/v2/ugcPosts", token, body)
    post_id = headers.get("X-RestLi-Id") or headers.get("x-restli-id", "")
    link = f"https://www.linkedin.com/feed/update/{post_id}/" if post_id else "posted"
    print(f"Shared on LinkedIn: {link}")
    (OUT / f"planning-desk-{stem}.linkedin.txt").write_text(link + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
