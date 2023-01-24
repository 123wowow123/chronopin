import puppeteer from 'puppeteer';

const _ = require('lodash');
const fs = require('fs');
const config = require('../config/environment');

//console.log(JSON.stringify(config))
const scrapeJsFileName = __dirname + '/scrape.min.js';
const scrapeJsFileJS = fs.readFileSync(scrapeJsFileName, 'utf8');
//console.log(scrapeJsFileName);

const defaultNavigationWait = 11000

module.exports.scrape = function scrape(pageUrl) {
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
          window.cpScrapePromise
            .then((res) => {
              resolve(res);
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
