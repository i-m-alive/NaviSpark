"""
Skill NC3.2 — Evidence Linker

Post-processes the raw findings list from NC3.1 to enrich each finding's
"evidence" field. Classifies the evidence type, attempts verification against
the proposal text, and downgrades PASS findings that lack any evidence to PARTIAL.
"""

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

_SLIDE_RE = re.compile(r"[Ss]lide\s*\d+")
_PAGE_RE = re.compile(r"[Pp]age\s*\d+")
_SECTION_RE = re.compile(r"[Ss]ection[\s:]+\w")


class EvidenceLinker:
    """Enriches LLM findings with evidence classification and document verification.

    For each finding, determines whether the evidence reference is a slide number,
    page number, section name, a direct quote from the document, or a paraphrase.
    Attempts to verify that the evidence phrase actually appears in the proposal text.

    PASS findings with no evidence are downgraded to PARTIAL with a gap note.
    """

    def run(
        self,
        findings: list[dict[str, Any]],
        proposal_text: str,
        category_items: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Enrich findings with evidence metadata.

        Args:
            findings: Raw findings list from NC3.1 (or a preceding skill stage).
            proposal_text: Full proposal text — used to verify evidence strings.
            category_items: Items list from the NC2 category dict (for reference).

        Returns:
            The findings list, each dict now containing an "evidence_meta" key.
        """
        logger.debug(
            "NC3.2 EvidenceLinker.run() findings=%d", len(findings)
        )
        proposal_lower = proposal_text.lower()

        for finding in findings:
            evidence: str | None = finding.get("evidence")
            evidence_type, evidence_verified = self._classify_evidence(
                evidence, proposal_lower
            )

            finding["evidence_meta"] = {
                "type": evidence_type,
                "verified": evidence_verified,
                "raw": evidence,
            }

            if finding.get("status") == "PASS" and evidence_type == "none":
                finding["status"] = "PARTIAL"
                finding["gap"] = (
                    "Item marked PASS but no evidence was provided. "
                    "Manual verification required."
                )
                logger.warning(
                    "NC3.2 downgraded item '%s' from PASS to PARTIAL — no evidence provided",
                    finding.get("item_id", "?"),
                )

        logger.debug("NC3.2 complete. findings=%d", len(findings))
        return findings

    def _classify_evidence(
        self,
        evidence: str | None,
        proposal_lower: str,
    ) -> tuple[str, bool]:
        """Classify the evidence type and verify its presence in the proposal.

        Args:
            evidence: The evidence string from the LLM finding (may be None).
            proposal_lower: Lowercased full proposal text for substring checks.

        Returns:
            Tuple of (evidence_type, evidence_verified).
        """
        if not evidence or not evidence.strip():
            return "none", False

        try:
            if _SLIDE_RE.search(evidence):
                verified = self._verify_key_phrase(evidence, proposal_lower)
                return "slide_reference", verified

            if _PAGE_RE.search(evidence):
                verified = self._verify_key_phrase(evidence, proposal_lower)
                return "page_reference", verified

            if _SECTION_RE.search(evidence):
                verified = self._verify_key_phrase(evidence, proposal_lower)
                return "section_reference", verified

            stripped = evidence.strip("\"'")
            if stripped.lower() in proposal_lower:
                return "direct_quote", True

            verified = self._verify_key_phrase(evidence, proposal_lower)
            return "paraphrase", verified

        except Exception as exc:
            logger.warning("NC3.2 evidence classification error: %s", exc)
            return "paraphrase", False

    def _verify_key_phrase(self, evidence: str, proposal_lower: str) -> bool:
        """Check whether a key phrase from the evidence appears in the proposal.

        Extracts the first sequence of 4+ words from the evidence string and
        checks if it appears (case-insensitively) in the proposal text.

        Args:
            evidence: The evidence string from the LLM.
            proposal_lower: Lowercased proposal text.

        Returns:
            True if the key phrase was found.
        """
        try:
            clean = re.sub(r"[\"'`]", "", evidence).strip()
            words = [w for w in clean.split() if len(w) > 2]
            if len(words) < 2:
                return clean.lower() in proposal_lower

            key_phrase = " ".join(words[:4]).lower()
            return key_phrase in proposal_lower
        except Exception:
            return False
