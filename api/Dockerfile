# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root prisma schema
COPY prisma ./prisma

# Copy API package files
COPY api/package.json api/package-lock.json* ./api/

WORKDIR /app/api
RUN npm install

# Generate Prisma client
RUN npx prisma generate --schema=../prisma/schema.prisma

# Copy API source
COPY api/tsconfig.json ./
COPY api/src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

COPY prisma ./prisma
COPY api/package.json api/package-lock.json* ./api/

WORKDIR /app/api
RUN npm install --omit=dev
RUN npx prisma generate --schema=../prisma/schema.prisma

COPY --from=builder /app/api/dist ./dist
COPY api/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

CMD ["./entrypoint.sh"]
