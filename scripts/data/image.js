/**
 * Populate DB with sample data
 */

'use strict';

import {
  MediumType,
  Medium,
  FullPins
} from '../../server/model';
import config from '../../server/config/environment';
import * as azureBlob from '../../server/azure-blob';
import fs from 'fs';
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

let cp,
  Request,
  pinFilePath;

// Setup
module.exports.setup = function (opt) {
  cp = opt.cp;
  Request = cp.Request;
  pinFilePath = opt.pinfile;
  return this;
};

module.exports.execute = function () {
  const originalContainerName = config.thumbFolder;
  const containerName = 't';
  return Promise.resolve('Begin Image Execute')
    .then(() => {
      return azureBlob.setup({ containerName });
    })
    .then(() => {
      return azureBlob.createThumbContainer();
    })
    .then(() => {
      let pinPromises = [];
      let pinsJSONObjs = JSON.parse(fs.readFileSync(pinFilePath, 'utf8'));
      let pins = new FullPins(pinsJSONObjs);

      pins.pins.forEach(p => {
        p.media.forEach(m => {
          if (m.type != 1) {
            return;
          }
          m.thumbName;
          m.originalUrl;
          let thumbImageUrl = m.getImageUrl().replace(containerName, originalContainerName);

          // if (!m.thumbWidth) {
          //   console.log('missing thumbWidth:', m.thumbName, m.originalUrl);
          // }
          // if (!m.thumbHeight) {
          //   console.log('missing thumbHeight:', m.thumbName, m.originalUrl);
          // }
          const thumbName = m.thumbName.replace(/\.[^/.]+$/, "");
          let promise = Medium.createAndSaveToCDN(m.originalUrl, thumbName)
            .then(t => {
              m.thumbName = t.thumbName;
              m.thumbWidth = t.thumbWidth;
              m.thumbHeight = t.thumbHeight;
              m.originalWidth = t.originalWidth;
              m.originalHeight = t.originalHeight;
              m.mimeType = t.mimeType;

              return t;
            })
            .catch(e => {
              //console.log('fail to save:', m.thumbName, m.originalUrl, e.message);
              return Medium.createAndSaveToCDN(thumbImageUrl, thumbName)
                .then(t => {
                  m.thumbName = t.thumbName;
                  m.thumbWidth = t.thumbWidth;
                  m.thumbHeight = t.thumbHeight;
                  m.originalWidth = t.originalWidth;
                  m.originalHeight = t.originalHeight;
                  m.mimeType = t.mimeType;
                  return t;
                })
                .catch(e => {
                  console.log('fail to save:', m.thumbName, m.originalUrl, thumbImageUrl, e.message);
                  throw e;
                });
            });

          // add meta ?

          pinPromises.push(promise);
        });

        const dom = new JSDOM(p.description);
        const document = dom.window.document;
        const matches = document.querySelectorAll('img');
        matches.forEach((match) => {
          const src = match.src;
          if (src) {
            let urlParts = src.split("/");
            let filename = urlParts[urlParts.length - 1];
            const thumbNameHtml = filename.replace(/\.[^/.]+$/, "");
            let promise = Medium.createAndSaveToCDN(src, thumbNameHtml)
              .then(t => {
                p.description = p.description.replaceAll(src, t.getImageUrl());
                return t;
              })
              .catch(e => {
                console.log('fail to save:', thumbNameHtml, src, e.message);
                throw e;
              });
            pinPromises.push(promise);
          }
        });

      });

      return Promise.all(pinPromises)
        .then(() => {
          return fs.writeFileSync(pinFilePath, JSON.stringify(pins.pins, null, 2));
        });
    })
    .then(() => {
      console.log('Update Images Complete');
    })
    .catch((err) => {
      console.log('Update Images err:', err);
    });
}
