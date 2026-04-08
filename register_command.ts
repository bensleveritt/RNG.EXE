const DISCORD_TOKEN = Deno.env.get("DISCORD_TOKEN")!;
const APPLICATION_ID = Deno.env.get("DISCORD_APPLICATION_ID")!;
const GUILD_ID = Deno.env.get("DISCORD_GUILD_ID");

if (!DISCORD_TOKEN || !APPLICATION_ID) {
  console.error(
    "Missing env vars. Required:\n" +
      "  DISCORD_TOKEN          (Discord Dev Portal → Bot → Reset Token)\n" +
      "  DISCORD_APPLICATION_ID (Discord Dev Portal → General Information)\n" +
      "Optional:\n" +
      "  DISCORD_GUILD_ID       (register per-guild for instant updates)",
  );
  Deno.exit(1);
}

const command = {
  name: "roll",
  description: "Roll dice. Examples: 2d6+1, 1d20, 2d6+1d4-2",
  type: 1,
  options: [
    {
      name: "expression",
      description: "Dice expression (e.g. 2d6+1, 1d100, 3d6-2)",
      type: 3,
      required: true,
    },
  ],
};

const endpoint = GUILD_ID
  ? `https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`
  : `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`;

console.log(`→ PUT ${endpoint}`);
console.log(
  `  scope: ${GUILD_ID ? `guild ${GUILD_ID}` : "global (may take up to 1h to propagate)"}`,
);

const response = await fetch(endpoint, {
  method: "PUT",
  headers: {
    "Authorization": `Bot ${DISCORD_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify([command]),
});

const text = await response.text();

if (!response.ok) {
  console.error(`\n✗ Registration failed: ${response.status} ${response.statusText}`);
  console.error(text);
  Deno.exit(1);
}

console.log("\n✓ Commands registered:");
try {
  const parsed = JSON.parse(text) as Array<{ name: string; id: string }>;
  for (const cmd of parsed) {
    console.log(`  /${cmd.name}  (id: ${cmd.id})`);
  }
} catch {
  console.log(text);
}
