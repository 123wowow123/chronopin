// The embeddable pin widget: a countdown or a thread that a blog or news site
// drops in with a snippet, each with a link back to the pin page. The widget
// is its own small page (/embed/pin/[id], src/app/embed) shown in an iframe;
// this file holds what the route, the docs page and the tests share.

import { siteUrl } from './appConfig';
import { escapeHtml } from './embedHtml';
import { isLocale, localizePath, type Locale } from './i18n/config';
import { pinPath } from './seo';
import type { PinJson } from './types';

export const WIDGET_VIEWS = ['countdown', 'thread'] as const;
export type WidgetView = (typeof WIDGET_VIEWS)[number];
export const WIDGET_THEMES = ['auto', 'light', 'dark'] as const;
export type WidgetTheme = (typeof WIDGET_THEMES)[number];

export type WidgetOptions = { view: WidgetView; theme: WidgetTheme; lang: Locale };

// The most pins a thread widget lists; a longer thread ends with a link to the rest.
export const WIDGET_THREAD_LIMIT = 8;
export const WIDGET_HEIGHT = { countdown: 190, thread: 420 } as const;

export const WIDGET_DEFAULTS: WidgetOptions = { view: 'countdown', theme: 'auto', lang: 'en' };

// Anything unknown falls back to the default, so a typo in a blog's snippet
// still draws a widget.
export function parseWidgetOptions(params: { get(name: string): string | null }): WidgetOptions {
  const view = params.get('view');
  const theme = params.get('theme');
  const lang = params.get('lang');
  return {
    view: WIDGET_VIEWS.find((v) => v === view) ?? WIDGET_DEFAULTS.view,
    theme: WIDGET_THEMES.find((t) => t === theme) ?? WIDGET_DEFAULTS.theme,
    lang: isLocale(lang) ? lang : WIDGET_DEFAULTS.lang,
  };
}

// The pin's page, tagged so referral visits from widgets can be told apart.
export function widgetPinUrl(pin: Pick<PinJson, 'id' | 'title' | 'originalTitle'>, lang: Locale): string {
  return `${siteUrl}${localizePath(pinPath(pin), lang)}?utm_source=embed&utm_medium=widget`;
}

// The address of the widget page itself.
export function widgetSrc(pinId: number, options: Partial<WidgetOptions> = {}): string {
  const o = { ...WIDGET_DEFAULTS, ...options };
  const query = new URLSearchParams();
  if (o.view !== WIDGET_DEFAULTS.view) query.set('view', o.view);
  if (o.theme !== WIDGET_DEFAULTS.theme) query.set('theme', o.theme);
  if (o.lang !== WIDGET_DEFAULTS.lang) query.set('lang', o.lang);
  const qs = query.toString();
  return `${siteUrl}/embed/pin/${pinId}${qs ? `?${qs}` : ''}`;
}

// The two snippets the docs offer. The script one keeps a plain link inside
// its div: the script draws the widget above it, the link stays on the page
// as the visible, followed backlink (and the fallback with scripts off).
export function widgetSnippets(pinId: number, options: Partial<WidgetOptions> = {}): { script: string; iframe: string } {
  const o = { ...WIDGET_DEFAULTS, ...options };
  const attrs = [`data-pin="${pinId}"`, o.view !== WIDGET_DEFAULTS.view ? `data-view="${o.view}"` : '', o.theme !== WIDGET_DEFAULTS.theme ? `data-theme="${o.theme}"` : '', o.lang !== WIDGET_DEFAULTS.lang ? `data-lang="${o.lang}"` : '']
    .filter(Boolean)
    .join(' ');
  const height = WIDGET_HEIGHT[o.view];
  return {
    script: `<div class="chronopin-embed" ${attrs}>\n  <a href="${siteUrl}/pin/${pinId}?utm_source=embed&utm_medium=widget">View on Chronopin</a>\n</div>\n<script async src="${siteUrl}/embed/widget.js"></script>`,
    iframe: `<iframe src="${widgetSrc(pinId, o)}" width="100%" height="${height}" style="border:0;max-width:520px" loading="lazy" title="Chronopin"></iframe>`,
  };
}

// The loader a blog includes (/embed/widget.js). It swaps each
// .chronopin-embed div's contents for the iframe and keeps the iframe as tall
// as the widget says it is, by listening for the height the page posts.
export function widgetLoaderScript(): string {
  return `(function(){
var ORIGIN=${JSON.stringify(siteUrl)};
var HEIGHT={countdown:${WIDGET_HEIGHT.countdown},thread:${WIDGET_HEIGHT.thread}};
function mount(box){
  if(box.getAttribute('data-chronopin-ready'))return;
  var pin=parseInt(box.getAttribute('data-pin'),10);
  if(!pin)return;
  box.setAttribute('data-chronopin-ready','1');
  var view=box.getAttribute('data-view')==='thread'?'thread':'countdown';
  var q=[];
  if(view!=='countdown')q.push('view='+view);
  var theme=box.getAttribute('data-theme');
  if(theme==='light'||theme==='dark')q.push('theme='+theme);
  var lang=box.getAttribute('data-lang');
  if(lang&&/^[a-z]{2}$/.test(lang))q.push('lang='+lang);
  var f=document.createElement('iframe');
  f.src=ORIGIN+'/embed/pin/'+pin+(q.length?'?'+q.join('&'):'');
  f.title='Chronopin';
  f.loading='lazy';
  f.width='100%';
  f.height=String(HEIGHT[view]);
  f.style.cssText='border:0;max-width:520px;display:block';
  f.setAttribute('data-chronopin-pin',String(pin));
  box.insertBefore(f,box.firstChild);
}
function run(){var all=document.querySelectorAll('.chronopin-embed');for(var i=0;i<all.length;i++)mount(all[i]);}
window.addEventListener('message',function(e){
  if(e.origin!==ORIGIN||!e.data||e.data.chronopin!=='height')return;
  var frames=document.querySelectorAll('iframe[data-chronopin-pin="'+e.data.pin+'"]');
  for(var i=0;i<frames.length;i++)if(frames[i].contentWindow===e.source)frames[i].height=String(Math.ceil(e.data.height));
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();
`;
}

const COUNTDOWN_LABELS = ['Days', 'Hours', 'Minutes', 'Seconds'];

// A pin's start as text, the way the page reads before the script runs: the
// date for an all-day pin, else date and time in UTC.
function startText(pin: Pick<PinJson, 'utcStartDateTime' | 'allDay'>, lang: Locale): string {
  const start = new Date(pin.utcStartDateTime);
  const format = new Intl.DateTimeFormat(lang, pin.allDay ? { dateStyle: 'long', timeZone: 'UTC' } : { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' });
  return format.format(start) + (pin.allDay ? '' : ' UTC');
}

const CSS = `
:root{--bg:#fff;--ink:#111;--muted:#555;--line:#d9d9d9;--accent:#1f6fb2;--raised:#f3f3f3}
@media (prefers-color-scheme:dark){html[data-theme=auto]{--bg:#141414;--ink:#ededed;--muted:#aaa;--line:#333;--accent:#6db3ee;--raised:#222}}
html[data-theme=dark]{--bg:#141414;--ink:#ededed;--muted:#aaa;--line:#333;--accent:#6db3ee;--raised:#222}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:inherit}
.w{border:1px solid var(--line);border-radius:12px;padding:14px 16px;max-width:520px}
.t{font-size:17px;font-weight:600;line-height:1.3;margin:0 0 2px;display:block;text-decoration:none}
.t:hover{text-decoration:underline}
.d{color:var(--muted);font-size:13px;margin:0 0 10px}
.c{display:flex;gap:8px;margin:0 0 10px}
.c div{flex:1;background:var(--raised);border-radius:8px;padding:6px 0;text-align:center}
.c b{display:block;font-size:22px;font-variant-numeric:tabular-nums;line-height:1.2}
.c span{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.s{font-size:15px;font-weight:600;margin:0 0 10px}
ol{list-style:none;margin:0 0 10px;padding:0;border-inline-start:2px solid var(--line)}
li{padding:0 0 8px 12px;position:relative}
li:last-child{padding-bottom:0}
li::before{content:"";position:absolute;inset-inline-start:-6px;top:6px;width:10px;height:10px;border-radius:50%;background:var(--bg);border:2px solid var(--line)}
li.on::before{background:var(--accent);border-color:var(--accent)}
li a{text-decoration:none;font-weight:500}
li a:hover{text-decoration:underline}
li small{display:block;color:var(--muted);font-size:12px}
.f{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--muted);border-top:1px solid var(--line);padding-top:8px}
.f a{color:var(--accent);text-decoration:none;font-weight:600}
.f a:hover{text-decoration:underline}
`;

// Posts the page's height to the loader, and ticks the countdown on the
// viewer's clock. No library; the page is a few kilobytes.
const SCRIPT = `
(function(){
var el=document.getElementById('cd');
function post(){parent.postMessage({chronopin:'height',pin:window.__pin,height:document.documentElement.scrollHeight},'*');}
if(el){
  var start=Number(el.getAttribute('data-start')),allDay=el.getAttribute('data-allday')==='1';
  if(allDay){var d=new Date(start);start=new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()).getTime();}
  var cells=el.querySelectorAll('b'),done=document.getElementById('done');
  var past=el.getAttribute('data-past'),now=el.getAttribute('data-now');
  function tick(){
    var left=start-Date.now();
    if(left<=0){el.style.display='none';done.style.display='block';done.textContent=past;return;}
    var s=Math.floor(left/1000);
    var v=[Math.floor(s/86400),Math.floor(s%86400/3600),Math.floor(s%3600/60),s%60];
    for(var i=0;i<4;i++)cells[i].textContent=i===0?String(v[i]):String(v[i]).padStart(2,'0');
    setTimeout(tick,1000-Date.now()%1000);
  }
  tick();
}
post();
addEventListener('load',post);
})();
`;

function shell(pinId: number, options: WidgetOptions, body: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="${options.lang}" data-theme="${options.theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,follow">
<title>${escapeHtml(title)}</title>
<style>${CSS}</style>
</head>
<body>
${body}
<script>window.__pin=${pinId};${SCRIPT}</script>
</body>
</html>`;
}

// A widget for a pin that is gone.
export function renderMissingWidget(pinId: number, options: WidgetOptions): string {
  const body = `<div class="w"><p class="s">This pin is not available.</p><div class="f"><span></span><a href="${siteUrl}/?utm_source=embed&amp;utm_medium=widget" target="_blank" rel="noopener">Chronopin</a></div></div>`;
  return shell(pinId, options, body, 'Chronopin');
}

// The countdown: the pin's title, its date, and days to seconds ticking down
// to it (or a note once it has started). The thread lists the pin's story in
// order, the current pin marked.
export function renderWidget(pin: PinJson, thread: PinJson[], options: WidgetOptions): string {
  const url = escapeHtml(widgetPinUrl(pin, options.lang));
  const footer = `<div class="f"><span>Dates on Chronopin</span><a href="${url}" target="_blank" rel="noopener">View on Chronopin &rarr;</a></div>`;
  const start = new Date(pin.utcStartDateTime);
  if (options.view === 'thread' && thread.length > 1) {
    const shown = thread.slice(0, WIDGET_THREAD_LIMIT);
    // Keep the current pin on screen when it falls beyond the limit.
    if (!shown.some((p) => p.id === pin.id)) shown[shown.length - 1] = pin;
    const items = shown
      .map((p) => `<li${p.id === pin.id ? ' class="on"' : ''}><a href="${escapeHtml(widgetPinUrl(p, options.lang))}" target="_blank" rel="noopener">${escapeHtml(p.title)}</a><small>${escapeHtml(startText(p, options.lang))}</small></li>`)
      .join('');
    const more = thread.length > shown.length ? `<p class="d">+${thread.length - shown.length} more in the thread</p>` : '';
    const body = `<div class="w"><p class="s">${escapeHtml(pin.title)} &middot; thread</p><ol>${items}</ol>${more}${footer}</div>`;
    return shell(pin.id, options, body, pin.title);
  }
  const body = `<div class="w"><a class="t" href="${url}" target="_blank" rel="noopener">${escapeHtml(pin.title)}</a><p class="d">${escapeHtml(startText(pin, options.lang))}</p>
<div class="c" id="cd" data-start="${start.getTime()}" data-allday="${pin.allDay ? 1 : 0}" data-past="Started" data-now="">${COUNTDOWN_LABELS.map((label) => `<div><b>-</b><span>${label}</span></div>`).join('')}</div>
<p class="s" id="done" style="display:none"></p>${footer}</div>`;
  return shell(pin.id, options, body, pin.title);
}
