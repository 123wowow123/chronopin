const puppeteer = require('puppeteer');
const _ = require('lodash');
const fs = require('fs');
const config = require('../config/environment');
const rp = require('request-promise');
const {
  Pin,
  Medium
} = require('../model');

const scrapeJsFileName = __dirname + '/scrape.min.js';
const scrapeJsFileJS = fs.readFileSync(scrapeJsFileName, 'utf8');

const defaultNavigationWait = 10000

module.exports.scrape = function scrape(pageUrl) {
  const match = _getDomain(pageUrl);
  let scraperResPromise, type;
  switch (match[1]) {
    case 'twitter.com':
      type = 'twitter';
      scraperResPromise = _getTwitterPost(pageUrl);
      break;
    case 'youtube.com':
      type = 'youtube';
      scraperResPromise = _getYoutubePost(pageUrl);
      break;
    default:
      type = 'web';
      scraperResPromise = _webScrpae(pageUrl);
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

function _getTwitterPost(pageUrl) {
  const regex = /\/(\d+)$/
  const match = pageUrl.match(regex);
  const jsonPromise = _getTwitterEmbed(match[1])
    .then(res => {
      console.log(res)
      const newPin = new Pin();
      newPin.addMedium(new Medium({
        type: 2,
        html: res.html
      }));
      return newPin;
    }).catch(e => {
      console.log(e)
      throw e;
    });
  return jsonPromise;
}

function _getTwitterEmbed(twitterId) {
  const uri = `https://publish.twitter.com/oembed?url=https://twitter.com/Interior/status/${twitterId}`;
  const options = {
    method: 'GET',
    uri: uri,
    json: true, // Automatically stringifies the body to JSON
  };
  return rp(options);
};

function _getYoutubePost(pageUrl) {
  const regex = /(?<=v=|v\/|vi=|vi\/|youtu.be\/)[a-zA-Z0-9_-]{11}/
  const match = pageUrl.match(regex);
  const id = match.filter(t => !!t)[0];
  const jsonPromise = _getYoutubeEmbed(id)
    .then(res => {
      const newPin = new Pin();
      newPin.addMedium(new Medium({
        type: 3,
        html: _.get(res, "items[0].player.embedHtml")
      }));
      return newPin;
    }).catch(e => {
      console.log(e);
      throw e;
    })
  return jsonPromise;
}

function _getYoutubeEmbed(youtubeId) {
  const YOUTUBE_API_KEY = config.youtube.YOUTUBE_API_KEY;
  const uri = `https://www.googleapis.com/youtube/v3/videos?part=player&id=${youtubeId}&maxResults=1&key=${YOUTUBE_API_KEY}`;
  const options = {
    method: 'GET',
    uri: uri,
    json: true, // Automatically stringifies the body to JSON
  };

  return rp(options);
};

function _webScrpae(pageUrl) {
  let browser = null;
  let page = null;
  const res = puppeteer.launch({
    ignoreHTTPSErrors: true,
    headless: true
  })
    .then((b) => {
      browser = b
      return browser.pages();
    })
    .then((pages) => {
      page = pages[0]
      return page.setDefaultNavigationTimeout(defaultNavigationWait);
    })
    .then(() => {
      return page.goto(pageUrl); //, { "waitUntil": ["load", "networkidle0"] }
    })
    .catch((err) => {
      if (err.name === "TimeoutError")
        return err;
      else
        throw err;
    })
    .then((res) => {
      return page.evaluate((scrapeJsFileJS) => {
        // this will be executed in headless chrome
        return (new Promise((resolve, reject) => {
          var script = document.createElement('script');
          script.id = "chrono";
          script.text = scrapeJsFileJS;
          document.getElementsByTagName('head')[0].appendChild(script);

          console.log("chrono", window.cpScrapePromise);

          window.cpScrapePromise
            .then((res) => {
              console.log("chrono resolve", res);
              resolve(res);
            }).catch((e) => {
              console.log("chrono catch", e);
              throw e;
            });
        }));

      }, scrapeJsFileJS);
    })
    .then((res) => {
      //for debugging
      console.log(JSON.stringify(res))
      return res;
    })
    .catch((err) => {
      console.log(err);
      return "load err";
    })
    .finally(() => {
      return browser.close();
    })

  return res;
}



//   function _getYouTubeURL($) {
//     var key = 'src';
//     var name = 'https://www.youtube.com/embed/';
//
//     var match = $(`[${key}^="${name}"]`);
//     if (match.get().length > 0) {
//       return match.map(function() {
//         return $(this).attr(key);
//       }).get();
//     }
//     return undefined;
//   }
