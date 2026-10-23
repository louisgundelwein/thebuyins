# shellcheck shell=bash
# Sourced by the CI scripts. The MINIONS VM image (xcode-27-2-tools) ships these exact versions; anything else fails.
# Downloads are cached per repo on the build machine through npm_config_store_dir and CP_HOME_DIR when MINIONS sets them.
export LANG=en_US.UTF-8

require_tool() {
  local actual
  actual="$("$1" "$2" 2>&1 | head -n 1)" || { echo "$1 missing from the build image" >&2; exit 1; }
  [[ "$actual" == *"$3"* ]] || { echo "$1 $3 expected in the build image, got: $actual" >&2; exit 1; }
}
require_tool node -v v24.22.1
require_tool pnpm -v 11.17.0
require_tool ruby -v "ruby 4.0.9"
require_tool pod --version 1.17.0
