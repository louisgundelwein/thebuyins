# shellcheck shell=bash
# Sourced by the MINIONS scripts in this folder. The MINIONS VM image (xcode-27-2-tools) ships these exact versions; anything else fails.
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

# Starts and ends a timed phase. MINIONS reads the ::phase:: line as the step name.
phase() { echo "::phase:: $1"; echo "== $1 ($(date +%H:%M:%S))"; SECONDS=0; }
phase_done() { echo "== $1 done in ${SECONDS}s"; }

# xcodebuild output goes to a file to keep the job log short; this prints its warnings (once each) so MINIONS counts them.
# grep exits 1 when there are none, which is fine; anything else is a real error.
print_warnings() {
  grep -E ': warning: |^warning: |^ld: warning: ' "$1" | sort -u || [[ $? -eq 1 ]]
}
