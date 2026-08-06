const PROGRESS = "typerail-progress-v1";
const SETTINGS = "typerail-settings-v1";
const SCORES = "typerail-leaderboard-v1";
const PLAYER_ID = "typerail-player-id";

const readJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
};

export const loadProgress = () => readJson(PROGRESS, {});
export const saveProgress = (progress) =>
  localStorage.setItem(PROGRESS, JSON.stringify(progress));
export const loadSettings = () => readJson(SETTINGS, {});
export const saveSettings = (settings) =>
  localStorage.setItem(SETTINGS, JSON.stringify(settings));

export const playerId = () => {
  let id = localStorage.getItem(PLAYER_ID);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID, id);
  }
  return id;
};

const demo = [
  {
    id: "demo1",
    name: "MetroMaven",
    totalStars: 34,
    bestWpm: 72,
    timestamp: 1,
  },
  {
    id: "demo2",
    name: "KeyConductor",
    totalStars: 27,
    bestWpm: 64,
    timestamp: 2,
  },
  {
    id: "demo3",
    name: "SignalSwift",
    totalStars: 19,
    bestWpm: 58,
    timestamp: 3,
  },
];

export const leaderboardStore = {
  async getLeaderboard() {
    return [...demo, ...readJson(SCORES, [])].sort(
      (a, b) => b.totalStars - a.totalStars || b.bestWpm - a.bestWpm,
    );
  },
  async submitScore(score) {
    const rows = readJson(SCORES, []).filter((row) => row.id !== score.id);
    rows.push(score);
    localStorage.setItem(SCORES, JSON.stringify(rows));
  },
};
