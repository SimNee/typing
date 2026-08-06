import { describe, expect, it } from "vitest";
import { calculateStars, getPostRouteAction } from "./rules";

describe("calculateStars", () => {
  it.each([
    [84.99, 100, 0],
    [85, 0, 1],
    [91.99, 100, 1],
    [92, 21.99, 1],
    [92, 22, 2],
    [96.99, 100, 2],
    [97, 34.99, 2],
    [97, 35, 3],
  ])("returns %i stars for %f%% accuracy at %f WPM", (accuracy, wpm, stars) => {
    expect(calculateStars(accuracy, wpm)).toBe(stars);
  });
});

describe("getPostRouteAction", () => {
  const countries = [
    {
      id: "test",
      lines: [
        { id: "first", countryId: "test" },
        { id: "last", countryId: "test" },
      ],
    },
  ];

  it("selects the next line within a country", () => {
    expect(getPostRouteAction(countries, countries[0].lines[0])).toEqual({
      type: "next-line",
      label: "Next line →",
      line: countries[0].lines[1],
    });
  });

  it("returns to world exploration after the final line", () => {
    expect(getPostRouteAction(countries, countries[0].lines[1])).toEqual({
      type: "explore-world",
      label: "Explore world →",
    });
  });

  it("does not bypass a locked next line after earning no stars", () => {
    expect(getPostRouteAction(countries, countries[0].lines[0], 0)).toEqual({
      type: "explore-world",
      label: "Explore world →",
    });
  });

  it("safely returns to world exploration for an unknown line", () => {
    expect(
      getPostRouteAction(countries, { id: "missing", countryId: "test" }),
    ).toEqual({
      type: "explore-world",
      label: "Explore world →",
    });
  });
});
