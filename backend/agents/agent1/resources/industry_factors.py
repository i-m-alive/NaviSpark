"""
Industry-specific completeness factors for Skill 1.4.
Each industry maps to a list of factors that a client in that vertical
would expect but are not on the generic GSK checklist.
"""

INDUSTRY_FACTORS: dict[str, list[dict]] = {
    "Fintech / Banking": [
        {
            "factor": "Regulatory framework section",
            "detail": "Which regulations govern this project must be named explicitly: PCI-DSS, RBI guidelines, SEBI, GDPR, DPDP Act, Basel III as applicable. 'We comply with all applicable regulations' = MISSING.",
        },
        {
            "factor": "Data security and encryption approach",
            "detail": "Specifically named encryption standards (AES-256, TLS 1.3), key management approach, data at rest and in transit protection.",
        },
        {
            "factor": "Licensing or certification acknowledgements",
            "detail": "Any financial services licences, PA/PG certification, NBFC registration, or compliance certifications required for this engagement.",
        },
        {
            "factor": "Financial data handling protocols",
            "detail": "How sensitive financial data is stored, accessed, masked in non-prod environments, audited, and disposed of at end of life.",
        },
    ],
    "Healthcare / Pharma": [
        {
            "factor": "Named regulatory pathway",
            "detail": "CDSCO, FDA 21 CFR Part 11, CE Mark, HIPAA, or equivalent — must be named, not implied. 'We are compliant with healthcare regulations' = MISSING.",
        },
        {
            "factor": "Patient data privacy approach",
            "detail": "Explicit, not implied — how patient PII and health records are protected, who can access them, how consent is tracked.",
        },
        {
            "factor": "Clinical validation plan or evidence of clinical-grade quality process",
            "detail": "Validation approach (IQ/OQ/PQ), clinical-grade testing rigour, evidence of prior medical device or clinical software delivery.",
        },
        {
            "factor": "Audit trail and data integrity approach",
            "detail": "How changes to clinical data are logged with timestamps and user IDs, immutable, and traceable per 21 CFR Part 11 or equivalent.",
        },
    ],
    "Government / Public Sector": [
        {
            "factor": "Policy alignment statement",
            "detail": "Which government policies, digital initiatives, or national frameworks (e.g., India Stack, GovTech Masterplan, Digital India) does this align with?",
        },
        {
            "factor": "Past public sector work cited specifically",
            "detail": "Named department/ministry (or anonymised), outcome, scale, and relevance. 'We have government experience' = MISSING.",
        },
        {
            "factor": "Compliance certifications named",
            "detail": "ISO 27001, CMMI Level 3+, GEM portal registration, NIC cloud compliance, or equivalent certifications explicitly stated.",
        },
        {
            "factor": "Knowledge transfer and handover plan",
            "detail": "Government cannot be permanently vendor-dependent. Explicit plan for training, documentation, and capability transfer to in-house teams.",
        },
        {
            "factor": "Social value / outcome metrics",
            "detail": "How will public benefit, citizen impact, or social outcomes be measured? Required for government procurement justification.",
        },
    ],
    "Manufacturing": [
        {
            "factor": "OT/ICS integration approach",
            "detail": "Integration methodology for SCADA, PLCs, MES, HISTORIAN, or other operational technology systems. Cyber-physical system security approach.",
        },
        {
            "factor": "Downtime risk and production continuity plan",
            "detail": "Explicit acknowledgement of production impact during implementation. Specific measures: parallel running, phased cutover, rollback plan.",
        },
        {
            "factor": "Safety standards compliance",
            "detail": "IS 13252, IEC 62443, local manufacturing safety regulations, functional safety requirements (if applicable) named and addressed.",
        },
    ],
    "Retail / E-commerce": [
        {
            "factor": "Customer-facing continuity plan",
            "detail": "How is the customer experience and transaction capability protected during the transition? Zero-downtime deployment approach.",
        },
        {
            "factor": "Seasonal and peak load handling",
            "detail": "Has the vendor explicitly acknowledged peak periods (festival season, sales events)? Load testing targets stated? Auto-scaling approach described?",
        },
        {
            "factor": "PCI-DSS compliance",
            "detail": "Required if payment processing is in scope — must be named, not implied. Scope of PCI-DSS assessment stated.",
        },
    ],
    "Education": [
        {
            "factor": "Adoption and change management plan",
            "detail": "Technology without adoption = failure. Explicit training plan, rollout strategy, teacher/student onboarding, and change champion identification.",
        },
        {
            "factor": "Measurable learning outcome metrics",
            "detail": "How will success be defined beyond 'system live'? Learning outcome KPIs, engagement metrics, assessment improvement targets.",
        },
        {
            "factor": "Accessibility and inclusivity approach",
            "detail": "WCAG 2.1 AA compliance, low-bandwidth support, device diversity (mobile/desktop), language/regional accessibility.",
        },
    ],
    "Deep Tech / AI": [
        {
            "factor": "IP ownership terms",
            "detail": "Who owns the trained models, training data, fine-tuned weights, pipeline code, and inference outputs? Must be explicit — ambiguity creates legal risk.",
        },
        {
            "factor": "Commercialisation pathway",
            "detail": "How does the client take this AI capability to market or realise ROI? GTM plan, licensing model, or white-labelling approach.",
        },
        {
            "factor": "Model explainability and bias mitigation approach",
            "detail": "How are model decisions explained to end users or regulators? What bias testing framework is used? How are model drift and fairness monitored?",
        },
    ],
    "Logistics / Supply Chain": [
        {
            "factor": "Integration with existing WMS/TMS/ERP systems",
            "detail": "Named integration approach for the client's specific warehouse management, transport management, and ERP systems. API or file-based integration method stated.",
        },
        {
            "factor": "Real-time tracking and visibility plan",
            "detail": "How will shipment/inventory visibility be provided in real-time? Data latency SLA? IoT/GPS/RFID integration if relevant?",
        },
        {
            "factor": "Regulatory compliance for cross-border operations",
            "detail": "If applicable — customs documentation, duty calculation, international trade compliance (EXIM), country-specific regulatory requirements.",
        },
    ],
}

def get_factors_for_industries(industries: list[str]) -> dict[str, list[dict]]:
    """Returns only the factors relevant to the selected industries."""
    return {ind: INDUSTRY_FACTORS[ind] for ind in industries if ind in INDUSTRY_FACTORS}

def build_industry_prompt_block(industries: list[str]) -> str:
    """
    Returns the industry-specific completeness block as a prompt-ready string.
    Only includes sections for the selected industries.
    Returns empty string if no matching industries.
    """
    relevant = get_factors_for_industries(industries)
    if not relevant:
        return ""

    lines = []
    for industry, factors in relevant.items():
        lines.append(f"\n{industry.upper()}:")
        for f in factors:
            lines.append(f"  - {f['factor']}: {f['detail']}")
    return "\n".join(lines)
