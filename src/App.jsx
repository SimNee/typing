import React, { useEffect, useMemo, useRef, useState } from "react";
import { countries, allLines } from "./data";
import worldGeo from "./assets/world.json";
import {
  leaderboardStore,
  loadProgress,
  saveProgress,
  loadSettings,
  saveSettings,
  playerId,
} from "./storage";

const clean = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
const starsFor = (acc, wpm) =>
  acc >= 97 && wpm >= 35 ? 3 : acc >= 92 && wpm >= 22 ? 2 : acc >= 85 ? 1 : 0;
const mapMeta = {
  sg: { iso: "SGP", lon: 103.82, lat: 1.35 },
  my: { iso: "MYS", lon: 101.69, lat: 3.14 },
  th: { iso: "THA", lon: 100.5, lat: 13.75 },
  hk: { iso: "CHN", lon: 114.17, lat: 22.32 },
  tw: { iso: "TWN", lon: 121.56, lat: 25.04 },
  kr: { iso: "KOR", lon: 126.98, lat: 37.57 },
  jp: { iso: "JPN", lon: 139.7, lat: 35.68 },
  gb: { iso: "GBR", lon: -0.13, lat: 51.51 },
};
const mercator = ([lon, lat]) => [
  ((lon + 180) / 360) * 1000,
  ((90 - lat) / 180) * 500,
];
const ringsOf = (g) =>
  g.type === "Polygon" ? g.coordinates : g.coordinates.flatMap((p) => p);
const featurePath = (feature, normalize = false) => {
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
function unlockedCountry(i, p) {
  return (
    i === 0 || countries[i - 1].lines.every((l) => (p[l.id]?.stars || 0) > 0)
  );
}
function unlockedLine(country, i, p) {
  return i === 0 || (p[country.lines[i - 1].id]?.stars || 0) > 0;
}

function AudioEngine({ muted }) {
  const ctx = useRef(),
    melodyBus = useRef();
  const melodyFamilies = useMemo(
    () => [
      {
        root: 72,
        notes: [0, 4, 7, 11, 7, 4, 2, 7],
        steps: [1, 1, 1, 2, 1, 1, 1, 2],
        wave: "square",
      },
      {
        root: 69,
        notes: [0, 2, 5, 9, 7, 5, 2, 0],
        steps: [1, 1, 1, 1, 1, 1, 1, 2],
        wave: "triangle",
      },
      {
        root: 74,
        notes: [0, 7, 5, 9, 7, 12, 9, 7],
        steps: [1, 1, 1, 1, 1, 2, 1, 2],
        wave: "sine",
      },
      {
        root: 67,
        notes: [0, 4, 2, 7, 5, 9, 7, 4],
        steps: [1, 1, 1, 1, 1, 1, 1, 2],
        wave: "square",
      },
      {
        root: 71,
        notes: [0, 3, 7, 10, 7, 5, 3, 0],
        steps: [1, 1, 1, 2, 1, 1, 1, 2],
        wave: "triangle",
      },
      {
        root: 76,
        notes: [0, -2, 0, 5, 4, 7, 5, 9],
        steps: [1, 1, 1, 1, 1, 1, 1, 2],
        wave: "sine",
      },
      {
        root: 65,
        notes: [0, 5, 9, 7, 12, 9, 7, 5],
        steps: [1, 1, 1, 1, 2, 1, 1, 2],
        wave: "square",
      },
      {
        root: 72,
        notes: [0, 2, 4, 7, 11, 9, 7, 4],
        steps: [1, 1, 1, 1, 1, 1, 1, 2],
        wave: "triangle",
      },
      {
        root: 69,
        notes: [0, 7, 4, 9, 5, 12, 9, 7],
        steps: [1, 1, 1, 1, 1, 2, 1, 2],
        wave: "sine",
      },
      {
        root: 74,
        notes: [0, 4, 9, 7, 5, 11, 9, 12],
        steps: [1, 1, 1, 1, 1, 1, 1, 2],
        wave: "square",
      },
    ],
    [],
  );
  const stopMelody = () => {
    const bus = melodyBus.current;
    if (!bus || !ctx.current) return;
    const now = ctx.current.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setTargetAtTime(0.0001, now, 0.035);
    melodyBus.current = null;
  };
  useEffect(() => {
    if (muted) stopMelody();
  }, [muted]);
  return useMemo(
    () => ({
      stopMelody,
      play(kind) {
        if (muted) return;
        ctx.current ??= new (
          window.AudioContext || window.webkitAudioContext
        )();
        const c = ctx.current,
          now = c.currentTime;
        const notes = {
          click: [520, 0.035, "sine"],
          error: [115, 0.11, "sawtooth"],
          ding: [660, 0.18, "sine"],
          fanfare: [523, 0.45, "triangle"],
        }[kind];
        if (!notes) return;
        (kind === "ding" || kind === "fanfare"
          ? [0, kind === "ding" ? 4 : 7, 12]
          : [0]
        ).forEach((n, i) => {
          const o = c.createOscillator(),
            g = c.createGain();
          o.type = notes[2];
          o.frequency.value = notes[0] * 2 ** (n / 12);
          g.gain.setValueAtTime(0.075, now + i * 0.1);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + notes[1]);
          o.connect(g).connect(c.destination);
          o.start(now + i * 0.1);
          o.stop(now + i * 0.1 + notes[1]);
        });
      },
      playArrival({ lineId, stationIndex }) {
        if (muted || lineId !== "jp-yama") return;
        ctx.current ??= new (
          window.AudioContext || window.webkitAudioContext
        )();
        stopMelody();
        const c = ctx.current,
          start = c.currentTime + 0.025,
          bus = c.createGain(),
          family = melodyFamilies[stationIndex % melodyFamilies.length];
        bus.gain.setValueAtTime(0.14, start);
        bus.connect(c.destination);
        melodyBus.current = bus;
        let beat = 0;
        family.notes.forEach((offset, i) => {
          const at = start + beat * 0.145,
            duration = Math.max(0.16, family.steps[i] * 0.14),
            midi = family.root + offset;
          [
            { wave: family.wave, ratio: 1, gain: 0.48, decay: 0.13 },
            { wave: "sine", ratio: 2, gain: 0.16, decay: 0.22 },
            { wave: "triangle", ratio: 0.5, gain: 0.12, decay: 0.28 },
          ].forEach((layer) => {
            const o = c.createOscillator(),
              g = c.createGain();
            o.type = layer.wave;
            o.frequency.value = 440 * 2 ** ((midi - 69) / 12) * layer.ratio;
            g.gain.setValueAtTime(0.0001, at);
            g.gain.exponentialRampToValueAtTime(layer.gain, at + 0.012);
            g.gain.exponentialRampToValueAtTime(
              0.0001,
              at + duration + layer.decay,
            );
            o.connect(g).connect(bus);
            o.start(at);
            o.stop(at + duration + layer.decay + 0.03);
          });
          beat += family.steps[i];
        });
      },
    }),
    [muted, melodyFamilies],
  );
}

export default function App() {
  const [screen, setScreen] = useState("world"),
    [country, setCountry] = useState(null),
    [line, setLine] = useState(null),
    [eggPrompt, setEggPrompt] = useState(null);
  const [progress, setProgress] = useState(loadProgress),
    [settings, setSettings] = useState(() => ({
      muted: false,
      name: "Driver",
      ...loadSettings(),
    }));
  const [rows, setRows] = useState([]);
  const audio = AudioEngine({ muted: settings.muted });
  useEffect(() => saveSettings(settings), [settings]);
  const nav = (s) => {
    setScreen(s);
    scrollTo(0, 0);
  };
  const openCountry = (c) => {
    if (c.id === "jp") {
      setEggPrompt(c);
      return;
    }
    setCountry(c);
    nav("lines");
  };
  const answerEasterEgg = (answer) => {
    if (clean(answer || "") !== "minecraft") {
      setEggPrompt(null);
      return;
    }
    const yamanote = eggPrompt.lines.find(
      (candidate) => candidate.id === "jp-yama",
    );
    setCountry(eggPrompt);
    setLine({
      ...yamanote,
      countryId: eggPrompt.id,
      country: eggPrompt.name,
      city: "Tokyo",
      easterEgg: true,
    });
    setEggPrompt(null);
    audio.playArrival({ lineId: "jp-yama", stationIndex: 0 });
    nav("play");
  };
  const play = (l) => {
    setLine({
      ...l,
      countryId: country.id,
      country: country.name,
      city: country.city,
    });
    nav("play");
  };
  const finished = async (result) => {
    const old = progress[line.id] || {};
    const next = {
      ...progress,
      [line.id]: {
        stars: Math.max(old.stars || 0, result.stars),
        wpm: Math.max(old.wpm || 0, result.wpm),
        accuracy: Math.max(old.accuracy || 0, result.accuracy),
      },
    };
    setProgress(next);
    saveProgress(next);
    const totalStars = Object.values(next).reduce(
        (n, x) => n + (x.stars || 0),
        0,
      ),
      bestWpm = Math.max(0, ...Object.values(next).map((x) => x.wpm || 0));
    await leaderboardStore.submitScore({
      id: playerId(),
      name: settings.name || "Driver",
      totalStars,
      bestWpm,
      timestamp: Date.now(),
    });
  };
  const showLeaderboard = async () => {
    setRows(await leaderboardStore.getLeaderboard());
    nav("leaderboard");
  };
  return (
    <div className="app">
      <header>
        <button
          className="brand"
          onClick={() => nav("world")}
          aria-label="TypeRail home"
        >
          <span>🚇</span> TypeRail
        </button>
        <nav>
          <button onClick={() => nav("world")}>Explore</button>
          <button onClick={showLeaderboard}>Leaderboard</button>
          <button
            className="icon"
            onClick={() => setSettings((s) => ({ ...s, muted: !s.muted }))}
            aria-label={settings.muted ? "Unmute" : "Mute"}
          >
            {settings.muted ? "🔇" : "🔊"}
          </button>
        </nav>
      </header>
      {screen === "world" && <World progress={progress} open={openCountry} />}{" "}
      {screen === "lines" && (
        <Lines
          country={country}
          progress={progress}
          back={() => nav("world")}
          play={play}
        />
      )}{" "}
      {screen === "play" && (
        <Game
          key={line.id}
          line={line}
          audio={audio}
          done={finished}
          back={() => nav("lines")}
          progress={progress}
          play={play}
        />
      )}{" "}
      {screen === "leaderboard" && (
        <Leaderboard
          rows={rows}
          settings={settings}
          setSettings={setSettings}
          back={() => nav("world")}
        />
      )}
      {eggPrompt && (
        <EasterEggPrompt
          submit={answerEasterEgg}
          close={() => setEggPrompt(null)}
        />
      )}
      <footer>Ride the rails. Master the keys.</footer>
    </div>
  );
}

function EasterEggPrompt({ submit, close }) {
  const [answer, setAnswer] = useState("");
  return (
    <div className="modal-bg">
      <form
        className="egg-prompt"
        role="dialog"
        aria-modal="true"
        aria-labelledby="egg-question"
        onSubmit={(e) => {
          e.preventDefault();
          submit(answer);
        }}
      >
        <button
          type="button"
          className="egg-close"
          onClick={close}
          aria-label="Close"
        >
          ×
        </button>
        <span className="egg-icon">🚉</span>
        <h2 id="egg-question">what does this line reminds you of?</h2>
        <input
          autoFocus
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          aria-label="Easter egg answer"
          autoComplete="off"
        />
        <button type="submit" className="primary">
          Answer
        </button>
      </form>
    </div>
  );
}

function WorldMap({ progress, open }) {
  return (
    <div className="world-map-wrap">
      <svg
        className="world-map"
        viewBox="0 35 1000 390"
        role="img"
        aria-label="World map of TypeRail destinations"
      >
        <g className="countries-shape">
          {worldGeo.features.map((f, i) => (
            <path key={i} d={featurePath(f)} />
          ))}
        </g>
        {countries.map((c, i) => {
          const ok = unlockedCountry(i, progress),
            canSelect = ok || c.id === "jp",
            [x, y] = mercator([mapMeta[c.id].lon, mapMeta[c.id].lat]);
          return (
            <g
              key={c.id}
              className={`map-pin ${ok ? "" : "pin-locked"} ${c.id === "jp" ? "secret-stop" : ""}`}
              transform={`translate(${x} ${y})`}
              onClick={() => canSelect && open(c)}
              role="button"
              tabIndex={canSelect ? 0 : -1}
              onKeyDown={(e) => {
                if (canSelect && (e.key === "Enter" || e.key === " ")) open(c);
              }}
              aria-label={`${c.name}${ok ? "" : " locked"}`}
            >
              <circle className="pin-pulse" r="13" />
              <circle r="8" />
              <text y="-14" textAnchor="middle">
                {c.flag} {c.name}
              </text>
              {!ok && (
                <text className="pin-lock" y="3" textAnchor="middle">
                  ×
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="map-note">
        Select an unlocked marker to choose a rail network
      </p>
    </div>
  );
}

function World({ progress, open }) {
  const earned = Object.values(progress).reduce(
    (n, x) => n + (x.stars || 0),
    0,
  );
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">YOUR NEXT DEPARTURE</p>
        <h1>
          Type your way
          <br />
          <em>around the world.</em>
        </h1>
        <p>Real stations. Famous routes. One keystroke at a time.</p>
        <div className="stats">
          <b>{earned}</b> stars earned <span>•</span>{" "}
          <b>{Object.values(progress).filter((x) => x.stars).length}</b> lines
          completed
        </div>
      </section>
      <section>
        <div className="section-title">
          <div>
            <p className="eyebrow">SELECT A DESTINATION</p>
            <h2>World lines</h2>
          </div>
          <span>
            {countries.filter((_, i) => unlockedCountry(i, progress)).length} /{" "}
            {countries.length} unlocked
          </span>
        </div>
        <WorldMap progress={progress} open={open} />
        <div className="country-grid">
          {countries.map((c, i) => {
            const ok = unlockedCountry(i, progress),
              stars = c.lines.reduce(
                (n, l) => n + (progress[l.id]?.stars || 0),
                0,
              );
            return (
              <button
                className={`country-card ${!ok ? "locked" : ""} ${c.id === "jp" ? "secret-stop" : ""}`}
                disabled={!ok && c.id !== "jp"}
                onClick={() => open(c)}
                key={c.id}
              >
                <span className="flag">{c.flag}</span>
                <span>
                  <b>{c.name}</b>
                  <small>
                    {c.city} · {c.system}
                  </small>
                </span>
                <span className="card-end">
                  {ok ? (
                    <>
                      ★ {stars}/{c.lines.length * 3}
                      <i>›</i>
                    </>
                  ) : (
                    <>
                      🔒<small>Complete {countries[i - 1]?.name}</small>
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Lines({ country, progress, back, play }) {
  return (
    <main className="shell">
      <button className="back" onClick={back}>
        ← All countries
      </button>
      <section className="line-head">
        <span className="bigflag">{country.flag}</span>
        <div>
          <p className="eyebrow">{country.system} NETWORK</p>
          <h1>{country.city}</h1>
          <p>Choose a line and begin your run.</p>
        </div>
      </section>
      <div className="line-list">
        {country.lines.map((l, i) => {
          const ok = unlockedLine(country, i, progress),
            p = progress[l.id];
          return (
            <button
              key={l.id}
              disabled={!ok}
              onClick={() => play(l)}
              className={"line-card " + (!ok ? "locked" : "")}
            >
              <span className="line-badge" style={{ background: l.color }}>
                {l.code}
              </span>
              <span>
                <b>{l.name}</b>
                <small>
                  {l.stations.length} stations · {l.stations[0]} →{" "}
                  {l.stations.at(-1)}
                </small>
              </span>
              <span className="line-score">
                {ok ? (
                  <>
                    <span>
                      {[1, 2, 3].map((x) => (
                        <i key={x} className={(p?.stars || 0) >= x ? "on" : ""}>
                          ★
                        </i>
                      ))}
                    </span>
                    <small>
                      {p ? `Best ${Math.round(p.wpm)} WPM` : "Ready to ride"}
                    </small>
                  </>
                ) : (
                  <>
                    <b>🔒</b>
                    <small>Earn a star on the previous line</small>
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </main>
  );
}

function LandmarkIcon({ type }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 0.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  if (type === "mountain")
    return (
      <>
        <path {...common} d="M-6 4L-1-3 1-1 4-5 8 4Z" />
        <path {...common} d="M-2-2L0 0 2-2" />
      </>
    );
  if (type === "tower" || type === "clocktower")
    return (
      <>
        <path {...common} d="M-2 5L-1-3 0-7 1-3 3 5M-3 5H4" />
        {type === "clocktower" && <circle {...common} cy="-1" r="1.2" />}
      </>
    );
  if (type === "twinTowers")
    return (
      <>
        <path
          {...common}
          d="M-5 5V-3L-4-6-3-3V5M2 5V-3L3-6 4-3V5M-3-1H2M-6 5H5"
        />
      </>
    );
  if (type === "bridge")
    return (
      <>
        <path
          {...common}
          d="M-8 4H8M-7 4V-2M7 4V-2M-7-1Q0 5 7-1M-8-3H-5M5-3H8"
        />
      </>
    );
  if (type === "wheel")
    return (
      <>
        <circle {...common} r="6" />
        <circle {...common} r="1" />
        <path {...common} d="M0-6V6M-6 0H6M-4-4L4 4M4-4L-4 4" />
      </>
    );
  if (type === "temple" || type === "castle")
    return (
      <>
        <path
          {...common}
          d="M-7 5H7M-5 5V0H5V5M-7 0H7L4-2H-4ZM-4-3H4L2-5H-2Z"
        />
      </>
    );
  if (type === "palace" || type === "memorial")
    return (
      <>
        <path
          {...common}
          d="M-8 5H8M-6 5V0H6V5M-8 0H8L5-3H-5ZM-3 1V5M0 1V5M3 1V5"
        />
      </>
    );
  if (type === "skyline" || type === "marina")
    return (
      <>
        <path
          {...common}
          d="M-8 5V0H-5V5M-4 5V-5H-1V5M0 5V-2H3V5M4 5V-6H7V5M-9 5H8"
        />
        {type === "marina" && <path {...common} d="M-5-6Q0-8 7-7" />}
      </>
    );
  if (type === "ferry" || type === "junk")
    return (
      <>
        <path {...common} d="M-7 2H7L4 5H-4ZM0 2V-5M0-4L6 0H0Z" />
        <path {...common} d="M-8 7Q-4 5 0 7T8 7" />
      </>
    );
  if (type === "torii")
    return (
      <>
        <path {...common} d="M-6 5V-3M6 5V-3M-8-4H8M-6-1H6" />
      </>
    );
  if (type === "skyscraper")
    return (
      <>
        <path
          {...common}
          d="M-3 6V-2H-2V-5H-1V-8H1V-5H2V-2H3V6ZM-5 6H5M-2 1H2M-2 3H2"
        />
      </>
    );
  if (type === "jewel")
    return (
      <>
        <ellipse {...common} rx="7" ry="4" />
        <path {...common} d="M-7 0Q0-8 7 0M-4 3Q0-2 4 3" />
      </>
    );
  if (type === "supertrees")
    return (
      <>
        <path {...common} d="M-4 6V-1M4 6V-2M-8-2Q-4-7 0-2M0-3Q4-8 8-3" />
      </>
    );
  if (type === "merlion")
    return (
      <>
        <path {...common} d="M-5 5Q-2 1-3-3L0-6 2-3Q6-1 5 5ZM1-1Q6-4 8-2" />
      </>
    );
  if (type === "lanterns")
    return (
      <>
        <path {...common} d="M-7-5H7M-5-5V-2M0-5V-1M5-5V-2" />
        <rect {...common} x="-7" y="-2" width="4" height="5" rx="1" />
        <rect {...common} x="-2" y="-1" width="4" height="5" rx="1" />
        <rect {...common} x="3" y="-2" width="4" height="5" rx="1" />
      </>
    );
  return <circle {...common} r="5" />;
}

function LandmarkLayer({ countryId }) {
  const country = countries.find((candidate) => candidate.id === countryId);
  return (
    <g className="landmarks" aria-hidden="true">
      {country?.landmarks.map((landmark) => (
        <g
          key={landmark.id}
          className="landmark"
          transform={`translate(${landmark.x} ${landmark.y}) scale(${landmark.scale})`}
        >
          <LandmarkIcon type={landmark.icon} />
          <text y="9" textAnchor="middle">
            {landmark.label}
          </text>
        </g>
      ))}
    </g>
  );
}

function routePath(points) {
  if (points.length < 2) return "";
  let d = `M${points[0]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)],
      p1 = points[i],
      p2 = points[i + 1],
      p3 = points[Math.min(points.length - 1, i + 2)];
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2}`;
  }
  return d;
}
function RouteMap({ line, index, bounce, celebrate }) {
  const pathRef = useRef(),
    [pts, setPts] = useState([]);
  // Singapore is much wider than it is tall. Fit its normalized transit
  // waypoints to the island's true aspect ratio instead of the full square.
  const displayShape =
    line.countryId === "sg"
      ? line.shape.map(([x, y]) => [10 + x * 0.8, 29 + y * 0.42])
      : line.shape;
  const d = routePath(displayShape);
  useEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const len = p.getTotalLength();
    setPts(
      line.stations.map((_, i) =>
        p.getPointAtLength((len * i) / (line.stations.length - 1)),
      ),
    );
  }, [line, d]);
  const cur = pts[index] || { x: 50, y: 50 },
    prev = pts[Math.max(0, index - 1)] || cur,
    flip = cur.x < prev.x;
  const countryFeature = worldGeo.features.find(
    (f) => f.properties.ADM0_A3 === mapMeta[line.countryId]?.iso,
  );
  const viewX = line.countryId === "sg" ? 0 : Math.max(-2, cur.x - 50),
    viewY = line.countryId === "sg" ? 7 : Math.max(-2, cur.y - 43),
    viewHeight = line.countryId === "sg" ? 78 : 86,
    vb = `${viewX} ${viewY} 100 ${viewHeight}`;
  return (
    <div className="map-wrap">
      <svg className="map" viewBox={vb} aria-label={`${line.name} route map`}>
        <defs>
          <pattern id="grid" width="6" height="6" patternUnits="userSpaceOnUse">
            <path
              d="M6 0H0V6"
              fill="none"
              stroke="#fff"
              strokeOpacity=".18"
              strokeWidth=".25"
            />
          </pattern>
          <filter id="shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity=".25" />
          </filter>
        </defs>
        <rect
          x={viewX - 5}
          y={viewY - 5}
          width="110"
          height={viewHeight + 10}
          fill="#a8d6df"
        />
        <rect
          x={viewX - 5}
          y={viewY - 5}
          width="110"
          height={viewHeight + 10}
          fill="url(#grid)"
        />
        <path className="land" d={featurePath(countryFeature, true)} />
        <LandmarkLayer countryId={line.countryId} />
        <text x={viewX + 7} y={viewY + 11} className="map-label">
          {line.city} · {line.name}
        </text>
        <g
          className="compass"
          transform={`translate(${viewX + 92} ${viewY + 12})`}
        >
          <circle r="5" />
          <path d="M0-4L1 0 0 4-1 0Z" />
          <text y="-6">N</text>
        </g>
        <path d={d} className="route-case" />
        <path
          ref={pathRef}
          d={d}
          className="route"
          style={{ stroke: line.color }}
        />
        {pts.map((p, i) => (
          <g
            key={i}
            className={
              "stop " + (i < index ? "visited" : i === index ? "current" : "")
            }
            transform={`translate(${p.x} ${p.y})`}
          >
            <circle
              r={i === index ? 2.2 : 1.35}
              style={i <= index ? { fill: line.color } : {}}
            />
            {i < index && (
              <text className="check" textAnchor="middle" y=".7">
                ✓
              </text>
            )}
            {(i === index ||
              i === 0 ||
              i === line.stations.length - 1 ||
              i % 3 === 0) && (
              <text
                className="station-label"
                textAnchor="middle"
                y={i % 2 ? 5 : -3.5}
              >
                {line.stations[i]}
              </text>
            )}
          </g>
        ))}
        {pts.length > 0 && (
          <g
            className={`train ${bounce ? "chug" : ""} ${celebrate ? "party" : ""}`}
            style={{ transformOrigin: `${cur.x}px ${cur.y}px` }}
            transform={`translate(${cur.x} ${cur.y - 4}) scale(${flip ? -1 : 1} 1)`}
          >
            <Train />
          </g>
        )}
      </svg>
      {celebrate && <div className="confetti">✦ ★ ✦</div>}
    </div>
  );
}
function Train() {
  return (
    <g filter="url(#shadow)">
      <g className="steam">
        <circle cx="-1" cy="-9" r="1" />
        <circle cx="1" cy="-12" r="1.4" />
      </g>
      <rect
        x="-5"
        y="-5"
        width="10"
        height="6.5"
        rx="2"
        fill="#fff7dc"
        stroke="#173c4c"
        strokeWidth=".7"
      />
      <rect x="1.5" y="-8" width="2" height="3" rx=".4" fill="#173c4c" />
      <rect x="-3.6" y="-4" width="2.5" height="2" rx=".5" fill="#9ed9e5" />
      <circle cx="2.3" cy="-2.5" r=".5" fill="#173c4c" />
      <circle cx="4" cy="-2.5" r=".5" fill="#173c4c" />
      <path
        d="M2.3-1 Q3.1-.2 4-1"
        fill="none"
        stroke="#173c4c"
        strokeWidth=".4"
      />
      <circle cx="-3" cy="2" r="1.2" fill="#173c4c" />
      <circle cx="3" cy="2" r="1.2" fill="#173c4c" />
    </g>
  );
}

function Game({ line, audio, done, back, progress, play }) {
  const [idx, setIdx] = useState(0),
    [pos, setPos] = useState(0),
    [correct, setCorrect] = useState(0),
    [errors, setErrors] = useState(0),
    [start, setStart] = useState(null),
    [shake, setShake] = useState(false),
    [bounce, setBounce] = useState(false),
    [result, setResult] = useState(null);
  const input = useRef(),
    posNow = useRef(0),
    correctNow = useRef(0),
    errorsNow = useRef(0),
    startNow = useRef(null);
  const station = line.stations[idx],
    target = clean(station);
  useEffect(() => input.current?.focus(), [idx]);
  const type = (e) => {
    // Some browsers briefly report the full hidden-input value during very
    // rapid typing. The newest character is the only one not yet processed.
    const raw = e.target.value.slice(-1);
    for (const char of raw) {
      if (!/[a-zA-Z0-9]/.test(char)) continue;
      const begun = startNow.current || Date.now();
      if (!startNow.current) {
        startNow.current = begun;
        setStart(begun);
      }
      if (clean(char) === target[posNow.current]) {
        audio.play("click");
        correctNow.current++;
        setCorrect(correctNow.current);
        if (posNow.current + 1 === target.length) {
          if (line.id === "jp-yama" && line.easterEgg) {
            audio.playArrival({
              lineId: line.id,
              stationIndex: Math.min(idx + 1, line.stations.length - 1),
            });
          } else {
            audio.play("ding");
          }
          setBounce(true);
          setTimeout(() => setBounce(false), 420);
          if (idx + 1 === line.stations.length) {
            const elapsed = Math.max((Date.now() - begun) / 60000, 1 / 600),
              c = correctNow.current,
              acc = (c / (c + errorsNow.current)) * 100,
              wpm = c / 5 / elapsed,
              stars = starsFor(acc, wpm),
              res = { accuracy: acc, wpm, stars, errors: errorsNow.current };
            setTimeout(() => {
              audio.play("fanfare");
              setResult(res);
              done(res);
            }, 300);
          } else {
            posNow.current = 0;
            setIdx((i) => i + 1);
            setPos(0);
          }
        } else {
          posNow.current++;
          setPos(posNow.current);
        }
      } else {
        audio.play("error");
        errorsNow.current++;
        setErrors(errorsNow.current);
        setShake(false);
        requestAnimationFrame(() => setShake(true));
        setTimeout(() => setShake(false), 300);
      }
    }
  };
  useEffect(() => {
    const onKey = (e) => {
      if (/^[a-z0-9]$/i.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        type({ target: { value: e.key } });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, idx]);
  const nextLine = () => {
    const ci = countries.findIndex((c) => c.id === line.countryId),
      c = countries[ci],
      li = c.lines.findIndex((l) => l.id === line.id);
    if (li < c.lines.length - 1) {
      play(c.lines[li + 1]);
    } else if (ci < countries.length - 1) {
      back();
    }
  };
  return (
    <main className="play">
      <div className="play-top">
        <button className="back mapback" onClick={back}>
          ← Lines
        </button>
        <div className="run-metrics">
          <span>
            <b>{errors}</b> errors
          </span>
          <span>
            <b>{idx}</b> stops
          </span>
        </div>
      </div>
      <RouteMap line={line} index={idx} bounce={bounce} celebrate={!!result} />
      <section className="typing-card" onClick={() => input.current?.focus()}>
        <div className="station-progress">
          <span>
            STATION {idx + 1} OF {line.stations.length}
          </span>
          <span>
            {Math.round((idx / (line.stations.length - 1)) * 100)}% COMPLETE
          </span>
        </div>
        <div className="progressbar">
          <i
            style={{
              width: `${(idx / (line.stations.length - 1)) * 100}%`,
              background: line.color,
            }}
          />
        </div>
        <p className="hint">Next stop</p>
        <div className={"word " + (shake ? "shake" : "")} aria-label={station}>
          {station.split("").map((ch, i) => {
            const normalizedBefore = clean(station.slice(0, i)).length,
              isPunct = !clean(ch);
            return (
              <span
                key={i}
                className={
                  isPunct
                    ? normalizedBefore <= pos
                      ? "typed"
                      : "pending"
                    : normalizedBefore < pos
                      ? "typed"
                      : normalizedBefore === pos
                        ? "caret"
                        : "pending"
                }
                style={normalizedBefore < pos ? { color: line.color } : {}}
              >
                {ch}
              </span>
            );
          })}
        </div>
        <p className="instruction">Type the station name to move the train</p>
        <input
          ref={input}
          className="capture"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="off"
          onChange={type}
          aria-label={`Type ${station}`}
        />
      </section>
      {result && (
        <Results
          result={result}
          line={line}
          retry={() => location.reload()}
          back={back}
          next={nextLine}
          hasNext={result.stars > 0}
        />
      )}
    </main>
  );
}

function Results({ result, line, retry, back, next, hasNext }) {
  const nextTier =
    result.stars === 0
      ? "85% accuracy for 1 star"
      : result.stars === 1
        ? "92% accuracy + 22 WPM for 2 stars"
        : result.stars === 2
          ? "97% accuracy + 35 WPM for 3 stars"
          : "Perfect route mastered!";
  return (
    <div className="modal-bg">
      <div className="results" role="dialog" aria-modal="true">
        <p className="eyebrow">TERMINUS REACHED</p>
        <h2>Route complete!</h2>
        <p>
          {line.stations[0]} → {line.stations.at(-1)}
        </p>
        <div className="result-stars">
          {[1, 2, 3].map((x, i) => (
            <span
              key={x}
              className={result.stars >= x ? "won" : ""}
              style={{ animationDelay: `${i * 0.18}s` }}
            >
              ★
            </span>
          ))}
        </div>
        <div className="result-grid">
          <div>
            <b>{Math.round(result.wpm)}</b>
            <small>WPM</small>
          </div>
          <div>
            <b>{result.accuracy.toFixed(1)}%</b>
            <small>ACCURACY</small>
          </div>
          <div>
            <b>{result.errors}</b>
            <small>ERRORS</small>
          </div>
        </div>
        <div className="next-tier">
          <span>Next milestone</span>
          <b>{nextTier}</b>
        </div>
        <div className="result-actions">
          <button onClick={retry}>Retry</button>
          <button onClick={back}>Line list</button>
          {hasNext && (
            <button className="primary" onClick={next}>
              Next line →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Leaderboard({ rows, settings, setSettings, back }) {
  return (
    <main className="shell leaderboard">
      <button className="back" onClick={back}>
        ← World map
      </button>
      <p className="eyebrow">GLOBAL SIGNAL BOARD</p>
      <h1>Top drivers</h1>
      <p>V1 uses a local mock leaderboard. Your score stays on this device.</p>
      <label className="name-label">
        Driver name
        <input
          value={settings.name}
          maxLength="18"
          onChange={(e) => setSettings((s) => ({ ...s, name: e.target.value }))}
        />
      </label>
      <div className="board">
        <div className="board-row board-head">
          <span>Rank</span>
          <span>Driver</span>
          <span>Stars</span>
          <span>Best WPM</span>
        </div>
        {rows.map((r, i) => (
          <div
            key={r.id}
            className={"board-row " + (r.id === playerId() ? "me" : "")}
          >
            <span>{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
            <b>
              {r.name}
              {r.id === playerId() ? " (you)" : ""}
            </b>
            <span>★ {r.totalStars}</span>
            <span>{Math.round(r.bestWpm)}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
