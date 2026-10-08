import os
import urllib.request

def check_jamendo_viability():
    # URL oficial do repositório MTG contendo as anotações de mood/theme
    url = "https://raw.githubusercontent.com/MTG/mtg-jamendo-dataset/master/data/autotagging_moodtheme.tsv"
    raw_dir = "data/raw"
    os.makedirs(raw_dir, exist_ok=True)
    file_path = os.path.join(raw_dir, "mtg_jamendo_moodtheme.tsv")
    
    if not os.path.exists(file_path):
        print(f"Baixando metadados do MTG-Jamendo de {url}...")
        try:
            urllib.request.urlretrieve(url, file_path)
            print("Download concluído!")
        except Exception as e:
            print(f"Erro ao baixar o arquivo: {e}")
            return

    print("Lendo TSV e processando tags...")
    
    sad_count = 0
    total_tracks = 0
    tag_freq = {}
    
    # Lemos linha a linha para lidar com segurança com o formato flexível do TSV
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    if not lines:
        print("Arquivo vazio.")
        return

    # O cabeçalho padrão é: TRACK_ID <tab> ARTIST_ID <tab> ALBUM_ID <tab> PATH <tab> TAGS...
    if lines[0].startswith("TRACK_ID"):
        lines = lines[1:]
        
    for line in lines:
        parts = line.strip().split('\t')
        if len(parts) < 5:
            continue
            
        total_tracks += 1
        # No MTG-Jamendo, as tags começam no índice 4 e podem ir até o final da linha
        tags = parts[4:] 
        
        is_sad = False
        for tag in tags:
            tag_clean = tag.lower().strip()
            tag_freq[tag_clean] = tag_freq.get(tag_clean, 0) + 1
            
            # Procuramos por variações explícitas de tristeza/melancolia no prefixo mood/
            if 'sad' in tag_clean or 'melanchol' in tag_clean or 'depress' in tag_clean:
                is_sad = True
        
        if is_sad:
            sad_count += 1
            
    print(f"\nTotal de faixas com anotações de mood/theme: {total_tracks}")
    print(f"Faixas marcadas com variações de 'sad/melancholic': {sad_count}")
    
    print("\nTop 20 tags de mood/theme mais comuns:")
    sorted_tags = sorted(tag_freq.items(), key=lambda x: x[1], reverse=True)[:20]
    for k, v in sorted_tags:
        print(f" - {k}: {v}")

if __name__ == "__main__":
    check_jamendo_viability()