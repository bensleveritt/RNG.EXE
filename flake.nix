{
  description = "RNG.EXE - Dice roller bot for The Sprawl";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    devshell.url = "github:numtide/devshell";
  };

  outputs = { self, nixpkgs, flake-utils, devshell }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ devshell.overlays.default ];
        };
      in
      {
        devShells.default = pkgs.devshell.mkShell {
          name = "rng-exe";

          packages = with pkgs; [
            deno
          ];

          commands = [
            {
              name = "register";
              help = "Register the /roll command with Discord";
              command = "deno run --allow-net --allow-env --allow-read register_command.ts";
            }
            {
              name = "dev";
              help = "Run the bot locally on :8000";
              command = "deno run --allow-net --allow-env --allow-read main.ts";
            }
            {
              name = "deploy";
              help = "Deploy to Deno Deploy";
              command = "deno run -A jsr:@deno/deployctl deploy";
            }
          ];

          motd = ''
            {202}🎲 RNG.EXE :: dice roller{reset}
            $(type -p menu &>/dev/null && menu)
          '';
        };
      }
    );
}
