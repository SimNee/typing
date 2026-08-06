export const calculateStars = (accuracy, wpm) =>
  accuracy >= 97 && wpm >= 35
    ? 3
    : accuracy >= 92 && wpm >= 22
      ? 2
      : accuracy >= 85
        ? 1
        : 0;

export function getPostRouteAction(countries, line, earnedStars = 1) {
  const country = countries.find(
    (candidate) => candidate.id === line.countryId,
  );
  const lineIndex =
    country?.lines.findIndex((candidate) => candidate.id === line.id) ?? -1;
  const nextLine = lineIndex >= 0 ? country.lines[lineIndex + 1] : undefined;
  return nextLine && earnedStars > 0
    ? { type: "next-line", label: "Next line →", line: nextLine }
    : { type: "explore-world", label: "Explore world →" };
}
