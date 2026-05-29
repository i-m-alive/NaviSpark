# Compatibility shim — Agent 2 is implemented in agents/agent2/
# This file is kept so any direct imports of AGENT2_SYSTEM_PROMPT continue to work.
# New code should import from agents.agent2 directly.

from agents.agent2.agent import compose_system_prompt as _compose

# Build a default prompt with no client context for backwards compatibility
AGENT2_SYSTEM_PROMPT = _compose(
    client_industry=[],
    proposal_type="",
    client_priorities=[],
)
