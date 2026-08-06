export const mapMeta = {
  sg: { iso: "SGP", lon: 103.82, lat: 1.35 },
  my: { iso: "MYS", lon: 101.69, lat: 3.14 },
  th: { iso: "THA", lon: 100.5, lat: 13.75 },
  hk: { iso: "CHN", lon: 114.17, lat: 22.32 },
  tw: { iso: "TWN", lon: 121.56, lat: 25.04 },
  kr: { iso: "KOR", lon: 126.98, lat: 37.57 },
  jp: { iso: "JPN", lon: 139.7, lat: 35.68 },
  gb: { iso: "GBR", lon: -0.13, lat: 51.51 },
};
export const mercator = ([lon, lat]) => [
  ((lon + 180) / 360) * 1000,
  ((90 - lat) / 180) * 500,
];
const ringsOf = (g) =>
  g.type === "Polygon" ? g.coordinates : g.coordinates.flatMap((p) => p);
export const featurePath = (feature, normalize = false) => {
  if (!feature) return "";
  const rings = ringsOf(feature.geometry);
  let project = mercator;
  if (normalize) {
    const flat = rings.flat(),
      xs = flat.map((p) => p[0]),
      ys = flat.map((p) => p[1]);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minY = Math.min(...ys),
      maxY = Math.max(...ys);
    const scale = 84 / Math.max(maxX - minX, maxY - minY);
    project = ([x, y]) => [
      50 + (x - (minX + maxX) / 2) * scale,
      50 - (y - (minY + maxY) / 2) * scale,
    ];
  }
  return rings
    .map(
      (r) =>
        r
          .map((p, i) => {
            const [x, y] = project(p);
            return `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
          })
          .join(" ") + " Z",
    )
    .join(" ");
};
