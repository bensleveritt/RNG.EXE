import type { DiceGroup, RollResult } from "./dice.ts";

const ESC = "\u001b";
const RESET = `${ESC}[0m`;
const GRAY = `${ESC}[30m`;
const RED = `${ESC}[31m`;
const GREEN = `${ESC}[32m`;
const YELLOW = `${ESC}[33m`;
const CYAN = `${ESC}[36m`;
const WHITE = `${ESC}[37m`;
const BOLD_RED = `${ESC}[1;31m`;
const BOLD_GREEN = `${ESC}[1;32m`;
const BOLD_WHITE = `${ESC}[1;37m`;

const HEADER = `${CYAN}░▒▓ RNG.EXE ▓▒░${RESET}`;

const LABEL_COLUMN_WIDTH = 9;

export type ColorTier =
  | "critMax"
  | "high"
  | "mid"
  | "low"
  | "critMin"
  | "flat";

function isPbtaRoll(result: RollResult): boolean {
  if (result.groups.length !== 1) return false;
  const [g] = result.groups;
  return g?.sign === 1 && g.count === 2 && g.sides === 6;
}

export function rollTier(result: RollResult): ColorTier {
  const { total, minPossible: min, maxPossible: max } = result;

  if (isPbtaRoll(result)) {
    if (total === max && total >= 10) return "critMax";
    if (total === min && total <= 6) return "critMin";
    if (total >= 10) return "high";
    if (total >= 7) return "mid";
    return "low";
  }

  if (max === min) return "flat";
  if (total >= max) return "critMax";
  if (total <= min) return "critMin";
  const percentile = (total - min) / (max - min);
  if (percentile >= 0.75) return "high";
  if (percentile >= 0.25) return "mid";
  return "low";
}

function tierColor(tier: ColorTier): string {
  switch (tier) {
    case "critMax":
      return BOLD_GREEN;
    case "high":
      return GREEN;
    case "mid":
      return YELLOW;
    case "low":
      return RED;
    case "critMin":
      return BOLD_RED;
    case "flat":
      return BOLD_WHITE;
  }
}

function formatGroupRolls(group: DiceGroup): string {
  const sign = group.sign === -1 ? "-" : "";
  const colored = group.rolls.map((r) => `${YELLOW}${r}${RESET}`);
  return `${sign}${group.count}d${group.sides} [${colored.join(`${WHITE}, ${RESET}`)}]`;
}

function formatModifierLine(modifier: number): string | null {
  if (modifier === 0) return null;
  const sign = modifier > 0 ? "+" : "-";
  return `  ${GRAY}mod    ${RESET}${YELLOW}${sign}${Math.abs(modifier)}${RESET}`;
}

function wrapAnsi(lines: string[]): string {
  return "```ansi\n" + lines.join("\n") + "\n```";
}

function formatTotalBox(total: number, tierC: string): string[] {
  const totalStr = String(total);
  const inner = ` ${totalStr} `;
  const bar = "━".repeat(inner.length);
  const pad = " ".repeat(LABEL_COLUMN_WIDTH);
  return [
    `${pad}${tierC}┏${bar}┓${RESET}`,
    `  ${GRAY}TOTAL  ${RESET}${tierC}┃${inner}┃${RESET}`,
    `${pad}${tierC}┗${bar}┛${RESET}`,
  ];
}

export function formatRollResult(userName: string, result: RollResult): string {
  const tier = rollTier(result);
  const totalC = tierColor(tier);

  const diceLines = result.groups.map(
    (g) => `  ${GRAY}dice   ${RESET}${formatGroupRolls(g)}`,
  );
  const modLine = formatModifierLine(result.modifier);

  const lines = [
    HEADER,
    `${GREEN}> ${userName} :: roll ${YELLOW}${result.expression}${RESET}`,
    ...diceLines,
  ];

  if (modLine !== null) {
    lines.push(modLine);
  }

  lines.push(...formatTotalBox(result.total, totalC));

  return wrapAnsi(lines);
}

export function formatError(userName: string, expression: string, message: string): string {
  const lines = [
    HEADER,
    `${RED}> ${userName} :: ERROR${RESET}`,
    `  ${GRAY}expr   ${RESET}${YELLOW}${expression}${RESET}`,
    `  ${RED}${message}${RESET}`,
  ];
  return wrapAnsi(lines);
}
