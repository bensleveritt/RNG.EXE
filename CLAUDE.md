# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

A Discord bot that rolls dice for **The Sprawl** play-by-post campaign. Standard dice notation
(`2d6+1`, `1d20`, multi-group). Built with Deno, deployed to Deno Deploy.

Sibling project: `discord-oracle` (yes/no oracle bot, same stack).

## Commands

**Run tests**:

```bash
deno test
```

**Type-check**:

```bash
deno task check
```

**Format and lint**:

```bash
deno fmt
deno lint
```

**Run locally** (won't reach Discord without a public tunnel):

```bash
deno task dev
```

**Register the /roll slash command** (run after changes to command definition):

```bash
deno task register
```

**Deploy**:

```bash
deno run -A jsr:@deno/deployctl deploy
```

The app is configured for Deno Deploy with org `leveritt-institute` and app `rng-exe` (see
`deno.json`).

## Architecture

- **`main.ts`** — `Deno.serve` HTTP handler. Inlined Ed25519 signature verification (Web Crypto).
  Dispatches by `interaction.data.name`.
- **`dice.ts`** — Pure parser + roller. Supports `XdY±Z`, multi-group, case-insensitive,
  whitespace-tolerant. Crypto-random via `crypto.getRandomValues` + rejection sampling for unbiased
  rolls. Capped at 100 dice / 1000 sides per group.
- **`format.ts`** — Discord message formatting for roll results and errors.
- **`register_command.ts`** — One-time PUT to Discord's API to register the `/roll` slash command.
  Supports per-guild registration via `DISCORD_GUILD_ID` for instant dev iteration.
- **`flake.nix`** — Nix devshell providing `deno`. Use `direnv allow` to auto-activate.

## Environment Variables

Required at runtime (Deno Deploy dashboard):

- `DISCORD_PUBLIC_KEY` — Application public key (hex) for webhook signature verification

Required for `register_command.ts` only (set in `.env.local`):

- `DISCORD_TOKEN` — Bot token
- `DISCORD_APPLICATION_ID` — Application ID

Optional:

- `DISCORD_GUILD_ID` — Register per-guild for instant updates instead of global

## Strictness

`deno.json` enables `strict: true` and `noUncheckedIndexedAccess: true`. Index access on arrays and
tuples returns `T | undefined` — write code that handles this without `!` non-null assertions. See
`dice.ts` for the pattern (destructure + guard, or use `?.`).

When working with `Uint8Array` and Web Crypto, use `Uint8Array<ArrayBuffer>` (not the default
`Uint8Array<ArrayBufferLike>`) so it satisfies `BufferSource`. Allocate via
`new Uint8Array(new ArrayBuffer(N))`. See `hexToUint8Array` in `main.ts`.

## Adding Commands

1. Define the command in `register_command.ts` and add it to the array passed to PUT
2. Add a dispatch branch in `main.ts`'s `handleRequest` (after the PING check)
3. Add a handler function (mirror `handleRoll`)
4. Run `deno task register` to publish the new command definition
