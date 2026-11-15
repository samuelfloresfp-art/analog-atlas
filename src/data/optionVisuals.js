// Pictures for every answer of the "Be an explorer" form, so the visitor can SEE what
// "semi-arid", "sparse vegetation" or "15–30° slope" means.
// - sat: a real high-resolution satellite tile (Esri World Imagery) of a well-known place
//   that is a textbook example of the option.
// - svg: a simple diagram where a photo cannot show the idea (slope, subsurface, access).

import { TILES } from "../config.js";
import { LANG } from "../i18n.js";

const sat = (lat, lon, z, en, pt) => ({ kind: "sat", lat, lon, z, en, pt });
const svg = (draw, en, pt) => ({ kind: "svg", draw, en, pt });

// ---- diagrams --------------------------------------------------------------------
const W = 160, H = 110;
const frame = (inner) =>
  `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2233"/><stop offset="1" stop-color="#0B0D12"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#sky)"/>${inner}</svg>`;

function slope(deg) {
  const rad = (Math.min(deg, 40) * Math.PI) / 180;
  const x0 = 20, y0 = 92, len = 125;
  const x1 = x0 + len * Math.cos(rad), y1 = y0 - len * Math.sin(rad);
  return frame(`<polygon points="${x0},${y0} ${x1},${y1} ${x1},${H} ${x0},${H}" fill="#7a4a32"/>
    <line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#F25C3B" stroke-width="2.5"/>
    <line x1="${x0}" y1="${y0}" x2="${x0 + 60}" y2="${y0}" stroke="#959599" stroke-dasharray="3 3"/>
    <path d="M ${x0 + 34} ${y0} A 34 34 0 0 0 ${x0 + 34 * Math.cos(rad)} ${y0 - 34 * Math.sin(rad)}" fill="none" stroke="#E7F434" stroke-width="1.5"/>
    <text x="${x0 + 40}" y="${y0 - 6}" fill="#E7F434" font-family="DM Mono, monospace" font-size="11">${deg === 45 ? ">30°" : deg + "°"}</text>
    <g transform="translate(${x0 + 70 * Math.cos(rad)},${y0 - 70 * Math.sin(rad)}) rotate(${-Math.min(deg, 40)})"><rect x="-9" y="-9" width="18" height="7" rx="2" fill="#B9B9BB"/><circle cx="-6" cy="-1" r="3" fill="#2E2E32"/><circle cx="6" cy="-1" r="3" fill="#2E2E32"/></g>`);
}

const ground = (extra = "") =>
  frame(`<rect y="38" width="${W}" height="${H - 38}" fill="#5a3a2a"/><rect y="38" width="${W}" height="4" fill="#7a4a32"/>${extra}`);
const SUB = {
  none: ground(`<path d="M0 60 L${W} 60 M0 80 L${W} 80 M0 98 L${W} 98" stroke="#4a3022" stroke-width="2"/>`),
  caves: ground(`<path d="M30 70 q20 -18 45 -4 q25 12 50 -2 q10 18 -10 26 q-30 10 -55 2 q-25 -6 -30 -22z" fill="#0B0D12"/><path d="M60 42 l6 20" stroke="#0B0D12" stroke-width="5"/>`),
  "lava-tubes": ground(`<ellipse cx="80" cy="74" rx="62" ry="15" fill="#0B0D12"/><ellipse cx="80" cy="74" rx="62" ry="15" fill="none" stroke="#F25C3B" stroke-width="1.2" opacity=".6"/><ellipse cx="80" cy="40" rx="12" ry="4" fill="#0B0D12"/><rect x="72" y="40" width="16" height="22" fill="#0B0D12"/>`),
  unknown: ground(`<text x="80" y="88" text-anchor="middle" fill="#E7F434" font-family="Inter, sans-serif" font-weight="700" font-size="34">?</text>`),
};
const ACCESS = {
  road: frame(`<rect y="40" width="${W}" height="70" fill="#6b5640"/><polygon points="62,${H} 98,${H} 84,40 76,40" fill="#2E2E32"/><line x1="80" y1="${H}" x2="80" y2="42" stroke="#E7F434" stroke-width="1.5" stroke-dasharray="6 6"/>`),
  track: frame(`<rect y="40" width="${W}" height="70" fill="#6b5640"/><path d="M60 ${H} C70 85, 95 70, 82 40" stroke="#9c8462" stroke-width="10" fill="none"/><path d="M60 ${H} C70 85, 95 70, 82 40" stroke="#4a3a2a" stroke-width="1" stroke-dasharray="2 4" fill="none"/>`),
  none: frame(`<rect y="40" width="${W}" height="70" fill="#6b5640"/><circle cx="40" cy="70" r="6" fill="#4a3a2a"/><circle cx="110" cy="88" r="9" fill="#4a3a2a"/><circle cx="92" cy="58" r="4" fill="#4a3a2a"/><g stroke="#F64137" stroke-width="3"><circle cx="80" cy="22" r="11" fill="none"/><line x1="72" y1="30" x2="88" y2="14"/></g>`),
};

// ---- per field / option ----------------------------------------------------------
export const OPTION_VISUALS = {
  topography: {
    "flat-plain": sat(40.76, -113.88, 12, "Bonneville Salt Flats, USA", "Bonneville Salt Flats, EUA"),
    "impact-crater": sat(35.0275, -111.0225, 14, "Meteor Crater, Arizona", "Cratera do Meteoro, Arizona"),
    "lava-field": sat(43.42, -113.56, 13, "Craters of the Moon lava field, Idaho", "Campo de lava Craters of the Moon, Idaho"),
    dunes: sat(-24.75, 15.35, 12, "Namib Sand Sea, Namibia", "Mar de areia do Namibe, Namíbia"),
    "canyon-valley": sat(36.1, -112.1, 12, "Grand Canyon, Arizona", "Grand Canyon, Arizona"),
    "mountain-plateau": sat(36.98, -110.1, 11, "Mesas of Monument Valley, USA", "Platôs de Monument Valley, EUA"),
    "rocky-plain": sat(-24.1, -69.9, 13, "Gravel plain, Atacama Desert", "Planície de cascalho, Deserto do Atacama"),
    "cave-lava-tube": { ...svg(SUB["lava-tubes"], "Cross-section of a lava tube", "Corte de um tubo de lava") },
  },
  slopeClass: {
    "0-2": svg(slope(2), "Almost flat", "Quase plano"),
    "2-5": svg(slope(5), "Gentle slope", "Declive suave"),
    "5-15": svg(slope(15), "Moderate slope", "Declive moderado"),
    "15-30": svg(slope(30), "Steep slope", "Declive forte"),
    ">30": svg(slope(45), "Very steep / cliffs", "Muito íngreme / paredões"),
  },
  surface: {
    "basalt-rock": sat(43.42, -113.56, 15, "Basalt lava, Idaho", "Lava basáltica, Idaho"),
    "loose-sand": sat(-24.75, 15.35, 14, "Loose dune sand, Namib", "Areia solta de duna, Namibe"),
    "fine-dust": sat(40.85, -119.15, 13, "Dry playa dust, Black Rock Desert", "Poeira de leito seco, Black Rock Desert"),
    "gravel-regolith": sat(-24.1, -69.9, 15, "Desert gravel, Atacama", "Cascalho do deserto, Atacama"),
    "salt-crust": sat(-20.2, -67.5, 12, "Salt crust, Salar de Uyuni", "Crosta de sal, Salar de Uyuni"),
    clay: sat(35.07, -109.78, 14, "Clay badlands, Painted Desert", "Terrenos de argila, Painted Desert"),
    "ice-permafrost": sat(70.25, -148.5, 13, "Frozen ground, Alaska North Slope", "Solo congelado, norte do Alasca"),
    "vegetated-soil": sat(-24.0, -51.5, 13, "Farmland, Paraná", "Lavouras, Paraná"),
  },
  vegetation: {
    none: sat(20.0, 50.0, 11, "Rub' al Khali desert", "Deserto Rub' al Khali"),
    sparse: sat(35.0, -115.9, 17, "Scattered shrubs, Mojave Desert", "Arbustos espaçados, Deserto de Mojave"),
    moderate: sat(-9.4, -40.6, 14, "Caatinga, Bahia/Pernambuco", "Caatinga, sertão nordestino"),
    dense: sat(-2.6, -60.2, 13, "Amazon rainforest", "Floresta Amazônica"),
  },
  climate: {
    "hyper-arid": sat(-24.1, -69.9, 11, "Atacama Desert, Chile", "Deserto do Atacama, Chile"),
    arid: sat(35.0, -115.9, 11, "Mojave Desert, USA", "Deserto de Mojave, EUA"),
    "semi-arid": sat(-9.7, -38.5, 12, "Raso da Catarina, Brazilian semi-arid", "Raso da Catarina, semiárido baiano"),
    humid: sat(-2.6, -60.2, 11, "Amazon, Brazil", "Amazônia, Brasil"),
    "polar-cold": sat(-77.5, 162.0, 10, "McMurdo Dry Valleys, Antarctica", "Vales Secos de McMurdo, Antártida"),
    "high-altitude": sat(-24.3, -67.2, 11, "Puna plateau, ~4,000 m", "Platô da Puna, ~4.000 m"),
  },
  waterIce: {
    none: sat(20.0, 50.0, 11, "No surface water, Arabian desert", "Sem água na superfície, deserto da Arábia"),
    seasonal: sat(-2.53, -43.12, 12, "Seasonal lagoons, Lençóis Maranhenses", "Lagoas sazonais, Lençóis Maranhenses"),
    permafrost: sat(70.25, -148.5, 12, "Permafrost lakes, Alaska", "Lagos de permafrost, Alasca"),
    "hydrated-minerals": sat(37.7, -6.6, 13, "Iron/sulfate minerals, Rio Tinto", "Minerais de ferro e sulfato, Rio Tinto"),
    unknown: svg(SUB.unknown, "Not known", "Não se sabe"),
  },
  subsurface: {
    none: svg(SUB.none, "Solid ground", "Solo maciço"),
    caves: svg(SUB.caves, "Caves", "Cavernas"),
    "lava-tubes": svg(SUB["lava-tubes"], "Lava tube with a skylight", "Tubo de lava com abertura"),
    unknown: svg(SUB.unknown, "Not known", "Não se sabe"),
  },
  access: {
    road: svg(ACCESS.road, "Paved or dirt road", "Estrada"),
    track: svg(ACCESS.track, "4×4 track only", "Só trilha 4×4"),
    none: svg(ACCESS.none, "No vehicle access", "Sem acesso de veículo"),
  },
  isolation: {
    populated: sat(-23.55, -46.63, 12, "City (São Paulo)", "Cidade (São Paulo)"),
    rural: sat(-24.0, -51.5, 12, "Farms and villages", "Fazendas e vilarejos"),
    remote: sat(-10.5, -46.6, 11, "Jalapão, hours from a town", "Jalapão, a horas da cidade"),
    extreme: sat(-75.1, 123.3, 9, "Antarctica (Concordia)", "Antártida (Concordia)"),
  },
};

function tileUrl(lat, lon, z) {
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const r = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
  return TILES.hd.replace("{z}", z).replace("{x}", x).replace("{y}", y);
}

/** HTML for the picture of one option, or "" if there is none. */
export function optionVisual(field, id) {
  const v = OPTION_VISUALS[field]?.[id];
  if (!v) return "";
  const cap = LANG === "pt" ? v.pt : v.en;
  const pic =
    v.kind === "sat"
      ? `<img src="${tileUrl(v.lat, v.lon, v.z)}" alt="${cap}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'opt-pic-fallback'}))"/>`
      : v.draw;
  return `<span class="opt-pic">${pic}</span><span class="opt-cap">${cap}</span>`;
}

export const hasVisuals = (field) => !!OPTION_VISUALS[field];
