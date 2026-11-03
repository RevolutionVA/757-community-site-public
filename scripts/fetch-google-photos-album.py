"""Download a Google Photos shared album with per-photo attribution.

Usage: python scripts/fetch-google-photos-album.py <album-url> social/events/<yyyy-mm-event> <event-slug> [--dry]
Requires: pip install piexif
Files: <yyyy-mm-dd>-<event>-<photographer>-<nnn>.<ext>, numbered chronologically.
Writes credits.json and EXIF Artist/Copyright (JPEG only).
"""
import json, re, sys, os, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor

import piexif

UA = {"User-Agent": "Mozilla/5.0"}
EXT = {"image/jpeg": "jpg", "image/png": "png", "image/heic": "heic", "image/webp": "webp", "image/gif": "gif"}


def get(url, data=None, headers=None):
    req = urllib.request.Request(url, data=data, headers={**UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.headers.get_content_type(), r.read(), r.geturl()


def ds1(html):
    i = html.find("key: 'ds:1'")
    s = html.find("data:", i) + len("data:")
    return json.loads(html[s:html.find(", sideChannel:", s)])


def next_page(album_id, key, token):
    req = [[["snAcKc", json.dumps([album_id, token, None, key]), None, "generic"]]]
    body = urllib.parse.urlencode({"f.req": json.dumps(req)}).encode()
    _, raw, _ = get("https://photos.google.com/_/PhotosUi/data/batchexecute", body,
                    {"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"})
    for line in raw.decode().splitlines():
        if line.startswith('[["wrb.fr"'):
            return json.loads(json.loads(line)[0][2])
    raise RuntimeError("no page data")


def sniff(b):
    """Real format from magic bytes; Google labels some HEIC originals as image/jpeg."""
    if b[:3] == b"\xff\xd8\xff":
        return "jpg"
    if b[4:8] == b"ftyp" and b[8:12] in (b"heic", b"heix", b"mif1", b"msf1", b"hevc"):
        return "heic"
    if b[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if b[:4] == b"GIF8":
        return "gif"
    return None


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-") or "unknown"


def people(meta):
    """Contributor id -> display name, from album owner and member list."""
    out = {}
    members = [meta[5]] + [p for x in meta if isinstance(x, list) and x and isinstance(x[0], list)
                           and len(x[0]) > 11 and isinstance(x[0][11], list) for p in x]
    for p in members:
        if isinstance(p, list) and len(p) > 11 and isinstance(p[0], str) and isinstance(p[11], list) and p[11]:
            out[p[0]] = p[11][0]
    return out


def tag_exif(path, name, album):
    try:
        exif = piexif.load(path)
    except Exception:
        exif = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "thumbnail": None}
    exif["0th"][piexif.ImageIFD.Artist] = name.encode()
    exif["0th"][piexif.ImageIFD.Copyright] = f"Photo by {name} ({album})".encode()
    try:
        piexif.insert(piexif.dump(exif), path)
    except Exception:
        exif.pop("thumbnail", None)
        exif["1st"] = {}
        piexif.insert(piexif.dump(exif), path)


def main(album_url, out_dir, event, dry):
    _, html, final = get(album_url)
    html = html.decode("utf-8", "replace")
    album_id = re.search(r"/share/([\w-]+)", final).group(1)
    key = urllib.parse.parse_qs(urllib.parse.urlparse(final).query)["key"][0]
    data = ds1(html)
    title = data[3][1]
    names = people(data[3])
    items, token = list(data[1]), data[2]
    while token:
        page = next_page(album_id, key, token)
        items += page[1]
        token = page[2]

    seen, photos = set(), []
    for it in items:
        if it[0] in seen:
            continue
        seen.add(it[0])
        tz = timezone(timedelta(milliseconds=it[4] or 0))
        taken = datetime.fromtimestamp(it[2] / 1000, tz)
        photos.append({"id": it[0], "url": it[1][0], "taken": taken,
                       "photographer": names.get(it[6][0] if it[6] else None, "Unknown")})
    photos.sort(key=lambda p: (p["taken"], p["id"]))
    print(f"{title}: {len(photos)} items, {len({p['photographer'] for p in photos})} photographers, "
          f"{photos[0]['taken']:%Y-%m-%d} to {photos[-1]['taken']:%Y-%m-%d}")
    if dry:
        return
    os.makedirs(out_dir, exist_ok=True)

    def dl(n_p):
        n, p = n_p
        ctype, blob, _ = get(p["url"] + "=d")
        if not ctype.startswith("image/"):
            return n, p, None, f"skip {n}: {ctype}"
        ext = sniff(blob) or EXT.get(ctype, "jpg")
        fname = f"{p['taken']:%Y-%m-%d}-{event}-{slug(p['photographer'])}-{n:03d}.{ext}"
        path = os.path.join(out_dir, fname)
        with open(path, "wb") as f:
            f.write(blob)
        if ext == "jpg":
            try:
                tag_exif(path, p["photographer"], title)
            except Exception as e:
                return n, p, fname, f"exif failed {fname}: {e!r}"
        return n, p, fname, None

    credits = []
    with ThreadPoolExecutor(8) as ex:
        for n, p, fname, err in ex.map(dl, enumerate(photos, 1)):
            if err:
                print(err)
                if not fname:
                    continue
            credits.append({"file": fname, "photographer": p["photographer"],
                            "taken_at": p["taken"].isoformat(), "google_photos_id": p["id"]})
    with open(os.path.join(out_dir, "credits.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump({"event": title, "sources": [album_url], "photos": credits}, f, indent=2, ensure_ascii=False)
        f.write("\n")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3], "--dry" in sys.argv)
