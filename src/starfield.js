// Star field used as the background of every page and around the globe on the maps,
// matching the stars behind the 3D planets on the home page. Generated once as a
// tiling texture (two sizes, so the pattern does not look repetitive).

function layer(size, count, maxR, seed) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < count; i++) {
    const r = 0.3 + rnd() * maxR;
    g.globalAlpha = 0.25 + rnd() * 0.75;
    g.fillStyle = rnd() < 0.08 ? "#cfe0ff" : rnd() < 0.08 ? "#ffe2c4" : "#ffffff";
    g.beginPath();
    g.arc(rnd() * size, rnd() * size, r, 0, Math.PI * 2);
    g.fill();
  }
  return c.toDataURL("image/png");
}

export function installStarfield() {
  try {
    const a = layer(420, 140, 0.9, 7);
    const b = layer(700, 60, 1.4, 13);
    document.documentElement.style.setProperty("--stars", `url(${a}), url(${b})`);
  } catch {
    /* canvas unavailable: plain background */
  }
}
