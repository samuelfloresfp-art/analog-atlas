// What each analog dimension must look like for each mission type — shown in the
// hover/tap explanation of the "Analog dimensions" block of a site card.
// Based on the mission criteria (src/data/criteria.json) and the analog-dimension
// framework in data/sources-page.json.

export const DIM_HELP = {
  en: {
    landing: {
      geology: "Ground made of basalt or regolith-like grains behaves like the lunar/Martian surface under the lander's feet and engine plume.",
      terrain: "Landing zones need gentle slopes (≤ 5°) and a known pattern of rocks and craters so hazard-detection sensors can be tested.",
      atmosphere: "Little air and dust in suspension matter: the engine plume and dust clouds blind cameras and lidar during the last metres.",
      temperature: "Cold, dry conditions keep the surface firm and similar to the target; extremes stress landing hardware.",
      water: "A dry surface is needed: water and mud change how the ground carries the lander and how dust is thrown up.",
      biology: "No vegetation: plants hide hazards from sensors and do not exist on the Moon or Mars.",
      subsurface: "Less important for landing; matters only if the ground could collapse under the lander.",
      operational: "Access for vehicles and permission to repeat flights are required for landing campaigns.",
    },
    rover: {
      geology: "Wheels behave very differently on basalt, regolith, sand or clay — the rock type defines traction and sampling practice.",
      terrain: "Rovers must be tested on slopes of 2–30° with obstacles (craters, rocks, dunes) that the navigation software must avoid.",
      atmosphere: "Wind and dust test how cameras, solar panels and moving parts cope with dust, as on Mars.",
      temperature: "Large day–night swings and cold stress batteries, electronics and wheels.",
      water: "Dry ground is closer to the target; mud and water change traction completely.",
      biology: "No or sparse vegetation: plants change traction and hide rocks from the rover's cameras.",
      subsurface: "Caves, lava tubes or ground ice let teams rehearse drilling and subsurface exploration.",
      operational: "Access, permits and space for long traverses decide whether repeated driving tests are possible.",
    },
    base: {
      geology: "Local rock and regolith are used to test building and resource extraction (ISRU) near the habitat.",
      terrain: "A stable, fairly flat area is needed to set up the habitat and move between modules.",
      atmosphere: "Thin air at altitude and strong UV help test life support and suits; Earth's air is still much denser.",
      temperature: "Extreme cold or heat tests thermal control of the habitat and the crew's routine.",
      water: "Ice, ground ice or hydrated minerals let crews rehearse extracting local water — critical for a permanent base.",
      biology: "A sterile or nearly lifeless area reduces contamination and resembles the target environment.",
      subsurface: "Caves and lava tubes are studied as natural shelters against radiation and temperature swings.",
      operational: "Isolation from towns is essential: the crew must depend on the base, as on the Moon or Mars.",
    },
  },
  pt: {
    landing: {
      geology: "Solo de basalto ou grãos tipo regolito se comporta como a superfície lunar/marciana sob os pés do módulo e o jato do motor.",
      terrain: "Zonas de pouso precisam de declives suaves (≤ 5°) e de um padrão conhecido de rochas e crateras para testar os sensores que detectam perigos.",
      atmosphere: "Pouco ar e poeira em suspensão importam: o jato do motor e a nuvem de poeira cegam câmeras e lidar nos últimos metros.",
      temperature: "Frio e secura mantêm o solo firme e parecido com o destino; extremos estressam o equipamento de pouso.",
      water: "A superfície precisa ser seca: água e lama mudam como o chão sustenta o módulo e como a poeira é lançada.",
      biology: "Sem vegetação: plantas escondem perigos dos sensores e não existem na Lua nem em Marte.",
      subsurface: "Pouco importante para o pouso; só conta se o chão puder ceder sob o módulo.",
      operational: "Acesso para veículos e autorização para repetir voos são obrigatórios em campanhas de pouso.",
    },
    rover: {
      geology: "Rodas se comportam de forma muito diferente em basalto, regolito, areia ou argila — o tipo de rocha define a tração e o treino de coleta.",
      terrain: "Rovers precisam ser testados em declives de 2° a 30°, com obstáculos (crateras, rochas, dunas) que o software de navegação deve evitar.",
      atmosphere: "Vento e poeira testam como câmeras, painéis solares e peças móveis lidam com a poeira, como em Marte.",
      temperature: "Grandes variações entre dia e noite e o frio estressam baterias, eletrônica e rodas.",
      water: "Chão seco é mais parecido com o destino; lama e água mudam completamente a tração.",
      biology: "Sem vegetação ou com pouca: plantas mudam a tração e escondem rochas das câmeras do rover.",
      subsurface: "Cavernas, tubos de lava ou gelo no solo permitem ensaiar perfuração e exploração do subsolo.",
      operational: "Acesso, autorizações e espaço para travessias longas definem se dá para repetir os testes de direção.",
    },
    base: {
      geology: "A rocha e o regolito locais servem para testar construção e extração de recursos (ISRU) perto do habitat.",
      terrain: "É preciso uma área estável e razoavelmente plana para montar o habitat e circular entre os módulos.",
      atmosphere: "Ar rarefeito pela altitude e UV forte ajudam a testar suporte de vida e trajes; o ar da Terra ainda é muito mais denso.",
      temperature: "Frio ou calor extremos testam o controle térmico do habitat e a rotina da tripulação.",
      water: "Gelo, gelo no solo ou minerais hidratados permitem ensaiar a extração de água local — essencial para uma base permanente.",
      biology: "Uma área estéril ou quase sem vida reduz a contaminação e se parece com o ambiente do destino.",
      subsurface: "Cavernas e tubos de lava são estudados como abrigos naturais contra radiação e variações de temperatura.",
      operational: "Ficar longe de cidades é essencial: a tripulação precisa depender da base, como na Lua ou em Marte.",
    },
  },
};

/** NASA indicators (data/nasa-cache) that inform each dimension. */
export const DIM_INDICATORS = {
  geology: ["land_cover"],
  terrain: ["elevation", "land_cover"],
  atmosphere: ["elevation", "wind"],
  temperature: ["temp_range"],
  water: ["aridity"],
  biology: ["vegetation", "land_cover"],
  subsurface: [],
  operational: ["solar"],
};
