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

CMD ["node", "--enable-source-maps", "server.js"]
