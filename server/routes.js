/**
 * Main application routes
 */

'use strict';

import errors from './components/errors';
import * as cache from './util/cache';
import path from 'path';
import * as paginationHeader from './util/paginationHeader'
import * as _ from 'lodash';
import fs from 'fs';
const config = require('./config/environment');
const mainController = require('./api/main/main.controller');
const auth = require('./auth/auth.service');
const ejs = require('ejs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
import {
  Pin,
  Pins,
  FullPins
} from './model';

export default function (app) {
  // Insert routes below
  //app.use('/api/things', require('./api/thing'));

  /** Begin Test **/
  var env = process.env.NODE_ENV;
  if (env === 'development' || env === 'test') {
    // Register dev endpoints
    app.get('/api/test', function (req, res) {
      let sns = require('./sns');
      sns.send()
        .then((data) => {
          res.send(data);
        });
    });
  }
  /** End Test **/

  app.use('/api/users', require('./api/user'));
  app.use('/api/pins', require('./api/pin'));
  //app.use('/api/likes', require('./api/like'));
  app.use('/api/scrape', require('./api/scrape'));
  app.use('/api/dates', require('./api/dateTime'));
  app.use('/api/main', require('./api/main'));
  app.use('/api/upload', require('./api/upload'));
  app.use('/api/meta', require('./api/meta'));
  app.use('/api/stock', require('./api/stock'));
  app.use('/api/ai', require('./api/ai'));
  app.use('/api/mention', require('./api/mention'));
  app.use('/auth', require('./auth').default);


  // Direct isso request is easier to maintain
  //app.use('/isso', require('./isso'));

  // All undefined asset or api routes should return a 404
  app.route('/:url(api|auth|components|app|bower_components|assets)/*')
    .get(errors[404]);

  // app.route('/')
  //   .get((req, res) => {
  //     //res.sendFile(path.resolve(app.get('appPath') + '/index.html'));
  //     const mainPinDataPromise = mainController.getPinsAndFormatData(req, res)
  //       .then(paginationHeader.setPaginationObject(res, req))
  //       .then((mainPinData) => {
  //         // Render Templated root page
  //         res.render(app.get('appPath') + '/index.html', { mainPinData });
  //       }).catch(() => {
  //         res.render(app.get('appPath') + '/index.html', { mainPinData: null });
  //       });
  //   });

  let mainPinDataContent;
  app.route('/mainPinData.js')
    .get(auth.tryGetUser())
    .get((req, res) => {
      if (!mainPinDataContent) {
        mainPinDataContent = fs.readFileSync(app.get('views') + '/mainPinData.ejs', 'utf8');
      }
      const useCache = !req.user;
      const key = cache.key.mainPinData;
      let responsePromise = cache.getWithExpiry(key);
      if (!useCache) {
        responsePromise = mainController.getPinsAndFormatData(req, res);
      }
      else if (useCache && !responsePromise) {
        responsePromise = cache.setWithExpiry(key, mainController.getPinsAndFormatData(req, res));
      }

      responsePromise.then(paginationHeader.setPaginationObject(res, req))
        .then((mainPinData) => {
          // Render Templated root page
          res.setHeader('Content-Type', 'text/javascript');
          const js = ejs.render(mainPinDataContent, { mainPinData });
          res.send(js);
        }).catch(() => {
          res.setHeader('Content-Type', 'text/javascript');
          const js = ejs.render(mainPinDataContent, { mainPinData: null });
          res.send(js);
        });
    });

  app.route('/pin/:id')
    .get((req, res) => {
      let pinId = +req.params.id,
        userId = req.user && +req.user.id;

      function getOgType(mediumID) {
        switch (+mediumID) {
          case config.mediumID.image:
            return 'og:image';
          case config.mediumID.youtube:
            return 'og:video';
          case config.mediumID.twitter:
            return undefined;
        }
      }

      return Pin.queryById(pinId, userId)
        .then(({
          pin
        }) => {
          if(!pin){
            return errors[404](req, res);
          }
          const canonical = `https://www.chronopin.com/pin/${pinId}`;
          const dom = new JSDOM(pin.description);
          const document = dom.window.document;
          const querySelector = document.querySelector('p');
          const description = querySelector && querySelector.textContent ? querySelector.textContent.trim() : '';
          const medium = _.get(pin, 'media[0]');
          let mediaContentType, mediaType, mediaWidth, mediaHeight;
          let mediaContent = medium ? medium.getUrl() : '';
          if (!mediaContent) {
            const querySelector = document.querySelector('img');
            mediaContent = querySelector && querySelector.src ? querySelector.src : '';
            mediaType = 'og:image';
            if (!mediaContent) {
              const querySelector = document.querySelector('iframe');
              let src = querySelector && querySelector.src ? querySelector.src : '';
              if (src) {
                const filemoonRex = /https:\/\/filemoon\.sx\/e\/([^\/\?\&]*)\/.*/
                let result1, matchId;
                result1 = filemoonRex.exec(src)
                matchId = result1 && result1[1];
                if (matchId) {
                  const thumbUrlPrefix = config.filemoon.thumbUrlPrefix;
                  mediaContent = `${thumbUrlPrefix}/${matchId}.jpg`;
                }
              }
            }
          } else {
            mediaType = getOgType(medium.type);
            // mediaWidth = medium.thumbWidth;
            // mediaHeight = medium.thumbHeight;
          }

          if (mediaType === 'og:image') {
            mediaContent = mediaContent.replace(config.uploadImage.large.postFix, '');
            mediaContent = mediaContent.replace('.webp', '.jpeg');
            mediaContentType = `<meta property="og:image:type" content="image/jpeg" />`;
          }

          const meta = {
            canonical,
            title: pin.title,
            description,
            mediaContent,
            mediaType,
            mediaContentType,
            type: 'article'
          };
          res.render(app.get('appPath') + '/index.html', { meta });
        }).catch((e) => {
          res.render(app.get('appPath') + '/index.html', { meta: config.meta });
        });
    });

  const descriptions = {
    login: 'Login to discover and track upcoming, release dates, events, and other important dates.',
    signup: 'Signup to discover and track upcoming, release dates, events, and other important dates.',
    about: `Chronopin, is a social bookmarking service for storing, sharing and discovering web bookmarks but treats chronology as a first class citizen via it's timeline user interface. Released in 2023, the service is available via mobile and desktop web browsers.`,
  }

  app.route('/:url(login|signup|about|search)')
    .get((req, res) => {
      const host = req.hostname;
      const protocol = req.protocol;
      const page = req.params.url;
      const description = descriptions[page] || descriptions.about;
      const url = req.url;
      const canonical = `${protocol}://www.${host}${url}`;
      let meta = {
        ...config.meta,
        canonical,
        description
      };

      let promise = Promise.reject();
      if (page === 'search') {
        const searchText = req.query.q;
        if (searchText && searchText.startsWith('🧵')) {
          const id = searchText.replace('🧵', '');
          promise = promise.catch(e => {
            return Pins.getFirstThreadPins(id)
              .then(pin => {
                const theadEmoji = '%F0%9F%A7%B5'; //🧵
                if (pin) {
                  const newUrl = url.replace(`${theadEmoji}${id}`, `🧵${pin.id}`);
                  const newCanonical = `${protocol}://www.${host}${newUrl}`; // update q to pinid
                  meta.canonical = newCanonical;
                  res.render(app.get('appPath') + '/index.html', { meta });
                } else {
                  throw 'no pin found';
                }
              });
          });
        }
      }
      promise.catch(err => {
        res.render(app.get('appPath') + '/index.html', { meta });
      });
    });

  let sitemapTemplate;
  app.route('/sitemap.txt')
    .get((req, res) => {
      if (!sitemapTemplate) {
        sitemapTemplate = fs.readFileSync(app.get('views') + '/sitemap.ejs', 'utf8');
      }
      const fromDateTime = new Date(0),
        userId = 0,
        lastPinId = 0,
        pageSize = 2147483647; // Maximum values for an integer in SQL Server
      return Pins.queryForwardByDate(fromDateTime, userId, lastPinId, pageSize)
        .then(({
          pins
        }) => {
          const txt = ejs.render(sitemapTemplate, { pins });
          res.send(txt);
        });
    });

  // All other routes should redirect to the index.html
  app.route('/*')
    .get((req, res) => {
      // res.sendFile(path.resolve(app.get('appPath') + '/index.html'));
      const canonical = `https://www.chronopin.com`;
      let meta = {
        ...config.meta,
        canonical
      };
      res.render(app.get('appPath') + '/index.html', { meta });
    });

}
