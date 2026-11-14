# SOURCES-AUDIT — auditoria das fontes (Fase 3 – Prompt 3)

Verificação feita em 2026-11-14:
- DOIs: Crossref/DataCite. **35 DOIs, todos resolvem.**
- Links: requisição HTTP real.
- Datasets: CMR.

Nada foi corrigido em silêncio. A única mudança em `src/data/sites.json` está registrada na seção 0.

## 0. Mudanças feitas em sites.json

| Site | Antes | Depois | Motivo |
|---|---|---|---|
| vargeao | rótulo "Icarus 252 (2015) 347–365 — Vargeão as Mars impact-hydrothermal analog (team-provided, verify)" | referência completa Yokoyama et al. (2015), mesmo DOI | O DOI foi verificado no Crossref e confere. Só o rótulo "(verify)" ficou desatualizado; a URL não mudou. |

Nenhuma URL morta e nenhum DOI que não resolve foi encontrado em sites.json.

## 0b. Links com problema nas listas novas (data/*.json)

| Item | Problema | Tratamento |
|---|---|---|
| RadLab GUI (`/radlab/gui/...`) | HTTP 500 em 2026-11-14. A Data API funciona. | `unverified` em official-resources.json. A integração usa a API. |
| CSA — "Space resources for STEM and youth organizations" e "Food production on the Moon…" | asc-csa.gc.ca não abriu desta máquina (timeout) | `unverified`, com selo na página |
| CSA open data / RADARSAT (datasources) | timeout | `unverified` |
| HI-SEAS (hi-seas.org) | HTTP 401: página protegida | `unverified` |
| Habitat Marte (site oficial) | DNS falhou (habitatmarte.com/.org/.com.br) | `unverified`. A fonte em sites.json (Olhar Digital) abre. |
| JAXA G-Portal | `/gpr/` devolveu 404 | URL corrigida para `https://gportal.jaxa.jp/` (200) |
| nasa.gov/reference/osdr-api/ | 404 | Substituído pela especificação OpenAPI oficial (visualization.osdr.nasa.gov/biodata/api/) |
| ESA Sentinel-2 / PANGAEA / CAVES (páginas antigas) | 404 | Substituídas por páginas ESA atuais (agente de pesquisa) |
| DOIs de editoras (Wiley, Science, Elsevier) | 403 ao abrir a página da editora (bloqueio de robô) | O DOI foi conferido direto no Crossref: ok |

## 0c. Listas de recursos "oficiais" divergem

- O brief da equipe chamou api.nasa.gov, DONKI, OSDR, RadLab e Trek de "recursos oficiais". **A aba Resources da página oficial de 2026 não lista nenhum deles** (conferido em 2026-11-14).
- A lista que estava como "notas da equipe" é a que está na página oficial: Earthdata Search, Worldview, PDS, LRO/Diviner, CSA RCM/RADARSAT-1, tutorial SAR, Copernicus, ESA OSC e JAXA G-Portal.
- Os rótulos foram ajustados em `data/official-resources.json` e `data/nasa-endpoints.json`.

## 0d. Avisos vindos do DATA-CHECK (dados NASA × cards)

- **HI-SEAS:** o card declara "high altitude", mas a elevação do POWER é a média da célula da grade (~0,5°), 1145 m. Mauna Loa é alta, então isso é limitação do dado, não erro do card. Revisar antes de mudar o atributo.
- **Iceland:** o land cover MODIS (classe 17, água) no ponto exato indica que a coordenada cai num lago ou na costa. Conferir a coordenada do site.
- **Léveillé:** o Crossref data o artigo em **2009** (Comptes Rendus Palevol 8(7)), não 2010 como se costuma citar.


Data da verificação: 2026-11-14. Método: Crossref (`api.crossref.org/works/<DOI>`) para DOIs; `curl -L` para links web.
Lista completa de referências verificadas: `C:\Users\samue\Documents\ppv\data\references.json` (23 itens, todos "verified").

## 1. vargeao

- **Citado:** "Icarus 252 (2015) 347–365 — Vargeão as Mars impact-hydrothermal analog (team-provided, verify)", https://doi.org/10.1016/j.icarus.2015.02.001
- **Encontrado (Crossref):**
  - Título: "Hydrothermal alteration in basalts from Vargeão impact structure, south Brazil, and implications for recognition of impact-induced hydrothermalism on Mars"
  - Autores: Yokoyama, E.; Nédélec, A.; Baratoux, D.; Trindade, R. I. F.; Fabre, S.; Berger, G.
  - Periódico: Icarus, vol. 252, pp. 347–365, publicado em 2015-05.
- **Veredito: ok.** Volume, páginas, ano e tema conferem com o rótulo.
- **Correção sugerida:** só trocar o rótulo pela referência completa (já está em references.json, id `yokoyama-2015-vargeao-hydrothermal-mars`):
  Yokoyama, E., Nédélec, A., Baratoux, D., Trindade, R. I. F., Fabre, S., & Berger, G. (2015). Hydrothermal alteration in basalts from Vargeão impact structure, south Brazil, and implications for recognition of impact-induced hydrothermalism on Mars. Icarus, 252, 347–365. https://doi.org/10.1016/j.icarus.2015.02.001
  e remover "(team-provided, verify)".
- Fontes complementares verificadas: Crósta et al. (2011), MAPS 47(1) 51–71, doi 10.1111/j.1945-5100.2011.01312.x (geologia; diâmetro ~12 km); Alsemgeest et al. (2026), JGR Planets 131(2) e2025JE008966, doi 10.1029/2025je008966 (Vargeão como análogo raro de sistema hidrotermal de impacto em Marte).

## 2. habitat-marte

- **Citado:** "Olhar Digital (2021) — news article on Habitat Marte (team-provided, secondary source)", https://olhardigital.com.br/2021/08/23/ciencia-e-espaco/habitat-marte-brasil-tem-estacao-espacial-analoga-ao-planeta-vermelho/
- **Encontrado:** HTTP 200, sem redirecionamento. Título da página: "Habitat Marte: Brasil tem estação espacial que imita o Planeta Vermelho". Autora: Flavia Correia (editado por André Lucena), publicado em 23/08/2021, atualizado em 17/12/2021. O texto diz que o Habitat Marte fica no sertão do Rio Grande do Norte, é a "única estação análoga ao Planeta Vermelho de todo o Hemisfério Sul", é uma iniciativa do prof. Júlio Rezende (Depto. de Engenharia de Produção, UFRN) e se inspira na MDRS da Mars Society.
- **Veredito: ok** (link ativo, conteúdo bate com o rótulo). Continua sendo fonte secundária/jornalística.
- **Pontos do "summary" que o artigo NÃO cobre no trecho lido:** o município "Caiçara do Rio do Vento" não aparece no trecho extraído (só "sertão do Rio Grande do Norte"). Conferir o artigo inteiro ou usar uma fonte da UFRN.
- **Correção sugerida:** nenhuma substituição verificada. Não achei artigo revisado por pares sobre o Habitat Marte nesta rodada; manter como fonte secundária.

## 3. Afirmações factuais sem fonte em sites.json

Só os sites `vargeao` e `habitat-marte` têm `sources`. Os outros 20 estão com `sources: []`. Afirmações com número ou fato específico:

| site | afirmação | situação |
|---|---|---|
| vargeao | "about 12 km wide", em basalto, Santa Catarina | Fonte verificada disponível: Crósta et al. 2011 (resumo: diâmetro borda a borda ~12 km). Adicionar a `sources`. |
| vista-alegre | "about 9.5 km wide in basalt, in Paraná" | Fonte verificada disponível: Crósta et al. 2010, MAPS 45(2) 181–194 (resumo: 9,5 km, basaltos do Paraná). Adicionar. |
| araguainha | "largest known impact structure in South America (about 40 km)", divisa Goiás–Mato Grosso, soerguimento central | 40 km e soerguimento central: Engelhardt et al. 1992, Meteoritics 27(4) 442–457 (resumo). "Maior da América do Sul" e a localização exata **não** foram verificadas. |
| serra-da-cangalha | "about 13 km wide in Tocantins" | Fonte verificada: Kenkmann et al. 2011, MAPS 46(6) 875–889 (resumo: 13.700 m, soerguimento central de 5.800 m). Talvez seja melhor escrever "~13.7 km". |
| cerro-do-jarau | "studied as an impact crater", basalto e arenito, RS | Crósta, Lourenço & Priebe 2010 (GSA, doi 10.1130/2010.2465(12)) chamam de "possible new impact structure". Sugiro escrever "provável/possível estrutura de impacto". A litologia não foi verificada. |
| atacama | "One of the driest places on Earth", solos com pouca matéria orgânica | sem fonte |
| haughton | cratera de impacto no Ártico canadense, local de pesquisa de Marte de longa duração | sem fonte |
| mdrs | habitat em Utah, sedimentos vermelhos estratificados | sem fonte |
| hiseas | encosta de vulcão (Mauna Loa), estudos de isolamento longo | sem fonte |
| black-point | usado no Desert RATS | sem fonte específica. Gruener et al. 2013 (Desert RATS 2010) cita o San Francisco Volcanic Field, Arizona; não confirmei se menciona Black Point. |
| lanzarote | treinamento de geologia para astronautas, testes de rover, tubos de lava | sem fonte |
| rio-tinto | rio ácido e rico em ferro, análogo de química aquosa marciana, testes de perfuração | sem fonte |
| iceland | testes de rover e treinamento de astronautas | sem fonte |
| concordia | estação no platô antártico, isolamento de meses | sem fonte |
| cinder-lake | crateras artificiais copiando um sítio lunar | sem fonte |
| florida-hazard-field | campo de perigos para testar detecção autônoma de perigos | sem fonte |
| lencois | dunas com lagoas sazonais de água doce | sem fonte |
| raso-da-catarina | uma das partes mais secas da caatinga | sem fonte |
| uyuni | "largest salt flat on Earth", ~3.600 m de altitude | sem fonte |
| puna | planalto alto e seco, grandes amplitudes térmicas | sem fonte |
| jalapao | dunas laranja, mesas de arenito | sem fonte |
