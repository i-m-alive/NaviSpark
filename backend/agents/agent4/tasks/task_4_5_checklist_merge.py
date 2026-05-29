"""
Task 4.5 — Unified Checklist Coverage Grid (pure Python, no LLM).

Merges the individual agent coverage data into a single 57-item grid
spanning all three GSK sheets (Proposal, Estimation, Pricing).

Status derivation logic per source:
  a1_section_audit  — read item.status directly from Agent 1's section_audit list
  a3_checklist      — read item.status directly from Agent 3's checklist_coverage list
  a2_estimation     — derive from presence/absence in Agent 2's estimation_issues list
  a2_phases         — derive from Agent 2's missing_phases list
  a2_pricing        — derive from Agent 2's pricing_issues list
  a2_internal       — always COVERED (internal controls are present or absent — flagged separately)
"""

from agents.agent4.resources.checklist_manifest import ALL_ITEMS


def run(
    agent1_output: dict,
    agent2_output: dict,
    agent3_output: dict,
) -> list:
    """
    Returns a list of 57 coverage dicts, one per GSK checklist item:
        [{
          "id": "P-01",
          "topic": "...",
          "mandatory": bool,
          "sheet": "Proposal|Estimation|Pricing",
          "status": "COVERED|PARTIAL|MISSING",
          "primary_agent": "A1|A2|A3",
          "skill": "...",
          "note": "...",
          "internal": bool
        }]
    """
    # Build lookup structures for fast O(1) access
    a1_audit_map = _build_a1_audit_map(agent1_output)
    a3_checklist_map = _build_a3_checklist_map(agent3_output)
    a2_missing_phases_set = _build_a2_phases_set(agent2_output)
    a2_estimation_issues_map = _build_a2_estimation_map(agent2_output)
    a2_pricing_issues_map = _build_a2_pricing_map(agent2_output)
    a2_internal_flags = _build_a2_internal_flags(agent2_output)

    result = []
    for item in ALL_ITEMS:
        source = item.get("source", "")
        status, note = _derive_status(
            item,
            source,
            a1_audit_map,
            a3_checklist_map,
            a2_missing_phases_set,
            a2_estimation_issues_map,
            a2_pricing_issues_map,
            a2_internal_flags,
        )
        result.append({
            "id": item["id"],
            "topic": item["topic"],
            "mandatory": item["mandatory"],
            "sheet": item["sheet"],
            "status": status,
            "primary_agent": item["primary_agent"],
            "skill": item["skill"],
            "note": note,
            "internal": item.get("internal", False),
        })

    return result


# ── Status derivation ─────────────────────────────────────────────────────────

def _derive_status(
    item: dict,
    source: str,
    a1_map: dict,
    a3_map: dict,
    a2_phases: set,
    a2_estimation: dict,
    a2_pricing: dict,
    a2_internal: dict,
) -> tuple:
    """Returns (status, note) for one manifest item."""
    item_id = item["id"]

    if source == "a1_section_audit":
        entry = a1_map.get(item_id)
        if entry:
            status = entry.get("status", "MISSING")
            note = entry.get("note", "")
            return status, note
        return "MISSING", f"Item {item_id} not found in Agent 1 section audit."

    if source == "a3_checklist":
        entry = a3_map.get(item_id)
        if entry:
            status = entry.get("status", "MISSING")
            note = entry.get("note", "")
            return status, note
        return "MISSING", f"Item {item_id} not found in Agent 3 checklist coverage."

    if source == "a2_phases":
        # If the corresponding GSK item ID appears in missing_phases, it's MISSING.
        # Otherwise assume COVERED (Agent 2 only flags what's missing/problematic).
        if item_id in a2_phases:
            return "MISSING", f"Agent 2 flagged this phase as missing or uncosted."
        return "COVERED", "Phase effort is accounted for in the estimation."

    if source == "a2_estimation":
        # Check estimation_issues for references to this item's GSK id
        issue = a2_estimation.get(item_id)
        if issue:
            sev = issue.get("severity", "MINOR")
            return _severity_to_status(sev), issue.get("issue", "")
        return "COVERED", "No estimation issue flagged for this item."

    if source == "a2_pricing":
        issue = a2_pricing.get(item_id)
        if issue:
            sev = issue.get("severity", "MINOR")
            return _severity_to_status(sev), issue.get("issue", "")
        # Commercial model check for PR-19 / P-19 (commercial plan)
        cma = a2_pricing.get("__commercial_model__")
        if cma and item_id in ("P-19", "PR-02"):
            if not cma.get("appropriate_for_scope", True):
                return "PARTIAL", f"Commercial model '{cma.get('model_stated', '')}' flagged as mismatched."
        return "COVERED", "No pricing issue flagged for this item."

    if source == "a2_internal":
        flag = a2_internal.get(item_id)
        if flag:
            sev = flag.get("severity", "MAJOR")
            return _severity_to_status(sev), f"[INTERNAL] {flag.get('finding', '')}"
        # If no internal flag raised, we cannot confirm presence (internal controls
        # are not visible in the proposal itself). Mark PARTIAL as a safe default.
        return "PARTIAL", "[INTERNAL] Margin target status not confirmed in this review."

    return "MISSING", "Source type unknown."


def _severity_to_status(severity: str) -> str:
    if severity == "CRITICAL":
        return "MISSING"
    if severity == "MAJOR":
        return "PARTIAL"
    return "COVERED"


# ── Lookup builders ───────────────────────────────────────────────────────────

def _build_a1_audit_map(agent1_output: dict) -> dict:
    """Maps item ID → audit entry from Agent 1's section_audit list."""
    result = {}
    for entry in (agent1_output.get("section_audit") or []):
        eid = entry.get("id")
        if eid:
            result[eid] = entry
    return result


def _build_a3_checklist_map(agent3_output: dict) -> dict:
    """Maps item ID → coverage entry from Agent 3's checklist_coverage list."""
    result = {}
    for entry in (agent3_output.get("checklist_coverage") or []):
        eid = entry.get("id")
        if eid:
            result[eid] = entry
    return result


def _build_a2_phases_set(agent2_output: dict) -> set:
    """Returns a set of GSK item IDs that appear in Agent 2's missing_phases."""
    missing = set()
    for entry in (agent2_output.get("missing_phases") or []):
        gsk = entry.get("gsk_item")
        if gsk:
            # Normalise: "E-06" stays as-is; our manifest uses the same IDs
            missing.add(gsk.strip())
    return missing


def _build_a2_estimation_map(agent2_output: dict) -> dict:
    """Maps GSK item ID → first estimation_issue entry for that item."""
    result = {}
    for entry in (agent2_output.get("estimation_issues") or []):
        gsk = entry.get("gsk_item")
        if gsk and gsk not in result:
            result[gsk.strip()] = entry
    return result


def _build_a2_pricing_map(agent2_output: dict) -> dict:
    """Maps GSK item ID → first pricing_issue entry, plus commercial model snapshot."""
    result = {}
    for entry in (agent2_output.get("pricing_issues") or []):
        gsk = entry.get("gsk_item")
        if gsk and gsk not in result:
            result[gsk.strip()] = entry
    # Attach commercial model for PR-02 / P-19 check
    cma = agent2_output.get("commercial_model_assessment")
    if cma:
        result["__commercial_model__"] = cma
    return result


def _build_a2_internal_flags(agent2_output: dict) -> dict:
    """Maps check ID → internal flag entry from Agent 2's internal_flags."""
    result = {}
    for entry in (agent2_output.get("internal_flags") or []):
        check = entry.get("check")
        if check:
            # Map P3d → PR-03d, P4b → PR-04
            gsk = check.strip()
            if gsk == "P3d":
                result["PR-03d"] = entry
            elif gsk == "P4b":
                result["PR-04"] = entry
            else:
                result[gsk] = entry
    return result
