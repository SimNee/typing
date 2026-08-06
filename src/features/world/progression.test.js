import { describe, expect, it } from "vitest";
import { countries } from "../../data";
import { isCountryUnlocked, isLineUnlocked } from "./progression";

describe("progression", () => {
  it("always unlocks the first country and line", () => {
    expect(isCountryUnlocked(0, {})).toBe(true);
    expect(isLineUnlocked(countries[0], 0, {})).toBe(true);
  });

  it("requires every line in the preceding country to earn a star", () => {
    const complete = Object.fromEntries(
      countries[0].lines.map((line) => [line.id, { stars: 1 }]),
    );
    expect(isCountryUnlocked(1, complete)).toBe(true);
    expect(
      isCountryUnlocked(1, {
        ...complete,
        [countries[0].lines.at(-1).id]: { stars: 0 },
      }),
    ).toBe(false);
  });

  it("requires a star on the preceding line", () => {
    const country = countries[0];
    expect(isLineUnlocked(country, 1, {})).toBe(false);
    expect(
      isLineUnlocked(country, 1, {
        [country.lines[0].id]: { stars: 1 },
      }),
    ).toBe(true);
  });
});
