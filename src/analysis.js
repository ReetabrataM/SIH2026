import { createHash } from 'node:crypto';

const matches = (text, words) => words.some(word => text.includes(word));
export function analyzeContent({ title = '', description = '', url = '' }) {
  const text = `${title} ${description} ${url}`.toLowerCase().slice(0, 12_000);
  const contentHash = createHash('sha256').update(`${url}|${title}`).digest('hex');
  if (!text.trim()) return { contentHash, category:'unknown', risk:'unknown', confidence:0, claim:'insufficient_evidence', explanation:'No usable page title or description was available for analysis.', evidence:[] };
  if (matches(text, ['porn','nude','explicit sex','onlyfans'])) return { contentHash, category:'adult', risk:'high', confidence:.82, claim:'not_applicable', explanation:'Browser-visible text contains age-restricted keywords. This is a heuristic, not a visual-content determination.', evidence:[] };
  if (matches(text, ['casino','bet now','sportsbook','jackpot'])) return { contentHash, category:'gambling', risk:'high', confidence:.85, claim:'not_applicable', explanation:'Browser-visible text contains gambling-related keywords.', evidence:[] };
  if (matches(text, ['guaranteed cure','they don\'t want you to know','breaking:','100% proven','election was rigged'])) return { contentHash, category:'claim', risk:'medium', confidence:.7, claim:'unverified', explanation:'A strong factual claim or sensational framing was detected. No external evidence was retrieved, so this remains unverified.', evidence:[] };
  if (matches(text, ['government','election','minister','parliament','policy'])) return { contentHash, category:'politics', risk:'low', confidence:.55, claim:'opinion_or_context_needed', explanation:'Political context detected. Political content alone is not treated as misinformation.', evidence:[] };
  return { contentHash, category:'general', risk:'low', confidence:.5, claim:'not_applicable', explanation:'No high-confidence safety or claim signal was found in the browser-visible metadata.', evidence:[] };
}
export function policy({ ageGroup, analysis, continuousSeconds }) {
  if (analysis.risk === 'unknown') return null;
  if (['under_13','13_15','16_17'].includes(ageGroup) && ['adult','gambling'].includes(analysis.category)) return { type:'age_suitability', severity:'high', message:'This page may not be appropriate for your age group. Consider leaving it.' };
  if (analysis.claim === 'unverified') return { type:'claim_verification', severity:'medium', message:'This claim could not be verified from available evidence. Check reliable sources before relying on it.' };
  if (continuousSeconds >= 3600) return { type:'break_recommendation', severity:'high', message:'You have been browsing continuously for 60 minutes. Consider taking a short break.' };
  if (continuousSeconds >= 2700) return { type:'break_recommendation', severity:'medium', message:'You have been browsing continuously for 45 minutes. Consider taking a short break.' };
  if (continuousSeconds >= 1800) return { type:'break_reminder', severity:'low', message:'You have been browsing continuously for 30 minutes.' };
  return null;
}
