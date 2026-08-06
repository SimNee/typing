import { playerId } from "../../storage";

export default function Leaderboard({ rows, settings, setSettings, back }) {
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
