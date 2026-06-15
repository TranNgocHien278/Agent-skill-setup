# Graphiti Temporal Knowledge Graphs

> **Source**: `sources/github/graphiti/`
> **License**: Apache 2.0
> **Use when**: Building AI agent memory systems, temporal knowledge graphs, long-term context management

> [!NOTE]
> Graphiti is a runtime framework. Using it requires: `pip install graphiti-core` + Neo4j + OpenAI API key.
> See init requirements in `setup.ps1` output.

## Overview
Graphiti builds temporally-aware knowledge graphs from unstructured data, designed as long-term memory for AI agents. It tracks how facts change over time and supports hybrid search.

## Key Concepts
- **Episodes**: Raw source data (conversations, documents, JSON)
- **Entities/Nodes**: People, products, concepts extracted from episodes
- **Facts/Edges**: Relationships with temporal metadata (valid_from, valid_to)
- **Bi-temporal model**: Tracks both when facts were true and when they were recorded
- **Hybrid retrieval**: Semantic similarity + BM25 + graph traversal

## Architecture
- Python framework (`graphiti-core`)
- Neo4j graph database backend
- LLM-powered entity extraction and resolution
- MCP server for direct agent integration

## Use Cases
1. **Agent memory**: Persistent context across sessions
2. **Conversation history**: Track evolving topics and decisions
3. **Document analysis**: Extract and query relationships from documents
4. **Temporal reasoning**: Answer "what was true at time X?"

## Init Requirements
```bash
pip install graphiti-core
docker run -d --name neo4j -p 7474:7474 -p 7687:7687 neo4j
# Set environment variables:
# NEO4J_URI=bolt://localhost:7687
# NEO4J_USER=neo4j
# NEO4J_PASSWORD=your_password
# OPENAI_API_KEY=your_key
```

## Full Documentation
See README and examples at: `sources/github/graphiti/`
