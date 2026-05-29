"""
GSK Pricing Checklist — items owned by Agent 2.
Covers commercial model items (P1, P2, P11) and pricing completeness items (P3a–P10).
Internal-only items P3d and P4b are flagged with internal=True.
"""

# Commercial model items — used by Skill 2.5
COMMERCIAL_MODEL_ITEMS = [
    {
        "id": "P1",
        "description": (
            "Commercial model stated and appropriate — the pricing model (Fixed Price, T&M, "
            "Retainer, Milestone, Outcome, or Hybrid) must be explicitly named and must be "
            "appropriate for the level of scope definition. Unstated model = CRITICAL."
        ),
        "mandatory": True,
        "internal": False,
    },
    {
        "id": "P2",
        "description": (
            "Payment schedule linked to deliverables — payment milestones must be tied to named, "
            "verifiable deliverables (e.g., 'Delivery of tested API module'). "
            "Payments tied to calendar dates (e.g., 'Month 3 payment') = MAJOR. "
            "No payment schedule at all = CRITICAL."
        ),
        "mandatory": True,
        "internal": False,
    },
    {
        "id": "P11",
        "description": (
            "Rate card for all roles — a rate card listing the day rate or hourly rate for every "
            "named role must be present. Essential for pricing change requests after contract "
            "signing. Absent = MAJOR, especially on T&M or Milestone models."
        ),
        "mandatory": False,
        "internal": False,
    },
]

# Pricing completeness items — used by Skill 2.4 (non-internal) and Skill 2.7 (internal)
PRICING_ITEMS = [
    {
        "id": "P3a",
        "description": (
            "Solution development & delivery cost — the core effort cost must be broken out as "
            "a separate named line. Bundled into a single total without this line = PARTIAL."
        ),
        "mandatory": True,
        "internal": False,
    },
    {
        "id": "P3b",
        "description": (
            "Warranty cost separately itemised — post-delivery warranty must be costed as its "
            "own line, distinct from ongoing S&M. Bundling warranty into S&M = MAJOR: creates "
            "billing ambiguity when the warranty period ends."
        ),
        "mandatory": True,
        "internal": False,
    },
    {
        "id": "P3c",
        "description": (
            "IP / licensed component cost — cost of any pre-built frameworks, licensed software, "
            "or IP assets used in the solution must be explicitly stated. "
            "'Our accelerator is included' without a cost line = PARTIAL."
        ),
        "mandatory": False,
        "internal": False,
    },
    {
        "id": "P3d",
        "description": (
            "Margin targets calculated — internal check: has the deal team calculated margin "
            "on this engagement? This is an internal governance item and must never appear "
            "in client-facing output."
        ),
        "mandatory": True,
        "internal": True,
    },
    {
        "id": "P4a",
        "description": (
            "Reseller / third-party discounts acknowledged — if the vendor is reselling "
            "third-party software, cloud services, or hardware, any applicable reseller "
            "discounts must be acknowledged and passed through (or absence explained)."
        ),
        "mandatory": False,
        "internal": False,
    },
    {
        "id": "P4b",
        "description": (
            "S&M margin targets set — internal check: has the deal team set margin targets "
            "for the support & maintenance component? Internal governance item — must never "
            "appear in client-facing output."
        ),
        "mandatory": True,
        "internal": True,
    },
    {
        "id": "P5",
        "description": (
            "External consultancy costed — if any external specialists or sub-contractors are "
            "required, their cost must appear as a named line item. Mentioned in the proposal "
            "body but absent from pricing = MAJOR."
        ),
        "mandatory": False,
        "internal": False,
    },
    {
        "id": "P6",
        "description": (
            "Contingency as a named pricing line item — contingency must appear as a visible, "
            "named line in the pricing table (e.g., 'Risk contingency — 15%'). "
            "Hidden in a total without disclosure = MAJOR. Absent entirely = CRITICAL on fixed price."
        ),
        "mandatory": True,
        "internal": False,
    },
    {
        "id": "P7",
        "description": (
            "Infrastructure cost — development environment — cloud/hosting cost for the "
            "development environment must be separately itemised. Commonly omitted. "
            "Absent = MAJOR."
        ),
        "mandatory": True,
        "internal": False,
    },
    {
        "id": "P8",
        "description": (
            "Infrastructure cost — test environment — cloud/hosting cost for the test "
            "environment must be separately itemised. Absent = MAJOR."
        ),
        "mandatory": True,
        "internal": False,
    },
    {
        "id": "P9",
        "description": (
            "Infrastructure cost — QA / pre-production environment — cloud/hosting cost for "
            "the QA and pre-production environment must be separately itemised. Absent = MAJOR."
        ),
        "mandatory": True,
        "internal": False,
    },
    {
        "id": "P10",
        "description": (
            "Infrastructure cost — production environment — the ongoing production hosting cost "
            "must be separately itemised, with a clear statement of whether it is a one-time "
            "or recurring cost. Absent = CRITICAL."
        ),
        "mandatory": True,
        "internal": False,
    },
]

# Convenience filters
CLIENT_PRICING_ITEMS = [item for item in PRICING_ITEMS if not item["internal"]]
INTERNAL_PRICING_ITEMS = [item for item in PRICING_ITEMS if item["internal"]]


def get_internal_items() -> list[dict]:
    """Returns only the internal-flagged pricing items (P3d, P4b)."""
    return INTERNAL_PRICING_ITEMS


def build_pricing_prompt_block() -> str:
    """Returns the non-internal pricing checklist as a prompt-ready string."""
    lines = ["THE GSK PRICING COMPLETENESS ITEMS (client-facing):\n"]
    mandatory = [item for item in CLIENT_PRICING_ITEMS if item["mandatory"]]
    optional = [item for item in CLIENT_PRICING_ITEMS if not item["mandatory"]]

    lines.append("MANDATORY items (MISSING = Critical or Major flag):")
    for item in mandatory:
        lines.append(f"\n  {item['id']} | {item['description']}")

    lines.append("\nOPTIONAL items (flag if contextually expected but absent):")
    for item in optional:
        lines.append(f"\n  {item['id']} | {item['description']}")

    return "\n".join(lines)


def build_commercial_model_prompt_block() -> str:
    """Returns the commercial model pricing items (P1, P2, P11) as a prompt-ready string."""
    lines = ["COMMERCIAL MODEL PRICING ITEMS:\n"]
    for item in COMMERCIAL_MODEL_ITEMS:
        lines.append(f"  {item['id']} | {item['description']}\n")
    return "\n".join(lines)
