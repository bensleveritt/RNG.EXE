import { assertEquals, assertStrictEquals } from "jsr:@std/assert@^1";
import { formatError, formatRollResult, rollTier } from "./format.ts";
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

function pbtaResult(modifier: number, total: number): RollResult {
  return fakeResult({
    expression: `2d6${modifier >= 0 ? "+" : ""}${modifier}`,
    modifier,
    total,
    minPossible: 2 + modifier,
    maxPossible: 12 + modifier,
  });
}

function d20Result(total: number): RollResult {
  return {
    expression: "1d20",
    groups: [{ sign: 1, count: 1, sides: 20, rolls: [total], subtotal: total }],
    modifier: 0,
    total,
    minPossible: 1,
    maxPossible: 20,
  };
}

Deno.test("rollTier PbtA 2d6: boxcars (12) is critMax", () => {
  assertStrictEquals(rollTier(pbtaResult(0, 12)), "critMax");
});

Deno.test("rollTier PbtA 2d6: snake eyes (2) is critMin", () => {
  assertStrictEquals(rollTier(pbtaResult(0, 2)), "critMin");
});

Deno.test("rollTier PbtA 2d6: 10+ is strong hit (high)", () => {
  assertStrictEquals(rollTier(pbtaResult(0, 10)), "high");
  assertStrictEquals(rollTier(pbtaResult(0, 11)), "high");
});

Deno.test("rollTier PbtA 2d6: 7-9 is weak hit (mid)", () => {
  assertStrictEquals(rollTier(pbtaResult(0, 7)), "mid");
  assertStrictEquals(rollTier(pbtaResult(0, 8)), "mid");
  assertStrictEquals(rollTier(pbtaResult(0, 9)), "mid");
});

Deno.test("rollTier PbtA 2d6: 6- is miss (low)", () => {
  assertStrictEquals(rollTier(pbtaResult(0, 6)), "low");
  assertStrictEquals(rollTier(pbtaResult(0, 5)), "low");
  assertStrictEquals(rollTier(pbtaResult(0, 4)), "low");
  assertStrictEquals(rollTier(pbtaResult(0, 3)), "low");
});

Deno.test("rollTier PbtA 2d6+1: 10 is strong hit (high), not mid", () => {
  assertStrictEquals(rollTier(pbtaResult(1, 10)), "high");
});

Deno.test("rollTier PbtA 2d6+1: 13 (max) is critMax", () => {
  assertStrictEquals(rollTier(pbtaResult(1, 13)), "critMax");
});

Deno.test("rollTier PbtA 2d6+1: 3 (min) is critMin", () => {
  assertStrictEquals(rollTier(pbtaResult(1, 3)), "critMin");
});

Deno.test("rollTier PbtA 2d6+5: min total (7) is mid not critMin", () => {
  // 2d6+5 cant miss; min is 7 which is a weak hit, so dont show critMin
  assertStrictEquals(rollTier(pbtaResult(5, 7)), "mid");
});

Deno.test("rollTier PbtA 2d6+5: max total (17) is critMax", () => {
  assertStrictEquals(rollTier(pbtaResult(5, 17)), "critMax");
});

Deno.test("rollTier PbtA 2d6-3: max total (9) is mid not critMax", () => {
  // 2d6-3 max is 9 which is only a weak hit, so dont show critMax
  assertStrictEquals(rollTier(pbtaResult(-3, 9)), "mid");
});

Deno.test("rollTier PbtA 2d6-3: 6 is low (miss)", () => {
  assertStrictEquals(rollTier(pbtaResult(-3, 6)), "low");
});

Deno.test("rollTier PbtA 2d6-3: -1 (min) is critMin", () => {
  assertStrictEquals(rollTier(pbtaResult(-3, -1)), "critMin");
});

Deno.test("rollTier non-PbtA 1d20: percentile-based, not PbtA bands", () => {
  assertStrictEquals(rollTier(d20Result(20)), "critMax");
  assertStrictEquals(rollTier(d20Result(1)), "critMin");
  assertStrictEquals(rollTier(d20Result(16)), "high"); // 79%
  assertStrictEquals(rollTier(d20Result(10)), "mid"); // 47%
  assertStrictEquals(rollTier(d20Result(5)), "low"); // 21%
});

Deno.test("rollTier non-PbtA 3d6: not treated as PbtA", () => {
  const r: RollResult = {
    expression: "3d6",
    groups: [{ sign: 1, count: 3, sides: 6, rolls: [4, 4, 4], subtotal: 12 }],
    modifier: 0,
    total: 12,
    minPossible: 3,
    maxPossible: 18,
  };
  // 12 in [3,18] = 60%, mid percentile (not PbtA strong hit)
  assertStrictEquals(rollTier(r), "mid");
});

Deno.test("rollTier flat: when min equals max", () => {
  const r: RollResult = {
    expression: "1d2-1+0",
    groups: [{ sign: 1, count: 1, sides: 2, rolls: [1], subtotal: 1 }],
    modifier: 0,
    total: 1,
    minPossible: 1,
    maxPossible: 1,
  };
  assertStrictEquals(rollTier(r), "flat");
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
