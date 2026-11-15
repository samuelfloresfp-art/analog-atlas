# Plano de integração dos recursos oficiais (14/11/2026)

Objetivo: usar o máximo dos recursos da aba *Resources* do desafio, deixando de fora o que custa muito ou não melhora a análise.

## O que entrou neste PR

| Recurso | Antes | Agora | Onde |
|---|---|---|---|
| NASA Worldview | Indireto (GIBS) | Indireto (GIBS) + botão "Open in Worldview" no card, no mesmo ponto e com as mesmas camadas | `imagery.js` → `worldviewUrl()`, `NasaPanel.js` |
| NASA Earthdata Search | Indireto (CMR, só contagem de arquivos) | + botões "Earthdata Search (SRTM / EMIT)" no ponto + **valores de SRTM e ASTER GDEM** via AppEEARS: elevação, declividade e relevo local em ~60 m (rover) e ~1 km (zona de pouso) | `earthdataSearchUrl()`, `scripts/fetch_official_extras.py --appeears`, bloco "Terrain at this site" |
| NASA PDS + LRO Diviner | Só citados | **Temperatura medida do polo sul lunar** (Polar Resource Product): média e máxima anual e % da área abaixo de 110 K em Shackleton e em 85–90°S, ao lado da faixa de temperatura do local na Terra (POWER) | `scripts/fetch_official_extras.py --diviner`, `data/lunar-targets.json`, bloco "Lunar south pole, measured" (só nos cards da Lua) |

Os blocos novos só aparecem no card quando `data/nasa-cache/official-extras.json` existir. Sem o arquivo, o site fica igual ao de hoje.

## Falta rodar (2 comandos, numa máquina com internet)

O ambiente onde o código foi escrito não alcança os servidores da NASA. O código foi testado com dados sintéticos: o leitor do Diviner e o cálculo de declividade, que deu 5,71° para uma rampa de 10%, como esperado.

```bash
# 1) Diviner — sem login. Baixa ~centenas de MB em streaming; lê as colunas do label oficial do PDS.
python scripts/fetch_official_extras.py --diviner

# 2) AppEEARS — precisa de Earthdata Login (conta gratuita: https://urs.earthdata.nasa.gov)
export EARTHDATA_USERNAME=...   # nunca commitar
export EARTHDATA_PASSWORD=...
python scripts/fetch_official_extras.py --appeears
# A tarefa leva de minutos a ~1 h. Se o terminal fechar, retome com:
python scripts/fetch_official_extras.py --appeears --appeears-task <task_id>
```

Depois: `git add data/nasa-cache/official-extras.json` e commit.

Se o Diviner parar com "Could not map columns", o script imprime os nomes das colunas do label. Rode de novo com `--diviner-columns lat=NOME,lon=NOME,tavg=NOME,tmax=NOME,ice=NOME`.

## Conferir à mão, uma vez

- Abrir um card e clicar nos 3 links "Open this point in NASA tools". O formato dos links (`sp[0]=lon,lat` no Earthdata Search; `v=`/`l=`/`t=` no Worldview) não pôde ser aberto daqui.
- Coordenadas e raio de Shackleton em `data/lunar-targets.json` (vêm do `trek-features.json`). Outros alvos Artemis podem ser adicionados ali, desde que dentro de 80–90°S.

## Deixado de fora, e por quê

| Recurso | Motivo |
|---|---|
| CSA RCM, RADARSAT-1, tutorial SAR | Pedido e download de imagem de radar + processamento: 4 h ou mais, com risco de não haver imagem dos locais. Ficam citados. |
| ESA Copernicus Data Space | Exige conta e outro pipeline. O SRTM via AppEEARS já cobre a mesma necessidade (DEM de 30 m). Candidato se sobrar tempo. |
| ESA Open Science Catalog, JAXA G-Portal | Sem produto com ganho claro sobre o que já entrou; o G-Portal exige conta. Ficam citados. |
| LRO LOLA (declividade lunar) | Os produtos polares têm vários GB. Custo alto para o prazo. |
| Mars (MOLA/CRISM em valores) | Processamento pesado via PDS/ODE. Marte segue com a imagem MOLA do Trek. |

## Próximo passo possível (não feito)

Usar a declividade do SRTM na regra de adequação da missão Landing (`missionFit`). Isso muda a lógica dos estados do mapa e as regras do projeto, então fica para decisão da equipe.
