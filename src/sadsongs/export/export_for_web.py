import pandas as pd
import os

def export_for_web():
    df = pd.read_parquet("data/processed/clustered_universe.parquet")
    
    # Criar a pasta pública do React se não existir
    out_dir = "web/public/data"
    os.makedirs(out_dir, exist_ok=True)
    
    # Isolar apenas as variáveis visuais
    df_web = df[['track_id', 'pca_x', 'pca_y', 'cluster', 'mood_label', 'energy_rms_norm']]
    
    out_path = os.path.join(out_dir, "universe.json")
    df_web.to_json(out_path, orient="records")
    
    print(f"JSON exportado com sucesso para: {out_path}")

if __name__ == "__main__":
    export_for_web()