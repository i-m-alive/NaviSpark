# Compatibility shim — Agent 3 is implemented in agents/agent3/
# This file is kept so any direct imports of AGENT3_SYSTEM_PROMPT continue to work.
# New code should import from agents.agent3 directly.

from agents.agent3.agent import compose_system_prompt as _compose

# Build a default prompt with no client context for backwards compatibility
AGENT3_SYSTEM_PROMPT = _compose(
    client_industry=[],
    proposal_type="",
    client_priorities=[],
)
