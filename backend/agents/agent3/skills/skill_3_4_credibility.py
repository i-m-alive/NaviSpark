"""
Skill 3.4 — Credibility & Trust Signals
Evaluates whether the proposal gives the client genuine confidence in the team
and the vendor's track record. Flags vague case studies, unnamed team credentials,
absent governance model, and credibility-damaging overclaiming.
Covers GSK Proposal items P-18 (case studies) and P-08 (work distribution/team).
"""

from agents.agent3.resources.overclaiming_patterns import build_overclaiming_prompt_block

RESULT_KEYS = ["credibility_gaps", "overclaiming_flags"]

OUTPUT_SCHEMA = {
    "credibility_gaps": [
        {
            "gsk_item": "P-08 | P-18 | null — the specific GSK proposal item this gap relates to, or null for governance/process gaps",
            "issue": "string — specific credibility gap: vague case study, unnamed team, absent governance",
            "severity": "CRITICAL | MAJOR | MINOR",
        }
    ],
    "overclaiming_flags": [
        {
            "claim": "string — exact phrase from the proposal, max 20 words",
            "location": "string — section name where this appears",
            "severity": "MAJOR | MINOR",
        }
    ],
}


def get_prompt_section() -> str:
    overclaiming_block = build_overclaiming_prompt_block()
    return f"""
═══════════════════════════════════════════════════
SKILL 3.4 — CREDIBILITY & TRUST SIGNALS
═══════════════════════════════════════════════════

A client is making a bet on a team and a vendor, not just evaluating a document.
This skill checks whether the proposal provides genuine evidence of capability —
and flags language that a sophisticated procurement officer would find suspicious.

CHECK 1 — P-18: Case Study Quality
  A strong case study has ALL of the following:
  (a) Named client or credibly anonymised reference (industry + scale, e.g. "a tier-1 private bank in India")
  (b) Specific problem solved — not "we delivered a digital transformation"
  (c) The approach taken — what did the vendor actually do?
  (d) A MEASURABLE OUTCOME — "reduced processing time by 40%", "went live 3 weeks ahead of schedule",
      "zero production incidents in first 90 days after go-live"
  (e) RELEVANCE — is it the same or similar industry? Similar scale? Similar technical challenge?

  BAD case study: "We worked with a leading financial services company to deliver a digital platform."
  GOOD case study: "For [anonymised tier-2 private bank], we replaced their legacy core banking
                   reconciliation system with a real-time API layer. Delivered in 7 months against
                   a 9-month estimate. Zero downtime during cutover. Processing time reduced from
                   4 hours to 12 minutes."

  No case studies = CRITICAL. Vague case studies without outcomes = MAJOR.
  Case studies from a completely different industry = MAJOR (low relevance).

CHECK 2 — P-08: Team Credibility
  Are key team members named with specific, relevant credentials?
  "Project Manager — 10 years experience" = PARTIAL.
  "Priya Sharma — 8 years delivering fintech integrations, led the core banking migration at [client X]" = COVERED.

  Generic role descriptions without named individuals on a significant engagement = MAJOR.
  No team section at all = CRITICAL.

CHECK 3 — Governance Model
  Is the delivery governance model described in enough detail to feel real?
  What is the reporting cadence (weekly steering committee? fortnightly status report?)?
  What is the escalation path if issues arise?
  How are change requests managed?
  Absent governance model = MAJOR — creates "how do we manage this?" anxiety for the client.

CHECK 4 — Overclaiming Detection
  Flag any of the following categories when used without specific, verifiable evidence:

{overclaiming_block}

  IMPORTANT: overclaiming_flags severity is capped at MAJOR — never CRITICAL.
  A "world class" claim without evidence weakens credibility but does not kill the deal alone.
  Do NOT flag terms if they are immediately followed by specific evidence in the same sentence.
  Example: "Our proven track record — we have delivered 14 core banking migrations across 5 countries
  with zero customer data incidents" is acceptable. "Our proven track record in financial services"
  without specifics = flag it.

SEVERITY RULES:
- CRITICAL: No case studies, no team section, or entire proposal reads as uncredible
- MAJOR: Vague case studies, overclaiming without evidence, absent governance model
- MINOR: Minor gaps in specificity — mostly credible with one or two weak areas

GSK ITEM MAPPING — set the "gsk_item" field for each credibility_gap:
  P-18: issues about case study quality, specificity, measurable outcomes, or relevance
  P-08: issues about team credibility, named individuals, or role descriptions
  null: use for governance model gaps (reporting cadence, escalation path, change control)

Every credibility_gap must reference specific content from the proposal.
Every overclaiming_flag must quote the exact phrase from the document.
"""
