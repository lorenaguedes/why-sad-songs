import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import os

def prepare_final_dataset():

    meta_path = "data/interim/jamendo_sampled_metadata.parquet"
    audio_path = "data/processed/audio_features.parquet"

    meta_df = pd.read_parquet(meta_path)
    audio_df = pd.read_parquet(audio_path)

    meta_df['track_id'] = meta_df['track_id'].astype(str)
    audio_df['track_id'] = audio_df['track_id'].astype(str)

    df = pd.merge(meta_df, audio_df, on="track_id", how="inner")
    print(f"Dataset combinado criado com {len(df)} faixas.")

    df = df.dropna()

    features = ["energy_rms", "tempo_bpm", "spectral_centroid", "zcr"]
    scaler = MinMaxScaler()

    for feat in features:
        df[f"{feat}_norm"] = scaler.fit_transform(df[[feat]])

    out_dir = "data/processed"
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "analytical_base_table.parquet")
    
    df.to_parquet(out_file, index=False)
    
    print(f"\n[SUCESSO] Base final pronta e salva em: {out_file}")
    print("\nResumo das Classes no Dataset Final:")
    print(f" - Músicas Tristes: {df['is_sad'].sum()}")
    print(f" - Músicas Felizes: {df['is_happy'].sum()}")
    print(f" - Músicas Sombrias (Dark): {df['is_dark'].sum()}")
    print("\nVisualização rápida das colunas normalizadas:")
    print(df[[f"{f}_norm" for f in features]].head(3))

if __name__ == "__main__":
    prepare_final_dataset()