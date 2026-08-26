export const AGE = { healthy: '18+', heavy: '18+', minor: '13–15', political: '18+', adult: '18+', mixed: '16–17' };
const content = [
  ['Education', .08], ['Entertainment', .08], ['Technology', .07], ['Sports', .05], ['News', .05], ['Politics', .15], ['Adult/18+', .94], ['Violence', .79], ['Gambling', .85], ['Scam/fraud', .82], ['Misinformation-risk', .74], ['Emotional manipulation', .65]
];
export function classify(text = '', preferred) {
  const s = text.toLowerCase();
  let found = preferred && content.find(x => x[0] === preferred);
  if (!found) found = s.includes('guaranteed') || s.includes('breaking') ? ['Misinformation-risk', .78] : s.includes('win cash') ? ['Gambling', .89] : s.includes('18+') ? ['Adult/18+', .93] : content.find(x => s.includes(x[0].toLowerCase())) || ['Entertainment', .72];
  const [category, confidence] = found;
  const severity = ['Adult/18+', 'Violence', 'Gambling', 'Scam/fraud'].includes(category) ? 'high' : ['Misinformation-risk', 'Emotional manipulation', 'Politics'].includes(category) ? 'medium' : 'low';
  const explanation = category === 'Misinformation-risk' ? 'Strong factual claim, high emotional language, and no verifiable source signal.' : `${category} signals were detected from authorized content metadata.`;
  return { category, confidence, severity, explanation, recommended_action: severity === 'high' ? 'Review safety policy' : severity === 'medium' ? 'Show verification guidance' : 'Allow' };
}
export function policy({ age = '18+', classification, repetition = 0, sessionMinutes = 0 }) {
  const minor = age !== '18+';
  const adult = classification.category === 'Adult/18+';
  if (classification.confidence < .5) return { level: 1, action: 'Inform', message: 'Classification uncertain. Basic safety rules are active.' };
  if (minor && adult && repetition >= 2) return { level: 5, action: 'Controlled demo intervention', message: 'Repeated age-inappropriate exposure detected. The demo feed is paused for a cooldown.' };
  if (minor && adult) return { level: 3, action: 'Strong warning', message: 'This content may not be appropriate for your age.' };
  if (adult) return { level: 2, action: 'Warn', message: 'Age-restricted content detected. Repeated exposure is logged privately.' };
  if (classification.category === 'Misinformation-risk') return { level: 2, action: 'Warn', message: 'This claim may require verification. It is not labelled false.' };
  if (sessionMinutes >= 45) return { level: 4, action: 'Recommend break', message: `You've been scrolling continuously for ${sessionMinutes} minutes.` };
  return { level: 0, action: 'Allow', message: 'No intervention needed.' };
}
export function wellbeing(a) {
  const screenPenalty = Math.max(0, (a.screenMinutes - a.goalMinutes) / 4);
  const latePenalty = a.lateMinutes / 7, sessionPenalty = Math.max(0, a.longSessions - 1) * 4;
  const safetyPenalty = a.safetyEvents * 2, diversityBonus = Math.min(10, a.categories.size * 1.6);
  return Math.max(0, Math.min(100, Math.round(82 - screenPenalty - latePenalty - sessionPenalty - safetyPenalty + diversityBonus)));
}
export function recommendation(a) {
  if (a.lateMinutes > 20) return 'Late-night usage may interfere with your planned sleep schedule. Try stopping 30 minutes before bedtime.';
  if (a.screenMinutes > a.goalMinutes) return `You are ${a.screenMinutes - a.goalMinutes} minutes over your daily target. A 10-minute break now can help reset your session.`;
  if (a.longSessions > 1) return 'You have had several long uninterrupted sessions today. Schedule a short break between feeds.';
  return 'Your activity is balanced today. Keep the healthy break rhythm going.';
}
