"""
Skill NC1.2 — Context Auto-Detector

Identifies the client industry, proposal type, and client priorities from
the proposal text using deterministic keyword matching. No LLM calls.
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
               "point of sale", "merchandising", "supply chain", "loyalty programme",
               "store operations", "fulfilment"],
    "Manufacturing": ["manufacturing", "factory", "production", "oem", "industrial",
                      "assembly line", "lean manufacturing", "quality control",
                      "supply chain", "erp", "mes", "scada", "plc"],
    "Energy": ["energy", "utilities", "oil and gas", "renewable", "solar", "wind",
               "grid", "smart meter", "ofgem", "electricity", "nuclear", "upstream",
               "downstream", "refinery"],
    "Telecommunications": ["telecoms", "telecommunications", "telco", "network",
                           "5g", "broadband", "isp", "bss", "oss", "noc",
                           "subscriber", "mvno", "spectrum"],
    "Education": ["education", "school", "university", "college", "student",
                  "curriculum", "edtech", "learning management", "lms", "ofsted",
                  "academy", "higher education", "further education"],
    "Legal": ["legal", "law firm", "solicitor", "barrister", "compliance",
              "regulatory", "gdpr", "litigation", "conveyancing", "legal tech",
              "case management", "court"],
    "Insurance": ["insurance", "underwriting", "claims", "actuarial", "policy",
                  "reinsurance", "broker", "lloyd's", "p&c", "life insurance",
                  "health insurance", "premium"],
    "Real Estate": ["real estate", "property", "landlord", "tenant", "proptech",
                    "construction", "facilities management", "fm", "building management",
                    "bms", "reit"],
    "Logistics": ["logistics", "supply chain", "freight", "shipping", "warehouse",
                  "last mile", "fleet management", "tms", "wms", "customs",
                  "3pl", "courier", "parcel"],
    "Technology": ["software", "saas", "platform", "cloud", "aws", "azure", "gcp",
                   "devops", "microservices", "api", "digital transformation",
                   "enterprise software", "it services"],
    "Defence": ["defence", "defense", "military", "ministry of defence", "mod",
                "nato", "dstl", "secure", "classified", "mission critical",
                "command and control", "c2", "armed forces"],
    "Pharma": ["pharmaceutical", "drug", "fda", "mhra", "clinical trial",
               "gxp", "gmp", "regulatory affairs", "life sciences",
               "biotech", "r&d", "compound"],
}

_PROPOSAL_TYPE_KEYWORDS: dict[str, list[str]] = {
    "Fixed Price": ["fixed price", "fixed-price", "lump sum", "firm price",
                    "fixed cost", "fixed fee", "firm fixed", "not to exceed"],
    "Time & Materials": ["time and materials", "time & materials", "t&m",
                         "day rate", "daily rate", "hourly rate", "rate card",
                         "time-and-materials"],
    "Managed Services": ["managed services", "managed service", "fully managed",
                         "as a service", "aaas", "outsourcing", "service wrapper",
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
                   "ai", "machine learning", "emerging technology", "digital transformation",
                   "modernisation", "modernization"],
    "Compliance": ["compliance", "gdpr", "regulatory", "iso 27001", "iso27001",
                   "soc 2", "hipaa", "pci dss", "audit", "governance", "fca",
                   "data protection"],
    "Scalability": ["scalability", "scalable", "elastic", "scale out", "scale up",
                    "high availability", "ha", "auto-scaling", "growth", "volume"],
    "Integration": ["integration", "interoperability", "api", "middleware",
                    "data migration", "legacy system", "connect", "interface",
                    "data exchange", "hl7", "fhir"],
    "Support & Maintenance": ["support", "maintenance", "sla", "helpdesk",
                               "service desk", "24/7", "incident management",
                               "break-fix", "warranty", "hypercare"],
}


class ContextAutoDetector:
    """Detects client industry, proposal type, and client priorities via keyword matching.

    All matching is case-insensitive. Multiple industries and priorities may be
    returned. Proposal type returns the first match or "Unknown".

    A ``detection_signals`` list is included in the output so that downstream
    skills (especially NC1.5 ConfidenceScorer) can assess evidence quality.
    """

    def run(self, document_text: str) -> dict[str, Any]:
        """Detect contextual attributes from proposal text.

        Args:
            document_text: Raw extracted text of the proposal.

        Returns:
            A dict with keys:
              - client_industry (list[str]): matched industries.
              - proposal_type (str): matched type or "Unknown".
              - client_priorities (list[str]): matched priorities.
              - detection_signals (list[dict]): evidence log for confidence scoring.
        """
        logger.debug("NC1.2 ContextAutoDetector.run() text_len=%d", len(document_text))

        lowered = document_text.lower()
        signals: list[dict[str, str]] = []

        client_industry = self._detect_industries(lowered, signals)
        proposal_type = self._detect_proposal_type(lowered, signals)
        client_priorities = self._detect_priorities(lowered, signals)

        logger.debug("NC1.2 industries=%s type=%s priorities=%s signals=%d",
                     client_industry, proposal_type, client_priorities, len(signals))

        return {
            "client_industry": client_industry,
            "proposal_type": proposal_type,
            "client_priorities": client_priorities,
            "detection_signals": signals,
        }

    def _detect_industries(self, lowered: str, signals: list[dict[str, str]]) -> list[str]:
        """Match industry keywords against the lowercased document text.

        Args:
            lowered: Lowercased document text.
            signals: Mutable list to append signal records to.

        Returns:
            List of matched industry names.
        """
        matched: list[str] = []
        for industry, keywords in _INDUSTRY_KEYWORDS.items():
            for kw in keywords:
                try:
                    if re.search(re.escape(kw), lowered):
                        matched.append(industry)
                        signals.append({
                            "field": "client_industry",
                            "keyword": kw,
                            "matched": industry,
                        })
                        break
                except Exception as exc:
                    logger.warning("NC1.2 industry regex error for '%s': %s", kw, exc)
        return matched

    def _detect_proposal_type(self, lowered: str, signals: list[dict[str, str]]) -> str:
        """Match proposal-type keywords and return the first match.

        Args:
            lowered: Lowercased document text.
            signals: Mutable list to append signal records to.

        Returns:
            Matched proposal type string or "Unknown".
        """
        for ptype, keywords in _PROPOSAL_TYPE_KEYWORDS.items():
            for kw in keywords:
                try:
                    if re.search(re.escape(kw), lowered):
                        signals.append({
                            "field": "proposal_type",
                            "keyword": kw,
                            "matched": ptype,
                        })
                        return ptype
                except Exception as exc:
                    logger.warning("NC1.2 proposal_type regex error for '%s': %s", kw, exc)
        return "Unknown"

    def _detect_priorities(self, lowered: str, signals: list[dict[str, str]]) -> list[str]:
        """Match priority keywords against the lowercased document text.

        Args:
            lowered: Lowercased document text.
            signals: Mutable list to append signal records to.

        Returns:
            List of matched priority names.
        """
        matched: list[str] = []
        for priority, keywords in _PRIORITY_KEYWORDS.items():
            for kw in keywords:
                try:
                    if re.search(re.escape(kw), lowered):
                        matched.append(priority)
                        signals.append({
                            "field": "client_priorities",
                            "keyword": kw,
                            "matched": priority,
                        })
                        break
                except Exception as exc:
                    logger.warning("NC1.2 priority regex error for '%s': %s", kw, exc)
        return matched
