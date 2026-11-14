# Fontes de dados NASA — api.nasa.gov e Earthdata Search

Contexto de referência para o projeto NASA Space Apps 2026 (análogos terrestres de Lua/Marte).
Levantado em 14/11/2026. Base: documentação oficial e tutoriais NASA/DAACs (dados concretos), exceto onde marcado como [dedução].

---

## 1. NASA Open APIs — https://api.nasa.gov/

**O que é:** portal único de APIs públicas da NASA. Uma única chave (emitida via api.data.gov) autentica toda a família de APIs, passada como parâmetro `api_key` na query string.

**Host base:** `https://api.nasa.gov/{endpoint}?api_key=SUA_CHAVE`
**Docs:** https://nasa.github.io/api-docs-stage/

### Chave e limites
| Modo | Limite |
|---|---|
| `DEMO_KEY` (sem cadastro) | 30 req/hora e 50 req/dia **por IP** |
| Chave pessoal (cadastro grátis, chega por e-mail) | 1.000 req/hora por chave, somado entre todas as APIs |

- Uso atual visível nos headers `X-RateLimit-Limit` / `X-RateLimit-Remaining`.
- Estourou o limite → chave bloqueada temporariamente; libera sozinha após 1 hora.
- Erros comuns: `403` = chave ausente/errada; `429` = limite estourado.

### APIs disponíveis (principais)
APOD, Asteroids NeoWs, DONKI (clima espacial), Earth, EONET (eventos naturais), EPIC (imagens da Terra inteira), Exoplanet Archive, InSight (clima em Marte), Mars Rover Photos, NASA Image and Video Library, TechPort, TechTransfer, SSD/CNEOS, Satellite Situation Center, GeneLab / Open Science Data Repository, TLE e **Vesta/Moon/Mars Trek WMTS**.

### Relevância para o desafio de análogos [dedução]
| API | Uso provável no projeto |
|---|---|
| **Moon/Mars Trek WMTS** | Tiles de mapas-base planetários (OGC WMTS) → lado "Lua/Marte" da comparação com o análogo terrestre. **Mais relevante.** |
| **Mars Rover Photos** | Imagens de superfície (Curiosity, Opportunity, Spirit) por `sol` ou data terrestre e câmera → comparação visual com o terreno análogo. Endpoint: `/mars-photos/api/v1/rovers/{rover}/photos` |
| **NASA Image and Video Library** | Imagens de missões análogas e de campo para o site/apresentação. |
| **EONET / Earth / EPIC** | Contexto terrestre (eventos naturais, imagens) — uso secundário. |
| APOD, NeoWs, DONKI, Exoplanet | Baixa relevância para análogos. |

**Limitação:** api.nasa.gov **não** é fonte de dados científicos terrestres de alta resolução (topografia, mineralogia, clima). Para isso → Earthdata (abaixo).

---

## 2. Earthdata Search — https://search.earthdata.nasa.gov/

**O que é:** aplicação web da NASA para buscar, descobrir, visualizar, refinar e acessar dados de observação da Terra. Roda sobre o **CMR (Common Metadata Repository)**, catálogo que unifica metadados de todos os 12 DAACs do EOSDIS — mais de 1 bilhão de arquivos num só lugar.

### Acesso
- **Buscar e ver metadados:** aberto, sem login.
- **Baixar dados / usar APIs:** exige **Earthdata Login (EDL)** — gratuito, aberto a qualquer pessoa no mundo. Cadastro: https://urs.earthdata.nasa.gov
- Tokens EDL expiram após 1 mês.

### Como buscar
Toda busca combina três filtros: **palavra-chave + intervalo de datas + área geográfica** (desenhada no mapa). Alguns datasets têm preview de imagem.

Dica: o painel **"For Developers"** de cada dataset mostra os endpoints programáticos (CMR API etc.) → caminho para automatizar.

### Formatos típicos
NetCDF, HDF, GeoTIFF (incluindo COG — Cloud Optimized GeoTIFF).

### Formas de acesso
| Via | Quando usar |
|---|---|
| Download pelo navegador | Poucos arquivos pequenos |
| `wget` / `curl` + arquivo `.netrc` | Lotes de arquivos com lista de URLs |
| **Python `earthaccess`** | Recomendado: abstrai CMR + login EDL; `search_datasets()` → `search_data()` → `download()` ou streaming direto pro `xarray` |
| CMR API / CMR-STAC API | Integração direta (ex.: backend do site) |
| Harmony | Recorte espacial/temporal antes de baixar (só datasets suportados) |

### Relevância para o desafio de análogos [dedução]
É a fonte das **variáveis terrestres** dos critérios de análogo: elevação/topografia, temperatura de superfície, umidade, cobertura vegetal, mineralogia (ex.: EMIT), albedo. Datasets candidatos a verificar [suposição — confirmar no Earthdata Search]:
- Topografia: SRTM / ASTER GDEM / NASADEM
- Temperatura de superfície: MODIS LST, ECOSTRESS
- Vegetação: MODIS NDVI
- Mineralogia de poeira/superfície: EMIT
- Umidade do solo: SMAP

---

## 3. Fluxo sugerido para o projeto [dedução]
1. **Lado planetário:** Moon/Mars Trek (WMTS) + Mars Rover Photos via api.nasa.gov.
2. **Lado terrestre:** variáveis físicas via Earthdata (`earthaccess` em Python).
3. **Comparação:** cruzar as variáveis com os critérios de análogo definidos em `claude/prompt-criterios-analogo.md`.

### Ação imediata
- [ ] Cadastrar chave pessoal em api.nasa.gov (não depender do DEMO_KEY — 50 req/dia trava qualquer demo ao vivo).
- [ ] Criar conta Earthdata Login para cada membro que for baixar dados.
- [ ] Cachear respostas da API no protótipo do site para não estourar limite durante a apresentação.
