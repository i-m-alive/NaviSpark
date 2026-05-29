"""
Skill 3.3 — Risk & Dependency Transparency
Evaluates whether the proposal is honest about complexity and whether risks
are specific with named mitigations rather than vague acknowledgements.
Covers GSK Proposal items P-14 (dependencies), P-16 (assumptions + impact),
P-20 (risk register with mitigation), P-21 (what vendor needs from client before start).
"""

RESULT_KEYS = ["risk_transparency_issues"]

OUTPUT_SCHEMA = {
    "risk_transparency_issues": [
        {
            "gsk_item": "P-14 | P-16 | P-20 | P-21 | null — the specific GSK proposal item this issue relates to, or null for cross-cutting issues",
            "issue": "string — specific description of the risk transparency problem",
            "severity": "CRITICAL | MAJOR | MINOR",
        }
    ]
}

PROMPT_SECTION = """
═══════════════════════════════════════════════════
SKILL 3.3 — RISK & DEPENDENCY TRANSPARENCY
═══════════════════════════════════════════════════

Clients trust vendors who are honest about complexity. A proposal that makes everything sound
easy is LESS trusted than one that identifies real challenges and explains how they will be managed.
This skill checks whether the proposal is genuinely transparent about risks, dependencies,
and assumptions — or whether it uses vague language to paper over real challenges.

CHECK 1 — P-20: Risk Register Quality
  A risk register must be SPECIFIC to this engagement:
  BAD: "Resource availability risk — we will manage this."
  GOOD: "If the lead architect is unavailable for more than 5 days, pre-identified backup resource
         [Name or Role] is briefed and ready to step in."

  BAD: "Integration risk — we will work with the client to resolve."
  GOOD: "If [client's legacy system] API response time exceeds 200ms under load, we will implement
         a caching layer — this will add 3 days to the integration phase."

  For EACH risk in the register:
  - Is the risk specific (named consequence, not generic)?
  - Does it have a NAMED mitigation (specific action, not "we will manage")?
  - Is the impact of the risk stated (scope, cost, timeline)?

  A risk register with only generic risks = MAJOR. No risk register = CRITICAL.
  A risk register that names client dependencies as a risk without specific consequence = PARTIAL.

CHECK 2 — P-14: Client Dependencies
  Dependencies must state three things:
  (a) What is needed from the client or third party
  (b) By when it is needed
  (c) The consequence if it is delayed

  BAD: "Client cooperation and timely feedback are required."
  GOOD: "We require access to the production database schema by Day 10. If delayed beyond Day 15,
         the technical design phase shifts by an equivalent number of days."

  Vague dependency language = MAJOR. Missing dependencies section = CRITICAL.
  Dependencies without consequences stated = PARTIAL → MINOR.

CHECK 3 — P-16: Assumptions + Impact If Wrong
  Every assumption must be paired with its consequence if incorrect.
  BAD: "We assume client will provide test data."
  GOOD: "We assume client will provide anonymised test data within 2 weeks of project start.
         If delayed, the testing phase will shift by an equivalent period."

  Assumptions listed without consequences = PARTIAL → MAJOR.
  No assumptions section = CRITICAL on a fixed-price engagement.

CHECK 4 — P-21: Pre-Project Requirements from Client
  A specific list of what the vendor needs BEFORE work begins: system access, named decision-makers,
  reference documents, approvals, environments. This is separate from ongoing dependencies (P-14).

  Missing or vague pre-project requirements = MAJOR.
  "We will need client cooperation to begin" = MISSING.

CHECK 5 — Third-Party Dependency Acknowledgement
  Are third-party dependencies (cloud providers, payment gateways, integration partners, licensed
  software vendors) acknowledged with their own risk profile? A proposal that ignores third-party
  risks creates post-contract disputes when those parties cause delays.

SEVERITY RULES:
- CRITICAL: No risk register, or no client dependencies section on a complex engagement
- MAJOR: Generic risks without named mitigations, dependencies without consequences
- MINOR: Minor gaps in specificity — risks are mostly good with one or two vague items

GSK ITEM MAPPING — set the "gsk_item" field for each issue:
  P-20: issues about the risk register quality
  P-14: issues about client or third-party dependency transparency
  P-16: issues about assumptions and their stated consequences
  P-21: issues about pre-project requirements from the client
  null: use for cross-cutting issues that span multiple items (e.g. third-party dependency acknowledgement)

Every issue must reference specific content from the proposal (or note its absence precisely).
If the risk and dependency sections are genuinely thorough, return an empty array.
"""
