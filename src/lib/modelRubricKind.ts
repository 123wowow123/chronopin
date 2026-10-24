// Which rubric an AI model release pin gets (the modelRubrics task,
// docs/okf/scraping/daily-jobs.md#modelrubrics): 'llm', 'video', or null for a
// pin that is not a scoreable text or video model release.

export type RubricKind = 'llm' | 'video';

// A release pin, not an announcement of what is still to come, a retirement, a
// prediction, or a model that makes images or speech rather than text or video.
const RELEASE = /\b(released|launches|launched|rolls out|unveils|previewed|announced)\b/i;
const NOT_A_MODEL = /\b(retire[sd]?|shut(s| down)|image|tts|speech|audio|live|lyria|embedding)\b/i;
const VIDEO = /\b(seedance|sora|kling|veo|grok imagine|wan|hailuo|runway|luma|pika)\b/i;

export const rubricKind = (title: string): RubricKind | null => {
  if (!RELEASE.test(title) || NOT_A_MODEL.test(title)) return null;
  return VIDEO.test(title) ? 'video' : 'llm';
};

