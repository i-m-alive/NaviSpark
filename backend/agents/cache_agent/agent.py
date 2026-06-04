"""
Cache Agent — seeds the Bedrock prompt cache with the proposal document
before specialist agents run. Placed at the top of both pipelines.

On first run  → cache_creation_input_tokens > 0  (document cached, normal cost)
On re-analysis → cache_read_input_tokens    > 0  (~10% of normal token cost)
"""

import logging
from bedrock_client import prewarm_document_cache

logger = logging.getLogger(__name__)


def run(
    pdf_bytes: bytes,
    file_type: str = "pdf",
    sid: str = "",
    emit=None,
) -> dict:
    """
    Pre-warms the Bedrock prompt cache for the proposal document.

    Returns a dict with cache metrics:
      cache_creation_input_tokens, cache_read_input_tokens,
      input_tokens, output_tokens, cache_active (bool)
    """
    _emit = emit if callable(emit) else (lambda msg, status="running": None)

    _emit("Cache Agent: seeding Bedrock prompt cache with proposal document")
    logger.info("[CACHE_AGENT] [%s] Starting document cache pre-warm (file_type=%s)", sid, file_type)

    stats = prewarm_document_cache(pdf_bytes=pdf_bytes, file_type=file_type, sid=sid)

    created = stats.get("cache_creation_input_tokens", 0)
    read    = stats.get("cache_read_input_tokens", 0)
    active  = created > 0 or read > 0

    if created > 0:
        _emit(f"Cache Agent: document cached ({created:,} tokens stored — re-analysis will cost ~10%)", "completed")
        logger.info("[CACHE_AGENT] [%s] Cache WRITTEN — %d tokens stored", sid, created)
    elif read > 0:
        _emit(f"Cache Agent: cache hit ({read:,} tokens read at ~10% cost)", "completed")
        logger.info("[CACHE_AGENT] [%s] Cache HIT — %d tokens read from cache", sid, read)
    else:
        _emit("Cache Agent: no cache activity (caching may not be enabled for this model/region)", "completed")
        logger.warning("[CACHE_AGENT] [%s] No cache activity — check model/region supports prompt caching", sid)

    return {**stats, "cache_active": active}
