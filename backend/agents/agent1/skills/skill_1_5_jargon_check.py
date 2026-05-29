"""
Skill 1.5 — Jargon Density Check
Flags paragraphs dense with unexplained technical jargon for non-technical buyer industries.
Suppressed entirely for technical buyer industries.
"""

from agents.agent1.resources.jargon_industries import (
    NON_TECHNICAL_BUYER_INDUSTRIES,
    TECHNICAL_BUYER_INDUSTRIES,
    is_jargon_check_active,
)

RESULT_KEYS = ["jargon_flags"]

OUTPUT_SCHEMA = {
    "jargon_flags": [
        {
            "passage": "string — first 20 words of the jargon-dense paragraph",
            "jargon_terms": ["list of unexplained acronyms or technical terms"],
            "plain_language_suggestion": "string — plain-English explanation of what those terms mean in context",
        }
    ]
}

def get_prompt_section(client_industries: list[str]) -> str:
    """
    Returns the jargon check prompt section if active for the given industries.
    Returns a suppression note if the industry is technical.
    """
    if not is_jargon_check_active(client_industries):
        return """
═══════════════════════════════════════════════════
SKILL 1.5 — JARGON DENSITY CHECK
═══════════════════════════════════════════════════

SUPPRESSED: The selected client industry ({industries}) is a technical buyer.
Jargon density check does not apply. Return jargon_flags as an empty array.
""".format(industries=", ".join(client_industries))

    non_tech_match = [i for i in client_industries if i in NON_TECHNICAL_BUYER_INDUSTRIES]

    return f"""
═══════════════════════════════════════════════════
SKILL 1.5 — JARGON DENSITY CHECK
═══════════════════════════════════════════════════

ACTIVATED: The selected industry ({", ".join(non_tech_match)}) indicates a non-technical buyer.

A CFO at a government ministry, a VP Operations at a hospital, or a retail chain director
cannot be expected to sign off on a proposal they cannot understand.

WHAT TO FLAG:
Flag paragraphs where:
- More than 3 undefined technical acronyms appear in a single paragraph
- A sentence would require a software engineering background to understand
- Technical jargon is used without any plain-language translation elsewhere in the document

EXAMPLE of a paragraph to flag:
"We will deploy a microservices-based EKS cluster with Istio service mesh, mTLS between services,
and a GitOps-driven CI/CD pipeline using ArgoCD for continuous reconciliation."
— A non-technical executive cannot evaluate this or explain it to their board.

SAP-SPECIFIC JARGON — FLAG THESE if used without plain-language explanation:
These SAP transaction codes are opaque to Finance and Procurement buyers who are not SAP power users:
  MIRO (Logistics Invoice Verification), MIGO (Goods Receipt posting), MIRO (invoice entry),
  F-53 / F-44 (vendor payment / clearing transactions), FB60 (direct FI invoice posting),
  FBL1N (vendor open items report), F-47 / F-48 (down payment request / posting),
  OData / NetWeaver Gateway (SAP's API layer), GR-IR clearing (Goods Receipt–Invoice Receipt reconciliation),
  S/4HANA RISE (SAP's cloud ERP product), SOA (Statement of Account — not Service Oriented Architecture here).
A CFO or AP Head approving this proposal may not know these codes. If they appear in sections
a decision-maker must read (Executive Summary, Solution Overview, Benefits section) without
explanation, flag them.

FOR EACH FLAG:
- Quote the first 20 words of the problematic paragraph
- List the specific jargon terms that are unexplained
- Provide a plain-English suggestion for what those terms mean in this context

Do NOT flag sections clearly marked as "Technical Architecture" if they are in a technical appendix
labelled for the client's IT team. Only flag sections the decision-maker must read and sign off on.

If jargon is explained clearly in the same document, do NOT flag it.
Return an empty array if no jargon density issues found.
"""
