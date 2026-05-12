{ config, lib, pkgs, ... }:

let
  # Single pin for languages.javascript and packages (scripts invoke `node` directly, e.g. Expo CLI).
  nodePkg = pkgs.nodejs_24;
in
{
  name = "tao-lang";

  # Tao's shell needs Nix-provided JS/dev tools, but Expo iOS builds delegate to
  # Xcode/CocoaPods; use a no-compiler shell on Darwin so Nix clang wrappers do
  # not intercept Apple toolchain flags such as -index-store-path.
  # If this regresses, the previous working fallback was:
  #    export PATH="/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
  #    unset SDKROOT DEVELOPER_DIR
  #    unset CC CXX LD
  #    unset NIX_CC NIX_CFLAGS_COMPILE NIX_LDFLAGS
  stdenv = if pkgs.stdenv.isDarwin then pkgs.stdenvNoCC else pkgs.stdenv;

  # Let Apple-native workflows use the SDK selected by Xcode instead of a Nix-provided SDK.
  apple.sdk = null;

  enterShell = ''
    export PATH="$PATH:$DEVENV_ROOT/packages/shared/node_modules/.bin"
  '';

  languages.javascript = {
    enable = true;
    package = nodePkg;
    bun.enable = true;
    npm.enable = true;
  };

  packages = [
    nodePkg
    pkgs.cocoapods
    pkgs.dprint
    pkgs.fd
    pkgs.git
    pkgs.just
    pkgs.jq
    pkgs.ripgrep
    pkgs.oxlint
    pkgs.watchexec
  ];

  env.TAO_DEVENV = "1";
  env.TAO_DEVENV_SCRIPT_HELP = lib.generators.toKeyValue {} (
    lib.filterAttrs (_name: description: description != "") (
      lib.mapAttrs (_name: script: script.description) config.scripts
    )
  );

  scripts.d = {
    exec = ''just dev "$@"'';
    description = "just dev";
  };
  scripts.j = {
    exec = ''just "$@"'';
    description = "just";
  };
  scripts.t = {
    exec = ''just test "$@"'';
    description = "just test";
  };
  scripts.b = {
    exec = ''just build "$@"'';
    description = "just build";
  };
  scripts.p = {
    exec = ''just prep-commit "$@"'';
    description = "just prep-commit";
  };
  scripts.c = {
    exec = ''just clean "$@"'';
    description = "just clean";
  };
  scripts.cf = {
    exec = ''just clean-full "$@"'';
    description = "just clean-full";
  };
  scripts.wt = {
    exec = ''just watch "$@"'';
    description = "just watch";
  };

}
