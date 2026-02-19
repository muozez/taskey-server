FROM node:20-alpine

# curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Dependencies first (layer cache)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Application source
COPY . .

# Non-root user
RUN addgroup -S taskey && adduser -S taskey -G taskey && \
    chown -R taskey:taskey /app
USER taskey

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/stats || exit 1

CMD ["node", "server.js"]
