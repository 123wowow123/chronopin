const config = require('../config/environment');
const { _getTwitterPost } = require('./twitter');
const { _getYoutubePost } = require('./youtube');
const { _webScrape } = require('./web');
const scrapeType = config.scrapeType;

module.exports.scrape = function scrape(pageUrl) {
  let scraperResPromise, type;
  const domainMatches = _getDomain(pageUrl);
  switch (domainMatches[1]) {
    case 'twitter.com':
      type = scrapeType.twitter;
      scraperResPromise = _getTwitterPost(pageUrl);
      break;
    case 'youtu.be':
    case 'youtube.com':
      type = scrapeType.youtube;
      scraperResPromise = _getYoutubePost(pageUrl);
      break;
    default:
      type = scrapeType.web;
      scraperResPromise = _webScrape(pageUrl);
      break;
  }
  return scraperResPromise.then(scraperRes => {
    return Object.assign({}, scraperRes, { type });
  })
}

function _getDomain(pageUrl) {
  const regex = /^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/?\n]+)/
  const match = pageUrl.match(regex);
  return match;
}

