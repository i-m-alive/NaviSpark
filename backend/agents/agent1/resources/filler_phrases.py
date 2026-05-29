"""
Reference lists for Writing Quality Analysis (Skill 1.2).
"""

FILLER_PHRASES = [
    "world class", "world-class",
    "best in class", "best-in-class",
    "seamless",
    "robust solution", "robust platform", "robust system", "robust architecture",
    "end-to-end",
    "holistic",
    "synergies", "leverage synergies",
    "cutting-edge", "cutting edge",
    "state-of-the-art", "state of the art",
    "best practices", "best-practice",
    "innovative approach", "innovative solution",
    "customer-centric", "customer centric",
    "trusted partner",
    "future-proof", "future proof",
    "scalable solution",
    "one-stop-shop", "one stop shop",
    "value-added",
    "game changer", "game-changer",
    "thought leader", "thought leadership",
    "360-degree", "360 degree",
    "paradigm shift",
    "proactive approach",
    "agile methodology",  # without specific explanation
]

HIDDEN_ACCOUNTABILITY_PATTERNS = [
    "it will be ensured",
    "steps will be taken",
    "quality will be maintained",
    "issues will be resolved",
    "the team will be responsible",
    "efforts will be made",
    "attention will be given",
    "care will be taken",
    "measures will be implemented",
    "problems will be addressed",
    "the necessary actions will be performed",
    "appropriate action will be taken",
    "the project will be managed",
    "delivery will be assured",
]

UNSUBSTANTIATED_CLAIM_PATTERNS = [
    "deep expertise",
    "proven track record",
    "extensive experience",
    "rich experience",
    "industry-leading",
    "market-leading",
    "unparalleled",
    "best-in-breed",
    "guaranteed results",
    "zero risk",
    "fully automated",
    "100% accurate",
    "we have successfully delivered",  # without naming what
    "our team has worked with",         # without naming who
    "we have helped many clients",      # without specifics
]

def build_filler_prompt_block() -> str:
    """Returns formatted filler phrase reference for prompt injection."""
    lines = [
        "FILLER PHRASES TO FLAG (examples — detect all variants):",
        ", ".join(f'"{p}"' for p in FILLER_PHRASES[:15]) + ", and similar.",
        "",
        "HIDDEN ACCOUNTABILITY PATTERNS TO FLAG:",
        ", ".join(f'"{p}"' for p in HIDDEN_ACCOUNTABILITY_PATTERNS[:8]) + ", and similar.",
        "",
        "UNSUBSTANTIATED CLAIM PATTERNS TO FLAG:",
        ", ".join(f'"{p}"' for p in UNSUBSTANTIATED_CLAIM_PATTERNS[:8]) + ", and similar.",
    ]
    return "\n".join(lines)
