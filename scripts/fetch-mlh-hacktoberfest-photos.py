"""Download MLH SmugMug Hacktoberfest 2026 photos.
Usage: python scripts/fetch-mlh-hacktoberfest-photos.py
Requires: pip install piexif
Adapts the Google Photos script for SmugMug gallery. Uses EXIF for date/order.
Photographer: Major League Hacking
Default date: 2026-10-17
Outputs to social/events/2026-10-hacktoberfest/ with credits.json and tagged JPGs.
"""
import json
import os
import re
import urllib.request
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import piexif

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

OUT_DIR = "social/events/2026-10-hacktoberfest"
EVENT = "hacktoberfest"
PHOTOGRAPHER = "Major League Hacking"
PHOTOGRAPHER_SLUG = "major-league-hacking"
DEFAULT_DATE = datetime(2026, 10, 17)
ALBUM_URL = "https://majorleaguehacking.smugmug.com/Event-Photos/Hacktoberfest-2026/Hacktoberfest-2026-in-the-757-2097f4416b/n-qLSGN6"

# Full list of original-size download URLs extracted from the SmugMug gallery (47 photos)
download_urls = [
    "https://photos.smugmug.com/photos/i-Q99hFZN/0/NZ2Fb8jBHq75fpPLSfqdTmt5WPkb6XXgcpgbMpvHL/O/i-Q99hFZN-O.jpg",
    "https://photos.smugmug.com/photos/i-QwqDc95/0/McBMKdb852F8wFMpVxLV9JSz2nJZxR73gfzgqWTF4/O/i-QwqDc95-O.jpg",
    "https://photos.smugmug.com/photos/i-Hgc2x63/0/MjHGknW7csd5xvWRc56DSfm25LHV96Pw5sBrx3DZx/O/i-Hgc2x63-O.jpg",
    "https://photos.smugmug.com/photos/i-DMrFH4t/0/L2gTZ7LTKRsFngWvjGkJ9HSVddT4tJKJNkpJGPFVt/O/i-DMrFH4t-O.jpg",
    "https://photos.smugmug.com/photos/i-vNfRw86/0/LpQPz6jd4Wd57Fkpbfs3LDhK7xcM98Z5tjpMDrPbh/O/i-vNfRw86-O.jpg",
    "https://photos.smugmug.com/photos/i-mcHqwJS/0/KvtDfMk7skNjBvxbkXLKvmttz3rDSD49z5sN68C8w/O/i-mcHqwJS-O.jpg",
    "https://photos.smugmug.com/photos/i-ctKMXFK/0/KHCgFJfgS9sBztWn5HGjs8Wf5JHFcqpjzpbs264w5/O/i-ctKMXFK-O.jpg",
    "https://photos.smugmug.com/photos/i-K2KBFDm/0/M6bd7QBRfSPc7Nzp6RTtnt5zZwwdPv3VJkBqdgdTR/O/i-K2KBFDm-O.jpg",
    "https://photos.smugmug.com/photos/i-WLcLW4R/0/NF8nJP95vNNQQzzBFM97fGBmHHGLr3Fz83txxttbd/O/i-WLcLW4R-O.jpg",
    "https://photos.smugmug.com/photos/i-4KsJtrn/0/NHNqpzNfRjcMvgFPQRfcb74XsVh2Bf7HpjLRjsT4D/O/i-4KsJtrn-O.jpg",
    "https://photos.smugmug.com/photos/i-5bVCvk4/0/LbqJgx5Bp2swnBZjdkzCLDgzb3VbGG563qFtCcBcD/O/i-5bVCvk4-O.jpg",
    "https://photos.smugmug.com/photos/i-2p664xH/0/Lqr7fcjjWxBcNK4jb7XLdNFtSGrnhLnPdPLKv7QDC/O/i-2p664xH-O.jpg",
    "https://photos.smugmug.com/photos/i-wvDR2vZ/0/MMxFh2PgNpH2Czt6MFTBT6gzgFMkjVfNW9fkFvVRF/O/i-wvDR2vZ-O.jpg",
    "https://photos.smugmug.com/photos/i-zrj8D8K/0/KgjjTH8JpZpb9xcd37hB4jbpVSqffzTQHJsFv7Tm5/O/i-zrj8D8K-O.jpg",
    "https://photos.smugmug.com/photos/i-MHcGMHM/0/L8vZBFqCPCwJzpws3b9SQx5vDx7rmp5SSbmgxLhVQ/O/i-MHcGMHM-O.jpg",
    "https://photos.smugmug.com/photos/i-9XTQwxZ/0/MrxrhN3jDVbnTSw5tJdJHD5Gq8S4bCvcpVPdQQ5wH/O/i-9XTQwxZ-O.jpg",
    "https://photos.smugmug.com/photos/i-WQ2vNFH/0/MhPQ3JN7tmR7zRSvdgZsNbSwvrZ5GVmkmfdmnMgFF/O/i-WQ2vNFH-O.jpg",
    "https://photos.smugmug.com/photos/i-KQd8vCK/0/MLqq4tLkz5B5WGwX5H6RcXgBTbXfD2LcZ83r9nJ7B/O/i-KQd8vCK-O.jpg",
    "https://photos.smugmug.com/photos/i-36pvPxh/0/Lpr7wqNkSz75ZPQ92M4Xjw4vh7Td6BCWr4BpMShBK/O/i-36pvPxh-O.jpg",
    "https://photos.smugmug.com/photos/i-3nvTpQ6/0/LbqvpVWkhh6NkcsWPMrxVsrzSDTp3XhfqbPCm6vpG/O/i-3nvTpQ6-O.jpg",
    "https://photos.smugmug.com/photos/i-43N4fQJ/0/Lv56xZZZRbGskvQSTGNzzh6jxq2zpr8n6PsdtJ8VB/O/i-43N4fQJ-O.jpg",
    "https://photos.smugmug.com/photos/i-DP5fTvG/0/LQB6jVk9h4wLX2PKm6D6MqSJ9Xbxs7KMXRtMjgH5R/O/i-DP5fTvG-O.jpg",
    "https://photos.smugmug.com/photos/i-NxSnbWQ/0/Kv6TqBMQWHp22Kbfms4mknmGZNvnD69WCmjjqz6Z4/O/i-NxSnbWQ-O.jpg",
    "https://photos.smugmug.com/photos/i-PQnzLjr/0/LSVTvHgNK56hsbmjhxMQp8Nvc35t2jXVrRqj5QCGx/O/i-PQnzLjr-O.jpg",
    "https://photos.smugmug.com/photos/i-KtRsxmJ/0/M66hLpZfwp76CC5Z7nzHMQCsh2m8S7rzBVqwfv7mr/O/i-KtRsxmJ-O.jpg",
    "https://photos.smugmug.com/photos/i-CWmRN4z/0/Kbvxn4bSPXbT3LcpSsM9x57m3F5HbX2vjZbK3Rc9M/O/i-CWmRN4z-O.jpg",
    "https://photos.smugmug.com/photos/i-636PpLP/0/KLjHCDZKdrTqBfZrSTJv5hH8FV6RjzddhT6T26D9H/O/i-636PpLP-O.jpg",
    "https://photos.smugmug.com/photos/i-HSKK3Hk/0/KJTpVWMHzLh6stvBv3wbr2qXCb5GqSzK3b7tLVttK/O/i-HSKK3Hk-O.jpg",
    "https://photos.smugmug.com/photos/i-TBtL9sc/0/Kk6ncdkSbtccVKtqs8FTJPDbCghCF93nmGnSZm2dN/O/i-TBtL9sc-O.jpg",
    "https://photos.smugmug.com/photos/i-PQhKSQp/0/NBQZLXpSPN4Fksw9n6TWMzmXkRLv3jJjQZkrjtPzS/O/i-PQhKSQp-O.jpg",
    "https://photos.smugmug.com/photos/i-gTFhtqK/0/M5n5JV7MRRqDx3JWD9vP6DVKhHPNpGtXLNh2nKQx5/O/i-gTFhtqK-O.jpg",
    "https://photos.smugmug.com/photos/i-xBjNcpD/0/M3VSvLkBqTp6tbm6TD9TmM6KjnPhG2ZfKnR23gHgV/O/i-xBjNcpD-O.jpg",
    "https://photos.smugmug.com/photos/i-23dJRg6/0/LsCM5HVHPfkR97NzHjxzMHx3Xm5CNwZmnSnDQcgDc/O/i-23dJRg6-O.jpg",
    "https://photos.smugmug.com/photos/i-VCFR7x8/0/M9WhvsPHvpnC5nm5Jt6PtqWR7FHxFfcJBLfXQjwgJ/O/i-VCFR7x8-O.jpg",
    "https://photos.smugmug.com/photos/i-5GLbDNZ/0/NRKR8WB5j4SLwsS8LhMC3wQ3zskq3VGCDRRPK7CwR/O/i-5GLbDNZ-O.jpg",
    "https://photos.smugmug.com/photos/i-NdkS8L6/0/L364DRBqDZNsfd6gcsfRNsqtPFkF95HZx9F4S2RmQ/O/i-NdkS8L6-O.jpg",
    "https://photos.smugmug.com/photos/i-T4Qmsxj/0/MW9Tr9vD4tdp8q42KGT64sgvtcJfNhPccjGVHhxPN/O/i-T4Qmsxj-O.jpg",
    "https://photos.smugmug.com/photos/i-rBG4Vz7/0/MkFn76BjkVz62sZwjvqQ9tskkvxv6fFJsxP3d6khh/O/i-rBG4Vz7-O.jpg",
    "https://photos.smugmug.com/photos/i-fFttN3z/0/MnLpFspz6ZjBLJ9ssxxKGXm5CsZNLwq2gHRXJ7HMr/O/i-fFttN3z-O.jpg",
    "https://photos.smugmug.com/photos/i-6Nq6FtR/0/MBhzN7MgFNT45tCtCFhSMsbtSWZ7DbVnxm25SVL6S/O/i-6Nq6FtR-O.jpg",
    "https://photos.smugmug.com/photos/i-9JbjppG/0/MFm9bznz7bH6prFTnWxBXQ7Dhtp6sJGkzpFCDKfm9/O/i-9JbjppG-O.jpg",
    "https://photos.smugmug.com/photos/i-NX4kVBG/0/NThjf9QBC6qpJRT2Hkt7xsmbTRhtJQc8HV4Pbj5CQ/O/i-NX4kVBG-O.jpg",
    "https://photos.smugmug.com/photos/i-4VSxt2K/0/KRWFnLqcNNHRRr4wNfqnXn8bGbn32HNKxWdPK6X2r/O/i-4VSxt2K-O.jpg",
    "https://photos.smugmug.com/photos/i-HDwB2Xd/0/MJJxdtDP4pqcKhg9P5xzTXGPwVkLF63GMSF6MqBv8/O/i-HDwB2Xd-O.jpg",
    "https://photos.smugmug.com/photos/i-g2F2tk7/0/Kq65NbhZ6WNbvRhv3J8wzTjwzdk2tRgxHVP52pKg5/O/i-g2F2tk7-O.jpg",
    "https://photos.smugmug.com/photos/i-gjZSRxC/0/MzvJr8hn46HsrwCWmLBPVrwVt8Vmr43mWBrxnf7hP/O/i-gjZSRxC-O.jpg",
    "https://photos.smugmug.com/photos/i-2HbNs5V/0/MqGZMrjTR8bfvdvZPTMFRcFftSsnJBZH8CNxLMxmg/O/i-2HbNs5V-O.jpg",
    "https://photos.smugmug.com/photos/i-3QXGgSc/0/K3HCrfh89fTmRtzLPNJSfB7KBGsC7WkHzHcVxk8cm/O/i-3QXGgSc-O.jpg",
    "https://photos.smugmug.com/photos/i-hrsGKRf/0/LnkwZKCMfBfKQNCzbBHQnLmkfsDQV7BnqK3f48ZRw/O/i-hrsGKRf-O.jpg",
    "https://photos.smugmug.com/photos/i-2t7Cgnb/0/KJhhx77MW6bRwVhdbqHmKkMfdhjqxxLb2wCZRhnX7/O/i-2t7Cgnb-O.jpg",
    "https://photos.smugmug.com/photos/i-Sn4szkJ/0/MF7LHZMSWzPSW3522bhWwg9mR9WDHmjvGTZJztPjq/O/i-Sn4szkJ-O.jpg",
    "https://photos.smugmug.com/photos/i-75k33SJ/0/NJV8LxwhHtQBhZbb7FTppcqXLLkXK6pWddDWKm4Fg/O/i-75k33SJ-O.jpg",
    "https://photos.smugmug.com/photos/i-7NVBGbN/0/KtKj8stZKjfrVKQKx2Lrbs3zfggGDwHrFwPfMmcRM/O/i-7NVBGbN-O.jpg",
    "https://photos.smugmug.com/photos/i-XVdxtpw/0/Kdn9xgQMzTrwqnsRptvZ3ptJfhR84dRZp3cwKbdW8/O/i-XVdxtpw-O.jpg",
    "https://photos.smugmug.com/photos/i-ZwjS4kn/0/MQDvP8Dqjrfvs7cQJcNgW4Rsh6tWHfhSswTvgQQrK/O/i-ZwjS4kn-O.jpg",
    "https://photos.smugmug.com/photos/i-XRJ9LbC/0/LVVfDBW6pfFwpw6f2B4Xfnqw4DJN6pPhFtdjbTp8F/O/i-XRJ9LbC-O.jpg",
    "https://photos.smugmug.com/photos/i-qqpf2zm/0/MMWb6hcmV9Kt5sCgntwx4HJFs9t5nscTmRWvRLqPT/O/i-qqpf2zm-O.jpg",
    "https://photos.smugmug.com/photos/i-PL8WDFj/0/MmmR42GsfDQGZj9k3grFKzsWhV7td452x98zwghTV/O/i-PL8WDFj-O.jpg",
    "https://photos.smugmug.com/photos/i-vkQ73Fj/0/KwB7njTz738jvZPx6C62dJLXgJSrMwk2hh8TNSwkw/O/i-vkQ73Fj-O.jpg",
    "https://photos.smugmug.com/photos/i-bNjx9ST/0/KKxB5L6SgQM6rSV46dVB5kf9g6Q8pbVHKszL6jX4s/O/i-bNjx9ST-O.jpg",
    "https://photos.smugmug.com/photos/i-G2kgg6z/0/LvBcmVhW9jM6NtsG9Fk2D9DQj6HqwVTh32XqPktWS/O/i-G2kgg6z-O.jpg",
    "https://photos.smugmug.com/photos/i-Rtgk57V/0/M74W35zSLvXrVzd2jBxDbNKHQ4gg4dDS4dbXM44bR/O/i-Rtgk57V-O.jpg",
    "https://photos.smugmug.com/photos/i-KKrtmNm/0/KwQhCPVPZfn75WXmPC653TPRpGCvcxmsWfQpXHjvn/O/i-KKrtmNm-O.jpg",
    "https://photos.smugmug.com/photos/i-XQxvMnf/0/LjJ7pwKc3PCC5pLSjgz4tCK3HVPKw2LdTsHpcWZ6n/O/i-XQxvMnf-O.jpg",
    "https://photos.smugmug.com/photos/i-4dsRgXz/0/M6bLCZGdLFHpx3WGNLR85L3LmzxHFCcWBGsLHptZT/O/i-4dsRgXz-O.jpg",
    "https://photos.smugmug.com/photos/i-VXsRQLq/0/LDvh2HXTBWZ6pbnf2nT7WhBJ6qDpT2NVZgGCS4Mf6/O/i-VXsRQLq-O.jpg",
    "https://photos.smugmug.com/photos/i-dHkBkCB/0/LLFMjPB6wdnFHb8RKRGFChgqkrw7hGGNZhjJ7CJGk/O/i-dHkBkCB-O.jpg",
    "https://photos.smugmug.com/photos/i-TGvhq9h/0/MM9N5g6CZ7hqW824JXG7rvGFC8RLGpqXJ2qh9xtd4/O/i-TGvhq9h-O.jpg",
    "https://photos.smugmug.com/photos/i-BtDMzDK/0/LdpsLcjTc8mqGgDHsK7qKSstnMCrZnrVz8X9XxNcK/O/i-BtDMzDK-O.jpg",
    "https://photos.smugmug.com/photos/i-8r2WTH2/0/NGZXV9WKqLc4HbxznwkZ2QPSD7qRcbcj5TKJRMR2n/O/i-8r2WTH2-O.jpg",
    "https://photos.smugmug.com/photos/i-mzMVqzP/0/Kc5fx8SzWmXLTQXFK75gXBz8tCXpfvnNz63svX3wR/O/i-mzMVqzP-O.jpg",
]

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-") or "unknown"

def get_exif_date(path):
    """Extract date from EXIF or return default."""
    try:
        exif_dict = piexif.load(path)
        for ifd in ('Exif', '0th'):
            for tag in (piexif.ExifIFD.DateTimeOriginal, piexif.ExifIFD.DateTimeDigitized, piexif.ImageIFD.DateTime):
                if tag in exif_dict.get(ifd, {}):
                    dt_bytes = exif_dict[ifd][tag]
                    if isinstance(dt_bytes, bytes):
                        dt_str = dt_bytes.decode('ascii').strip()
                        try:
                            return datetime.strptime(dt_str, '%Y:%m:%d %H:%M:%S')
                        except ValueError:
                            pass
    except Exception:
        pass
    return DEFAULT_DATE

def tag_exif(path, name, album):
    """Add Artist and Copyright to EXIF."""
    try:
        exif_dict = piexif.load(path)
    except Exception:
        exif_dict = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "thumbnail": None}
    exif_dict["0th"][piexif.ImageIFD.Artist] = name.encode("utf-8")
    exif_dict["0th"][piexif.ImageIFD.Copyright] = f"Photo by {name} ({album})".encode("utf-8")
    try:
        piexif.insert(piexif.dump(exif_dict), path)
    except Exception:
        exif_dict.pop("thumbnail", None)
        exif_dict["1st"] = {}
        piexif.insert(piexif.dump(exif_dict), path)

def main(dry=False):
    os.makedirs(OUT_DIR, exist_ok=True)
    print(f"Downloading {len(download_urls)} photos from MLH SmugMug gallery to {OUT_DIR}")
    if dry:
        print("Dry run - skipping download")
        return

    photo_metadata = []

    def download_one(url):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as response:
                blob = response.read()
            # Determine extension (all jpg for now)
            tmp_name = f"tmp_{os.path.basename(url.split('?')[0])}"
            tmp_path = os.path.join(OUT_DIR, tmp_name)
            with open(tmp_path, "wb") as f:
                f.write(blob)
            taken = get_exif_date(tmp_path)
            photo_metadata.append({
                "url": url,
                "taken": taken,
                "tmp_path": tmp_path,
                "original_url": url
            })
            print(f"Downloaded {url.split('/')[-1]}")
            return True
        except Exception as e:
            print(f"Error downloading {url}: {e}")
            return False

    with ThreadPoolExecutor(max_workers=5) as executor:
        executor.map(download_one, download_urls)

    # Sort by taken date, then by original order if dates same
    photo_metadata.sort(key=lambda x: (x["taken"], download_urls.index(x["original_url"]) if x["original_url"] in download_urls else 0))

    credits = []
    for i, meta in enumerate(photo_metadata, 1):
        taken = meta["taken"]
        fname = f"{taken:%Y-%m-%d}-{EVENT}-{PHOTOGRAPHER_SLUG}-{i:03d}.jpg"
        final_path = os.path.join(OUT_DIR, fname)
        os.rename(meta["tmp_path"], final_path)
        tag_exif(final_path, PHOTOGRAPHER, "Hacktoberfest 2026 in the 757")
        credits.append({
            "file": fname,
            "photographer": PHOTOGRAPHER,
            "taken_at": taken.isoformat(),
            "source_url": meta["url"]
        })
        print(f"Processed {fname} (taken {taken:%Y-%m-%d})")

    with open(os.path.join(OUT_DIR, "credits.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump({
            "event": "Hacktoberfest 2026 in the 757",
            "sources": [ALBUM_URL],
            "photos": credits
        }, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"\nCompleted! {len(credits)} photos saved to {OUT_DIR}/")
    print("credits.json created with EXIF tags applied (Artist/Copyright).")
    print("Photos follow naming scheme: YYYY-MM-DD-hacktoberfest-major-league-hacking-NNN.jpg")
    print("Use for newsletter recaps, social, etc. Credit photographer everywhere used.")

if __name__ == "__main__":
    import sys
    main("--dry" in sys.argv)
