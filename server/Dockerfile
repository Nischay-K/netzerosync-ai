# Use official Node.js lightweight image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies in production mode
RUN npm ci --only=production

# Copy source code
COPY index.js .

# Expose port (default Cloud Run port is 8080)
EXPOSE 8080

# Run server
CMD [ "npm", "start" ]
