"""
NCR3 Skill 6 — Industry Win Factors

Conditional skill: only active when NC1 detected a known industry.
Checks industry-specific signals that determine whether a proposal wins.
Reuses the industry win factors registry from Agent 3.
"""

# Industry win factor definitions — each entry maps to evaluation guidance.
# Aligned with agent3's industry_win_factors.py for consistency.
_INDUSTRY_WIN_FACTORS: dict[str, list[str]] = {
    "fintech": [
        "Regulatory compliance (FCA, PCI-DSS, GDPR, AML/KYC) explicitly addressed with named controls",
        "Data security architecture described (encryption at rest/in transit, access controls)",
        "Audit trail and data lineage capabilities mentioned",
        "Real-time processing or low-latency requirements acknowledged if applicable",
        "Open banking / API standards knowledge demonstrated",
    ],
    "healthcare": [
        "Clinical workflow understanding demonstrated — not just IT delivery",
        "Data privacy (NHS DSP Toolkit, HIPAA, HL7/FHIR) addressed with specifics",
        "Patient safety and clinical risk implications of the solution acknowledged",
        "Integration with clinical systems (EPR, PACS, etc.) described if relevant",
        "Change management for clinical staff adoption included",
    ],
    "government": [
        "Public sector procurement compliance referenced (G-Cloud, DOS, Crown Commercial)",
        "Security classification and data handling requirements addressed (IL2/IL3, Cyber Essentials)",
        "Transparency and audit requirements built into the solution design",
        "Social value and SME/diversity commitments mentioned",
        "Government Digital Service (GDS) or equivalent standards referenced if relevant",
    ],
    "insurance": [
        "Regulatory compliance (Solvency II, FCA, Lloyd's, EIOPA) named with specific controls",
        "Actuarial data integrity and reporting requirements acknowledged",
        "Legacy system integration complexity addressed (many insurers run 20+ year old cores)",
        "Claims processing accuracy and audit requirements mentioned",
        "Data security for sensitive personal/financial data described",
    ],
    "retail": [
        "Peak trading scalability (Black Friday, seasonal spikes) addressed with specific architecture",
        "Omnichannel integration complexity acknowledged",
        "Customer data privacy (GDPR) and loyalty data handling described",
        "PCI-DSS compliance mentioned if payments are in scope",
        "Inventory/supply chain integration complexity addressed if relevant",
    ],
    "manufacturing": [
        "OT/IT convergence and industrial IoT complexities acknowledged if relevant",
        "ERP integration (SAP, Oracle) experience demonstrated with specifics",
        "Production downtime risk mitigation addressed explicitly",
        "Supply chain data complexity acknowledged",
        "Industry 4.0 / smart factory context demonstrated if relevant",
    ],
    "telecommunications": [
        "Network infrastructure integration complexity addressed",
        "High-volume transaction processing and low-latency requirements acknowledged",
        "OSS/BSS system integration experience demonstrated",
        "Regulatory (Ofcom, data retention) requirements addressed",
        "5G / cloud-native network understanding shown if relevant",
    ],
    "energy": [
        "Regulatory compliance (Ofgem, NERC, FERC) addressed with specifics",
        "Critical national infrastructure (CNI) security requirements mentioned",
        "SCADA/ICS integration complexity acknowledged if in scope",
        "Smart metering or grid digitalisation context demonstrated if relevant",
        "Environmental/ESG reporting capabilities mentioned if relevant",
    ],
}

# Industries that map to the same known set
_ALIASES = {
    "financial services": "fintech",
    "banking": "fintech",
    "finance": "fintech",
    "pharma": "healthcare",
    "pharmaceutical": "healthcare",
    "public sector": "government",
    "defence": "government",
    "utilities": "energy",
    "oil and gas": "energy",
    "ecommerce": "retail",
    "e-commerce": "retail",
}


def _resolve_industry(client_industry: list[str]) -> tuple[str | None, list[str]]:
    for ind in client_industry:
        normalised = ind.strip().lower()
        if normalised in _INDUSTRY_WIN_FACTORS:
            return normalised, _INDUSTRY_WIN_FACTORS[normalised]
        alias = _ALIASES.get(normalised)
        if alias and alias in _INDUSTRY_WIN_FACTORS:
            return alias, _INDUSTRY_WIN_FACTORS[alias]
    return None, []


def is_active(client_industry: list[str]) -> bool:
    resolved, _ = _resolve_industry(client_industry)
    return resolved is not None


def get_prompt_section(client_industry: list[str]) -> str:
    resolved, factors = _resolve_industry(client_industry)
    industry_str = ", ".join(client_industry) if client_industry else "Not specified"

    if not resolved or not factors:
        return f"""
═══════════════════════════════════════════════════
SKILL NCR3.6 — INDUSTRY WIN FACTORS
═══════════════════════════════════════════════════

CLIENT INDUSTRY: {industry_str}

No specific industry win factors available for this industry.
Set industry_factors score to 5.0 (neutral) and return an empty industry_findings array.
Set scores.weights.industry_factors to 0.0 and redistribute its weight proportionally
to the other five dimensions.
"""

    factors_block = "\n".join(f"  {i+1}. {factor}" for i, factor in enumerate(factors))

    return f"""
═══════════════════════════════════════════════════
SKILL NCR3.6 — INDUSTRY WIN FACTORS ({industry_str.upper()})
═══════════════════════════════════════════════════

CLIENT INDUSTRY: {industry_str}

Proposals in this industry are evaluated against industry-specific signals.
Missing these signals is a significant competitive disadvantage — buyers in this
sector expect vendors to demonstrate industry-specific knowledge without being asked.

INDUSTRY WIN FACTORS TO CHECK:

{factors_block}

For each factor, assess: present / absent / weak / not_applicable.
- present      — Explicitly and credibly addressed with specific content
- weak         — Mentioned but vague or insufficient
- absent       — Not addressed at all
- not_applicable — Genuinely not relevant to this specific engagement

SEVERITY:
- Factor absent when clearly in scope = CRITICAL
- Factor weak/vague when it matters to this client = MAJOR
- Factor absent when marginally in scope = MINOR

OUTPUT: industry_findings array — one entry per factor above, in order.
Every entry: factor (name), finding (present/absent/weak/not_applicable), severity.

SCORING NOTE:
If all or most factors are present → industry_factors score ≥ 8.0
If key factors are absent → score ≤ 4.0
"""
