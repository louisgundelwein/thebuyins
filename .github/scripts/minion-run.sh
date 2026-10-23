#!/usr/bin/env bash
# Runs one MINION job for this repo, mirrors its logs and exits 0 only if the job succeeded.
# Usage: minion-run.sh <branch> <sha> <step>. The job fails unless it checks out exactly <sha>.
# Needs MINION_URL, MINION_API_KEY and the GITHUB_* env of an Actions run.
set -euo pipefail
BRANCH="$1"
SHA="$2"
STEP="$3"
API="$MINION_URL/api/v1"

# Transient network or server errors are retried; anything persistent fails the run.
api() {
  curl -fsS --retry 5 --retry-all-errors --retry-delay 3 \
    -H @<(printf 'Authorization: Bearer %s\n' "$MINION_API_KEY") "$@"
}

BODY=$(jq -n --arg repo "$GITHUB_SERVER_URL/$GITHUB_REPOSITORY" --arg ref "$BRANCH" \
  --arg step "test \"\$(git rev-parse HEAD)\" = \"$SHA\" || { echo \"branch moved past $SHA\" >&2; exit 1; }; $STEP" \
  --arg key "$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT-$GITHUB_JOB" \
  '{repo: $repo, ref: $ref, steps: [$step], idempotencyKey: $key, timeoutSeconds: 5400}')
JOB=$(api -H "content-type: application/json" -d "$BODY" "$API/jobs" | jq -er .job.id)
echo "MINION job $MINION_URL/jobs/$JOB"

DONE=0
# A cancelled or failed Actions run must not leave the job running on a mini.
cleanup() {
  if [ "$DONE" = 0 ]; then
    echo "cancelling MINION job $JOB" >&2
    api -X POST "$API/jobs/$JOB/cancel" >/dev/null
  fi
}
trap cleanup EXIT
trap 'exit 130' INT TERM

AFTER=0
# Prints every log line after $AFTER, page by page, and advances $AFTER.
drain() {
  while true; do
    PAGE=$(api "$API/jobs/$JOB/logs?after=$AFTER")
    [ "$(jq '.lines | length' <<<"$PAGE")" -gt 0 ] || return 0
    jq -r '.lines[].text' <<<"$PAGE"
    AFTER=$(jq '[.lines[].seq] | max' <<<"$PAGE")
  done
}

while true; do
  STATUS=$(api "$API/jobs/$JOB" | jq -er .job.status)
  drain
  case "$STATUS" in
    queued|running) sleep 10 ;;
    succeeded) DONE=1; exit 0 ;;
    *) DONE=1; echo "MINION job ended: $STATUS" >&2; exit 1 ;;
  esac
done
