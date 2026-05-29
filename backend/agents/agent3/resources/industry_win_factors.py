"""
Industry-specific win factors for Skill 3.6 — Industry Win Factors.
Keyed by CLIENT_INDUSTRY — mirrors industry_factors.py in Agent 1.
These describe what drives PURCHASING DECISIONS in each industry,
not just what sections must be present (that is Agent 1's job).
"""

INDUSTRY_WIN_FACTORS: dict[str, list[dict]] = {
    "Fintech / Banking": [
        {
            "factor": "Compliance credibility is front-and-centre",
            "detail": (
                "In fintech/banking, regulatory credibility is the primary gate. A proposal that buries "
                "compliance in an appendix loses to one that leads with it. Check whether the proposal "
                "prominently addresses the applicable regulatory framework — not just mentions it. "
                "PCI-DSS, RBI, SEBI, GDPR, DPDP Act as applicable should be named in the first two pages."
            ),
        },
        {
            "factor": "Specific security controls named",
            "detail": (
                "Fintech clients will not sign off on 'enterprise-grade security'. "
                "Encryption standards (AES-256, TLS 1.3), key management approach, data masking in "
                "non-production environments, pen testing commitment, and SOC 2 or ISO 27001 certification "
                "must be named explicitly. Vague security language = CRITICAL competitive weakness."
            ),
        },
        {
            "factor": "Speed to market through reuse or pre-built compliance tooling",
            "detail": (
                "Fintech clients face competitive pressure — time to market is a win factor even when "
                "not explicitly stated as a priority. Does the proposal demonstrate how the vendor can "
                "reduce time through existing compliance frameworks, pre-certified components, or "
                "established banking integration patterns?"
            ),
        },
        {
            "factor": "Resilience and uptime commitments",
            "detail": (
                "Financial systems cannot go down. Are SLA commitments for availability (99.9%+), "
                "disaster recovery, and business continuity specifically stated? Absent = MAJOR."
            ),
        },
    ],
    "Healthcare / Pharma": [
        {
            "factor": "Patient safety is treated as the primary non-negotiable",
            "detail": (
                "In healthcare, patient safety is the lens through which all other decisions are made. "
                "The proposal must demonstrate that patient safety implications have been considered at "
                "every stage of the design. This is not just a compliance checkbox — it is a fundamental "
                "orientation. Does the proposal frame decisions through a patient safety lens?"
            ),
        },
        {
            "factor": "Evidence-based credentials for clinical or health-data work",
            "detail": (
                "Has the vendor delivered clinical-grade or health-data-grade work before? Named "
                "healthcare clients (or anonymised with specific clinical context), FDA/CDSCO "
                "experience, clinical validation methodology (IQ/OQ/PQ), or HL7/FHIR integration "
                "credentials must be present. 'Healthcare experience' without specifics = MISSING."
            ),
        },
        {
            "factor": "Named regulatory pathway for this engagement",
            "detail": (
                "HIPAA, CDSCO, FDA 21 CFR Part 11, MDR, CE Mark, or equivalent must be named for "
                "the specific type of work being delivered. 'We comply with all healthcare regulations' "
                "is a red flag for a sophisticated healthcare buyer — it signals the vendor does not "
                "know which regulations apply."
            ),
        },
        {
            "factor": "Change management and clinical adoption plan",
            "detail": (
                "Healthcare technology fails at adoption, not at build. Does the proposal address how "
                "clinical staff, administrators, or patients will adopt the new system? Training, "
                "workflow integration, champion identification, and phased rollout to protect care "
                "continuity must be addressed."
            ),
        },
    ],
    "Government / Public Sector": [
        {
            "factor": "Value for money is explicitly demonstrated",
            "detail": (
                "Government procurement is legally required to demonstrate value for money. The proposal "
                "must show how the pricing represents good use of public funds — benchmarking against "
                "market rates, reuse of existing assets, or total cost of ownership analysis. "
                "A proposal that just states a price without justification is weak for government."
            ),
        },
        {
            "factor": "Past public sector work is prominently cited",
            "detail": (
                "Government buyers want to see government experience — they consider public sector "
                "work structurally different from private sector work (procurement processes, "
                "accountability requirements, stakeholder complexity). Named department or ministry "
                "work (even anonymised) with outcome metrics is essential. Generic enterprise case "
                "studies are not sufficient."
            ),
        },
        {
            "factor": "Transparency in delivery and governance",
            "detail": (
                "Government clients need to account for public money. Does the proposal commit to "
                "transparent reporting, open-book costing on request, and an audit trail? "
                "Governance model with named reporting cadence and escalation path is expected."
            ),
        },
        {
            "factor": "Social value and public benefit outcomes",
            "detail": (
                "Many government procurement frameworks require social value assessment. Does the "
                "proposal address public benefit, citizen impact, or social outcomes beyond the "
                "technical deliverable? Employment of local suppliers, skills transfer, or social "
                "inclusion in the solution design are win factors."
            ),
        },
        {
            "factor": "Knowledge transfer and in-house capability building",
            "detail": (
                "Government cannot be permanently vendor-dependent. Does the proposal include an "
                "explicit knowledge transfer plan, documentation that enables in-house maintenance, "
                "and training for public sector staff? Absent = MAJOR for government clients."
            ),
        },
    ],
    "Manufacturing": [
        {
            "factor": "Operational continuity during implementation is explicitly addressed",
            "detail": (
                "In manufacturing, downtime is measured in direct revenue loss. The proposal must "
                "explicitly acknowledge production continuity risk and describe the mitigation: "
                "parallel running, phased cutover, rollback plan, maintenance window scheduling. "
                "'We will minimise disruption' = MISSING. A specific continuity plan = COVERED."
            ),
        },
        {
            "factor": "OT/IT integration credentials named",
            "detail": (
                "Manufacturing engagements often involve integrating with operational technology "
                "(PLCs, SCADA, MES, HISTORIAN). Named experience with these systems — specific "
                "platforms, protocols (OPC-UA, Modbus, MQTT), and past manufacturing integrations — "
                "is a critical differentiator. Absent when OT integration is in scope = CRITICAL."
            ),
        },
        {
            "factor": "Safety standards compliance acknowledged",
            "detail": (
                "Applicable safety standards (IEC 62443 for industrial cybersecurity, IS 13252, "
                "functional safety requirements) must be named where relevant. A manufacturing "
                "client evaluating an OT-adjacent proposal expects to see these acknowledged."
            ),
        },
        {
            "factor": "Understanding of production environment constraints",
            "detail": (
                "Does the proposal show understanding of manufacturing-specific constraints — "
                "limited downtime windows, shift patterns, legacy systems that cannot be easily "
                "replaced, and the real-world physical environment in which systems operate?"
            ),
        },
    ],
    "Retail / E-commerce": [
        {
            "factor": "Customer experience continuity during transition is explicitly planned",
            "detail": (
                "For a retail client, any degradation of the customer experience during cutover is "
                "unacceptable — it means lost sales. The proposal must describe how the customer-facing "
                "experience will be protected: zero-downtime deployment approach, A/B rollout, "
                "canary releases, or parallel running. 'Minimal disruption' = MISSING."
            ),
        },
        {
            "factor": "Seasonal and peak load handling explicitly addressed",
            "detail": (
                "Retail clients have predictable demand spikes (festival season, sale events, "
                "Black Friday equivalents). The proposal must acknowledge these explicitly and "
                "describe auto-scaling approach, load testing targets, and capacity planning. "
                "A retail client will immediately notice if peak load is not mentioned."
            ),
        },
        {
            "factor": "Transaction performance and availability SLA stated",
            "detail": (
                "Response time targets, checkout flow availability (99.9%+), and transaction "
                "processing SLAs must be stated. A retail system that is slow at checkout "
                "directly impacts conversion rates — the proposal should demonstrate the vendor "
                "understands this business impact."
            ),
        },
    ],
    "Education": [
        {
            "factor": "Adoption and change management plan — not just technology deployment",
            "detail": (
                "Education technology fails at adoption, not at build. The single most important "
                "win factor for an education client is confidence that the new system will actually "
                "be used. Teacher/student onboarding, training plan, change champion identification, "
                "rollout strategy, and ongoing support model must be present. A proposal that "
                "focuses on features without addressing adoption is a significant competitive weakness."
            ),
        },
        {
            "factor": "Measurable learning outcome KPIs stated",
            "detail": (
                "How will success be defined beyond 'system is live'? Learning outcome metrics, "
                "engagement rates, assessment improvement targets, or attendance/participation "
                "improvement. An education client buying technology wants to know it will improve "
                "educational outcomes — not just digitise existing processes."
            ),
        },
        {
            "factor": "Accessibility and inclusivity explicitly addressed",
            "detail": (
                "WCAG 2.1 AA compliance, low-bandwidth support, device diversity (shared tablets, "
                "mobile), regional language support, and accommodation for students with different "
                "abilities must be addressed. A public education client especially will evaluate "
                "proposals on these grounds."
            ),
        },
    ],
    "Deep Tech / AI": [
        {
            "factor": "IP ownership terms are unambiguous",
            "detail": (
                "In AI/deep tech engagements, IP ownership is a primary commercial concern. "
                "Who owns the trained models, training data, fine-tuned weights, pipeline code, "
                "and inference outputs must be explicitly stated. Any ambiguity is a red flag — "
                "a sophisticated deep tech buyer will immediately notice absent IP terms."
            ),
        },
        {
            "factor": "Model performance, explainability, and bias approach described",
            "detail": (
                "What evaluation metrics will be used? How will model decisions be explained to "
                "end users or regulators? What bias testing framework will be applied? How will "
                "model drift be monitored post-deployment? These are non-negotiable for any "
                "AI/ML engagement with a sophisticated buyer."
            ),
        },
        {
            "factor": "Commercialisation or productisation pathway described",
            "detail": (
                "A deep tech client is typically building something to take to market or scale. "
                "Does the proposal address how the delivered capability will be productised, "
                "scaled, or commercialised? GTM strategy, licensing model, API-first architecture, "
                "or white-labelling capability — absence = MAJOR for this type of client."
            ),
        },
    ],
    "Logistics / Supply Chain": [
        {
            "factor": "Integration with existing WMS/TMS/ERP named",
            "detail": (
                "Named integration approach for the client's specific warehouse management, "
                "transport management, and ERP systems is essential. Generic 'we integrate with "
                "leading platforms' = MISSING. Named systems with specific integration approach "
                "(API, EDI, file-based, real-time vs batch) = COVERED."
            ),
        },
        {
            "factor": "Real-time visibility and tracking approach described",
            "detail": (
                "Logistics clients measure success in real-time visibility. How will shipment, "
                "inventory, or fleet visibility be provided? Data latency SLA? IoT/GPS/RFID "
                "integration if relevant? Mobile access for field operations?"
            ),
        },
        {
            "factor": "Operational resilience and failover described",
            "detail": (
                "Supply chain systems are mission-critical — a logistics platform being down "
                "means goods stop moving. High availability architecture, failover plan, "
                "and SLA commitments must be present."
            ),
        },
    ],
    "Real Estate": [
        {
            "factor": "Data security for sensitive property and financial data",
            "detail": (
                "Real estate transactions involve significant financial and personal data. "
                "How will property valuation data, transaction records, and personal financial "
                "information be protected? Encryption, access controls, and data retention "
                "policies must be addressed."
            ),
        },
        {
            "factor": "Integration with existing property management or CRM systems",
            "detail": (
                "Named integration with the client's existing property management software, "
                "CRM, or MLS/PropTech platforms. Generic integration claims without specific "
                "system names = MINOR gap."
            ),
        },
    ],
}


def get_factors_for_industries(industries: list[str]) -> dict[str, list[dict]]:
    """Returns only the win factors relevant to the selected industries."""
    return {ind: INDUSTRY_WIN_FACTORS[ind] for ind in industries if ind in INDUSTRY_WIN_FACTORS}


def is_active(client_industries: list[str]) -> bool:
    """Returns True if at least one selected industry has known win factors."""
    return any(ind in INDUSTRY_WIN_FACTORS for ind in client_industries)


def build_win_factor_prompt_block(industries: list[str]) -> str:
    """
    Returns the industry win factors as a prompt-ready string,
    filtered to only the selected industries.
    Returns empty string if no matching industries.
    """
    relevant = get_factors_for_industries(industries)
    if not relevant:
        return ""

    lines = []
    for industry, factors in relevant.items():
        lines.append(f"\n{industry.upper()} — WIN FACTORS:")
        for f in factors:
            lines.append(f"  ▸ {f['factor']}: {f['detail']}")
    return "\n".join(lines)
