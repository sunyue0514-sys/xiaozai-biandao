#!/bin/bash
set -Eeuo pipefail
cd "${COZE_WORKSPACE_PATH:-$(pwd)}"
exec pnpm next dev --webpack --port "${DEPLOY_RUN_PORT:-5000}"
