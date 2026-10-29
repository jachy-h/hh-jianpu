import { parse, scheduleNotes } from '../packages/core/dist/index.js';
import { SCORE_CATEGORIES } from '../packages/score-library/dist/index.js';
let count = 0;
for (const category of SCORE_CATEGORIES) for (const template of category.scores) {
  const result = parse(template.source);
  if (!result.score || result.errors.length) throw new Error(`${category.id}/${template.id}: ${JSON.stringify(result.errors)}`);
  const events = scheduleNotes(result.score, result.score.metadata.tempo);
  if (!events.length || events.some(event => !Number.isFinite(event.startBeat) || !Number.isFinite(event.durationBeats))) throw new Error(`${template.id}: invalid playback events`);
  count++;
}
console.log(`PASS: ${SCORE_CATEGORIES.length} shared categories; ${count} scores; all parse and schedule`);
