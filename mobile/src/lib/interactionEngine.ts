import { INTERACTION_RULES, type InteractionRule } from '@/data/interactions';
import type { Medication } from '@/data/types';

export interface InteractionResult {
  rule: InteractionRule;
  medication: Medication;   // the medication in the user's list that triggered drugA
  matchedDrugB: string;     // the specific drugB term that matched
}

/**
 * Evaluates all active medications against the curated interaction rules.
 * Returns only deterministic matches from the hardcoded rule database.
 * Never generates or infers interactions not in the database.
 */
export function evaluateInteractions(meds: Medication[]): InteractionResult[] {
  const results: InteractionResult[] = [];
  const seen = new Set<string>(); // dedup by ruleId + medId

  for (const med of meds) {
    const nameLower = (med.name + ' ' + (med.genericName ?? '')).toLowerCase();

    for (const rule of INTERACTION_RULES) {
      // Check if this med matches drugA
      const matchesA = rule.drugA.some(term => nameLower.includes(term));
      if (!matchesA) continue;

      // Check if any other med in the list matches drugB
      for (const otherMed of meds) {
        if (otherMed.id === med.id) continue;
        const otherName = (otherMed.name + ' ' + (otherMed.genericName ?? '')).toLowerCase();
        const matchedB = rule.drugB.find(term => otherName.includes(term));
        if (matchedB) {
          const key = `${rule.id}:${med.id}:${otherMed.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push({ rule, medication: med, matchedDrugB: otherMed.name });
          }
        }
      }

      // Also check the drugB list against the medication's own name (for food/substance interactions
      // where the "other drug" might be entered as a medication name itself, e.g. "Ibuprofen")
      const selfMatchedB = rule.drugB.find(term => nameLower.includes(term));
      if (selfMatchedB) {
        // The med itself IS drugB — find the med(s) that are drugA and flag them
        // This is already handled above via the outer loop, so skip to avoid dup
      }
    }
  }

  // Sort: call_care_team first, then urgent_review, caution, informational
  const order: Record<string, number> = {
    call_care_team: 0, urgent_review: 1, caution: 2, informational: 3,
  };
  results.sort((a, b) => (order[a.rule.severity] ?? 9) - (order[b.rule.severity] ?? 9));

  return results;
}

/**
 * Returns the count of non-informational interactions.
 * Used to show a badge count in the Meds tab.
 */
export function countActiveInteractions(meds: Medication[]): number {
  return evaluateInteractions(meds).filter(r => r.rule.severity !== 'informational').length;
}
