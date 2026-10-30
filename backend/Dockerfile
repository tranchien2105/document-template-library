FROM node:22-alpine AS dependencies

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json

RUN npm ci

FROM dependencies AS build

COPY backend ./backend

RUN npm run build --workspace backend

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY --from=build /app/backend/dist ./backend/dist
COPY storage/templates ./storage/templates

RUN mkdir -p /app/storage/generated/documents /app/storage/generated/presentations \
  && chown -R node:node /app/storage

USER node

EXPOSE 3001

CMD ["node", "backend/dist/main.js"]
