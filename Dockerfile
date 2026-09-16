# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM deps AS dev
ENV ASTRO_TELEMETRY_DISABLED=1
COPY . .
EXPOSE 4321
CMD ["npm", "run", "dev"]

FROM deps AS build
ENV ASTRO_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS preview
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
