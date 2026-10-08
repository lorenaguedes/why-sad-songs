import os
import time
import urllib.request
import urllib.error
import pandas as pd


def numeric_id(track_id: str) -> int:
    return int(str(track_id).replace("track_", ""))


def fetch(url, dest, retries=3, timeout=20):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = r.read()
            if len(data) < 10_000:  # resposta suspeita (erro em HTML, etc.)
                return "failed"
            with open(dest, "wb") as f:
                f.write(data)
            return "ok"
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return "missing"       
            time.sleep(2 * (attempt + 1))
        except Exception:
            time.sleep(2 * (attempt + 1))  
    return "failed"


def download_class(pool, n_target, audio_dir, label, seed=42):
    shuffled = pool.sample(frac=1, random_state=seed)
    ok_ids, missing, failed = [], [], []

    for track_id in shuffled["track_id"]:
        if len(ok_ids) >= n_target:
            break
        path = os.path.join(audio_dir, f"{track_id}.mp3")
        if os.path.exists(path):
            ok_ids.append(track_id)
            continue

        url = f"https://mp3l.jamendo.com/?trackid={numeric_id(track_id)}&format=mp31"
        status = fetch(url, path)
        if status == "ok":
            ok_ids.append(track_id)
            time.sleep(0.2)
        elif status == "missing":
            missing.append(track_id)
        else:
            failed.append(track_id)

        done = len(ok_ids)
        if done and done % 100 == 0 and status == "ok":
            print(f"[{label}] {done}/{n_target} baixadas "
                  f"({len(missing)} removidas, {len(failed)} falhas de rede)")

    print(f"[{label}] final: {len(ok_ids)}/{n_target}")
    return ok_ids, missing, failed


def build_dataset(input_parquet, output_parquet, audio_dir, sample_size=800):
    df = pd.read_parquet(input_parquet)
    os.makedirs(audio_dir, exist_ok=True)

    pools = {
        "sad":   df[df["is_sad"] & ~df["is_happy"]],
        "happy": df[df["is_happy"] & ~df["is_sad"]],
        "dark":  df[df["is_dark"] & ~df["is_sad"] & ~df["is_happy"]],
    }

    keep, all_failed = [], []
    for label, pool in pools.items():
        ids, _, failed = download_class(pool, sample_size, audio_dir, label)
        keep += ids
        all_failed += failed

    final = df[df["track_id"].isin(keep)].drop_duplicates("track_id")
    final.to_parquet(output_parquet, index=False)
    pd.Series(all_failed, name="track_id").to_csv(
        os.path.join(audio_dir, "_failed_network.csv"), index=False
    )


if __name__ == "__main__":
    build_dataset(
        "data/interim/jamendo_moods.parquet",
        "data/interim/jamendo_sampled_metadata.parquet",
        "data/raw/audio",
        sample_size=800,
    )