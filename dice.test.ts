import {
  assertEquals,
  assertGreaterOrEqual,
  assertLessOrEqual,
  assertStrictEquals,
  assertThrows,
} from "jsr:@std/assert@^1";
import { rollExpression } from "./dice.ts";

Deno.test("rollExpression: parses 2d6 and rolls in range", () => {
  for (let i = 0; i < 100; i++) {
    const r = rollExpression("2d6");
    assertEquals(r.groups.length, 1);
    const [group] = r.groups;
    assertStrictEquals(group?.count, 2);
    assertStrictEquals(group?.sides, 6);
    assertGreaterOrEqual(r.total, 2);
    assertLessOrEqual(r.total, 12);
    assertStrictEquals(r.minPossible, 2);
    assertStrictEquals(r.maxPossible, 12);
  }
});

Deno.test("rollExpression: minPossible/maxPossible for 2d6+1", () => {
  const r = rollExpression("2d6+1");
  assertStrictEquals(r.minPossible, 3);
  assertStrictEquals(r.maxPossible, 13);
});

Deno.test("rollExpression: minPossible/maxPossible for 1d20", () => {
  const r = rollExpression("1d20");
  assertStrictEquals(r.minPossible, 1);
  assertStrictEquals(r.maxPossible, 20);
});

Deno.test("rollExpression: minPossible/maxPossible for 2d6+1d4-1", () => {
  const r = rollExpression("2d6+1d4-1");
  assertStrictEquals(r.minPossible, 2 + 1 - 1);
  assertStrictEquals(r.maxPossible, 12 + 4 - 1);
});

Deno.test("rollExpression: minPossible/maxPossible for negative dice group 2d6-1d4", () => {
  const r = rollExpression("2d6-1d4");
  assertStrictEquals(r.minPossible, 2 - 4);
  assertStrictEquals(r.maxPossible, 12 - 1);
});

Deno.test("rollExpression: parses 2d6+1 with modifier", () => {
  for (let i = 0; i < 100; i++) {
    const r = rollExpression("2d6+1");
    assertStrictEquals(r.modifier, 1);
    assertGreaterOrEqual(r.total, 3);
    assertLessOrEqual(r.total, 13);
  }
});

Deno.test("rollExpression: parses 2d6-2 with negative modifier", () => {
  const r = rollExpression("2d6-2");
  assertStrictEquals(r.modifier, -2);
  assertGreaterOrEqual(r.total, 0);
  assertLessOrEqual(r.total, 10);
});

Deno.test("rollExpression: parses single die shorthand 1d20", () => {
  const r = rollExpression("1d20");
  const [group] = r.groups;
  assertStrictEquals(group?.count, 1);
  assertStrictEquals(group?.sides, 20);
  assertGreaterOrEqual(r.total, 1);
  assertLessOrEqual(r.total, 20);
});

Deno.test("rollExpression: parses multi-group 2d6+1d4+3", () => {
  const r = rollExpression("2d6+1d4+3");
  assertEquals(r.groups.length, 2);
  assertStrictEquals(r.modifier, 3);
  assertGreaterOrEqual(r.total, 2 + 1 + 3);
  assertLessOrEqual(r.total, 12 + 4 + 3);
});

Deno.test("rollExpression: is case-insensitive", () => {
  const r = rollExpression("2D6+1");
  const [group] = r.groups;
  assertStrictEquals(group?.sides, 6);
  assertStrictEquals(r.modifier, 1);
});

Deno.test("rollExpression: tolerates whitespace", () => {
  const r = rollExpression("  2d6 + 1  ");
  assertStrictEquals(r.modifier, 1);
});

Deno.test("rollExpression: rejects empty input", () => {
  assertThrows(() => rollExpression(""));
  assertThrows(() => rollExpression("   "));
});

Deno.test("rollExpression: rejects garbage", () => {
  assertThrows(() => rollExpression("2d"));
  assertThrows(() => rollExpression("d"));
  assertThrows(() => rollExpression("abc"));
  assertThrows(() => rollExpression("2d6 rolling hot"));
});

Deno.test("rollExpression: rejects oversized dice count", () => {
  assertThrows(() => rollExpression("101d6"));
});

Deno.test("rollExpression: rejects oversized sides", () => {
  assertThrows(() => rollExpression("1d1001"));
});

Deno.test("rollExpression: pure modifiers without dice are rejected", () => {
  assertThrows(() => rollExpression("5"));
  assertThrows(() => rollExpression("+5"));
});

Deno.test("rollExpression: preserves trimmed expression on result", () => {
  const r = rollExpression("  2d6+1  ");
  assertStrictEquals(r.expression, "2d6+1");
});

Deno.test("rollExpression: negative dice group in multi-term expression", () => {
  const r = rollExpression("2d6-1d4");
  assertEquals(r.groups.length, 2);
  const second = r.groups[1];
  assertStrictEquals(second?.sign, -1);
});
