/**
 * Main application routes
 */

'use strict';

import errors from './components/errors';
import path from 'path';
import * as paginationHeader from './util/paginationHeader'
const mainController = require('./api/main/main.controller');

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
  app.use('/auth', require('./auth').default);
  app.use('/upload', require('./api/upload'));

  
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


  app.route('/mainPinData.js')
    .get((req, res) => {
      const mainPinDataPromise = mainController.getPinsAndFormatData(req, res)
        .then(paginationHeader.setPaginationObject(res, req))
        .then((mainPinData) => {
          // Render Templated root page
          res.type('text/javascript').render(app.get('appPath') + '/mainPinData.ejs', { mainPinData });
        }).catch(() => {
          res.type('text/javascrip').render(app.get('appPath') + '/mainPinData.ejs', { mainPinData: null });
        });

    });

  // All other routes should redirect to the index.html
  app.route('/*')
    .get((req, res) => {
      res.sendFile(path.resolve(app.get('appPath') + '/index.html'));
      // res.render(app.get('appPath') + '/index.html', { mainPinData: null });
    });

}
