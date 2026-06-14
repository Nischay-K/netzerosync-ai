# Stage 1: Build TypeScript source code
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY index.ts ./
RUN npm run build

# Stage 2: Production release
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist

# Expose port (default Cloud Run port is 8080)
EXPOSE 8080

# Run server
CMD [ "npm", "start" ]
