#!/usr/bin/env bash
# Runs one MINION job for this repo and mirrors its logs; exits 0 only if the job succeeded.
# Usage: minion-run.sh <ref> <step>. Needs MINION_URL, MINION_API_KEY and the usual GITHUB_* env.
set -euo pipefail
REF="$1"
STEP="$2"
API="$MINION_URL/api/v1"
AUTH=(-H "Authorization: Bearer $MINION_API_KEY")

BODY=$(jq -n --arg repo "$GITHUB_SERVER_URL/$GITHUB_REPOSITORY" --arg ref "$REF" --arg step "$STEP" \
  --arg key "$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT-$GITHUB_JOB" \
  '{repo: $repo, ref: $ref, steps: [$step], idempotencyKey: $key, timeoutSeconds: 5400}')
JOB=$(curl -fsS "${AUTH[@]}" -H "content-type: application/json" -d "$BODY" "$API/jobs" | jq -r .job.id)
echo "MINION job $MINION_URL/jobs/$JOB"
trap 'curl -fsS -X POST "${AUTH[@]}" "$API/jobs/$JOB/cancel" >/dev/null || true' INT TERM

AFTER=0
while true; do
  STATUS=$(curl -fsS "${AUTH[@]}" "$API/jobs/$JOB" | jq -r .job.status)
  LINES=$(curl -fsS "${AUTH[@]}" "$API/jobs/$JOB/logs?after=$AFTER")
  echo "$LINES" | jq -r '.lines[].text'
  AFTER=$(echo "$LINES" | jq -r --argjson a "$AFTER" '[.lines[].seq] | max // $a')
  case "$STATUS" in
    queued|running) sleep 10 ;;
    succeeded) exit 0 ;;
    *) echo "MINION job ended: $STATUS" >&2; exit 1 ;;
  esac
done
