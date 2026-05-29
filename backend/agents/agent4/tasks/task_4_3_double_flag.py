"""
Task 4.3 — Double-Flag Detection (pure Python, no LLM).

Collects every finding from all three agents, normalises them into a flat
list of (source_agent, issue_text) pairs, then uses keyword overlap scoring
to detect the same root problem appearing in two or more agents.

Double-flagged issues are passed into the Bedrock prompt pre-labelled so
Claude writes the human-readable synthesis — but the DETECTION itself is
deterministic and never hallucinates.
"""

import re
from collections import defaultdict


# ── Stop words excluded from keyword matching ─────────────────────────────────
_STOP_WORDS = frozenset({
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "should",
    "could", "may", "might", "shall", "can", "need", "must",
    "of", "in", "on", "at", "to", "for", "with", "by", "from", "as",
    "and", "or", "but", "not", "no", "nor", "so", "yet", "both",
    "this", "that", "these", "those", "it", "its", "their", "our",
    "any", "all", "each", "every", "some", "such", "than", "then",
    "if", "when", "where", "which", "who", "what", "how",
    "there", "here", "also", "too", "very", "just", "more", "most",
    "proposal", "section", "document", "client", "vendor",
})

# Minimum keyword overlap (Jaccard similarity) to consider two findings as
# referencing the same root problem.
_JACCARD_THRESHOLD = 0.20

# Minimum absolute shared-keyword count regardless of Jaccard ratio.
_MIN_SHARED_KEYWORDS = 2


def run(
    agent1_output: dict,
    agent2_output: dict,
    agent3_output: dict,
) -> list:
    """
    Detects findings that appear in two or more agents, indicating a high-priority issue.

    Returns a list of double-flagged issue dicts:
        [{
          "issue_summary": str,       -- representative text from the first agent
          "agents": [str],            -- e.g. ["Agent 1", "Agent 3"]
          "agent_quotes": [str],      -- raw finding text from each source agent
          "shared_keywords": [str],   -- the keywords that matched
          "severity": "CRITICAL"      -- always promoted to CRITICAL
        }]
    """
    # ── Collect all findings from each agent ──────────────────────────────────
    findings = []
    findings.extend(_extract_agent1_findings(agent1_output))
    findings.extend(_extract_agent2_findings(agent2_output))
    findings.extend(_extract_agent3_findings(agent3_output))

    # ── Compare every pair for keyword overlap ────────────────────────────────
    n = len(findings)
    matched_pairs = []   # list of (i, j, shared_keywords)

    for i in range(n):
        for j in range(i + 1, n):
            f_i = findings[i]
            f_j = findings[j]
            # Skip if same agent — we want cross-agent matches only
            if f_i["agent"] == f_j["agent"]:
                continue
            shared = _keyword_overlap(f_i["keywords"], f_j["keywords"])
            if shared:
                matched_pairs.append((i, j, shared))

    # ── Group overlapping findings into clusters ──────────────────────────────
    # Union-Find to merge transitively overlapping pairs
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x, y):
        parent[find(x)] = find(y)

    for i, j, _ in matched_pairs:
        union(i, j)

    clusters = defaultdict(list)
    for idx, finding in enumerate(findings):
        root = find(idx)
        clusters[root].append(idx)

    # ── Build output — only clusters spanning 2+ agents ──────────────────────
    double_flagged = []

    for root, indices in clusters.items():
        agents_in_cluster = list({findings[idx]["agent"] for idx in indices})
        if len(agents_in_cluster) < 2:
            continue

        # Collect all shared keywords across pairs in this cluster
        all_shared = set()
        for i, j, shared in matched_pairs:
            if find(i) == root and find(j) == root:
                all_shared.update(shared)

        # Representative finding = the one from the lowest-numbered agent
        agent_order = {"Agent 1": 0, "Agent 2": 1, "Agent 3": 2}
        representative_idx = min(
            indices, key=lambda idx: agent_order.get(findings[idx]["agent"], 9)
        )
        representative_text = findings[representative_idx]["text"]

        quotes = [findings[idx]["text"] for idx in indices]

        double_flagged.append({
            "issue_summary": representative_text,
            "agents": sorted(agents_in_cluster, key=lambda a: agent_order.get(a, 9)),
            "agent_quotes": quotes,
            "shared_keywords": sorted(all_shared)[:10],  # cap for prompt length
            "severity": "CRITICAL",
        })

    return double_flagged


# ── Extraction helpers ────────────────────────────────────────────────────────

def _extract_agent1_findings(output: dict) -> list:
    findings = []
    # Writing issues
    for item in output.get("writing_issues") or []:
        text = item.get("issue") or item.get("quote") or ""
        if text:
            findings.append(_make(text, "Agent 1", item.get("severity")))
    # Scope clarity issues
    for item in output.get("scope_clarity_issues") or []:
        text = item.get("issue") or item.get("description") or ""
        if text:
            findings.append(_make(text, "Agent 1", item.get("severity")))
    # High risk assumptions
    for item in output.get("high_risk_assumptions") or []:
        text = item.get("assumption") or ""
        if text:
            findings.append(_make(text, "Agent 1", "MAJOR"))
    # Section audit — MISSING or PARTIAL mandatory items
    for item in output.get("section_audit") or []:
        if item.get("status") in ("MISSING", "PARTIAL") and item.get("mandatory"):
            text = f"Section {item.get('id', '')} ({item.get('section', item.get('topic', ''))}) is {item.get('status', '')}"
            if item.get("note"):
                text += f": {item['note']}"
            findings.append(_make(text, "Agent 1", "MAJOR" if item.get("status") == "MISSING" else "MINOR"))
    # Client-specific gaps
    for item in output.get("client_specific_gaps") or []:
        text = item.get("gap") or item.get("finding") or ""
        if text:
            findings.append(_make(text, "Agent 1", item.get("severity")))
    return findings


def _extract_agent2_findings(output: dict) -> list:
    findings = []
    for item in output.get("estimation_issues") or []:
        text = item.get("issue") or ""
        if text:
            findings.append(_make(text, "Agent 2", item.get("severity")))
    for item in output.get("missing_phases") or []:
        text = f"Phase '{item.get('phase', '')}' ({item.get('gsk_item', '')}) is missing from estimation"
        findings.append(_make(text, "Agent 2", item.get("severity")))
    for item in output.get("pricing_issues") or []:
        text = item.get("issue") or ""
        if text:
            findings.append(_make(text, "Agent 2", item.get("severity")))
    for item in output.get("arithmetic_flags") or []:
        text = item.get("finding") or ""
        if text:
            findings.append(_make(text, "Agent 2", item.get("severity")))
    return findings


def _extract_agent3_findings(output: dict) -> list:
    findings = []
    for item in output.get("client_fit_issues") or []:
        text = item.get("issue") or ""
        if text:
            findings.append(_make(text, "Agent 3", item.get("severity")))
    for item in output.get("risk_transparency_issues") or []:
        text = item.get("issue") or ""
        if text:
            findings.append(_make(text, "Agent 3", item.get("severity")))
    for item in output.get("credibility_gaps") or []:
        text = item.get("issue") or ""
        if text:
            findings.append(_make(text, "Agent 3", item.get("severity")))
    for item in output.get("overclaiming_flags") or []:
        text = item.get("claim") or ""
        if text:
            findings.append(_make(text, "Agent 3", item.get("severity")))
    narr = output.get("narrative_assessment") or {}
    for gap in narr.get("narrative_gaps") or []:
        if gap:
            findings.append(_make(gap, "Agent 3", "MINOR"))
    for item in output.get("industry_findings") or []:
        if item.get("finding") in ("absent", "weak"):
            text = f"Industry factor '{item.get('factor', '')}' is {item.get('finding', '')}"
            findings.append(_make(text, "Agent 3", item.get("severity")))
    return findings


def _make(text: str, agent: str, severity=None) -> dict:
    return {
        "text": text,
        "agent": agent,
        "severity": severity or "MINOR",
        "keywords": _extract_keywords(text),
    }


def _extract_keywords(text: str) -> frozenset:
    words = re.findall(r"[a-z]{3,}", text.lower())
    return frozenset(w for w in words if w not in _STOP_WORDS)


def _keyword_overlap(kw_a: frozenset, kw_b: frozenset) -> set:
    """Returns the shared keywords if overlap passes both thresholds, else empty set."""
    if not kw_a or not kw_b:
        return set()
    shared = kw_a & kw_b
    if len(shared) < _MIN_SHARED_KEYWORDS:
        return set()
    jaccard = len(shared) / len(kw_a | kw_b)
    if jaccard < _JACCARD_THRESHOLD:
        return set()
    return shared
