import { countries } from "../../data";

export function isCountryUnlocked(index, progress) {
  return (
    index === 0 ||
    countries[index - 1].lines.every(
      (line) => (progress[line.id]?.stars || 0) > 0,
    )
  );
}

export function isLineUnlocked(country, index, progress) {
  return index === 0 || (progress[country.lines[index - 1].id]?.stars || 0) > 0;
}
