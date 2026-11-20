#!/usr/bin/env bash
# Proves each supply-chain check goes red on a planted finding, and is green without it (M5 task C.4).
#
# A scanner that has never been seen to fail may not be looking. For each check this runs the command the CI
# job runs, first on the repository as it is (it must pass, so a failure can only come from the plant), then
# with one planted finding (it must fail, naming the finding):
#
#   pins   an action by tag, an image without a digest                            scripts/check-pins.sh
#   audit  a dependency with known high-severity advisories                       npm run audit:deps
#
# This SDK has no container image, so it has no image scan.
#
# Run in CI as its own job: that job is green when the checks are red on the plants.
# usage: scripts/verify-supply-chain.sh [pins|audit ...]   (default: both)
set -uo pipefail
cd "$(dirname "$0")/.."
root="$PWD"

FAILED=0
work="$(mktemp -d "${TMPDIR:-/tmp}/verify-supply-chain.XXXXXX")"
cleanup() { rm -rf "$work"; }
trap cleanup EXIT

pass() { echo "  PASS  $1"; }
fail() { echo "  FAIL  $1"; FAILED=1; }

# expect_green <description> <command...>
expect_green() {
  local desc="$1"; shift
  local out
  if out="$("$@" 2>&1)"; then pass "$desc: exit 0"; else
    fail "$desc: expected exit 0, so a plant would prove nothing"
    echo "$out" | tail -15 | sed 's/^/        /'
  fi
}

# expect_red <description> <pattern the output must contain> <command...>
expect_red() {
  local desc="$1" pattern="$2"; shift 2
  local out status
  out="$("$@" 2>&1)"; status=$?
  if [ "$status" -ne 0 ] && grep -q -- "$pattern" <<<"$out"; then
    pass "$desc: exit $status, and it names '$pattern'"
  else
    fail "$desc: expected a failure naming '$pattern' (exit $status)"
    echo "$out" | tail -15 | sed 's/^/        /'
  fi
}

verify_pins() {
  echo "Pins: the repository as it is passes"
  expect_green "check-pins on the repository" scripts/check-pins.sh

  echo "Pins: a planted tag or floating image turns it red"
  plant() { # <name> <sed expression> <file...>   copies the files, applies the expression, prints the directory
    local name="$1" expr="$2"; shift 2
    local dir="$work/pins-$name"
    mkdir -p "$dir"
    local f
    for f in "$@"; do mkdir -p "$dir/$(dirname "$f")"; sed -E "$expr" "$f" > "$dir/$f"; done
    echo "$dir"
  }
  local dir
  dir="$(plant action 's#(uses: actions/checkout)@[0-9a-f]{40}.*#\1@v4#' .github/workflows/ci.yml)"
  expect_red "an action by tag" "uses: actions/checkout@v4 (a commit is required)" scripts/check-pins.sh "$dir"
  dir="$(plant service 's#(image: redis:7-alpine)@sha256:[0-9a-f]{64}#\1#' .github/workflows/ci.yml)"
  expect_red "a CI service image without a digest" "image: redis:7-alpine (a digest is required)" scripts/check-pins.sh "$dir"
}

verify_audit() {
  echo "Vulnerable dependency: the lockfile as it is passes"
  expect_green "npm run audit:deps on the repository" npm run --silent audit:deps

  echo "Vulnerable dependency: a planted dependency with known high-severity advisories turns it red"
  # lodash 4.17.15: prototype pollution (GHSA-p6mc-m468-83gw, high, fixed in 4.17.19) and command injection
  # (GHSA-35jh-r3h4-6jhm, high, fixed in 4.17.21). Planted in a copy of the manifest and the lockfile, so
  # the repository's own files are never edited; the same npm script runs on the copy.
  local dir="$work/audit"
  mkdir -p "$dir"
  cp package.json package-lock.json "$dir/"
  if ! (cd "$dir" && npm install --package-lock-only --ignore-scripts --no-audit --no-fund lodash@4.17.15 >/dev/null 2>&1); then
    fail "could not plant lodash@4.17.15 in the copy of the lockfile"
    return
  fi
  expect_red "lodash 4.17.15 in the lockfile" "GHSA-35jh-r3h4-6jhm" npm --prefix "$dir" run --silent audit:deps
}

targets=("$@"); [ "${#targets[@]}" -gt 0 ] || targets=(pins audit)
for t in "${targets[@]}"; do
  case "$t" in
    pins) verify_pins ;;
    audit) verify_audit ;;
    *) echo "unknown check '$t' (pins, audit)"; exit 2 ;;
  esac
done

if [ "$FAILED" -ne 0 ]; then
  echo "A supply-chain check does NOT behave as required."
  exit 1
fi
echo "Each supply-chain check is green without a plant and red with one."
