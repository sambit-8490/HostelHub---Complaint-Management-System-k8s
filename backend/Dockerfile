FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# npm install regenerates the lockfile as needed, unlike npm ci
RUN npm install --omit=dev && npm cache clean --force

COPY . .

FROM node:20-alpine

RUN apk add --no-cache curl

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

WORKDIR /app

COPY --from=builder /app /app

USER nodejs

EXPOSE 5000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["node", "server.js"]
