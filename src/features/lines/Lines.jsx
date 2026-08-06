import { isLineUnlocked } from "../world/progression";

export default function Lines({ country, progress, back, play }) {
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
          const ok = isLineUnlocked(country, i, progress),
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
