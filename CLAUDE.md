# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

A Discord bot that rolls dice for **The Sprawl** play-by-post campaign. Standard dice notation
(`2d6+1`, `1d20`, multi-group). Built with Deno, deployed to [Deno Deploy](https://console.deno.com)
(the new platform — not Classic at `dash.deno.com`).

- **Production**: https://rng-exe.leveritt-institute.deno.net
- **Console**: https://console.deno.com/leveritt-institute/rng-exe
- **GitHub**: https://github.com/bensleveritt/RNG.EXE

Sibling project: `discord-oracle` (yes/no oracle bot). Note: discord-oracle was built on Deno Deploy
Classic and uses `deployctl`. RNG.EXE was built fresh on the new platform and uses the built-in
`deno deploy` subcommand. **Do not copy `deployctl` patterns into this repo.**

## Commands

```bash
deno task test       # run dice parser tests
deno task check      # type-check all files
deno task dev        # run main.ts locally on :8000
deno task register   # publish /roll slash command to Discord
deno task deploy     # production deploy (deno deploy --prod)
deno task logs       # stream production logs
deno fmt
deno lint
```

## Architecture

- **`main.ts`** — `Deno.serve` HTTP handler. Inlined Ed25519 signature verification (Web Crypto).
  Dispatches by `interaction.data.name`. Reads `DISCORD_PUBLIC_KEY` from `Deno.env`.
- **`dice.ts`** — Pure parser + roller. Supports `XdY±Z`, multi-group, case-insensitive,
  whitespace-tolerant. Crypto-random via `crypto.getRandomValues` + rejection sampling for unbiased
  rolls. Capped at 100 dice / 1000 sides per group.
- **`format.ts`** — Discord message formatting for roll results and errors.
- **`register_command.ts`** — One-time PUT to Discord's API to register the `/roll` slash command.
  Supports per-guild registration via `DISCORD_GUILD_ID` for instant dev iteration.
- **`flake.nix`** — Nix devshell providing `deno`. Use `direnv allow` to auto-activate.

## Environment Variables

### Set on Deno Deploy (production runtime)

- `DISCORD_PUBLIC_KEY` — Application public key (hex) for webhook signature verification

Set with: `deno deploy env add DISCORD_PUBLIC_KEY <value> --org=leveritt-institute --app=rng-exe`\
Then redeploy: `deno task deploy`

### Set in `.env.local` (local CLI tools only, never deployed)

- `DISCORD_TOKEN` — Bot token (~72 chars, dotted format, from **Bot** tab — NOT OAuth2 Client Secret
  which is ~32 chars)
- `DISCORD_APPLICATION_ID` — Application ID (from General Information)
- `DISCORD_GUILD_ID` — Server ID for per-guild command registration (optional but recommended for
  instant updates)
- `DENO_DEPLOY_TOKEN` — Personal access token from console.deno.com → Account Settings → Access
  Tokens. Used by `deno deploy` CLI for auth.

`.env.local` is gitignored. Bot token must never be pasted in chat.

## Deployment

This project uses **Deno Deploy** (the new platform, GA Feb 2026), not Deno Deploy Classic. The CLI
is the built-in `deno deploy` subcommand, not `deployctl`.

### Initial deploy (one-time)

The app already exists. To recreate from scratch:

```bash
deno deploy create \
  --org=leveritt-institute \
  --app=rng-exe \
  --source=local \
  --runtime-mode=dynamic \
  --entrypoint=main.ts \
  --region=eu
```

### Subsequent deploys

```bash
deno task deploy
```

This is the daily workflow. Edits to code → test/check → deploy → smoke test live URL.

### Smoke test

```bash
curl -i https://rng-exe.leveritt-institute.deno.net/
# Expect: HTTP 200, body "RNG.EXE :: online"

curl -i -X POST -H 'X-Signature-Ed25519: deadbeef' -H 'X-Signature-Timestamp: 1' \
  -H 'Content-Type: application/json' -d '{"type":1}' \
  https://rng-exe.leveritt-institute.deno.net/
# Expect: HTTP 401 "Invalid signature" (proves env var loaded + verify works)
```

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
4. `deno task deploy` to push the new code
5. `deno task register` to publish the new command definition
