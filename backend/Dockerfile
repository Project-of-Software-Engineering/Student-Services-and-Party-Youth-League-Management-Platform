FROM node:22-alpine AS build

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json

RUN npm ci

COPY backend ./backend

RUN npm --workspace backend run prisma:generate \
  && npm --workspace backend run build

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma

WORKDIR /app/backend

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && node dist/main.js"]
