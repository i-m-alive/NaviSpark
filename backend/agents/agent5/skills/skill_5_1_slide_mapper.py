"""
Skill 5.1 — Slide Content Mapper

Instructs Agent 5 to cross-reference the slide map against all agent findings
and produce a precise location map before generating any modification instructions.
"""


def get_skill_prompt() -> str:
    return """
═══════════════════════════════════════════════════
SKILL 5.1 — SLIDE CONTENT MAPPER (Run This First)
═══════════════════════════════════════════════════

PURPOSE:
Before generating any modification instruction you must locate EACH agent finding
inside the slide map. Every modification MUST reference a real slide_index and
shape_name from the SLIDE MAP provided in the user message.

MAPPING RULES:

1. For every entry in agent1_output.writing_issues[].quote:
   - Find which slide + shape contains that exact or near-exact quote.
   - Record: slide_index, shape_name, matched_text.

2. For agent1_output.rewrite (the improved paragraph):
   - Find the slide + shape that contains rewrite.original.
   - This becomes a top-priority replace_text modification using rewrite.improved.

3. For every entry in agent1_output.scope_clarity_issues[].quote:
   - Find which slide + shape contains that ambiguous text.

4. For every entry in agent3_output.overclaiming_flags[].claim:
   - Find which slide + shape contains that overclaiming phrase.

5. For agent4_output.rewrite_suggestions[].original:
   - Find which slide + shape contains that paragraph.
   - Agent 4's rewrite_suggestions have original → improved already paired.
     These are the HIGHEST PRIORITY replace_text modifications.

SLIDE MAP FORMAT — HOW TO READ IT:
Each shape entry looks like:
    [SHAPE_NAME] (role, font): text content
• shape_name for your JSON = the text inside [ ] only.
• The (role, font) parenthetical is metadata — never copy it into shape_name.
• Example:  [Content Placeholder 2] (body, inherited): Our solution delivers...
  → shape_name: "Content Placeholder 2"   ← correct
  → shape_name: "Content Placeholder 2] (body, inherited)"  ← WRONG

MATCHING STRATEGY:
- Use case-insensitive substring matching (not exact character match).
- If a quote spans multiple shapes, pick the shape with the longest match.
- If you cannot locate a finding in any slide, mark it as skipped with reason
  "Quote not found in any slide shape".
- Never invent slide_index or shape_name values — use ONLY values from the
  SLIDE MAP in the user message.

SHAPE SELECTION RULES (critical — prevents text overlay):
- PREFER shapes with role "body" or "title" over "free_text" shapes.
- "free_text" shapes with a large explicit font (e.g. "28pt" shown in the metadata)
  are design/callout elements. DO NOT target them for replace_text unless the
  finding explicitly refers to a callout or heading.
- Only target a "free_text" shape when:
  a) No body/title shape on the same slide contains the relevant text, AND
  b) The original_text you provide is a LONG, UNIQUE excerpt (> 30 chars).
- For replace_text: always provide the LONGEST possible original_text excerpt
  from the target paragraph — never a short phrase (< 20 chars).

OUTPUT REQUIREMENT:
Your modifications JSON must ONLY use slide_index and shape_name values that
appear verbatim in the SLIDE MAP. Any modification referencing a shape or slide
not in the map will be silently discarded by the modifier.
"""
