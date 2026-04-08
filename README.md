# RNG.EXE

Dice roller Discord bot for **The Sprawl** (Neograd campaign). Built with Deno, deployed to Deno
Deploy.

```
/roll 2d6+1
🎲 Koroviev rolled `2d6+1`
2d6 [5, 4] + 1 = **10**
```

## Features

- `/roll <expression>` — standard dice notation
  - Single groups: `2d6`, `1d20`, `3d6`, `1d100`
  - With modifiers: `2d6+1`, `1d20-2`
  - Multi-group: `2d6+1d4-2`
- Cryptographically random rolls (`crypto.getRandomValues`, unbiased via rejection sampling)
- Discord Ed25519 signature verification via Web Crypto (zero deps)
- Errors reply ephemerally (only the roller sees them)

## Files

```
rng-exe/
├── main.ts             Deno.serve handler — verifies signatures, dispatches /roll
├── dice.ts             Parser + roller (crypto-random, rejection-sampled)
├── format.ts           Discord message formatting
├── dice.test.ts        14 Deno.test cases for the parser
├── register_command.ts One-time slash command registration
├── deno.json           Deno project config (deploy, tasks, compiler options)
├── deno.lock           Pinned dependencies
├── flake.nix           Nix devshell — provides deno
├── flake.lock          Pinned Nix inputs
├── .envrc              direnv: use flake + load .env.local
├── .env.example        Required env vars
└── CLAUDE.md           Notes for Claude Code
```

## Setup (one-time)

### 1. Enter the dev shell

If you have direnv installed (recommended):

```bash
cd /Users/benjamin/projects/personal/discord/rng-exe
direnv allow
# devshell auto-activates on cd; deno is now on PATH
```

Without direnv:

```bash
nix develop
```

### 2. Create the Discord application

1. Go to https://discord.com/developers/applications → **New Application** → name it `RNG.EXE`.
2. **General Information** tab:
   - Copy **Application ID** → `DISCORD_APPLICATION_ID`
   - Copy **Public Key** → `DISCORD_PUBLIC_KEY`
3. **Bot** tab:
   - Click **Reset Token** → copy → `DISCORD_TOKEN` (treat like a password)
   - **Privileged Gateway Intents**: leave OFF (slash commands don't need them)
4. **OAuth2 → URL Generator**:
   - Scopes: `applications.commands`, `bot`
   - Permissions: `Send Messages`, `Use Slash Commands`, `Embed Links`
   - Open the generated URL → invite to the Neograd server

### 3. Create `.env.local`

```bash
cp .env.example .env.local
# edit .env.local with the values from step 2
```

`.env.local` is gitignored and auto-loaded by direnv.

### 4. Deploy to Deno Deploy

```bash
deno run -A jsr:@deno/deployctl deploy
```

First run prompts you to authenticate with Deno Deploy (browser). Subsequent runs are instant.

The deploy reads `deno.json`'s `deploy.org` (`leveritt-institute`) and `deploy.app` (`rng-exe`) and
prints a URL like:

```
https://rng-exe.deno.dev
```

### 5. Set the public key as a Deno Deploy env var

In the Deno Deploy dashboard:

1. https://dash.deno.com/projects/rng-exe → **Settings** → **Environment Variables**
2. Add: `DISCORD_PUBLIC_KEY` = `<hex public key>`
3. Save

Or via `deployctl`:

```bash
deno run -A jsr:@deno/deployctl deploy --env DISCORD_PUBLIC_KEY=$DISCORD_PUBLIC_KEY
```

### 6. Point Discord at the deployment

1. Discord Dev Portal → your app → **General Information**
2. **Interactions Endpoint URL** → paste `https://rng-exe.deno.dev`
3. Save Changes

Discord sends a `PING`. If signature verification works, it accepts.

### 7. Register the `/roll` slash command

```bash
register
```

(That's the devshell shortcut. Or directly:
`deno run --allow-net --allow-env --allow-read register_command.ts`.)

For instant updates while developing, set `DISCORD_GUILD_ID` in `.env.local` — the command registers
per-guild and appears immediately. Without it, global registration takes up to an hour.

### 8. Test in Discord

```
/roll 2d6+1
/roll 1d20
/roll 3d6+1d4-1
```

---

## Development

### Devshell commands

| Command    | What it does                                                                                  |
| ---------- | --------------------------------------------------------------------------------------------- |
| `dev`      | `deno run main.ts` — local server on `:8000` (won't work without a public tunnel for Discord) |
| `register` | Re-register the `/roll` slash command                                                         |
| `deploy`   | `deployctl deploy`                                                                            |

### Direct deno commands

```bash
deno task test    # run dice parser tests
deno task check   # type-check all files
deno fmt          # format
deno lint         # lint
```

### Tail logs from the deployed worker

```bash
deno run -A jsr:@deno/deployctl logs
```

---

## Troubleshooting

**"Invalid signature" in deploy logs**

- `DISCORD_PUBLIC_KEY` env var on Deno Deploy doesn't match the one in Discord Dev Portal → General
  Info.
- Update it in the Deno Deploy dashboard and redeploy.

**Discord Interactions URL save fails**

- The deployed bot can't verify the PING. Most likely cause: env var not set on Deno Deploy.
- Set `DISCORD_PUBLIC_KEY` in the Deno Deploy dashboard, then retry the save in Discord.

**`/roll` doesn't show up in Discord autocomplete**

- Run `register` from the devshell.
- If global (no `DISCORD_GUILD_ID`), wait up to an hour.
- Check the bot is in the server and has `Use Slash Commands` permission.

---

## Extending

Future commands (not in v1):

- `/move stat:cool` — PbtA move with character stat lookup + result band
- `/oracle likelihood:50 question:"..."` — yes/no oracle (overlap with discord-oracle)
- `/clock name:"Heat" ticks:1` — clock ticker (needs persistence — Deno KV)

To add a command:

1. Add the definition to `register_command.ts`
2. Add a dispatch branch in `main.ts`
3. Re-run `register`
