FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/github-mcp ./packages/github-mcp
RUN npm install --workspace=@glaciereq/shared --workspace=@glaciereq/github-mcp
RUN npm run build -w @glaciereq/shared -w @glaciereq/github-mcp

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/github-mcp/dist ./dist
COPY --from=builder /app/packages/github-mcp/package.json ./
RUN npm install --production
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
