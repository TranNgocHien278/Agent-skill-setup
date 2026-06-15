# Skill Test Issues Report

**Date:** 2026-06-16  
**Scope:** Initial connectivity tests for Graphiti, Mem0, and CocoIndex  
**Excluded:** API key / credential errors (user configuration)

---

## Summary

During the first end-to-end test of the AgentOS skill stack, 7 distinct issues were
encountered that were unrelated to API key misconfiguration. They fall into four
categories: library version mismatch, API surface changes, environment constraints,
and LLM provider compatibility.

---

## Issue 1 — CocoIndex: Skill Written for v0, Library at v1

**Severity:** Critical (blocked all progress)  
**Category:** Version mismatch

### What happened
The skill file referenced `cocoindex.flow_def`, which does not exist in v1:
```
AttributeError: module 'cocoindex' has no attribute 'flow_def'
```

### Root cause
The wrapper skill (`skills/ai-agents/cocoindex-rag-pipeline.md`) was authored against
CocoIndex v0. The installed package (`cocoindex==1.0.10`) is a full redesign (v1) with a
completely different public API:

| v0 | v1 |
|---|---|
| `@cocoindex.flow_def` | `coco.App(coco.AppConfig(...), main_fn)` |
| Implicit pipeline | `@coco.fn`, `@coco.lifespan`, `coco.mount_each` |
| N/A | `COCOINDEX_DB` env var required for LMDB state path |

### Fix applied
Rewrote the test script from scratch using `sources/github/cocoindex/AGENTS.md` and the
`examples/text_embedding/main.py` example as ground truth.

### Recommendation
Add a `verified_version` field to skill files. Pin to the major version that was tested.
Example: `> **Verified:** cocoindex==1.0.x (v1 API)`

---

## Issue 2 — Mem0: `search()` Parameter API Change

**Severity:** Medium (test failure, easy fix)  
**Category:** API surface change

### What happened
```python
# Skill documented this pattern:
results = client.search("query", user_id="agentos_test")

# Actual API in mem0ai==2.0.6:
ValueError: Top-level entity parameters frozenset({'user_id'}) are not supported
in search(). Use filters={'user_id': '...'} instead.
```

### Root cause
The `mem0ai` platform client changed the `search()` signature between versions. The skill
file documented the older parameter style. The managed API endpoint was updated but the
SDK wrapper was not mirrored in the skill.

### Fix applied
```python
results = client.search("query", filters={"user_id": "agentos_test"})
```

### Recommendation
Skill files that document SDK method signatures should include the version they were
verified against and link to the changelog.

---

## Issue 3 — Mem0: Search Result Object Not Directly Indexable

**Severity:** Low (one-liner fix)  
**Category:** API surface change

### What happened
After fixing Issue 2, accessing the first result by index raised:
```
KeyError: 0
```
The `search()` return value in v2.0.6 is not a plain `list` — it is a dict-like response
object that requires iteration rather than integer indexing.

### Fix applied
```python
first = results[0] if isinstance(results, list) else list(results)[0]
```

---

## Issue 4 — Graphiti: `add_episode()` Missing Required `reference_time`

**Severity:** Medium (immediate crash)  
**Category:** Skill documentation gap

### What happened
```
TypeError: Graphiti.add_episode() missing 1 required positional argument: 'reference_time'
```

### Root cause
The skill file shows a simplified call signature without `reference_time`. The actual
`graphiti-core==0.29.2` method signature requires it:
```python
await client.add_episode(
    name="...",
    episode_body="...",
    source_description="...",
    reference_time=datetime.now(timezone.utc),  # required, not shown in skill
)
```

### Fix applied
Added `reference_time=datetime.now(timezone.utc)` to the call.

### Recommendation
Skill code snippets should be copy-paste runnable, not illustrative pseudocode.

---

## Issue 5 — Graphiti: `json_schema` Structured Output Incompatible with Proxy Model

**Severity:** High (silent data corruption)  
**Category:** LLM provider compatibility

### What happened
Using `OpenAIGenericClient` with default `structured_output_mode='json_schema'` caused
the model (`gh/gemini-2.5-pro` served via local OpenAI-compatible proxy) to return a
JSON array instead of the expected object:
```
TypeError: graphiti_core.prompts.extract_nodes.ExtractedEntities()
argument after ** must be a mapping, not list
```

### Root cause
`json_schema` mode relies on constrained decoding at the API level. The local proxy does
not enforce the schema server-side, so the model returns its native output format which
happened to be a list. The skill/config did not document this limitation.

### Fix applied
```python
llm_client = OpenAIGenericClient(
    config=LLMConfig(...),
    structured_output_mode='json_object',  # injects schema into prompt instead
)
```

### Recommendation
Document the `structured_output_mode` requirement in the Graphiti skill for users
running non-OpenAI-native backends (local proxies, vLLM, Ollama, etc.).

---

## Issue 6 — CocoIndex: pgvector `ivfflat` Index Dimension Limit

**Severity:** Medium (feature degradation)  
**Category:** Library constraint undocumented

### What happened
Calling `target.declare_vector_index(column="embedding")` raised:
```
asyncpg.exceptions.ProgramLimitExceededError:
column cannot have more than 2000 dimensions for ivfflat index
```
The embedding model (`gemini/gemini-embedding-2-preview`) produces 3072-dimensional
vectors. pgvector's `ivfflat` index type supports a maximum of 2000 dimensions.

### Fix applied
Removed `declare_vector_index` for the test. Rows are inserted with the full embedding
but without a vector similarity index.

### Long-term options
- Request lower dimensions from the embedding endpoint (`dimensions=768`)
- Use `hnsw` index type (also limited to 2000 by default, but configurable)
- Reduce embedding model to one that outputs ≤2000 dims

### Recommendation
Add a note to the CocoIndex skill: *"If using high-dimension embedding models (>2000
dims), pgvector ivfflat indexing is not supported. Store without index or reduce
embedding dimensions."*

---

## Issue 7 — Windows: Unicode Encoding Error in Console Output

**Severity:** Low (test script only, not production)  
**Category:** Environment / platform

### What happened
```
UnicodeEncodeError: 'charmap' codec can't encode character '✓'
in position 0: character maps to <undefined>
```
The checkmark character `✓` (U+2713) is not in the Windows cp1252 codepage used by
the default Python console on this machine.

### Fix applied
Replaced all `✓` with `[OK]` / `[PASS]` in test scripts.

### Recommendation
Test scripts should use ASCII-only output, or set `PYTHONIOENCODING=utf-8` in the
environment. Skill-provided example scripts should avoid non-ASCII characters in
`print()` calls.

---

## Cross-Cutting Observations

### Skill files lag library releases
Four of the seven issues stem from skills that were not updated when the underlying
library changed (CocoIndex v0→v1, Mem0 v1→v2 search API). Skills need a maintenance
process — either automated smoke tests or a documented re-verification cadence.

### Source > Wrapper
In every case where the skill wrapper was wrong, reading the library's own `AGENTS.md`,
`CLAUDE.md`, or `examples/` directory gave the correct answer immediately. When a
skill-documented pattern fails twice, the right move is to fall back to the source repo,
not to patch the wrapper call.

### Windows is a first-class gap
None of the skill files mention Windows-specific constraints (encoding, path quoting,
Docker networking). This caused repeated friction throughout the session.

---

## Files Modified / Created

| File | Purpose |
|---|---|
| `scripts/test_graphiti.py` | Graphiti connectivity test |
| `scripts/test_mem0.py` | Mem0 managed API test |
| `scripts/test_cocoindex.py` | CocoIndex pipeline test |
| `config/.env` | Added `LLM_MODEL_NAME`, `EMBEDDER_MODEL_NAME` |
| `memory/project_stack_setup.md` | Persisted setup state for future sessions |
