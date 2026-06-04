"""
NCR3 Skill 1 — Client Fit Evaluator

Evaluates whether the proposal demonstrates genuine understanding of the
client's business context and directly addresses each stated client priority.
Dynamically calibrated by CLIENT_PRIORITIES from NC1 auto-detected context.
"""


def get_prompt_section(client_priorities: list[str]) -> str:
    priorities_str = ", ".join(client_priorities) if client_priorities else "Not specified"

    priority_checks = _build_priority_checks(client_priorities)

    return f"""
═══════════════════════════════════════════════════
SKILL NCR3.1 — CLIENT FIT EVALUATOR
═══════════════════════════════════════════════════

CLIENT PRIORITIES: {priorities_str}

A proposal wins when it speaks the client's language and directly addresses
what they care about most. Evaluate the proposal against each stated priority.

UNIVERSAL CHECKS (apply regardless of stated priorities):

  NAME-SWAP TEST:
    Could this exact proposal be submitted by any competitor to any client
    in a different industry with just the company name changed?
    If yes → CRITICAL client_fit_issue. Set sounds_generic implication.
    Every prioritised client concern must be addressed with client-specific content.

  OUTCOME FRAMING:
    Are benefits stated as client outcomes (time saved, cost reduced, risk mitigated)
    or as vendor features ("we will build X")?
    Feature-framing when outcome-framing was needed → MAJOR.

  UNDERSTANDING DEPTH:
    Does the proposal show genuine understanding of the client's actual business
    problem — not just a restatement of the requirements list?
    Shallow problem restatement → MAJOR.

{priority_checks}

SEVERITY RULES:
- A stated priority completely absent from the proposal = CRITICAL
- A stated priority addressed generically without client-specific content = MAJOR
- A minor gap in how a priority is addressed = MINOR
- Every issue must reference specific content (or its absence) from the proposal.
- If all priorities are well-addressed, return an empty array.
"""


def _build_priority_checks(client_priorities: list[str]) -> str:
    """Generate priority-specific evaluation guidance from NC1 auto-detected priorities."""
    if not client_priorities:
        return "No specific priorities detected — apply universal checks above."

    known_checks = {
        "cost certainty": (
            "Does the proposal give the client confidence about total cost?\n"
            "    Look for: fixed-price commitment, cost ceilings, what triggers cost change,\n"
            "    clear change-request process. Vague 'indicative' pricing = MAJOR."
        ),
        "speed to market": (
            "Does the proposal demonstrate how delivery speed is prioritised?\n"
            "    Look for: aggressive but credible timeline, MVP/phased approach, specific\n"
            "    accelerators or reusable assets that reduce time. Generic timelines = MAJOR."
        ),
        "regulatory compliance": (
            "Does the proposal address the client's specific regulatory requirements?\n"
            "    Look for: named regulations (GDPR, FCA, ISO 27001, etc.), specific compliance\n"
            "    controls proposed, audit trail provisions. Generic 'we comply' = CRITICAL."
        ),
        "risk minimisation": (
            "Does the proposal show how delivery risks are proactively managed?\n"
            "    Look for: named risks with specific mitigations, governance model,\n"
            "    escalation procedures, not just a generic risk statement. = MAJOR if absent."
        ),
        "innovation": (
            "Does the proposal demonstrate innovative thinking specific to this client?\n"
            "    Look for: novel approaches to the client's problem, emerging tech justified\n"
            "    for this context, evidence of creative problem-solving. Generic 'innovative\n"
            "    approach' without specifics = MAJOR."
        ),
        "proven track record": (
            "Does the proposal evidence relevant prior work?\n"
            "    Look for: case studies from the same industry and problem domain with\n"
            "    measurable outcomes. Generic case studies from unrelated domains = MAJOR.\n"
            "    No case studies = CRITICAL."
        ),
    }

    lines = ["PRIORITY-SPECIFIC CHECKS:\n"]
    matched = False
    for priority in client_priorities:
        p_lower = priority.strip().lower()
        for keyword, guidance in known_checks.items():
            if keyword in p_lower or p_lower in keyword:
                lines.append(f"  Priority: {priority}")
                lines.append(f"    {guidance}")
                lines.append("")
                matched = True
                break
        else:
            lines.append(f"  Priority: {priority}")
            lines.append(
                f"    Evaluate whether the proposal explicitly addresses '{priority}' "
                f"with specific, verifiable content — not generic claims."
            )
            lines.append("")
            matched = True

    return "\n".join(lines) if matched else ""
