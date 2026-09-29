// Which bot a user agent belongs to, for the admin Bots page (see BotVisit,
// 0069). Search engines index the site, AI crawlers read it for models and
// answer engines, social bots draw link previews, and everything else - SEO
// tools, uptime monitors, scripts and headless browsers - is "other".
//
// A user agent is the bot's own claim, so this says who a request says it is,
// not who sent it.

export const BOT_KINDS = [
  { id: 'search', label: 'Search engines' },
  { id: 'ai', label: 'AI crawlers' },
  { id: 'social', label: 'Link previews' },
  { id: 'other', label: 'Other' },
] as const;

export type BotKind = (typeof BOT_KINDS)[number]['id'];

export type Bot = { name: string; kind: BotKind };

// Checked in order, so a specific name comes before a family it shares a word
// with (Google-Extended before Googlebot, Applebot-Extended before Applebot).
const KNOWN: [RegExp, string, BotKind][] = [
  [/GPTBot/i, 'GPTBot', 'ai'],
  [/ChatGPT-User/i, 'ChatGPT-User', 'ai'],
  [/OAI-SearchBot/i, 'OAI-SearchBot', 'ai'],
  [/ClaudeBot/i, 'ClaudeBot', 'ai'],
  [/Claude-User/i, 'Claude-User', 'ai'],
  [/Claude-SearchBot/i, 'Claude-SearchBot', 'ai'],
  [/anthropic-ai/i, 'anthropic-ai', 'ai'],
  [/PerplexityBot/i, 'PerplexityBot', 'ai'],
  [/Perplexity-User/i, 'Perplexity-User', 'ai'],
  [/Google-Extended/i, 'Google-Extended', 'ai'],
  [/Applebot-Extended/i, 'Applebot-Extended', 'ai'],
  [/CCBot/i, 'CCBot', 'ai'],
  [/Bytespider/i, 'Bytespider', 'ai'],
  [/meta-externalagent/i, 'Meta-ExternalAgent', 'ai'],
  [/Amazonbot/i, 'Amazonbot', 'ai'],
  [/cohere-ai/i, 'cohere-ai', 'ai'],
  [/Diffbot/i, 'Diffbot', 'ai'],
  [/YouBot/i, 'YouBot', 'ai'],
  [/MistralAI-User/i, 'MistralAI-User', 'ai'],
  [/DuckAssistBot/i, 'DuckAssistBot', 'ai'],
  [/Timpibot/i, 'Timpibot', 'ai'],

  [/Googlebot-Image/i, 'Googlebot-Image', 'search'],
  [/Googlebot/i, 'Googlebot', 'search'],
  [/Google-InspectionTool/i, 'Google-InspectionTool', 'search'],
  [/Storebot-Google/i, 'Storebot-Google', 'search'],
  [/AdsBot-Google/i, 'AdsBot-Google', 'search'],
  [/Mediapartners-Google/i, 'Mediapartners-Google', 'search'],
  [/bingbot/i, 'Bingbot', 'search'],
  [/BingPreview/i, 'BingPreview', 'search'],
  [/DuckDuckBot/i, 'DuckDuckBot', 'search'],
  [/YandexBot|YandexImages|YandexMobileBot/i, 'YandexBot', 'search'],
  [/Baiduspider/i, 'Baiduspider', 'search'],
  [/Applebot/i, 'Applebot', 'search'],
  [/Slurp/i, 'Yahoo Slurp', 'search'],
  [/Sogou/i, 'Sogou', 'search'],
  [/SeznamBot/i, 'SeznamBot', 'search'],
  [/Naver|Yeti\//i, 'Naver Yeti', 'search'],
  [/PetalBot/i, 'PetalBot', 'search'],
  [/Qwantify|Qwantbot/i, 'Qwantbot', 'search'],
  [/MojeekBot/i, 'MojeekBot', 'search'],
  [/Brave(Bot|-Search)/i, 'BraveBot', 'search'],
  [/ia_archiver|archive\.org_bot/i, 'Internet Archive', 'search'],

  [/facebookexternalhit|facebookcatalog/i, 'Facebook', 'social'],
  [/Twitterbot/i, 'Twitterbot', 'social'],
  [/LinkedInBot/i, 'LinkedInBot', 'social'],
  [/Slackbot/i, 'Slackbot', 'social'],
  [/Discordbot/i, 'Discordbot', 'social'],
  [/WhatsApp/i, 'WhatsApp', 'social'],
  [/TelegramBot/i, 'TelegramBot', 'social'],
  [/redditbot/i, 'redditbot', 'social'],
  [/Pinterest/i, 'Pinterest', 'social'],
  [/SkypeUriPreview/i, 'Skype', 'social'],
  [/Iframely/i, 'Iframely', 'social'],
  [/Embedly/i, 'Embedly', 'social'],
  [/Mastodon/i, 'Mastodon', 'social'],
  [/Bluesky|Cardyb/i, 'Bluesky', 'social'],
  [/vkShare/i, 'VK', 'social'],

  [/AhrefsBot/i, 'AhrefsBot', 'other'],
  [/SemrushBot/i, 'SemrushBot', 'other'],
  [/MJ12bot/i, 'MJ12bot', 'other'],
  [/DotBot/i, 'DotBot', 'other'],
  [/DataForSeoBot/i, 'DataForSeoBot', 'other'],
  [/Screaming Frog/i, 'Screaming Frog', 'other'],
  [/UptimeRobot/i, 'UptimeRobot', 'other'],
  [/Pingdom/i, 'Pingdom', 'other'],
  [/HeadlessChrome/i, 'HeadlessChrome', 'other'],
  [/\bcurl\//i, 'curl', 'other'],
  [/\bWget\//i, 'Wget', 'other'],
  [/python-requests|python-urllib|aiohttp|httpx/i, 'Python', 'other'],
  [/Go-http-client/i, 'Go', 'other'],
  [/node-fetch|axios|undici/i, 'Node', 'other'],
  [/Scrapy/i, 'Scrapy', 'other'],
];

// The AI crawlers by name, which is also the token each reads its robots.txt
// group by.
export const AI_BOT_NAMES = KNOWN.filter(([, , kind]) => kind === 'ai').map(([, name]) => name);

// A bot this list does not name still calls itself one somewhere in its user
// agent: "FooBot/1.0", "bar-crawler", "some spider".
const GENERIC = /[\w.-]*(?:bot|crawler|spider|scraper|fetcher)\b[\w.-]*/i;

// The bot a user agent names, or null for a browser. A request with no user
// agent at all is a script, not a person.
export function identifyBot(userAgent: string | null | undefined): Bot | null {
  const ua = (userAgent || '').trim();
  if (!ua) return { name: 'No user agent', kind: 'other' };
  for (const [pattern, name, kind] of KNOWN) {
    if (pattern.test(ua)) return { name, kind };
  }
  const generic = GENERIC.exec(ua);
  if (generic) return { name: generic[0].replace(/\/.*$/, '').slice(0, 80), kind: 'other' };
  return null;
}

export function botKindLabel(kind: BotKind): string {
  return BOT_KINDS.find((k) => k.id === kind)?.label ?? kind;
}
