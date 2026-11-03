"""Review event photos with a local vision model (Ollama, OpenAI-compatible API).

Usage: python scripts/review-event-photos.py social/events/<folder> [more folders...] [--picks N] [--repick]
--repick re-runs duplicate marking and picks from review.json without calling the model.
Requires: pip install pillow pillow-heif
Hand-reviewed rejects go in review.json "exclude" ({file: reason}); they are never picked.
Env: OLLAMA_URL (default http://192.168.0.142:11434/v1/chat/completions), OLLAMA_MODEL

Writes review.json (full results, resumable) and adds alt/tags/quality/flags/pick to credits.json.
"""
import base64, io, json, os, re, sys, urllib.request
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

from PIL import Image, ImageFile, ImageOps
import pillow_heif

pillow_heif.register_heif_opener()
ImageFile.LOAD_TRUNCATED_IMAGES = True  # a few Google originals are missing trailing bytes

URL = os.environ.get("OLLAMA_URL", "http://192.168.0.142:11434/v1/chat/completions")
MODEL = os.environ.get("OLLAMA_MODEL", "qwen3.6:35b-a3b")
WORKERS = 3
MIN_QUALITY = 50
TAGS = ["talk", "stage", "slides", "crowd", "audience", "group-photo", "portrait", "networking",
        "sponsor", "booth", "swag", "food", "venue", "signage", "workshop", "hardware", "robots",
        "prize", "outdoor", "kids", "screenshot", "non-photo"]
FLAGS = ["blurry", "dark", "overexposed", "eyes-closed", "awkward-moment", "cropped-subject",
         "screenshot", "non-photo", "sensitive"]

PROMPT = f"""You are reviewing photos from a community tech event (conference, meetup, or hack day) \
to pick images for social posts and newsletter recaps.

Return ONLY a JSON object with exactly these keys:
{{
  "description": "1-2 sentences describing what is happening",
  "alt_text": "screen-reader alt text, under 125 characters, no 'image of'",
  "tags": [subset of {TAGS}],
  "people_count": integer (0 if none; estimate for crowds),
  "scene": one of ["talk", "hacking", "networking", "group-photo", "food", "sponsor", "venue", "slides-only", "other"],
  "scores": {{"sharpness": 1-5, "exposure": 1-5, "composition": 1-5, "people": 1-5, "story": 1-5}},
  "flags": [subset of {FLAGS}] ("sensitive" = anything unflattering or that someone may not want posted),
  "notes": "one short sentence on why it would or would not work for social"
}}
Scoring guide (use the full 1-5 range; most photos should NOT all get the same score):
- people: 1 = nobody visible, 3 = people present but backs turned or tiny, 5 = engaged faces, clear action.
- story: 1 = could be any room (empty room, projector screen only, slide close-up), 3 = recognizably an event,
  5 = captures energy of the day (building, collaborating, laughing, a speaker mid-gesture with audience).
- composition: 1 = subject cut off or lost in clutter, 5 = clear subject, clean framing.
A photo that is mostly a projected slide with nobody engaged should score people <= 2 and story <= 2.
Do not name people. Use only the listed tags and flags."""


def encode(path):
    im = Image.open(path)
    im.seek(0)
    im = ImageOps.exif_transpose(im.convert("RGB"))
    im.thumbnail((1024, 1024))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode(), im


def dhash(im, size=8):
    g = im.convert("L").resize((size + 1, size), Image.LANCZOS)
    px = list(g.getdata())
    return sum(1 << i for i in range(size * size)
               if px[(i // size) * (size + 1) + i % size] > px[(i // size) * (size + 1) + i % size + 1])


def ask(b64):
    body = {"model": MODEL, "reasoning_effort": "none", "temperature": 0.2,
            "messages": [{"role": "user", "content": [
                {"type": "text", "text": PROMPT},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}]}]}
    req = urllib.request.Request(URL, json.dumps(body).encode(),
                                 {"Content-Type": "application/json", "Authorization": "Bearer ollama"})
    with urllib.request.urlopen(req, timeout=300) as r:
        text = json.load(r)["choices"][0]["message"]["content"]
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    m = re.search(r"\{.*\}", text, re.S)
    data = json.loads(m.group(0))
    data["tags"] = [t for t in data.get("tags", []) if t in TAGS]
    data["flags"] = [f for f in data.get("flags", []) if f in FLAGS]
    sc = {k: max(1, min(5, int(data.get("scores", {}).get(k, 1))))
          for k in ("sharpness", "exposure", "composition", "people", "story")}
    data["scores"] = sc
    # 0-100; story and people weigh double since picks are for recaps and social
    data["quality"] = round(100 * (sc["sharpness"] + sc["exposure"] + sc["composition"]
                                   + 2 * sc["people"] + 2 * sc["story"] - 7) / 28)
    return data


def review_one(folder, fname):
    try:
        b64, im = encode(os.path.join(folder, fname))
    except Exception as e:
        return fname, {"error": f"decode: {e!r}"}
    for attempt in range(3):
        try:
            r = ask(b64)
            break
        except Exception as e:
            err = repr(e)
    else:
        return fname, {"error": err}
    r["dhash"] = f"{dhash(im):016x}"
    return fname, r


def pick(results, n, meta, exclude=()):
    """Top-n by quality, spread across the day.

    With timestamps: at most 2 picks per 20-minute window, 1 per photographer burst (2 min),
    and evening shots (after-parties, 6 PM-5 AM local) capped at a third of n.
    Without (date-only): at most 2 per scene and nothing visually similar to an earlier pick.
    Photos under MIN_QUALITY are never picked, so a thin event gets fewer than n.
    """
    ham = lambda a, b: bin(int(a, 16) ^ int(b, 16)).count("1")
    bad = {"blurry", "dark", "eyes-closed", "sensitive", "screenshot", "non-photo", "near-duplicate"}
    ok = [(f, r) for f, r in results.items()
          if "error" not in r and f not in exclude and not bad & set(r["flags"]) and r.get("scene") != "slides-only"
          and r["quality"] >= MIN_QUALITY]
    ok.sort(key=lambda x: (-x[1]["quality"], -x[1]["scores"]["story"], -x[1].get("people_count", 0)))
    t = {f: datetime.fromisoformat(m["taken_at"]).timestamp()
         for f, m in meta.items() if "T" in m.get("taken_at", "")}
    evening = {f for f, m in meta.items()
               if "T" in m.get("taken_at", "")
               and not 5 <= datetime.fromisoformat(m["taken_at"]).hour < 18}
    chosen = []

    def fits(f, r):
        if f in t:
            same_window = sum(1 for c in chosen if c in t and abs(t[c] - t[f]) < 1200)
            same_burst = any(c in t and meta[c]["photographer"] == meta[f]["photographer"]
                             and abs(t[c] - t[f]) < 120 for c in chosen)
            too_late = f in evening and sum(c in evening for c in chosen) >= n // 3
            return same_window < 2 and not same_burst and not too_late
        scene = r.get("scene", "other")
        return (sum(results[c].get("scene") == scene for c in chosen) < 2
                and all(ham(r["dhash"], results[c]["dhash"]) > 10 for c in chosen))

    for f, r in ok:
        if len(chosen) >= n:
            break
        if fits(f, r):
            chosen.append(f)
    return set(chosen)


def mark_dupes(results):
    """Flag near-duplicates (keep the higher-quality one)."""
    ham = lambda a, b: bin(int(a, 16) ^ int(b, 16)).count("1")
    items = sorted(((f, r) for f, r in results.items() if "error" not in r),
                   key=lambda x: (-x[1]["quality"], x[0]))
    kept = []
    for f, r in items:
        dup = next((k for k in kept if ham(r["dhash"], results[k]["dhash"]) <= 6), None)
        r["duplicate_of"] = dup
        if dup:
            if "near-duplicate" not in r["flags"]:
                r["flags"].append("near-duplicate")
        else:
            r["flags"] = [x for x in r["flags"] if x != "near-duplicate"]
            kept.append(f)


def run(folder, n_picks, repick=False):
    cpath, rpath = os.path.join(folder, "credits.json"), os.path.join(folder, "review.json")
    credits = json.load(open(cpath, encoding="utf-8"))
    review = json.load(open(rpath, encoding="utf-8")) if os.path.exists(rpath) else {"model": MODEL, "photos": {}}
    results = review["photos"]
    todo = [] if repick else [p["file"] for p in credits["photos"]
                              if "error" in results.get(p["file"], {"error": 1})]
    print(f"{folder}: {len(todo)} to review, {len(results)} cached", flush=True)

    def save():
        with open(rpath, "w", encoding="utf-8", newline="\n") as f:
            json.dump(review, f, indent=2, ensure_ascii=False)
            f.write("\n")

    with ThreadPoolExecutor(WORKERS) as ex:
        for i, (fname, r) in enumerate(ex.map(lambda f: review_one(folder, f), todo), 1):
            results[fname] = r
            if "error" in r:
                print(f"  error {fname}: {r['error']}", flush=True)
            if i % 10 == 0:
                save()
                print(f"  {i}/{len(todo)}", flush=True)

    mark_dupes(results)
    n = n_picks or max(8, min(20, len(credits["photos"]) // 10))
    picks = pick(results, n, {p["file"]: p for p in credits["photos"]}, review.get("exclude", {}))
    for f, r in results.items():
        r["pick"] = f in picks
    save()

    for p in credits["photos"]:
        r = results.get(p["file"], {})
        if "error" in r or not r:
            continue
        p.update(alt=r["alt_text"], scene=r.get("scene"), tags=r["tags"], quality=r["quality"],
                 flags=r["flags"], pick=r["pick"])
    with open(cpath, "w", encoding="utf-8", newline="\n") as f:
        json.dump(credits, f, indent=2, ensure_ascii=False)
        f.write("\n")
    errs = sum("error" in r for r in results.values())
    print(f"{folder}: done, {len(picks)} picks, {errs} errors, "
          f"{sum(bool(r.get('duplicate_of')) for r in results.values())} near-duplicates", flush=True)


if __name__ == "__main__":
    args = sys.argv[1:]
    n = int(args[args.index("--picks") + 1]) if "--picks" in args else 0
    folders = [a for a in args if a.startswith("social")]
    for fo in folders:
        run(fo, n, "--repick" in args)
