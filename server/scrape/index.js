const puppeteer = require('puppeteer');
const _ = require('lodash');
const fs = require('fs');
const config = require('../config/environment');
const rp = require('request-promise');
const getVideoId = require('get-video-id');
const {
  Pin,
  Medium
} = require('../model');

const headless = true;
const scrapeType = config.scrapeType;
const scrapeJsFileName = __dirname + '/scrape.min.js';
const scrapeJsFileJS = fs.readFileSync(scrapeJsFileName, 'utf8');
const defaultNavigationWait = 9000

const MediumID = {
  image: 1,
  twitter: 2,
  youtube: 3,
}

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
  const postPromise = _getTwitterAndWrapInMediumSync(pageUrl)
    .then(({ res, medium }) => {
      const newPin = new Pin();
      newPin.addMedium(medium);
      return newPin;
    }).catch(e => {
      console.log(e)
      throw e;
    });
  return postPromise;
}

function _getTwitterAndWrapInMediumSync(pageUrl) {
  const twitterId = _getTwitterId(pageUrl);
  if (!twitterId) {
    return Promise.reject(twitterId);
  }
  const promise = _getTwitterEmbed(twitterId)
    .then(res => {
      // Wraps youtube to Medium
      const medium = _twitterEmbedToMedium(res);
      return {
        res,
        medium
      };
    });
  return promise;
}

function _twitterEmbedToMedium(res) {
  const medium = new Medium({
    type: MediumID.twitter,
    html: res.html,
    originalUrl: res.url,
    authorName: res.author_name,
    authorUrl: res.author_url
  });
  return medium;
}

function _getTwitterId(pageUrl) {
  const regex = /\/(\d+)$/
  const match = pageUrl.match(regex);
  let twitterId = match && match[1] || null;

  if (!twitterId) {
    // Find digits
    const reg = /^(\d+)$/
    const digitMatch = pageUrl.match(reg);
    twitterId = digitMatch && digitMatch[1] || null;
  }
  return twitterId;
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
  const postPromise = _getYoutubeAndWrapInMediumSync(pageUrl)
    .then(({ res, medium }) => {
      // Wraps everythig in Pin
      const newPin = new Pin();
      newPin.title = _.get(res, "items[0].snippet.title")
      newPin.description = _.get(res, "items[0].snippet.description")
      newPin.addMedium(medium);
      return newPin;
    })
    .catch(e => {
      console.log(e);
      throw e;
    })
  return postPromise;
}

function _getYoutubeAndWrapInMediumSync(pageUrl) {
  const { id } = getVideoId(pageUrl);
  const promise = _getYoutubeEmbed(id)
    .then(res => {
      // Wraps youtube to Medium
      const medium = _youtubeEmbedToMedium(res);
      return {
        res,
        medium
      };
    });
  return promise;
}

function _youtubeEmbedToMedium(res) {
  const iframeSrcRegex = /(?<=src=").*?(?=[\?"])/
  const html = _.get(res, "items[0].player.embedHtml")
  const originalUrl = html.match(iframeSrcRegex)[0];
  // const replacedHtml  = html.replace(originalUrl, originalUrl + "?start=225")
  const medium = new Medium({
    type: MediumID.youtube,
    html: html,
    originalUrl: originalUrl
  });
  return medium
}

function _getYoutubeEmbed(youtubeId) {
  const YOUTUBE_API_KEY = config.youtube.YOUTUBE_API_KEY;
  const uri = `https://www.googleapis.com/youtube/v3/videos?part=player,snippet&id=${youtubeId}&maxResults=1&key=${YOUTUBE_API_KEY}`;
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
    headless: headless,
    //devtools: !headless
    defaultViewport: {
      width: 1280,
      height: 1200
    }
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
    }).then(() => {
      return page.keyboard.press("PageDown");
    })
    .then(() => {
      return page.waitForSelector(`iframe[src*="www.youtube.com"]`, { timeout: 1000 })
        .catch(e => {
          return e;
        });
    }).then(() => {
      return page.evaluate(() => {
        window.scrollTo(0, window.document.body.scrollHeight);
      });
    }).then(() => {
      return page.waitForSelector(`iframe[src*="www.youtube.com"]`, { timeout: 2000 })
        .catch(e => {
          return e;
        });
    })
    .then((t) => {
      return page.evaluate((scrapeJsFileJS) => {
        // this will be executed in headless chrome
        return (new Promise((resolve, reject) => {
          let script = document.createElement('script');
          script.id = "chrono";
          script.text = scrapeJsFileJS;
          document.getElementsByTagName('head')[0].appendChild(script);

          console.log("chrono", window.cpScrapePromise);

          // Copy here for debug

          function promiseRetry(fn, times, delay) {
            return new Promise(function (resolve, reject) {
              let error;
              let attempt = function () {
                if (times == 0) {
                  reject(error);
                } else {
                  try {
                    fn.then(resolve)
                      .catch(function (e) {
                        times--;
                        error = e;
                        setTimeout(function () { attempt() }, delay);
                      });
                  } catch (e) {
                    times--;
                    error = e;
                    setTimeout(function () { attempt() }, delay);
                  }
                }
              };
              attempt();
            });
          };

          promiseRetry(window.cpScrapePromise, 20, 100)
            .then((res) => {
              console.log("chrono resolve", JSON.stringify(res));
              resolve(res);
            })

            .catch((e) => {
              console.log("chrono catch", e);
              reject(e);
            });

        }));

      }, scrapeJsFileJS);
    })
    .then((res) => {
      //console.log(JSON.stringify(res));
      const newPin = new Pin();
      newPin.title = _.get(res, "titles[0]")
      newPin.description = _.get(res, "descriptions[0]")
      newPin.utcStartDateTime = new Date(_.get(res, 'dates[0].start'));
      newPin.utcEndDateTime = new Date(_.get(res, 'dates[0].end'));
      newPin.allDay = _.get(res, 'dates[0].allDay');

      _.get(res, "media", []).forEach(m => {
        newPin.addMedium(new Medium({
          type: MediumID.image,
          originalWidth: m.width,
          originalHeight: m.height,
          originalUrl: m.originalUrl
        }));
      });

      const youtubeProsmises = _.get(res, "youtube", []).map(url => {
        let finalURL = url;
        function decodeQueryParam(p) {
          return decodeURIComponent(p.replace(/\+/g, " "));
        }
        function extractEmbedlyURL(url) {
          const params = (new URL(url)).searchParams;
          const hasSRC = params.has("src");
          const src = params.get("src");
          return hasSRC ? decodeQueryParam(src) : url;
        }

        // extract url from embedly query string
        if (url.startsWith('https://embedly')) {
          finalURL = extractEmbedlyURL(url);
        }

        return _getYoutubeAndWrapInMediumSync(finalURL).catch((e) => {
          return { res: null, medium: null };
        });
      });

      const twitterProsmises = _.get(res, "twitter", []).map(url => {
        return _getTwitterAndWrapInMediumSync(url).catch((e) => {
          return { res: null, medium: null };
        });
      });

      return Promise.all(youtubeProsmises.concat(twitterProsmises))
        .then(values => {
          values.forEach(({ res, medium }) => {
            if (!!medium && !newPin.findMediumByOriginalUrl(medium.originalUrl)) {
              newPin.medium
              newPin.unshiftMedium(medium);
            }
          });
          return newPin;
        });
    })
    .then((res) => {
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
