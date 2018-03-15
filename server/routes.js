/**
 * Main application routes
 */

'use strict';

import errors from './components/errors';
import path from 'path';

export default function (app) {
  // Insert routes below
  //app.use('/api/things', require('./api/thing'));

  /** Begin Test **/
  var env = process.env.NODE_ENV = process.env.NODE_ENV || 'development';
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
  //app.use('/api/pins', require('./api/pin'));
  app.use('/api/pins', require('./api/pin'));
  //app.use('/api/likes', require('./api/like'));
  app.use('/api/scrape', require('./api/scrape'));
  app.use('/api/dates', require('./api/dateTime'));
  app.use('/api/main', require('./api/main'));
  app.use('/auth', require('./auth').default);

  // All undefined asset or api routes should return a 404
  app.route('/:url(api|auth|components|app|bower_components|assets)/*')
    .get(errors[404]);

  // All other routes should redirect to the index.html
  app.route('/*')
    .get((req, res) => {
      res.sendFile(path.resolve(app.get('appPath') + '/index.html'));
    });
}
