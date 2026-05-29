# Compatibility shim — Agent 1 is now implemented in agents/agent1/
# This file is kept so any direct imports of AGENT1_SYSTEM_PROMPT continue to work.
# New code should import from agents.agent1 directly.

from agents.agent1.agent import compose_system_prompt as _compose

# Build a default prompt with no client context for backwards compatibility
AGENT1_SYSTEM_PROMPT = _compose(
    client_industry=[],
    proposal_type="",
    client_priorities=[],
)
