FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/asana-mcp ./packages/asana-mcp
RUN npm install --workspace=@glaciereq/shared --workspace=@glaciereq/asana-mcp
RUN npm run build -w @glaciereq/shared -w @glaciereq/asana-mcp

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/asana-mcp/dist ./dist
COPY --from=builder /app/packages/asana-mcp/package.json ./
RUN npm install --production
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
