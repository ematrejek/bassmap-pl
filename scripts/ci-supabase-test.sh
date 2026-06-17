#!/usr/bin/env bash
# CI test runner: requires local Supabase env (SUPABASE_URL, SUPABASE_KEY,
# SUPABASE_SERVICE_ROLE_KEY) – from the shell, from a workflow-written `.env.test`,
# or (locally only) auto-loaded from `.env.test` in the repo root.
#
# Local manual check for "missing env" errors: temporarily rename `.env.test` –
# `unset` alone is not enough because this script reloads `.env.test` when present.
set -euo pipefail

strip_quotes() {
  local value="$1"
  if [[ "${value}" == \"*\" && "${value}" == *\" ]]; then
    value="${value#\"}"
    value="${value%\"}"
  fi
  printf '%s' "${value}"
}

load_env_file() {
  local file="$1"
  local line key value
  while IFS= read -r line || [[ -n "${line}" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    [[ -z "${line}" || "${line}" == \#* ]] && continue
    if [[ "${line}" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      value="$(strip_quotes "${BASH_REMATCH[2]}")"
      export "${key}=${value}"
    fi
  done < "${file}"
}

if [[ -f .env.test ]]; then
  load_env_file .env.test
fi

SKIP_WARNING="$(
  node --experimental-strip-types --input-type=module -e \
    "import { INTEGRATION_SKIP_WARNING_PREFIX } from './tests/helpers/supabase.ts'; process.stdout.write(INTEGRATION_SKIP_WARNING_PREFIX)"
)"

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "ci-supabase-test: missing required env var ${name}" >&2
    echo "Export SUPABASE_URL, SUPABASE_KEY, and SUPABASE_SERVICE_ROLE_KEY from 'supabase status' before running." >&2
    exit 1
  fi
}

require_local_url() {
  local url="$1"
  case "${url}" in
    http://127.0.0.1:* | http://localhost:* | http://\[::1\]:*)
      return 0
      ;;
    *)
      echo "ci-supabase-test: SUPABASE_URL must point to local Supabase (127.0.0.1 or localhost), not production (got: ${url})" >&2
      exit 1
      ;;
  esac
}

require_env SUPABASE_URL
require_env SUPABASE_KEY
require_env SUPABASE_SERVICE_ROLE_KEY
require_local_url "${SUPABASE_URL}"

OUTPUT_FILE="$(mktemp)"
trap 'rm -f "${OUTPUT_FILE}"' EXIT

set +e
npm test 2>&1 | tee "${OUTPUT_FILE}"
TEST_EXIT="${PIPESTATUS[0]}"
set -e

if [[ "${TEST_EXIT}" -ne 0 ]]; then
  echo "ci-supabase-test: npm test failed (exit ${TEST_EXIT})" >&2
  exit "${TEST_EXIT}"
fi

if grep -q "${SKIP_WARNING}" "${OUTPUT_FILE}"; then
  echo "ci-supabase-test: integration suites were skipped – CI requires a full integration run." >&2
  echo "Ensure Supabase is running (supabase start) and env vars match 'supabase status -o env'." >&2
  exit 1
fi

echo "ci-supabase-test: all tests passed (integration suites executed)."
exit 0
