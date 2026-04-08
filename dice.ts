export interface DiceGroup {
  sign: 1 | -1;
  count: number;
  sides: number;
  rolls: number[];
  subtotal: number;
}

export interface RollResult {
  expression: string;
  groups: DiceGroup[];
  modifier: number;
  total: number;
  minPossible: number;
  maxPossible: number;
}

const MAX_DICE_COUNT = 100;
const MAX_DIE_SIDES = 1000;
const UINT32_MAX_PLUS_ONE = 0x100000000;

const VALIDATE_RE = /^[+-]?(\d*d\d+|\d+)([+-](\d*d\d+|\d+))*$/;
const TERM_RE = /([+-])?(?:(\d*)d(\d+)|(\d+))/gi;

function secureRandomInt(sides: number): number {
  const buffer = new ArrayBuffer(4);
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const limit = Math.floor(UINT32_MAX_PLUS_ONE / sides) * sides;
  for (;;) {
    crypto.getRandomValues(bytes);
    const value = view.getUint32(0, false);
    if (value < limit) {
      return (value % sides) + 1;
    }
  }
}

function rollGroup(sign: 1 | -1, count: number, sides: number): DiceGroup {
  const rolls: number[] = [];
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const r = secureRandomInt(sides);
    rolls.push(r);
    sum += r;
  }
  return { sign, count, sides, rolls, subtotal: sum * sign };
}

export function rollExpression(rawExpression: string): RollResult {
  const expression = rawExpression.trim();
  if (!expression) {
    throw new Error("Empty expression. Try `2d6+1`.");
  }

  const normalized = expression.replace(/\s+/g, "").toLowerCase();
  if (!VALIDATE_RE.test(normalized)) {
    throw new Error(
      `Can't parse \`${expression}\`. Use dice notation like \`2d6\`, \`1d20+3\`, \`2d6+1d4-2\`.`,
    );
  }

  const groups: DiceGroup[] = [];
  let modifier = 0;

  for (const match of normalized.matchAll(TERM_RE)) {
    const signStr = match[1];
    const countStr = match[2];
    const sidesStr = match[3];
    const numStr = match[4];

    const sign: 1 | -1 = signStr === "-" ? -1 : 1;

    if (sidesStr !== undefined) {
      const count = countStr && countStr.length > 0 ? parseInt(countStr, 10) : 1;
      const sides = parseInt(sidesStr, 10);

      if (count < 1 || count > MAX_DICE_COUNT) {
        throw new Error(`Dice count must be between 1 and ${MAX_DICE_COUNT}.`);
      }
      if (sides < 2 || sides > MAX_DIE_SIDES) {
        throw new Error(`Die sides must be between 2 and ${MAX_DIE_SIDES}.`);
      }

      groups.push(rollGroup(sign, count, sides));
    } else if (numStr !== undefined) {
      modifier += sign * parseInt(numStr, 10);
    }
  }

  if (groups.length === 0) {
    throw new Error(`No dice in \`${expression}\`. Try \`2d6+1\`.`);
  }

  const total = groups.reduce((acc, g) => acc + g.subtotal, 0) + modifier;

  let minPossible = modifier;
  let maxPossible = modifier;
  for (const g of groups) {
    if (g.sign === 1) {
      minPossible += g.count;
      maxPossible += g.count * g.sides;
    } else {
      minPossible -= g.count * g.sides;
      maxPossible -= g.count;
    }
  }

  return { expression, groups, modifier, total, minPossible, maxPossible };
}
