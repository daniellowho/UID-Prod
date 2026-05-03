# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app

# Install backend dependencies first for better layer caching
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy the backend source
COPY backend/ .

# Copy the frontend so Express can serve it as static files
COPY frontend/ ../frontend/

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { r.resume(); process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1))"

CMD ["node", "--enable-source-maps", "server.js"]
