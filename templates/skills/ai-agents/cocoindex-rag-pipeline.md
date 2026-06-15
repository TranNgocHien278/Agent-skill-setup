# CocoIndex RAG Pipeline

> **Source**: `sources/github/cocoindex/skills/cocoindex/SKILL.md`
> **License**: Apache 2.0
> **Use when**: Building RAG pipelines, data indexing, semantic search infrastructure

> [!NOTE]
> CocoIndex is a runtime library. Using it requires: `pip install cocoindex[embeddings]` + PostgreSQL with pgvector.
> See init requirements in `setup.ps1` output.

## Overview
Teaches the agent how to build incremental data indexing pipelines with CocoIndex for RAG (Retrieval-Augmented Generation) applications.

## Key Concepts
- **Mental model**: Target = F(Source) — declarative data transformation
- **Core APIs**: `@coco.fn`, `mount`, `mount_each`, `ContextKey`, `@coco.lifespan`
- **Incremental processing**: Only re-indexes changed data
- **Connectors**: Local files, S3, Google Drive, Postgres
- **Targets**: LanceDB, Qdrant, Postgres+pgvector, Neo4j

## Common Patterns
1. File -> Chunk -> Embed -> Vector Store
2. Document -> Extract entities -> Knowledge Graph
3. Code -> AST parse -> Semantic search index

## Init Requirements
```bash
pip install -U "cocoindex[embeddings]"
# Set environment variable:
# COCOINDEX_DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
# First run: cocoindex update --setup main.py
```

## Full Instructions
Read the complete skill file at: `sources/github/cocoindex/skills/cocoindex/SKILL.md`
