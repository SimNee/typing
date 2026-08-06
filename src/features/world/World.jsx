import { countries } from "../../data";
import { featurePath, mapMeta, mercator } from "./geo";
import { isCountryUnlocked } from "./progression";
import { useWorldGeo } from "./useWorldGeo";

function WorldMap({ progress, open }) {
  const worldGeo = useWorldGeo();
  return (
    <div className="world-map-wrap">
      <svg
        className="world-map"
        viewBox="0 35 1000 390"
        role="img"
        aria-label="World map of TypeRail destinations"
      >
        <g className="countries-shape">
          {worldGeo?.features.map((f, i) => (
            <path key={i} d={featurePath(f)} />
          ))}
        </g>
        {countries.map((c, i) => {
          const ok = isCountryUnlocked(i, progress),
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

export default function World({ progress, open }) {
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
            {countries.filter((_, i) => isCountryUnlocked(i, progress)).length}{" "}
            / {countries.length} unlocked
          </span>
        </div>
        <WorldMap progress={progress} open={open} />
        <div className="country-grid">
          {countries.map((c, i) => {
            const ok = isCountryUnlocked(i, progress),
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
