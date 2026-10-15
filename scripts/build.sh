#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
pnpm install --frozen-lockfile --ignore-scripts

# 数据库迁移说明
# 本项目使用 SQL 迁移文件 (supabase/migrations/) 而非 Drizzle push
# Drizzle push 会尝试删除未在 schema.ts 中定义的表，这非常危险
# 因此我们不在构建过程中执行数据库迁移

echo "Building the project..."
pnpm run build

echo "Build completed successfully!"
