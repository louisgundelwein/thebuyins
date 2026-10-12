# One image serves the API and the exported Expo web app on $PORT (default 3000).
FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=1
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
# Web talks to its own origin, so no API URL is baked in.
RUN cd apps/app && npx expo export --platform web --output-dir dist

FROM base AS runtime
ENV NODE_ENV=production WEB_DIST=/repo/apps/app/dist PORT=3000
COPY --from=build /repo /repo
RUN pnpm install --frozen-lockfile --prod --filter @thebuyins/server... \
 && rm -rf apps/app/node_modules apps/app/src apps/app/assets
WORKDIR /repo/apps/server
EXPOSE 3000
CMD ["pnpm", "start"]
