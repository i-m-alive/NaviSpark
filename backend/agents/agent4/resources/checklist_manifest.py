"""
Complete GSK checklist manifest — all 57 items across the three sheets.
Used by Task 4.5 to build the unified 57-item coverage grid from individual
agent outputs. Each item records which agent assesses it and how to extract
the status from that agent's JSON output.
"""

# ── Proposal Checklist — 22 items ────────────────────────────────────────────
# Items covered by Agent 1 (via section_audit) or Agent 3 (via checklist_coverage).
# Items P-19 and P-22 are covered by Agent 2 and Agent 1 respectively.

PROPOSAL_ITEMS = [
    # Agent 1 section_audit items
    {"id": "P-01",  "topic": "Functional requirements understanding",       "mandatory": True,  "sheet": "Proposal",   "primary_agent": "A1", "skill": "1.1",        "source": "a1_section_audit"},
    {"id": "P-02",  "topic": "Non-functional requirements",                 "mandatory": True,  "sheet": "Proposal",   "primary_agent": "A1", "skill": "1.1",        "source": "a1_section_audit"},
    {"id": "P-03",  "topic": "Clarification areas & assumptions",           "mandatory": False, "sheet": "Proposal",   "primary_agent": "A1", "skill": "1.1",        "source": "a1_section_audit"},
    {"id": "P-04",  "topic": "Requirements prioritisation criteria",        "mandatory": False, "sheet": "Proposal",   "primary_agent": "A1", "skill": "1.1",        "source": "a1_section_audit"},
    {"id": "P-05",  "topic": "Proposed scope of work",                      "mandatory": True,  "sheet": "Proposal",   "primary_agent": "A1", "skill": "1.1 · 1.3",  "source": "a1_section_audit"},
    {"id": "P-06",  "topic": "Areas outside proposed scope",                "mandatory": True,  "sheet": "Proposal",   "primary_agent": "A1", "skill": "1.3",        "source": "a1_section_audit"},
    {"id": "P-07",  "topic": "Requirements Matrix (colour-coded)",          "mandatory": False, "sheet": "Proposal",   "primary_agent": "A1", "skill": "1.3",        "source": "a1_section_audit"},
    # Agent 3 checklist_coverage items
    {"id": "P-08",  "topic": "Work responsibility distribution",            "mandatory": True,  "sheet": "Proposal",   "primary_agent": "A3", "skill": "3.4",        "source": "a3_checklist"},
    {"id": "P-09",  "topic": "Logical / functional solution architecture",  "mandatory": True,  "sheet": "Proposal",   "primary_agent": "A3", "skill": "3.2",        "source": "a3_checklist"},
    {"id": "P-10",  "topic": "Technical solution architecture",             "mandatory": True,  "sheet": "Proposal",   "primary_agent": "A3", "skill": "3.2",        "source": "a3_checklist"},
    # Agent 1 section_audit
    {"id": "P-11",  "topic": "Sample solution screens",                     "mandatory": False, "sheet": "Proposal",   "primary_agent": "A1", "skill": "1.1",        "source": "a1_section_audit"},
    # Agent 3 checklist_coverage items
    {"id": "P-12",  "topic": "Technology stack with role justification",    "mandatory": True,  "sheet": "Proposal",   "primary_agent": "A3", "skill": "3.2",        "source": "a3_checklist"},
    {"id": "P-13",  "topic": "Benefits framed as client outcomes",          "mandatory": True,  "sheet": "Proposal",   "primary_agent": "A3", "skill": "3.1",        "source": "a3_checklist"},
    {"id": "P-14",  "topic": "Dependencies on customer / third parties",    "mandatory": True,  "sheet": "Proposal",   "primary_agent": "A3", "skill": "3.3",        "source": "a3_checklist"},
    # Agent 1 section_audit
    {"id": "P-15",  "topic": "Schedule & delivery milestones",              "mandatory": True,  "sheet": "Proposal",   "primary_agent": "A1", "skill": "1.1 · A2·2.2", "source": "a1_section_audit"},
    # Agent 3 checklist_coverage
    {"id": "P-16",  "topic": "Assumptions + impact if wrong",               "mandatory": True,  "sheet": "Proposal",   "primary_agent": "A3", "skill": "3.3",        "source": "a3_checklist"},
    # Agent 1 section_audit
    {"id": "P-17",  "topic": "Deliverables list with description",          "mandatory": True,  "sheet": "Proposal",   "primary_agent": "A1", "skill": "1.1",        "source": "a1_section_audit"},
    # Agent 3 checklist_coverage
    {"id": "P-18",  "topic": "Case studies of similar work",                "mandatory": True,  "sheet": "Proposal",   "primary_agent": "A3", "skill": "3.4",        "source": "a3_checklist"},
    # Agent 2 (pricing completeness covers commercial plan)
    {"id": "P-19",  "topic": "Commercial plan overview",                    "mandatory": True,  "sheet": "Proposal",   "primary_agent": "A2", "skill": "2.4",        "source": "a2_pricing"},
    # Agent 3 checklist_coverage
    {"id": "P-20",  "topic": "Risk register with mitigation",               "mandatory": True,  "sheet": "Proposal",   "primary_agent": "A3", "skill": "3.3",        "source": "a3_checklist"},
    {"id": "P-21",  "topic": "What vendor needs from client before start",  "mandatory": True,  "sheet": "Proposal",   "primary_agent": "A3", "skill": "3.3",        "source": "a3_checklist"},
    # Agent 1 section_audit
    {"id": "P-22",  "topic": "Reference documents cited",                   "mandatory": True,  "sheet": "Proposal",   "primary_agent": "A1", "skill": "1.1",        "source": "a1_section_audit"},
]

# ── Estimation Checklist — 24 items ──────────────────────────────────────────
# All covered by Agent 2. Status is inferred from missing_phases and estimation_issues.

ESTIMATION_ITEMS = [
    {"id": "E-01",  "topic": "Work breakdown structure",                    "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.1",        "source": "a2_estimation"},
    {"id": "E-02",  "topic": "Estimation assumptions",                      "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.1",        "source": "a2_estimation"},
    {"id": "E-03",  "topic": "Clarity level per requirement",               "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.1",        "source": "a2_estimation"},
    {"id": "E-04",  "topic": "Complexity level per requirement",            "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.1",        "source": "a2_estimation"},
    {"id": "E-05",  "topic": "Reuse of pre-existing assets",               "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.3",        "source": "a2_estimation"},
    {"id": "E-06",  "topic": "Effort: requirements detailing",              "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.2",        "source": "a2_phases"},
    {"id": "E-07",  "topic": "Effort: technical design",                    "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.2",        "source": "a2_phases"},
    {"id": "E-08",  "topic": "Effort: coding & unit testing",              "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.2",        "source": "a2_phases"},
    {"id": "E-09",  "topic": "Effort: component integration & testing",    "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.2",        "source": "a2_phases"},
    {"id": "E-10",  "topic": "Effort: automation of dev/test activities",  "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.2",        "source": "a2_phases"},
    {"id": "E-11",  "topic": "Contingency linked to clarity + complexity", "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.1",        "source": "a2_estimation"},
    {"id": "E-12",  "topic": "Reference baselines for projections",        "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.1",        "source": "a2_estimation"},
    {"id": "E-13",  "topic": "Documentation effort",                        "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.2",        "source": "a2_phases"},
    {"id": "E-14",  "topic": "Module integration effort",                   "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.2",        "source": "a2_phases"},
    {"id": "E-15",  "topic": "External system integration effort",          "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.2",        "source": "a2_phases"},
    {"id": "E-16",  "topic": "CI/CD & release management effort",          "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.2",        "source": "a2_phases"},
    {"id": "E-17",  "topic": "System testing effort",                       "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.2",        "source": "a2_phases"},
    {"id": "E-18",  "topic": "UAT & go-live support effort",               "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.2",        "source": "a2_phases"},
    {"id": "E-19",  "topic": "Project management effort",                   "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.2",        "source": "a2_phases"},
    {"id": "E-20",  "topic": "Team roles & headcount",                      "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.6",        "source": "a2_estimation"},
    {"id": "E-21",  "topic": "External consultancy requirement",            "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.2",        "source": "a2_phases"},
    {"id": "E-22",  "topic": "Duration & basis for duration",              "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.2 · 2.6",  "source": "a2_estimation"},
    {"id": "E-23",  "topic": "Resource loading plan — solution dev",       "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.2",        "source": "a2_phases"},
    {"id": "E-24",  "topic": "Resource loading plan — S&M",               "mandatory": True,  "sheet": "Estimation", "primary_agent": "A2", "skill": "2.2",        "source": "a2_phases"},
]

# ── Pricing Checklist — 11 items ──────────────────────────────────────────────
# All covered by Agent 2.

PRICING_ITEMS = [
    {"id": "PR-01",    "topic": "Rate card for all delivery roles",             "mandatory": True, "sheet": "Pricing", "primary_agent": "A2", "skill": "2.5",        "source": "a2_pricing"},
    {"id": "PR-02",    "topic": "Commercial model",                             "mandatory": True, "sheet": "Pricing", "primary_agent": "A2", "skill": "2.5",        "source": "a2_pricing"},
    {"id": "PR-03a",   "topic": "Solution development & delivery cost",         "mandatory": True, "sheet": "Pricing", "primary_agent": "A2", "skill": "2.4",        "source": "a2_pricing"},
    {"id": "PR-03b",   "topic": "Warranty phase cost",                          "mandatory": True, "sheet": "Pricing", "primary_agent": "A2", "skill": "2.4",        "source": "a2_pricing"},
    {"id": "PR-03c",   "topic": "IP / reusable component cost",                 "mandatory": True, "sheet": "Pricing", "primary_agent": "A2", "skill": "2.3",        "source": "a2_pricing", "internal": False},
    {"id": "PR-03d",   "topic": "Margin targets (internal only)",               "mandatory": True, "sheet": "Pricing", "primary_agent": "A2", "skill": "2.7",        "source": "a2_internal", "internal": True},
    {"id": "PR-03e",   "topic": "Contingency cost in pricing",                  "mandatory": True, "sheet": "Pricing", "primary_agent": "A2", "skill": "2.4",        "source": "a2_pricing"},
    {"id": "PR-04",    "topic": "S&M price workings + margin (internal)",       "mandatory": True, "sheet": "Pricing", "primary_agent": "A2", "skill": "2.4 · 2.7",  "source": "a2_pricing", "internal": True},
    {"id": "PR-05-08", "topic": "Infrastructure costs across 4 environments",  "mandatory": True, "sheet": "Pricing", "primary_agent": "A2", "skill": "2.4",        "source": "a2_pricing"},
    {"id": "PR-09",    "topic": "Reseller discounts / charges",                 "mandatory": True, "sheet": "Pricing", "primary_agent": "A2", "skill": "2.4",        "source": "a2_pricing"},
    {"id": "PR-10",    "topic": "External consultancy cost workings",           "mandatory": True, "sheet": "Pricing", "primary_agent": "A2", "skill": "2.2 · 2.4",  "source": "a2_pricing"},
    {"id": "PR-11",    "topic": "Invoicing / payment schedule",                 "mandatory": True, "sheet": "Pricing", "primary_agent": "A2", "skill": "2.5",        "source": "a2_pricing"},
]

ALL_ITEMS = PROPOSAL_ITEMS + ESTIMATION_ITEMS + PRICING_ITEMS
