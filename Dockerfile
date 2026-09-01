# ===== 階段 1：建置階段 (Build Stage) =====
FROM node:22-alpine AS builder

WORKDIR /app

# 安裝 native 模組 (better-sqlite3) 所需編譯工具
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY apps/workbench/package.json ./apps/workbench/package.json
COPY packages/api-client/package.json ./packages/api-client/package.json
RUN npm ci

COPY . .

# 產出 dist/ 與 dist/standalone/
RUN npm run build

# 移除非必要的 devDependencies，清理 npm 快取
RUN npm prune --omit=dev && npm cache clean --force

# ===== 階段 2：極簡執行階段 (Lightweight Runner Stage) =====
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV DATABASE_FILE=/app/data/mobile-pulse.sqlite
ENV PAYLOAD_DATABASE_FILE=/app/data/cms.sqlite
ENV MEDIA_DIR=/app/media

# 複製 Next.js standalone 產物與 runtime 依賴，runner 完全不需要安裝編譯器
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json

# 建立持久化資料庫與媒體存放目錄
RUN mkdir -p /app/data /app/media

EXPOSE 3000

# 啟動時自動套用 migration，隨後啟動獨立伺服器
CMD ["sh", "-c", "node scripts/migrate.mjs && node server.js"]
