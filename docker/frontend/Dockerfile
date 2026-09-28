# ==============================================================================
# ABHI FRONTEND DOCKERFILE - MULTI-STAGE PRODUCTION BUILD
# Stage 1: Angular 22 Production Build (Node 22 Alpine)
# Stage 2: Minimal Static Runtime (Nginx 1.27 Alpine)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Environment
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package descriptors first to maximize Docker build layer caching
COPY frontend/package*.json ./

# Clean install dependencies
RUN npm ci

# Copy full frontend source code
COPY frontend/ ./

# Build optimized production bundle
RUN npm run build -- --configuration production

# ------------------------------------------------------------------------------
# Stage 2: Production Nginx Runtime
# ------------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Remove default Nginx HTML pages and configuration
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY docker/frontend/nginx.conf /etc/nginx/nginx.conf

# Copy compiled Angular distribution from builder stage
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

# Expose HTTP port 80 inside container
EXPOSE 80

# Health check verifying HTTP responsiveness
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/health || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
