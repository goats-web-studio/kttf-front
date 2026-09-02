# Образ фронтенда KTTF.
#
# На выходе — статика и веб-сервер, который её отдаёт. Никакого Node
# в рантайме: приложение собирается один раз при сборке образа.
#
# Сервер — Caddy, тот же образ, что и у kttf-proxy. Второй веб-сервер в стеке
# означал бы второй синтаксис конфигурации ради одной раздачи файлов.

FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# VITE_API_URL пуст: фронт и API живут на одном домене за Caddy, поэтому
# запросы уходят на тот же origin и CORS не нужен вовсе.
RUN pnpm build

# ---- Раздача ----

FROM caddy:2-alpine AS runtime
COPY --from=build /app/dist /srv
COPY caddy/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
