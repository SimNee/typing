import { describe, expect, it } from "vitest";
import { normalizeTypingText } from "./text";

describe("normalizeTypingText", () => {
  it.each([
    ["Dhoby Ghaut", "dhobyghaut"],
    ["one-north", "onenorth"],
    ["Raffles Place!", "rafflesplace"],
    ["École 42", "ecole42"],
    ["SÃO PAULO", "saopaulo"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeTypingText(input)).toBe(expected);
  });
});
