{ config, lib, pkgs, ... }:

{
  name = "tao-lang";

  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_24;
    bun.enable = true;
    npm.enable = true;
  };

  packages = [
    pkgs.git
    pkgs.just
    pkgs.jq
    pkgs.watchexec
    pkgs.ripgrep
    pkgs.fd
    pkgs.dprint
    pkgs.oxlint
  ];

  env.TAO_DEVENV = "1";
  env.TAO_DEVENV_SCRIPT_HELP = lib.generators.toKeyValue {} (
    lib.filterAttrs (_name: description: description != "") (
      lib.mapAttrs (_name: script: script.description) config.scripts
    )
  );

  scripts.d = {
    exec = ''just dev "$@"'';
    description = "Alias for just dev";
  };

  scripts.j = {
    exec = ''just "$@"'';
    description = "Alias for just";
  };

  scripts.r = {
    exec = ''just run "$@"'';
    description = "Alias for just run";
  };

  scripts.t = {
    exec = ''just test "$@"'';
    description = "Alias for just test";
  };

  scripts.b = {
    exec = ''just build "$@"'';
    description = "Alias for just build";
  };

  scripts.p = {
    exec = ''just prep-commit "$@"'';
    description = "Alias for just prep-commit";
  };

  scripts.wt = {
    exec = ''just watch "$@"'';
    description = "Alias for just watch";
  };

  enterShell = ''
    export PATH="$PATH:$DEVENV_ROOT/packages/shared/node_modules/.bin"
  '';
}
