# One image serves the API and the exported Expo web app on $PORT (default 3000).
FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=1
RUN corepack enable
WORKDIR /repo

# Full install only to export the web app.
FROM base AS web
COPY . .
RUN pnpm install --frozen-lockfile
# Web talks to its own origin, so no API URL is baked in.
RUN cd apps/app && npx expo export --platform web --output-dir dist

# Runtime: only the server, the shared core and their production deps.
FROM base AS runtime
ENV NODE_ENV=production WEB_DIST=/repo/web PORT=3000
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/core packages/core
COPY apps/server apps/server
RUN pnpm install --frozen-lockfile --prod --filter @thebuyins/server... && rm -rf "$PNPM_HOME/store" /root/.cache
COPY --from=web /repo/apps/app/dist /repo/web
WORKDIR /repo/apps/server
EXPOSE 3000
CMD ["pnpm", "start"]
