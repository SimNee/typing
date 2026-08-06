import { lazy, Suspense, useEffect, useState } from "react";
import { countries } from "./data";
import { useAudioEngine } from "./features/audio/useAudioEngine";
import EasterEggPrompt from "./shared/EasterEggPrompt";
import { normalizeTypingText } from "./shared/text";
import {
  leaderboardStore,
  loadProgress,
  loadSettings,
  playerId,
  saveProgress,
  saveSettings,
} from "./storage";

const World = lazy(() => import("./features/world/World"));
const Lines = lazy(() => import("./features/lines/Lines"));
const Game = lazy(() => import("./features/game/Game"));
const Leaderboard = lazy(() => import("./features/leaderboard/Leaderboard"));

export default function App() {
  const [screen, setScreen] = useState("world");
  const [country, setCountry] = useState(null);
  const [line, setLine] = useState(null);
  const [eggPrompt, setEggPrompt] = useState(null);
  const [progress, setProgress] = useState(loadProgress);
  const [settings, setSettings] = useState(() => ({
    muted: false,
    name: "Driver",
    ...loadSettings(),
  }));
  const [rows, setRows] = useState([]);
  const audio = useAudioEngine({ muted: settings.muted });

  useEffect(() => saveSettings(settings), [settings]);

  const navigate = (nextScreen) => {
    setScreen(nextScreen);
    scrollTo(0, 0);
  };

  const openCountry = (selectedCountry) => {
    if (selectedCountry.id === "jp") {
      setEggPrompt(selectedCountry);
      return;
    }
    setCountry(selectedCountry);
    navigate("lines");
  };

  const playLine = (selectedLine) => {
    setLine({
      ...selectedLine,
      countryId: country.id,
      country: country.name,
      city: country.city,
    });
    navigate("play");
  };

  const answerEasterEgg = (answer) => {
    if (normalizeTypingText(answer || "") !== "minecraft") {
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
    navigate("play");
  };

  const finishLine = async (result) => {
    const previous = progress[line.id] || {};
    const nextProgress = {
      ...progress,
      [line.id]: {
        stars: Math.max(previous.stars || 0, result.stars),
        wpm: Math.max(previous.wpm || 0, result.wpm),
        accuracy: Math.max(previous.accuracy || 0, result.accuracy),
      },
    };
    setProgress(nextProgress);
    saveProgress(nextProgress);

    const totalStars = Object.values(nextProgress).reduce(
      (total, entry) => total + (entry.stars || 0),
      0,
    );
    const bestWpm = Math.max(
      0,
      ...Object.values(nextProgress).map((entry) => entry.wpm || 0),
    );
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
    navigate("leaderboard");
  };

  return (
    <div className="app">
      <header>
        <button
          className="brand"
          onClick={() => navigate("world")}
          aria-label="TypeRail home"
        >
          <span>🚇</span> TypeRail
        </button>
        <nav>
          <button onClick={() => navigate("world")}>Explore</button>
          <button onClick={showLeaderboard}>Leaderboard</button>
          <button
            className="icon"
            onClick={() =>
              setSettings((current) => ({
                ...current,
                muted: !current.muted,
              }))
            }
            aria-label={settings.muted ? "Unmute" : "Mute"}
          >
            {settings.muted ? "🔇" : "🔊"}
          </button>
        </nav>
      </header>

      <Suspense
        fallback={
          <main className="shell loading-screen" aria-live="polite">
            Loading TypeRail…
          </main>
        }
      >
        {screen === "world" && <World progress={progress} open={openCountry} />}
        {screen === "lines" && (
          <Lines
            country={country}
            progress={progress}
            back={() => navigate("world")}
            play={playLine}
          />
        )}
        {screen === "play" && (
          <Game
            key={line.id}
            line={line}
            audio={audio}
            done={finishLine}
            back={() => navigate("lines")}
            explore={() => navigate("world")}
            play={playLine}
          />
        )}
        {screen === "leaderboard" && (
          <Leaderboard
            rows={rows}
            settings={settings}
            setSettings={setSettings}
            back={() => navigate("world")}
          />
        )}
      </Suspense>
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
