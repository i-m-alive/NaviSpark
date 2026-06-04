"""
NCR3 Skill 4 — Credibility Evaluator

Checks whether past experience and team credentials are effectively
presented — and flags overclaiming.
"""

PROMPT_SECTION = """
═══════════════════════════════════════════════════
SKILL NCR3.4 — CREDIBILITY EVALUATOR
═══════════════════════════════════════════════════

Evaluate whether the vendor has credibly demonstrated they can deliver.
A proposal that makes promises without evidence is a risk to the client.

FOUR AREAS TO EVALUATE:

1. TEAM CREDENTIALS
   Are the people who will DO the work named and credentialed?
   Named = first name, last name, role, relevant experience/certification.
   A proposal with named leadership (e.g., "our Managing Director has 20 years experience")
   but anonymous delivery team ("2 senior developers, 1 BA") = PARTIAL.
   No team information at all = MISSING.
   Severity: MAJOR for anonymous delivery team; MINOR for incomplete credentials.

2. CASE STUDIES / PAST WORK
   Are case studies specific and relevant?
   COVERED requires ALL of:
     - Same or closely related industry
     - Similar problem scale or complexity
     - Measurable outcome (not just "we delivered successfully")
   Vague: "We have delivered similar projects for major clients in financial services."
   Specific: "For [Client Type], we reduced month-end close from 5 days to 2 days by
              implementing [specific solution] — delivered in 14 weeks."
   No case studies = CRITICAL on an enterprise engagement.
   Generic or irrelevant case studies = MAJOR.

3. GOVERNANCE MODEL
   Is the delivery governance described?
   Who is the vendor's point of escalation? How are issues raised and resolved?
   What is the reporting cadence?
   A proposal with no governance model assumes delivery will go smoothly — PARTIAL.
   Severity: MINOR for most engagements; MAJOR for large or regulated ones.

4. OVERCLAIMING
   Flag claims that no reasonable vendor could substantiate:
     - "Guaranteed outcomes" without stated conditions
     - "Zero defects" or "100% uptime" without SLA definition
     - Specific ROI percentages without evidence (e.g., "300% ROI in year 1")
     - Universal expertise claims ("we are experts in all areas of X")
   Overclaiming damages trust when discovered during delivery.
   Severity: MAJOR — clients' procurement teams flag these.

SEVERITY RULES:
- CRITICAL: No case studies on an enterprise engagement; delivery team entirely anonymous
            with no credentials.
- MAJOR:    Generic/irrelevant case studies; named leadership only, anonymous delivery;
            overclaiming flags in credibility-critical sections.
- MINOR:    Minor credential gap; one vague case study that has other strong examples.

RULES:
- type field for credibility_gaps: "team", "case_study", "governance", "overclaiming"
- Every credibility_gap MUST reference specific content or its absence.
- For overclaiming_flags, quote the EXACT phrase from the proposal (max 20 words).
- If credibility is genuinely strong, return empty arrays for both fields.
"""
