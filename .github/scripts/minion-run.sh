#!/usr/bin/env bash
# Runs one MINION job for this repo, mirrors its logs, exits 0 only if the job succeeded.
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
BODY=$(jq -n --arg repo "$GITHUB_SERVER_URL/$GITHUB_REPOSITORY" --arg ref "$BRANCH" \
  --arg step "test \"\$(git rev-parse HEAD)\" = \"$SHA\" || { echo \"branch moved past $SHA\" >&2; exit 1; }; $STEP" \
  --arg key "$KEY" \
  '{repo: $repo, ref: $ref, steps: [$step], idempotencyKey: $key, timeoutSeconds: 5400}')
JOB=""
SUBMITTED=0
DONE=0

# One HTTP call that may use at most $1 seconds in total, with connect timeout $2. Every attempt and every sleep is
# capped to what is left of the budget, and no attempt starts once it is spent. Each attempt writes its own file, so
# only a complete body from a successful attempt is printed.
api_within() {
  local budget=$1 connect=$2 start=$SECONDS left attempt out
  shift 2
  while true; do
    left=$(( budget - (SECONDS - start) ))
    (( left > 0 )) || return 1
    attempt=$(( left < 30 ? left : 30 ))
    out="$(mktemp)"
    if curl -fsS --connect-timeout "$(( connect < attempt ? connect : attempt ))" --max-time "$attempt" -o "$out" \
         -H @<(printf 'Authorization: Bearer %s\n' "$MINION_API_KEY") "$@"; then
      cat "$out"
      rm -f "$out"
      return 0
    fi
    rm -f "$out"
    left=$(( budget - (SECONDS - start) ))
    (( left > 0 )) || return 1
    sleep "$(( left < 3 ? left : 3 ))"
  done
}

# Normal calls: 120 s of attempts in total.
api() { api_within 120 10 "$@"; }

# Registered before the submit. Cancels the job when the script exits early. If the submit was sent but its ID never
# arrived, one bounded re-POST with the same key returns that job, then it is cancelled.
cancel() {
  [ "$DONE" = 0 ] && [ "$SUBMITTED" = 1 ] || return 0
  if [ -z "$JOB" ]; then
    echo "recovering the MINION job for key $KEY" >&2
    JOB="$(api_within 15 5 -H content-type:application/json -d "$BODY" "$API/jobs" 2>/dev/null \
      | jq -er '.job.id' 2>/dev/null || true)"
    if [ -z "$JOB" ]; then
      echo "WARNING: could not find the MINION job for idempotency key $KEY; cancel it in MINION by hand" >&2
      return 0
    fi
  fi
  echo "cancelling MINION job $JOB" >&2
  api_within 20 5 -X POST "$API/jobs/$JOB/cancel" >/dev/null 2>&1 \
    || echo "WARNING: cancel of MINION job $JOB failed; cancel it in MINION (key $KEY)" >&2
}
trap cancel EXIT
trap 'exit 130' INT TERM

# Retries the submit with the same key. The first attempt is the one that can leave a job behind.
SUBMITTED=1
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
