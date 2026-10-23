# Root-level entry point for the standalone selfhosted-chat app.
# This lets deployment run from the repository root: docker build -t openui-selfhosted-chat:1.0 .
FROM node:24-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

# Native build tools are needed if better-sqlite3 has no prebuilt binary.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY selfhosted-chat/package.json ./package.json
# Install devDependencies for TypeScript checks and the Next.js build; prune them after build.
RUN npm install --include=dev

COPY selfhosted-chat/ ./
RUN npm run typecheck && npm run build && npm prune --omit=dev

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATA_DIR=/data

RUN mkdir -p /data && chown -R node:node /app /data
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "run", "start"]
