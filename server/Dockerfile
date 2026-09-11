# ---- Backend: MIST Avinya / SalesEdge API ----
FROM node:20-alpine

# App runs in Asia/Kolkata; install tzdata so process.env.TZ resolves correctly
RUN apk add --no-cache tzdata
ENV TZ=Asia/Kolkata

WORKDIR /app

# Install production dependencies first for better layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

# Basic container healthcheck against the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src.js"]
