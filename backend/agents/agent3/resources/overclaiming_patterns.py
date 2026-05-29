"""
Overclaiming and generic differentiator patterns for Skill 3.4.
Mirrors filler_phrases.py in Agent 1 — but focused on credibility-damaging
claims rather than general writing quality.
"""

# Phrases that damage credibility when used without supporting evidence.
# A procurement director who reads these without proof becomes sceptical.
OVERCLAIMING_PHRASES = [
    "guaranteed",
    "zero risk",
    "zero defects",
    "fully automated",
    "100% automated",
    "industry leading",
    "industry-leading",
    "market leading",
    "market-leading",
    "world class",
    "world-class",
    "best in class",
    "best-in-class",
    "unparalleled",
    "unmatched",
    "second to none",
    "proven track record",      # without citing what was proven
    "deep expertise",           # without specifying the domain
    "extensive experience",     # without naming specific engagements
    "rich experience",
    "vast experience",
    "100% on time",
    "100% on budget",
    "always deliver",
    "never failed",
    "guaranteed ROI",
    "guaranteed results",
    "fully compliant",          # without naming the standard
    "fully secure",             # without specifying controls
    "enterprise grade",         # without definition
    "cutting edge",
    "cutting-edge",
    "state of the art",
    "state-of-the-art",
]

# Phrases that sound like differentiators but are meaningless —
# any competitor can claim these without evidence.
GENERIC_DIFFERENTIATOR_PHRASES = [
    "trusted partner",
    "we are a trusted partner",
    "customer-centric",
    "customer centric",
    "client-centric",
    "people first",
    "we put clients first",
    "end-to-end solutions",
    "end to end",
    "one-stop-shop",
    "one stop shop",
    "full-service",
    "full service",
    "we leverage synergies",
    "we leverage",
    "holistic approach",
    "collaborative approach",
    "agile methodology",        # without explaining how it applies to this engagement
    "innovative solutions",
    "innovative approach",
    "thought leaders",
    "thought leadership",
    "we are passionate about",
    "we are committed to",
    "we strive to",
    "we aim to",
    "value-added services",
    "seamless integration",
    "seamless experience",
    "digital transformation",   # without specifying what is being transformed
    "best practices",
]


def build_overclaiming_prompt_block() -> str:
    """Returns formatted reference lists for prompt injection."""
    lines = [
        "OVERCLAIMING PHRASES TO FLAG (flag when used without specific, verifiable evidence):",
        ", ".join(f'"{p}"' for p in OVERCLAIMING_PHRASES[:16]) + ", and similar.",
        "",
        "GENERIC DIFFERENTIATOR PHRASES TO FLAG (sound distinctive but any competitor can claim these):",
        ", ".join(f'"{p}"' for p in GENERIC_DIFFERENTIATOR_PHRASES[:14]) + ", and similar.",
    ]
    return "\n".join(lines)
