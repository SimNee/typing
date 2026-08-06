# TypeRail

Live site: https://simnee.github.io/typing/

A responsive metro-map typing trainer built with React and Vite. Type real station names to move a friendly train along stylized geographic routes, earn stars, and unlock the world.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To verify a production build:

```bash
npm run build
npm run preview
```

Progress, settings, driver identity, and the v1 leaderboard are saved in `localStorage`. Clear the keys beginning with `typerail-` to reset the app.

## Project structure

- `src/data.js` — countries, lines, ordered stations, official colors, and normalized route waypoints.
- `src/assets/world.json` — bundled Natural Earth country boundaries used by the world and play maps.
- `src/storage.js` — progress helpers and the asynchronous leaderboard storage interface.
- `src/App.jsx` — screens, typing/scoring engine, Web Audio, route map, and train.
- `src/styles.css` — responsive design, animation, focus states, and reduced-motion behavior.

## Add a country or line

Open `src/data.js`. Countries are listed in unlock order, and lines inside each country are likewise ordered. Add a line with:

```js
L(
  'country-line-id',
  'CODE',
  'Display Line Name',
  '#official-color',
  ['First Station', 'Second Station', 'Terminus'],
  [[10, 20], [45, 55], [90, 80]]
)
```

Waypoints use a 0–100 coordinate space. Use a handful of points that describe the route's geographic silhouette; the SVG renderer smooths them into a curve and spaces stations evenly by path length. A closed loop should repeat its first waypoint as its last waypoint.

Country outlines come from the public-domain [Natural Earth](https://www.naturalearthdata.com/) dataset and are bundled so the map works offline. Add the country's ISO-3 code and city coordinates to `mapMeta` in `src/App.jsx` when adding a destination.

To add a country, append a `{ id, flag, name, city, system, lines }` object. Unlocking follows array order automatically. Keep IDs stable after release because progress is keyed by line ID.

## Leaderboard backend swap

UI code only calls `leaderboardStore.getLeaderboard()` and `leaderboardStore.submitScore(score)` in `src/storage.js`. Replace those method bodies with Firebase, Supabase, or REST calls while keeping their return shapes unchanged.
