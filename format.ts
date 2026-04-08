import type { DiceGroup, RollResult } from "./dice.ts";

function formatGroup(group: DiceGroup): string {
  const signPrefix = group.sign === -1 ? "-" : "";
  return `${signPrefix}${group.count}d${group.sides} [${group.rolls.join(", ")}]`;
}

function formatModifier(modifier: number): string {
  if (modifier === 0) return "";
  if (modifier > 0) return ` + ${modifier}`;
  return ` - ${Math.abs(modifier)}`;
}

function joinGroups(groups: DiceGroup[]): string {
  return groups
    .map((g, i) => {
      const formatted = formatGroup(g);
      if (i === 0) return formatted;
      return g.sign === -1 ? ` - ${formatted.slice(1)}` : ` + ${formatted}`;
    })
    .join("");
}

export function formatRollResult(userName: string, result: RollResult): string {
  const breakdown = joinGroups(result.groups) + formatModifier(result.modifier);
  const header = `🎲 **${userName}** rolled \`${result.expression}\``;
  const body = `${breakdown} = **${result.total}**`;
  return `${header}\n${body}`;
}

export function formatError(userName: string, expression: string, message: string): string {
  return `⚠️ **${userName}**: couldn't roll \`${expression}\`\n${message}`;
}
