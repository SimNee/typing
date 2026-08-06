import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  leaderboardStore,
  loadProgress,
  loadSettings,
  saveProgress,
  saveSettings,
} from "./storage";

const createStorage = () => {
  const values = new Map();
  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, String(value))),
    removeItem: vi.fn((key) => values.delete(key)),
    clear: vi.fn(() => values.clear()),
  };
};

describe("local storage", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
  });

  it("loads defaults when values are missing", () => {
    expect(loadProgress()).toEqual({});
    expect(loadSettings()).toEqual({});
  });

  it("round-trips progress and settings", () => {
    saveProgress({ line: { stars: 2 } });
    saveSettings({ muted: true });
    expect(loadProgress()).toEqual({ line: { stars: 2 } });
    expect(loadSettings()).toEqual({ muted: true });
  });

  it("recovers from malformed progress and settings", () => {
    localStorage.setItem("typerail-progress-v1", "{broken");
    localStorage.setItem("typerail-settings-v1", "{broken");
    expect(loadProgress()).toEqual({});
    expect(loadSettings()).toEqual({});
  });

  it("retains demo rows when local scores are malformed", async () => {
    localStorage.setItem("typerail-leaderboard-v1", "{broken");
    const rows = await leaderboardStore.getLeaderboard();
    expect(rows).toHaveLength(3);
    expect(rows[0].name).toBe("MetroMaven");
  });

  it("replaces malformed scores when submitting", async () => {
    localStorage.setItem("typerail-leaderboard-v1", "{broken");
    await leaderboardStore.submitScore({
      id: "driver",
      name: "Driver",
      totalStars: 1,
      bestWpm: 20,
      timestamp: 1,
    });
    expect(JSON.parse(localStorage.getItem("typerail-leaderboard-v1"))).toEqual(
      [expect.objectContaining({ id: "driver" })],
    );
  });
});
