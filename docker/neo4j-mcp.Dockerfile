FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/neo4j-mcp ./packages/neo4j-mcp
RUN npm install --workspace=@glaciereq/shared --workspace=@glaciereq/neo4j-mcp
RUN npm run build -w @glaciereq/shared -w @glaciereq/neo4j-mcp

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/neo4j-mcp/dist ./dist
COPY --from=builder /app/packages/neo4j-mcp/package.json ./
RUN npm install --production
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
