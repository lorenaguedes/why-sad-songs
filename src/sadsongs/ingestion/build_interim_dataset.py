import os
import pandas as pd

def process_raw_tags():
    raw_file = "data/raw/mtg_jamendo_moodtheme.tsv"
    interim_dir = "data/interim"
    os.makedirs(interim_dir, exist_ok=True)
    output_file = os.path.join(interim_dir, "jamendo_moods.parquet")
    
    records = []
    with open(raw_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    if lines[0].startswith("TRACK_ID"):
        lines = lines[1:]
        
    for line in lines:
        parts = line.strip().split('\t')
        if len(parts) < 5:
            continue
            
        track_id = parts[0]
        artist_id = parts[1]
        
        tags = [t.replace("mood/theme---", "").strip().lower() for t in parts[4:]]
        
        records.append({
            "track_id": track_id,
            "artist_id": artist_id,
            "tags": tags
        })
        
    df = pd.DataFrame(records)

    df['is_sad'] = df['tags'].apply(lambda x: 'sad' in x or 'depressed' in x or 'melancholic' in x)
    df['is_happy'] = df['tags'].apply(lambda x: 'happy' in x or 'joyful' in x)
    df['is_dark'] = df['tags'].apply(lambda x: 'dark' in x)
    

    df.to_parquet(output_file, index=False)
    print(f"Total de faixas tristes isoladas: {df['is_sad'].sum()}")

if __name__ == "__main__":
    process_raw_tags()