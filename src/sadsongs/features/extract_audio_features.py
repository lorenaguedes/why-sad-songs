import os
import librosa
import numpy as np
import pandas as pd
import warnings
from pathlib import Path

warnings.filterwarnings('ignore')

def extract_features(audio_path):
    try:
        y, sr = librosa.load(audio_path, duration=30.0)

        rms = librosa.feature.rms(y=y)[0]
        energy_mean = np.mean(rms)

        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        tempo_val = tempo[0] if isinstance(tempo, np.ndarray) else tempo

        cent = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        centroid_mean = np.mean(cent)

        zcr = librosa.feature.zero_crossing_rate(y)[0]
        zcr_mean = np.mean(zcr)
        
        return {
            "energy_rms": float(energy_mean),
            "tempo_bpm": float(tempo_val),
            "spectral_centroid": float(centroid_mean),
            "zcr": float(zcr_mean)
        }
    except Exception as e:
        print(f"Erro ao processar {audio_path}: {e}")
        return None

def process_dataset(audio_dir, output_file):
    print(f"Iniciando extração de features em {audio_dir}...")
    audio_paths = list(Path(audio_dir).glob("*.mp3"))
    total = len(audio_paths)
    
    features_list = []
    
    for i, path in enumerate(audio_paths):
        track_id = path.stem 

        if (i + 1) % 50 == 0:
            print(f"Processando [{i + 1}/{total}]...")
            
        feats = extract_features(path)
        if feats:
            feats["track_id"] = track_id
            features_list.append(feats)
            
    df_features = pd.DataFrame(features_list)
    print(f"\nExtração concluída para {len(df_features)} faixas.")
    
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    df_features.to_parquet(output_file, index=False)
    print(f"Features salvas em: {output_file}")

if __name__ == "__main__":
    AUDIO_DIR = "data/raw/audio"
    OUTPUT_FILE = "data/processed/audio_features.parquet"
    process_dataset(AUDIO_DIR, OUTPUT_FILE)