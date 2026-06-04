"""
Skill NC1.2 — Context Auto-Detector

Identifies the client industry, proposal type, and client priorities from
the proposal text using deterministic keyword matching. No LLM calls.

Industry detection uses a SCORING approach: every matched keyword for an
industry adds one point. Only the top-scoring industries (those with ≥ 2
keyword hits AND ≥ 33% of the top score) are returned, capped at 3.
This prevents a single "supply chain" hit from falsely including Retail,
Manufacturing and Logistics simultaneously.
"""

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


_INDUSTRY_KEYWORDS: dict[str, list[str]] = {
    "Healthcare": ["hospital", "ehr", "clinical", "nhs", "patient", "healthcare",
                   "medical", "pharma", "health system", "gp surgery", "radiology",
                   "oncology", "nursing", "electronic health record"],
    "Fintech": ["fintech", "banking", "payments", "financial services", "lending",
                "credit", "mortgage", "insurtech", "wealth management", "trading",
                "forex", "open banking", "psd2", "kyc", "aml"],
    "Government": ["government", "public sector", "ministry", "council", "local authority",
                   "department", "civil service", "g-cloud", "crown commercial", "public body",
                   "hmrc", "dwp", "home office", "nhs trust"],
    "Retail": ["retail", "e-commerce", "ecommerce", "consumer", "omnichannel", "pos",
               "point of sale", "merchandising", "loyalty programme",
               "store operations", "fulfilment"],
    "Manufacturing": ["manufacturing", "factory", "production", "oem", "industrial",
                      "assembly line", "lean manufacturing", "quality control",
                      "erp", "mes", "scada", "plc", "bill of materials", "work order",
                      "shop floor", "machining", "fabrication"],
    "Energy": ["energy", "utilities", "oil and gas", "renewable", "solar", "wind",
               "grid", "smart meter", "ofgem", "electricity", "nuclear", "upstream",
               "downstream", "refinery"],
    "Telecommunications": ["telecoms", "telecommunications", "telco", "network",
                           "5g", "broadband", "isp", "bss", "oss", "noc",
                           "subscriber", "mvno", "spectrum"],
    "Education": ["education", "school", "university", "college", "student",
                  "curriculum", "edtech", "learning management", "lms", "ofsted",
                  "academy", "higher education", "further education"],
    "Legal": ["law firm", "solicitor", "barrister", "litigation", "conveyancing",
              "legal tech", "case management", "court", "legal sector"],
    "Insurance": ["insurance", "underwriting", "claims", "actuarial",
                  "reinsurance", "lloyd's", "p&c", "life insurance",
                  "health insurance", "premium"],
    "Real Estate": ["real estate", "property management", "landlord", "tenant", "proptech",
                    "facilities management", "building management",
                    "bms", "reit"],
    "Logistics": ["logistics", "freight", "shipping", "warehouse",
                  "last mile", "fleet management", "tms", "wms", "customs",
                  "3pl", "courier", "parcel", "dispatch", "haulage"],
    "Technology": ["software development", "saas platform", "cloud platform",
                   "devops", "microservices", "digital transformation",
                   "enterprise software", "it services", "software vendor"],
    "Defence": ["defence", "defense", "military", "ministry of defence", "mod",
                "nato", "dstl", "classified", "command and control", "armed forces"],
    "Pharma": ["pharmaceutical", "drug", "fda", "mhra", "clinical trial",
               "gxp", "gmp", "regulatory affairs", "life sciences",
               "biotech", "r&d lab"],
}

_PROPOSAL_TYPE_KEYWORDS: dict[str, list[str]] = {
    "Fixed Price": ["fixed price", "fixed-price", "lump sum", "firm price",
                    "fixed cost", "fixed fee", "firm fixed", "not to exceed"],
    "Time & Materials": ["time and materials", "time & materials", "t&m",
                         "day rate", "daily rate", "hourly rate", "rate card",
                         "time-and-materials"],
    "Managed Services": ["managed services", "managed service", "fully managed",
                         "as a service", "outsourcing", "service wrapper",
                         "service management"],
    "Framework Agreement": ["framework agreement", "framework contract", "call-off",
                            "call off", "dps", "dynamic purchasing system",
                            "framework lot"],
    "Retainer": ["retainer", "on-retainer", "monthly retainer", "standing agreement",
                 "ongoing support", "retained service"],
}

_PRIORITY_KEYWORDS: dict[str, list[str]] = {
    "Cost Certainty": ["cost certainty", "budget certainty", "fixed budget",
                       "cost cap", "price guarantee", "no surprises", "capped cost",
                       "budget control"],
    "Speed to Market": ["speed to market", "time to market", "rapid delivery",
                        "fast track", "accelerated", "quick wins", "go-live",
                        "short timeline", "urgent"],
    "Risk Mitigation": ["risk mitigation", "risk management", "de-risk",
                        "risk register", "contingency", "risk reduction",
                        "low risk", "proven approach"],
    "Innovation": ["innovation", "innovative", "cutting-edge", "next generation",
                   "machine learning", "emerging technology", "digital transformation",
                   "modernisation", "modernization"],
    "Compliance": ["compliance", "gdpr", "regulatory", "iso 27001", "iso27001",
                   "soc 2", "hipaa", "pci dss", "audit", "governance",
                   "data protection"],
    "Scalability": ["scalability", "scalable", "elastic", "scale out", "scale up",
                    "high availability", "auto-scaling", "growth"],
    "Integration": ["integration", "interoperability", "middleware",
                    "data migration", "legacy system", "connect", "interface",
                    "data exchange", "hl7", "fhir"],
    "Support & Maintenance": ["support", "maintenance", "sla", "helpdesk",
                               "service desk", "incident management",
                               "break-fix", "warranty", "hypercare"],
}


class ContextAutoDetector:
    """Detects client industry, proposal type, and client priorities via keyword matching.

    Industry detection uses keyword scoring (count of matched keywords per
    industry) so a single shared keyword like 'supply chain' does not falsely
    include unrelated industries.
    """

    def run(self, document_text: str) -> dict[str, Any]:
        logger.debug("NC1.2 ContextAutoDetector.run() text_len=%d", len(document_text))

        lowered = document_text.lower()
        signals: list[dict[str, str]] = []

        client_industry  = self._detect_industries(lowered, signals)
        proposal_type    = self._detect_proposal_type(lowered, signals)
        client_priorities = self._detect_priorities(lowered, signals)

        logger.debug(
            "NC1.2 industries=%s type=%s priorities=%s signals=%d",
            client_industry, proposal_type, client_priorities, len(signals),
        )

        return {
            "client_industry":    client_industry,
            "proposal_type":      proposal_type,
            "client_priorities":  client_priorities,
            "detection_signals":  signals,
        }

    def _detect_industries(self, lowered: str, signals: list[dict[str, str]]) -> list[str]:
        """Score each industry by number of keyword hits; return the top 1-3."""
        scores: dict[str, int] = {}

        for industry, keywords in _INDUSTRY_KEYWORDS.items():
            hit_count = 0
            for kw in keywords:
                try:
                    if re.search(re.escape(kw), lowered):
                        hit_count += 1
                        signals.append({
                            "field":   "client_industry",
                            "keyword": kw,
                            "matched": industry,
                        })
                except Exception as exc:
                    logger.warning("NC1.2 industry regex error '%s': %s", kw, exc)
            if hit_count > 0:
                scores[industry] = hit_count

        if not scores:
            return []

        # Sort by score descending
        ranked = sorted(scores.items(), key=lambda x: -x[1])
        top_score = ranked[0][1]

        # Include only industries with ≥ 2 hits AND ≥ 33% of top score.
        # This prevents single-keyword false positives (e.g. "supply chain"
        # appearing in a manufacturing proposal but not making it look like
        # a logistics or retail proposal too).
        min_hits      = max(2, round(top_score * 0.33))
        filtered      = [ind for ind, count in ranked if count >= min_hits]

        # Hard cap: return at most 3 industries
        return filtered[:3]

    def _detect_proposal_type(self, lowered: str, signals: list[dict[str, str]]) -> str:
        for ptype, keywords in _PROPOSAL_TYPE_KEYWORDS.items():
            for kw in keywords:
                try:
                    if re.search(re.escape(kw), lowered):
                        signals.append({
                            "field":   "proposal_type",
                            "keyword": kw,
                            "matched": ptype,
                        })
                        return ptype
                except Exception as exc:
                    logger.warning("NC1.2 proposal_type regex error '%s': %s", kw, exc)
        return "Unknown"

    def _detect_priorities(self, lowered: str, signals: list[dict[str, str]]) -> list[str]:
        matched: list[str] = []
        for priority, keywords in _PRIORITY_KEYWORDS.items():
            for kw in keywords:
                try:
                    if re.search(re.escape(kw), lowered):
                        matched.append(priority)
                        signals.append({
                            "field":   "client_priorities",
                            "keyword": kw,
                            "matched": priority,
                        })
                        break
                except Exception as exc:
                    logger.warning("NC1.2 priority regex error '%s': %s", kw, exc)
        return matched
