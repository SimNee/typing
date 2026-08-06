import { useCallback, useEffect, useRef, useState } from "react";
import { countries } from "../../data";
import { normalizeTypingText } from "../../shared/text";
import RouteMap from "./RouteMap";
import Results from "./Results";
import { calculateStars, getPostRouteAction } from "./rules";

export default function Game({ line, audio, done, back, explore, play }) {
  const [idx, setIdx] = useState(0),
    [pos, setPos] = useState(0),
    [errors, setErrors] = useState(0),
    [shake, setShake] = useState(false),
    [bounce, setBounce] = useState(false),
    [result, setResult] = useState(null);
  const input = useRef(),
    posNow = useRef(0),
    correctNow = useRef(0),
    errorsNow = useRef(0),
    startNow = useRef(null);
  const station = line.stations[idx],
    target = normalizeTypingText(station);
  useEffect(() => input.current?.focus(), [idx]);
  const type = useCallback(
    (e) => {
      // Some browsers briefly report the full hidden-input value during very
      // rapid typing. The newest character is the only one not yet processed.
      const raw = e.target.value.slice(-1);
      for (const char of raw) {
        if (!/[a-zA-Z0-9]/.test(char)) continue;
        const begun = startNow.current || Date.now();
        if (!startNow.current) {
          startNow.current = begun;
        }
        if (normalizeTypingText(char) === target[posNow.current]) {
          audio.play("click");
          correctNow.current++;
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
                stars = calculateStars(acc, wpm),
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
    },
    [audio, done, idx, line, target],
  );
  useEffect(() => {
    const onKey = (e) => {
      if (e.target === input.current) return;
      if (/^[a-z0-9]$/i.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        type({ target: { value: e.key } });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [type]);
  const postRouteAction = getPostRouteAction(countries, line, result?.stars);
  const primaryAction = {
    label: postRouteAction.label,
    run: () => {
      if (postRouteAction.type === "next-line") {
        play(postRouteAction.line);
      } else {
        explore();
      }
    },
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
            const normalizedBefore = normalizeTypingText(
                station.slice(0, i),
              ).length,
              isPunct = !normalizeTypingText(ch);
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
          primaryAction={primaryAction}
        />
      )}
    </main>
  );
}
