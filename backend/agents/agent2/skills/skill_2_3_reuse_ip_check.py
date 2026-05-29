"""
Skill 2.3 — Reuse & IP Asset Check
Checks whether pre-built frameworks/accelerators are properly accounted for
in both the effort estimate and the pricing section.
Covers GSK items E5 (reuse claimed in estimate) and P3c (IP cost in pricing).
"""

RESULT_KEYS = ["estimation_issues"]

OUTPUT_SCHEMA = {
    "estimation_issues": [
        {
            "skill": "2.3",
            "gsk_item": "E5 | P3c",
            "issue": "string — specific description of the reuse/IP integrity problem",
            "severity": "CRITICAL | MAJOR | MINOR",
            "recommendation": "string — specific, actionable fix",
        }
    ]
}

PROMPT_SECTION = """
═══════════════════════════════════════════════════
SKILL 2.3 — REUSE & IP ASSET CHECK
═══════════════════════════════════════════════════

When a vendor claims to use pre-built accelerators, frameworks, or IP assets, three things
must be true: (1) the assets are listed, (2) the effort reduction is reflected in the estimate,
and (3) any licensing or IP cost appears in the pricing.

WHAT TO CHECK:

CHECK 1 — E5: Are pre-existing frameworks or accelerators explicitly listed?
  - If the proposal claims effort reduction from reuse, the specific assets must be named.
  - "Our proprietary accelerator reduces time by 30%" without naming the accelerator = PARTIAL.
  - No mention of any reuse or accelerators: acceptable if the estimate is a ground-up build.
    Do NOT flag this if there is no claim of reuse.

CHECK 2 — E5: Is the effort reduction from reuse reflected in the estimate?
  - If reuse is claimed, the estimate must show reduced effort (e.g., "Without accelerator:
    240 days. With accelerator: 168 days — 30% reduction"). Generic claim without a
    before/after comparison = PARTIAL.
  - If the vendor claims 30% reduction but the estimate shows the same effort as a ground-up
    build, flag as MAJOR — the client is being charged for work the vendor won't do.

CHECK 3 — P3c: Is the IP or licensed component cost included in the pricing?
  - If the vendor uses licensed third-party components or charges a platform/IP fee, this must
    appear as a named line item in the pricing section.
  - If licensing cost is embedded in the total without disclosure = MAJOR.
  - If vendor uses its own IP with no cost to the client: acceptable. Note it as COVERED.

SEVERITY RULES:
- Effort reduction claimed but not shown in estimate: MAJOR
- IP/license cost used but not disclosed in pricing: MAJOR
- Named assets missing when reuse is claimed: MINOR

IMPORTANT:
- Only run these checks if the proposal claims reuse or accelerators.
- If there is NO mention of reuse, frameworks, or IP assets anywhere in the proposal,
  return an empty array for Skill 2.3 — there is nothing to check.
"""
