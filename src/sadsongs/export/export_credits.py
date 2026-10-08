import json
import os
import urllib.request

CLIENT_ID = os.environ["JAMENDO_CLIENT_ID"]
AUDIO_DIR = "web/public/audio"

ids = json.load(open("web/public/data/audio_ids.json"))
nums = [i.replace("track_", "") for i in ids]

url = (
    "https://api.jamendo.com/v3.0/tracks/"
    f"?client_id={CLIENT_ID}&format=json&limit={len(nums)}&id={'+'.join(nums)}"
)
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
results = json.load(urllib.request.urlopen(req, timeout=30))["results"]

credits = {}
for t in results:
    lic = t.get("license_ccurl", "")
    key = f"track_{int(t['id']):07d}"          
    credits[key] = {
        "title": t["name"],
        "artist": t["artist_name"],
        "license": lic,
        "url": t.get("shareurl", f"https://www.jamendo.com/track/{t['id']}"),
        "nd": "-nd" in lic,
        "nc": "-nc" in lic,
    }

keep = [i for i in ids if i in credits and not credits[i]["nd"]]
no_api = [i for i in ids if i not in credits]
nd = [i for i in ids if i in credits and credits[i]["nd"]]

for i in nd + no_api:
    p = f"{AUDIO_DIR}/{i}.mp3"
    if os.path.exists(p):
        os.remove(p)

json.dump(keep, open("web/public/data/audio_ids.json", "w"))
json.dump({k: credits[k] for k in keep},
          open("web/public/data/credits.json", "w"), ensure_ascii=False, indent=1)

print(f"Mantidas: {len(keep)} | ND removidas: {len(nd)} | fora da API: {len(no_api)}")