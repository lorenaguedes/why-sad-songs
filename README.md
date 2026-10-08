# Por que ouvimos músicas tristes?

Uma história interativa de dados que faz uma pergunta menor que o título: **quatro medidas de áudio conseguem distinguir uma música triste de uma feliz ou sombria?**

2.400 faixas do dataset [MTG-Jamendo](https://mtg.github.io/mtg-jamendo-dataset/) são posicionadas num mapa 2D pelo seu som. Depois, a história adiciona a tag de humor que cada faixa carrega e observa onde as duas discordam.

O site não responde por que as pessoas ouvem música triste. Ele mede som, não motivação, e diz isso.

## O que ele mostra

- As faixas com tag triste não ficam num único lugar do mapa. Cerca de 71% ficam nos dois grupos calmos e escuros; o resto se espalha pelos outros, inclusive os barulhentos.
- O contrário também vale: mais da metade das faixas do grupo "lento e escuro" não foi marcada como triste.
- 40 faixas com tag triste ficam longe da faixa triste típica no mapa. 20 delas podem ser ouvidas no site (as que têm licença que permite).

Os números exibidos no site são calculados a partir dos dados quando a página carrega, e não digitados.

## Como funciona

| Etapa | O quê |
|---|---|
| Dados | 2.400 faixas, 800 com tag triste, 800 feliz e 800 sombria (grupos mutuamente exclusivos). |
| Features de áudio | Energia RMS, tempo estimado, centroide espectral e taxa de cruzamento por zero, calculados nos primeiros 30 s de cada faixa e normalizados de 0 a 1. |
| Mapa | PCA para dois eixos (78,7% da variância mantida). |
| Grupos | K-Means, k = 4, nas quatro features normalizadas. |
| Frontend | React, TypeScript, Tailwind, D3 (só matemática) e canvas HTML. |
| Áudio no site | Streaming direto do Jamendo. O repositório não contém nenhum arquivo de áudio. |

## Limitações

- **As tags são definidas por quem enviou a faixa** (artistas ou gravadoras), e não por ouvintes. Elas expressam intenção e não são padronizadas.
- **Os grupos se sobrepõem bastante.** O silhouette é 0,25 com k = 4 e maior com k = 2 e k = 3 (cerca de 0,30). Escolhemos k = 4 porque dá grupos que podemos descrever pelo som, e não porque os dados exijam.
- **O mapa perde informação.** O PCA descarta cerca de 21% da variância.
- **"Casos estranhos" é uma aproximação grosseira:** os 5% das faixas com tag triste mais distantes da mediana das faixas tristes no mapa 2D.
- **O RMS depende da masterização,** e a estimativa automática de tempo pode errar por um fator de dois.
- **Faixas do mesmo artista não são independentes.** Seis das vinte faixas ouvíveis envolvem um mesmo artista.
- **O que você ouve não é exatamente o que foi medido.** As features vêm dos primeiros 30 s de cada faixa, mas o player toca a faixa desde o início, sem recorte.
- **O áudio depende do Jamendo.** Se uma faixa for removida ou o serviço mudar, ela deixa de tocar no site, mesmo que continue no mapa. O `export_credits.py` filtra as faixas indisponíveis no momento em que é rodado.

As mesmas notas aparecem na seção "Methods and limits" do site.

## Estrutura do projeto

```
data/
  interim/        metadados da amostra
  processed/      features, tabela analítica, universo com clusters
  raw/            áudio baixado para extrair features (fora do repositório, cerca de 8 GB)
notebooks/        01 EDA, 02 modelagem (PCA + K-Means)
src/sadsongs/
  ingestion/      verificação do dataset, metadados, download de áudio
  cleaning/       junção e limpeza
  features/       extração de features de áudio
  export/         arquivos consumidos pelo site
web/              o site (Vite + React + TypeScript)
```

A pasta `data/` não está no repositório. Para reproduzir o projeto, gere-a com os scripts abaixo.

## Como reproduzir

### 1. Parte em Python

Python 3.10+. No Windows, use o WSL: algumas políticas de segurança do Windows bloqueiam as bibliotecas compiladas do Numba, que o librosa precisa.

```bash
python3 -m venv ~/venvs/sadsongs
source ~/venvs/sadsongs/bin/activate
pip install librosa numpy pandas pyarrow scikit-learn soundfile matplotlib seaborn ipykernel
sudo apt install ffmpeg libsndfile1
```

Rode a partir da raiz do repositório, nesta ordem:

```bash
python src/sadsongs/ingestion/check_mtg_jamendo_viability.py
python src/sadsongs/ingestion/build_interim_dataset.py
python src/sadsongs/ingestion/download_audio_samples.py
python src/sadsongs/features/extract_audio_features.py
python src/sadsongs/cleaning/merge_and_clean.py
# depois rode notebooks/01_eda_distribuicoes.ipynb e notebooks/02_machine_learning.ipynb
# (o 02 gera data/processed/clustered_universe.parquet)
python src/sadsongs/export/export_for_web.py
JAMENDO_CLIENT_ID=seu_id python src/sadsongs/export/export_credits.py
```

- O download baixa faixas inteiras (cerca de 3,5 MB cada) do Jamendo e demora. Ele pula arquivos que já existem, então pode ser interrompido e retomado. Esse áudio serve só para calcular as features e fica em `data/raw/`, fora do Git.
- O `export_credits.py` precisa de um client id gratuito da API em [devportal.jamendo.com](https://devportal.jamendo.com). Ele remove faixas cuja licença proíbe derivações (CC ND) e faixas que não estão mais no Jamendo, e grava os créditos de cada faixa. Nunca coloque o client id no código nem faça commit dele: use a variável de ambiente.

### 2. Site

Node 20.19+ ou 22.12+ (use o [nvm](https://github.com/nvm-sh/nvm)).

```bash
cd web
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # saída em web/dist
```

O site lê `universe.json`, `audio_ids.json` e `credits.json` em `web/public/data/`, todos gerados pelos scripts de exportação. Não há áudio em `web/public/`: ao clicar numa faixa, o navegador toca direto do Jamendo, então é preciso estar online.

## Áudio e licenças

O áudio vem do [Jamendo](https://www.jamendo.com) sob licenças Creative Commons (CC BY, BY-NC e BY-NC-SA entre as faixas ouvíveis). Este projeto não hospeda nem redistribui nenhum arquivo de áudio: o navegador faz streaming direto do Jamendo. O site mostra título e artista de cada faixa e se destina a pesquisa e educação sem fins comerciais. A licença, o link e o crédito de todas as faixas estão em `web/public/data/credits.json`.

Faixas com licença CC BY-ND foram excluídas do conjunto ouvível. Se você reutilizar o projeto, confira a licença de cada faixa e mantenha o uso não comercial.

## Créditos

- Dataset: Bogdanov, D., Won, M., Tovstogan, P., Porter, A., & Serra, X. (2019). *The MTG-Jamendo Dataset for Automatic Music Tagging.* Machine Learning for Music Discovery Workshop, ICML 2019.
- Áudio e tags: Jamendo e seus artistas.
