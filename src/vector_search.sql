-- PostgreSQL + pgvector Schema for Sovereign MCP Knowledge Base
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS mcp_embedding_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_chunk TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS mcp_vector_hnsw_idx 
ON mcp_embedding_store 
USING hnsw (embedding vector_cosine_ops);
