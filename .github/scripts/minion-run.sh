#!/usr/bin/env bash
# Runs one MINION job for this repo, mirrors its logs and exits 0 only if the job succeeded.
# Usage: minion-run.sh <branch> <sha> <step>. The job fails unless it checks out exactly <sha>.
# Needs MINION_URL, MINION_API_KEY and the GITHUB_* env of an Actions run.
set -euo pipefail
BRANCH="$1"
SHA="$2"
STEP="$3"
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "not a commit SHA: $SHA" >&2; exit 1; }
API="$MINION_URL/api/v1"
# The same key on a re-POST returns the job that the first POST created, so a lost response cannot start a second job.
KEY="$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT-$GITHUB_JOB"
JOB=""
DONE=0

# One HTTP call. Each attempt writes its own file; only a complete body from a successful attempt is printed,
# so a dropped connection can never leave a partial body to parse. Attempts are capped at 120 s in total.
api() {
  local start=$SECONDS out
  while true; do
    out="$(mktemp)"
    if curl -fsS --connect-timeout 10 --max-time 30 -o "$out" \
         -H @<(printf 'Authorization: Bearer %s\n' "$MINION_API_KEY") "$@"; then
      cat "$out"
      rm -f "$out"
      return 0
    fi
    rm -f "$out"
    if (( SECONDS - start >= 120 )); then
      return 1
    fi
    sleep 3
  done
}

# Registered before the submit, so a job that exists is cancelled on any abnormal exit. The cancel itself is bounded.
cancel() {
  [ "$DONE" = 0 ] && [ -n "$JOB" ] || return 0
  echo "cancelling MINION job $JOB" >&2
  curl -fsS --connect-timeout 5 --max-time 20 -o /dev/null -X POST \
    -H @<(printf 'Authorization: Bearer %s\n' "$MINION_API_KEY") "$API/jobs/$JOB/cancel" \
    || echo "cancel of $JOB failed; cancel it in MINION" >&2
}
trap cancel EXIT
trap 'exit 130' INT TERM

BODY=$(jq -n --arg repo "$GITHUB_SERVER_URL/$GITHUB_REPOSITORY" --arg ref "$BRANCH" \
  --arg step "test \"\$(git rev-parse HEAD)\" = \"$SHA\" || { echo \"branch moved past $SHA\" >&2; exit 1; }; $STEP" \
  --arg key "$KEY" \
  '{repo: $repo, ref: $ref, steps: [$step], idempotencyKey: $key, timeoutSeconds: 5400}')
for _ in 1 2 3; do
  RESPONSE="$(api -H content-type:application/json -d "$BODY" "$API/jobs" || true)"
  JOB="$(jq -er '.job.id' <<<"$RESPONSE" 2>/dev/null || true)"
  [ -n "$JOB" ] && break
  sleep 5
done
[ -n "$JOB" ] || { echo "no job id from MINION for key $KEY" >&2; exit 1; }
echo "MINION job $MINION_URL/jobs/$JOB"

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
