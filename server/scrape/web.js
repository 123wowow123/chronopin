const puppeteer = require('puppeteer');
const fs = require('fs');
const _ = require('lodash');
const { _getYoutubeAndWrapInMediumSync } = require('./youtube');
const { _getTwitterAndWrapInMediumSync } = require('./twitter');
const config = require('../config/environment');
const mediumID = config.mediumID;
const {
  Pin,
  Medium
} = require('../model');

const headless = true;
const scrapeJsFileName = __dirname + '/scrape.min.js';
const scrapeJsFileJS = fs.readFileSync(scrapeJsFileName, 'utf8');
const defaultNavigationWait = 6000

export function _webScrape(pageUrl) {
  let browser = null;
  let page = null;
  const res = puppeteer.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox'], // This was important. Can't remember why

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
      return page.setRequestInterception(true)
    })
    .then(() => {
      /// https://github.com/puppeteer/puppeteer/issues/823
      page.on('request', req => {
        if (req.isNavigationRequest() && req.frame() === page.mainFrame() && req.url() !== pageUrl) {
          // no redirect chain means the navigation is caused by setting `location.href`
          req.respond(req.redirectChain().length
            ? { body: '' } // prevent 301/302 redirect
            : { status: 204 } // prevent navigation by js
          )
        } else {
          req.continue()
        }
      });
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
      return page.waitForSelector(`iframe[src*="www.youtube.com"]`, { timeout: 500 })
        .catch(e => {
          return e;
        });
    })
    .then(() => {
      return page.evaluate(() => {
        window.scrollTo(0, window.document.body.scrollHeight);
      });
    })
    .then(() => {
      return page.waitForSelector(`iframe[src*="www.youtube.com"]`, { timeout: 500 })
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
        if (m.width > 150 && m.height > 150) {
          newPin.addMedium(new Medium({
            type: mediumID.image,
            originalWidth: m.width,
            originalHeight: m.height,
            originalUrl: m.originalUrl
          }));
        }
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
      console.error(err.message);
      throw { err: err.message };
    })
    .finally(() => {
      return browser.close();
    })

  return res;
}