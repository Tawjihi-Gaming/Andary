# Build stage
FROM node:lts-alpine AS builder

# Set working directory
WORKDIR /app

# Copy source code
COPY frontend .

# Install dependencies
RUN npm ci

# build the app
RUN npm run build

FROM nginx:stable-alpine3.23 AS production

COPY --from=builder /app/dist /var/www/andary/html

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/conf.d/ /etc/nginx/conf.d/

RUN mkdir -p /etc/ssl

COPY nginx/cert.pem /etc/ssl
COPY nginx/key.pem /etc/ssl

EXPOSE 8080 4443
