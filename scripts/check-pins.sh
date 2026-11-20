#!/usr/bin/env bash
# Every action is pinned by commit, every third-party image by digest (M5 task C.4).
#
# A tag is a name the owner of an action or an image can move; a commit and a digest cannot be moved. The
# tag of an action that was repointed at a credential stealer ran in the pipelines that trusted it, and an
# image tag that moves changes what a build or a host runs without a line of this repository changing.
#
#   workflows        every `uses:` is ./local or owner/repo[/path]@<40 hex>
#   Dockerfiles      every FROM is scratch, an earlier stage, or name@sha256:<64 hex>
#   compose, CI      every `image:` is name@sha256:<64 hex>, or built from a ${variable}: an image of this
#                    project, named by its tag at deploy time
#
# A pin keeps its human-readable half (`# v4.4.0`, `postgres:17-alpine@sha256:...`) so a review can see
# what moved. scripts/verify-supply-chain.sh plants a tag and a floating image and requires this to go red.
#
# usage: scripts/check-pins.sh [directory]   (default: the repository)
set -uo pipefail

root="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$root" || exit 2

bad=0
fail() { echo "  UNPINNED  $1:$2  $3"; bad=1; }

# Files, without a dependency directory or a git directory.
find_files() { find . \( -name node_modules -o -name .git -o -name vendor \) -prune -o -type f "$@" -print | sort; }

# --- actions -----------------------------------------------------------------------------------------------
while IFS= read -r f; do
  while IFS= read -r hit; do
    n="${hit%%:*}"; line="${hit#*:}"
    ref="${line#*uses:}"
    ref="${ref%%#*}"                       # drop the trailing "# vX.Y.Z"
    ref="$(echo "$ref" | tr -d " \"'")"
    case "$ref" in
      ./*) continue ;;                     # an action of this repository
    esac
    if ! [[ "$ref" =~ ^[A-Za-z0-9._/-]+@[0-9a-f]{40}$ ]]; then
      fail "$f" "$n" "uses: $ref (a commit is required)"
    fi
  done < <(grep -n '^[[:space:]-]*uses:' "$f" || true)
done < <(find_files \( -path './.github/workflows/*.yml' -o -path './.github/workflows/*.yaml' \))

# --- Dockerfiles -------------------------------------------------------------------------------------------
while IFS= read -r f; do
  stages=" "
  n=0
  while IFS= read -r line || [ -n "$line" ]; do
    n=$((n + 1))
    set -- $line
    [ "${1:-}" = "FROM" ] || [ "${1:-}" = "from" ] || continue
    shift
    while [[ "${1:-}" == --* ]]; do shift; done      # --platform=...
    ref="${1:-}"
    shift
    if [ "${1:-}" = "AS" ] || [ "${1:-}" = "as" ]; then
      alias="${2:-}"
      stages="$stages$(echo "$alias" | tr 'A-Z' 'a-z') "
    fi
    lower="$(echo "$ref" | tr 'A-Z' 'a-z')"
    case "$lower" in scratch) continue ;; esac
    case "$stages" in *" $lower "*) continue ;; esac  # an earlier stage
    if ! [[ "$ref" =~ @sha256:[0-9a-f]{64}$ ]]; then
      fail "$f" "$n" "FROM $ref (a digest is required)"
    fi
  done < "$f"
done < <(find_files \( -name 'Dockerfile' -o -name 'Dockerfile.*' -o -name '*.Dockerfile' \))

# --- compose files and the images of a CI job --------------------------------------------------------------
while IFS= read -r f; do
  while IFS= read -r hit; do
    n="${hit%%:*}"; line="${hit#*:}"
    ref="${line#*image:}"
    ref="${ref%%#*}"
    ref="$(echo "$ref" | tr -d " \"'")"
    case "$ref" in
      '') continue ;;                      # a job or a key that happens to be called image
      *'${'*) continue ;;                  # this project's own image, named at deploy time
    esac
    if ! [[ "$ref" =~ @sha256:[0-9a-f]{64}$ ]]; then
      fail "$f" "$n" "image: $ref (a digest is required)"
    fi
  done < <(grep -n '^[[:space:]-]*image:' "$f" || true)
done < <(find_files \( -name 'compose*.yaml' -o -name 'compose*.yml' -o -name 'docker-compose*.y*ml' \
                       -o -path './.github/workflows/*.yml' -o -path './.github/workflows/*.yaml' \))

if [ "$bad" -ne 0 ]; then
  echo "Something is pinned by a name that can move. Pin it by commit or digest (scripts/check-pins.sh)."
  exit 1
fi
echo "Every action is pinned by commit and every third-party image by digest."
