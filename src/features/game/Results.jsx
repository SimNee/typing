export default function Results({ result, line, retry, back, primaryAction }) {
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
          <button className="primary" onClick={primaryAction.run}>
            {primaryAction.label}
          </button>
        </div>
      </div>
    </div>
  );
}
