# Stage 1: Production Nginx Web Server
FROM nginx:alpine

# Set working directory to Nginx html folder
WORKDIR /usr/share/nginx/html

# Clean up default welcome page
RUN rm -rf ./*

# Copy web application assets
COPY src/ .

# Expose HTTP port
EXPOSE 80

# Healthcheck to verify Nginx is actively responding
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
