"""
Industry routing for Jargon Density Check (Skill 1.5).
Determines whether jargon check should activate based on the buyer's
assumed technical literacy.
"""

NON_TECHNICAL_BUYER_INDUSTRIES = [
    "Healthcare / Pharma",
    "Government / Public Sector",
    "Retail / E-commerce",
    "Education",
    "Real Estate",
    "Logistics / Supply Chain",
    # Manufacturing Finance/AP/ERP buyers (CFO, AP Head, Finance Controller) are NOT
    # technical users. SAP transaction codes, cloud architecture terms, and API jargon
    # must be explained for the decision-making audience in a Manufacturing company.
    "Manufacturing",
]

TECHNICAL_BUYER_INDUSTRIES = [
    "Fintech / Banking",
    "Deep Tech / AI",
]

def is_jargon_check_active(client_industries: list[str]) -> bool:
    """
    Returns True if the jargon check should run.

    Rules:
    - If ANY selected industry is in TECHNICAL_BUYER_INDUSTRIES → suppress (return False).
    - If ANY selected industry is in NON_TECHNICAL_BUYER_INDUSTRIES → activate (return True).
    - If industry not in either list → default to activating.
    """
    for ind in client_industries:
        if ind in TECHNICAL_BUYER_INDUSTRIES:
            return False
    for ind in client_industries:
        if ind in NON_TECHNICAL_BUYER_INDUSTRIES:
            return True
    return len(client_industries) > 0
