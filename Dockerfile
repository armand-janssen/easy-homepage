FROM node:24-alpine

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@8.15.0

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Build the stylesheet (needs dev dependencies), then keep only production dependencies
RUN pnpm install --frozen-lockfile
COPY public/ ./public/
COPY tailwind.config.js ./
RUN pnpm build:css && pnpm prune --prod

# Copy source code
COPY src/ ./src/

# Stamp the build date shown in the GUI
RUN date -u +%Y-%m-%d > BUILD_DATE

# Create logos directory
RUN mkdir -p logos

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "src/app.js"]
