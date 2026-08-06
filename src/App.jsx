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
  const ctx = useRef();
  return useMemo(
    () => ({
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
        notes &&
          (kind === "ding" || kind === "fanfare"
            ? [0, kind === "ding" ? 4 : 7, 12]
            : [0]
          ).forEach((n, i) => {
            const o = c.createOscillator(),
              g = c.createGain();
            o.type = notes[2];
            o.frequency.value = notes[0] * 2 ** (n / 12);
            g.gain.setValueAtTime(0.09, now + i * 0.1);
            g.gain.exponentialRampToValueAtTime(
              0.001,
              now + i * 0.1 + notes[1],
            );
            o.connect(g).connect(c.destination);
            o.start(now + i * 0.1);
            o.stop(now + i * 0.1 + notes[1]);
          });
      },
    }),
    [muted],
  );
}

export default function App() {
  const [screen, setScreen] = useState("world"),
    [country, setCountry] = useState(null),
    [line, setLine] = useState(null);
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
    setCountry(c);
    nav("lines");
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
      <footer>Ride the rails. Master the keys.</footer>
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
            [x, y] = mercator([mapMeta[c.id].lon, mapMeta[c.id].lat]);
          return (
            <g
              key={c.id}
              className={`map-pin ${ok ? "" : "pin-locked"}`}
              transform={`translate(${x} ${y})`}
              onClick={() => ok && open(c)}
              role="button"
              tabIndex={ok ? 0 : -1}
              onKeyDown={(e) => {
                if (ok && (e.key === "Enter" || e.key === " ")) open(c);
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
                className={"country-card " + (!ok ? "locked" : "")}
                disabled={!ok}
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
  const vb =
    line.countryId === "sg"
      ? "0 7 100 78"
      : `${Math.max(-2, cur.x - 50)} ${Math.max(-2, cur.y - 43)} 100 86`;
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
        <rect x="-5" y="-5" width="115" height="110" fill="#a8d6df" />
        <rect x="-5" y="-5" width="115" height="110" fill="url(#grid)" />
        <path className="land" d={featurePath(countryFeature, true)} />
        <text x="7" y="11" className="map-label">
          {line.city} · {line.name}
        </text>
        <g className="compass" transform="translate(92 12)">
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
          audio.play("ding");
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
