# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the backend source
COPY . .

EXPOSE 3000

CMD ["node", "--enable-source-maps", "server.js"]
