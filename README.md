# RNG.EXE

Dice roller Discord bot for **The Sprawl** (Neograd campaign). Built with Deno, deployed to
[Deno Deploy](https://console.deno.com).

```
/roll 2d6+1
🎲 Koroviev rolled `2d6+1`
2d6 [5, 4] + 1 = **10**
```

**Live**: https://rng-exe.leveritt-institute.deno.net\
**Console**: https://console.deno.com/leveritt-institute/rng-exe\
**Repo**: https://github.com/bensleveritt/RNG.EXE

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
├── deno.json           Deno project config (tasks, compiler options)
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
```

The flake provides `deno` on PATH. Without direnv: `nix develop`.

### 2. Create the Discord application

1. Go to https://discord.com/developers/applications → **New Application** → name it `RNG.EXE`.
2. **General Information** tab — copy:
   - **Application ID** → `DISCORD_APPLICATION_ID`
   - **Public Key** → `DISCORD_PUBLIC_KEY`
3. **Bot** tab (left sidebar):
   - Click **Reset Token** → copy → `DISCORD_TOKEN`
   - ⚠️ The bot token is ~72 chars with two dots (e.g. `MTQ...GOLqXh.abc...`). If you got a 32-char
     value, you copied the **Client Secret** from the OAuth2 tab by mistake.
   - **Privileged Gateway Intents**: leave OFF (slash commands don't need them)
4. **OAuth2 → URL Generator**:
   - Scopes: `applications.commands`, `bot`
   - Permissions: `Send Messages`, `Use Slash Commands`, `Embed Links`
   - Open the generated URL → invite to the Neograd server

### 3. Get a Deno Deploy access token

1. Go to https://console.deno.com → avatar → **Account Settings** → **Access Tokens**
2. **New Token** → copy → `DENO_DEPLOY_TOKEN`

### 4. Create `.env.local`

```bash
cp .env.example .env.local
# edit .env.local with values from steps 2 and 3
```

`.env.local` is gitignored and auto-loaded by direnv.

### 5. Create the Deno Deploy application (one-time)

```bash
deno deploy create \
  --org=leveritt-institute \
  --app=rng-exe \
  --source=local \
  --runtime-mode=dynamic \
  --entrypoint=main.ts \
  --region=eu
```

This uploads the code and starts the first deployment. It prints the production URL:
`https://rng-exe.leveritt-institute.deno.net`

> If you're a different user, replace `leveritt-institute` with your own org slug. You'll need to
> create the org first at https://console.deno.com.

### 6. Set the public key as a Deno Deploy env var

```bash
deno deploy env add DISCORD_PUBLIC_KEY "$DISCORD_PUBLIC_KEY" \
  --org=leveritt-institute --app=rng-exe
```

Then redeploy so the new value is picked up:

```bash
deno task deploy
```

### 7. Point Discord at the deployment

1. Discord Dev Portal → your app → **General Information**
2. **Interactions Endpoint URL** → paste `https://rng-exe.leveritt-institute.deno.net`
3. **Save Changes**

Discord sends a `PING`. The worker verifies the Ed25519 signature against `DISCORD_PUBLIC_KEY` and
responds with `{"type":1}`. Discord accepts the save.

### 8. Register the `/roll` slash command

```bash
deno task register
```

This reads `DISCORD_TOKEN`, `DISCORD_APPLICATION_ID`, and (optionally) `DISCORD_GUILD_ID` from
`.env.local`. With `DISCORD_GUILD_ID` set the command appears instantly. Without it, global
registration takes up to an hour.

### 9. Test in Discord

```
/roll 2d6+1
/roll 1d20
/roll 3d6+1d4-1
```

---

## Development

### Devshell commands

| Command    | What it does                                                             |
| ---------- | ------------------------------------------------------------------------ |
| `dev`      | `deno run main.ts` — local server on `:8000` (no Discord without tunnel) |
| `register` | Re-register the `/roll` slash command                                    |
| `deploy`   | `deno deploy --prod --org=leveritt-institute --app=rng-exe`              |
| `logs`     | Stream logs from the deployed bot                                        |

### Direct deno tasks

```bash
deno task test    # run dice parser tests
deno task check   # type-check all files
deno task deploy  # production deploy
deno task logs    # stream production logs
deno fmt          # format
deno lint         # lint
```

### Daily deploy workflow

```bash
# edit code...
deno task check && deno task test && deno task deploy
```

`deno deploy create` is **one-time**. Subsequent deploys use `deno deploy` (or `deno task deploy`).

---

## Troubleshooting

**"Invalid signature" in deploy logs**

- `DISCORD_PUBLIC_KEY` env var on Deno Deploy doesn't match the one in Discord Dev Portal → General
  Info.
- Update with `deno deploy env update-value DISCORD_PUBLIC_KEY <new-value>` then `deno task deploy`.

**Discord Interactions URL save fails**

- The deployed bot can't verify the PING. Most likely cause: env var not set on Deno Deploy or
  redeploy needed after setting it.
- Verify with `deno deploy env list --org=leveritt-institute --app=rng-exe`, then redeploy.

**`401 Unauthorized` when running `deno task register`**

- Wrong token type. The `DISCORD_TOKEN` must come from the **Bot** tab (~72 chars, dotted), not the
  OAuth2 Client Secret (~32 chars). Reset the bot token in the Bot tab and update `.env.local`.

**`/roll` doesn't show up in Discord autocomplete**

- Run `deno task register`.
- If global (no `DISCORD_GUILD_ID`), wait up to an hour.
- Check the bot is in the server and has `Use Slash Commands` permission.

**`deployctl` instead of `deno deploy`**

- `deployctl` targets Deno Deploy **Classic** which is being sunset July 20, 2026. Always use the
  built-in `deno deploy` subcommand instead.

---

## Extending

Future commands (not in v1):

- `/move stat:cool` — PbtA move with character stat lookup + result band
- `/oracle likelihood:50 question:"..."` — yes/no oracle (overlap with discord-oracle)
- `/clock name:"Heat" ticks:1` — clock ticker (needs persistence — Deno KV)

To add a command:

1. Add the definition to `register_command.ts`
2. Add a dispatch branch in `main.ts`
3. Run `deno task deploy` to push code, then `deno task register` to publish the command
