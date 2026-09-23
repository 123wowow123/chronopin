import { siteUrl } from './appConfig';

// Google Analytics 4: the "Chronopin web" stream of the chronopin.com property,
// in chronopin.official's Analytics account. Enhanced measurement (set in
// Analytics) counts page views - the app's own navigations included, from
// history changes - scrolls, outbound clicks, site search and file downloads.
export const GA_MEASUREMENT_ID = 'G-R203GC4H9B';

// Inline, first thing after the theme script. It does nothing anywhere but the
// real site's host, so development, e2e runs and a production build tried
// locally send no hits; there it queues the config and adds gtag.js itself.
export const analyticsScript = `(function(){if(location.hostname!==${JSON.stringify(new URL(siteUrl).hostname)})return;window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag("js",new Date());gtag("config",${JSON.stringify(GA_MEASUREMENT_ID)});var s=document.createElement("script");s.async=true;s.src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}";document.head.appendChild(s)})()`;
