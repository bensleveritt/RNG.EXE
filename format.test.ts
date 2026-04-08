import { assertEquals, assertStrictEquals } from "jsr:@std/assert@^1";
import { formatError, formatRollResult, totalTier } from "./format.ts";
import type { RollResult } from "./dice.ts";

function fakeResult(overrides: Partial<RollResult> = {}): RollResult {
  return {
    expression: "2d6+1",
    groups: [
      {
        sign: 1,
        count: 2,
        sides: 6,
        rolls: [5, 4],
        subtotal: 9,
      },
    ],
    modifier: 1,
    total: 10,
    minPossible: 3,
    maxPossible: 13,
    ...overrides,
  };
}

Deno.test("totalTier: critMax when total equals max", () => {
  assertStrictEquals(totalTier(13, 3, 13), "critMax");
});

Deno.test("totalTier: critMin when total equals min", () => {
  assertStrictEquals(totalTier(3, 3, 13), "critMin");
});

Deno.test("totalTier: high in top 25%", () => {
  assertStrictEquals(totalTier(11, 3, 13), "high");
  assertStrictEquals(totalTier(12, 3, 13), "high");
});

Deno.test("totalTier: mid in middle 50%", () => {
  assertStrictEquals(totalTier(6, 3, 13), "mid");
  assertStrictEquals(totalTier(8, 3, 13), "mid");
  assertStrictEquals(totalTier(10, 3, 13), "mid");
});

Deno.test("totalTier: low in bottom 25%", () => {
  assertStrictEquals(totalTier(4, 3, 13), "low");
  assertStrictEquals(totalTier(5, 3, 13), "low");
});

Deno.test("totalTier: flat when min equals max", () => {
  assertStrictEquals(totalTier(7, 7, 7), "flat");
});

Deno.test("totalTier: 1d20 examples", () => {
  assertStrictEquals(totalTier(20, 1, 20), "critMax");
  assertStrictEquals(totalTier(1, 1, 20), "critMin");
  assertStrictEquals(totalTier(16, 1, 20), "high");
  assertStrictEquals(totalTier(10, 1, 20), "mid");
  assertStrictEquals(totalTier(5, 1, 20), "low");
});

Deno.test("formatRollResult: wraps in ansi code block", () => {
  const out = formatRollResult("Koroviev", fakeResult());
  assertEquals(out.startsWith("```ansi\n"), true);
  assertEquals(out.endsWith("\n```"), true);
});

Deno.test("formatRollResult: includes user name and expression", () => {
  const out = formatRollResult("Koroviev", fakeResult());
  assertEquals(out.includes("Koroviev"), true);
  assertEquals(out.includes("2d6+1"), true);
});

Deno.test("formatRollResult: includes individual dice rolls", () => {
  const out = formatRollResult("Koroviev", fakeResult());
  assertEquals(out.includes("5"), true);
  assertEquals(out.includes("4"), true);
});

Deno.test("formatRollResult: includes total", () => {
  const out = formatRollResult("Koroviev", fakeResult());
  assertEquals(out.includes("TOTAL"), true);
  assertEquals(out.includes("10"), true);
});

Deno.test("formatRollResult: omits mod line when modifier is 0", () => {
  const out = formatRollResult(
    "Koroviev",
    fakeResult({ modifier: 0, expression: "2d6", total: 9, minPossible: 2, maxPossible: 12 }),
  );
  assertEquals(out.includes("mod"), false);
});

Deno.test("formatRollResult: shows positive modifier with + sign", () => {
  const out = formatRollResult("Koroviev", fakeResult({ modifier: 2 }));
  assertEquals(out.includes("+2"), true);
});

Deno.test("formatRollResult: shows negative modifier with - sign", () => {
  const out = formatRollResult(
    "Koroviev",
    fakeResult({ modifier: -2, expression: "2d6-2", minPossible: 0, maxPossible: 10 }),
  );
  assertEquals(out.includes("-2"), true);
});

Deno.test("formatError: wraps in ansi code block", () => {
  const out = formatError("Koroviev", "garbage", "Can't parse `garbage`.");
  assertEquals(out.startsWith("```ansi\n"), true);
  assertEquals(out.endsWith("\n```"), true);
});

Deno.test("formatError: includes user, expression, and message", () => {
  const out = formatError("Koroviev", "garbage", "Bad input");
  assertEquals(out.includes("Koroviev"), true);
  assertEquals(out.includes("ERROR"), true);
  assertEquals(out.includes("garbage"), true);
  assertEquals(out.includes("Bad input"), true);
});
