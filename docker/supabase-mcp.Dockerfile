FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/supabase-mcp ./packages/supabase-mcp
RUN npm install --workspace=@glaciereq/shared --workspace=@glaciereq/supabase-mcp
RUN npm run build -w @glaciereq/shared -w @glaciereq/supabase-mcp

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/supabase-mcp/dist ./dist
COPY --from=builder /app/packages/supabase-mcp/package.json ./
RUN npm install --production
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
