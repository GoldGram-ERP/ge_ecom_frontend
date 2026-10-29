#!/usr/bin/env bash
# Builds the Hostinger upload (app.zip) for this Next.js app, ready-made, and proves it starts.
#
# Hostinger's build servers have GLIBC 2.28, which Next 16 cannot compile on, so the app is built
# here (Linux, in Docker) as a standalone server and uploaded prebuilt: the zip's "build" script is
# a no-op. Needs only git and Docker. Builds the committed HEAD, never uncommitted files.
#
#   API_URL=https://goldgram-api.178-16-130-122.sslip.io scripts/hostinger-zip.sh [out.zip] [test path]
#
# API_URL is baked into the /api rewrite at build time (next.config.ts), so it must be the live
# backend. Then upload out.zip as app.zip and start a Node.js build (Next.js, pnpm, Node 22, output
# .next); Hostinger finds the standalone server and publishes it.
set -euo pipefail

: "${API_URL:?Set API_URL to the backend the /api rewrite should reach}"
OUT="$(realpath -m "${1:-app.zip}")"
TEST_PATH="${2:-/}"
NODE_IMAGE="node:22"
ROOT="$(git rev-parse --show-toplevel)"
WORK="$(mktemp -d)"
trap 'docker rm -f hostinger-zip-test >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT

echo "==> Source: $(git -C "$ROOT" log -1 --format='%h %s')"
git -C "$ROOT" archive HEAD | tar -x -C "$WORK"

# A flat node_modules: pnpm's default symlinked layout does not survive being zipped, and the
# standalone server then dies with "Cannot find module 'next'". pnpm 11 reads this setting from
# pnpm-workspace.yaml only; the zip gets the original file back below.
cp "$WORK/pnpm-workspace.yaml" "$WORK/pnpm-workspace.original.yaml"
printf '\nnodeLinker: hoisted\n' >> "$WORK/pnpm-workspace.yaml"

echo "==> Building in $NODE_IMAGE"
docker run --rm -v "$WORK:/app" -w /app -e CI=true -e NEXT_TELEMETRY_DISABLED=1 \
  -e NEXT_OUTPUT=standalone -e API_URL="$API_URL" "$NODE_IMAGE" sh -c '
    set -e
    npm i -g pnpm@11 >/dev/null 2>&1
    pnpm install --frozen-lockfile
    pnpm build
    cp -r public .next/standalone/public
    mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/static
    # What Hostinger publishes: package.json (build: a no-op), the lockfile, public and .next.
    python3 - <<"PY"
import json, os, zipfile
pkg = json.load(open("package.json"))
pkg["scripts"]["build"] = "node -e 0"
with zipfile.ZipFile("/app/app.zip", "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("package.json", json.dumps(pkg, indent=2) + "\n")
    z.write("pnpm-workspace.original.yaml", "pnpm-workspace.yaml")
    z.write("pnpm-lock.yaml")
    for top in ("public", ".next"):
        for root, dirs, files in os.walk(top):
            if root == ".next":
                dirs[:] = [d for d in dirs if d != "cache"]
            for name in files:
                z.write(os.path.join(root, name))
PY
    chown -R "$(stat -c %u:%g /app)" /app'

LINKS=$(find "$WORK/.next/standalone" -type l | wc -l)
[ "$LINKS" -eq 0 ] || { echo "ERROR: $LINKS symlinks in the standalone output; it would not start on Hostinger." >&2; exit 1; }

echo "==> Testing the zip itself: unzip, start the server, request $TEST_PATH"
mkdir -p "$WORK/test" && (cd "$WORK/test" && python3 -c 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(".")' "$WORK/app.zip")
docker run -d --name hostinger-zip-test -v "$WORK/test/.next/standalone:/app:ro" -w /app \
  -e PORT=3999 -e HOSTNAME=0.0.0.0 -e API_URL="$API_URL" "$NODE_IMAGE" node server.js >/dev/null
for _ in $(seq 1 30); do
  if docker exec hostinger-zip-test node -e "fetch('http://localhost:3999$TEST_PATH').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    cp "$WORK/app.zip" "$OUT"
    echo "==> OK: $OUT ($(du -h "$OUT" | cut -f1)), tested $TEST_PATH. Upload it to Hostinger as app.zip."
    exit 0
  fi
  sleep 1
done
echo "ERROR: the zipped server did not answer $TEST_PATH. Its log:" >&2
docker logs hostinger-zip-test 2>&1 | tail -20 >&2
exit 1
