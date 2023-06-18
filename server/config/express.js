/**
 * Express configuration
 */

'use strict';

import express from 'express';
import favicon from 'serve-favicon';
import morgan from 'morgan';
import compression from 'compression';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import cookieParser from 'cookie-parser';
import errorHandler from 'errorhandler';
import path from 'path';
import lusca from 'lusca';
import config from './environment';
import passport from 'passport';
import session from 'express-session';
import sqldb from '../sqldb';
import expressSequelizeSession from 'express-sequelize-session';
const { forceDomain } = require('forcedomain');
let Store = expressSequelizeSession(session.Store);

export default function (app) {
  let env = app.get('env');

  // let requestPath = function (req, res, next) {
  //   console.log(req.originalUrl);
  //   next()
  // }

  // app.use(requestPath);

  // app.use(require('../prerender'));
  app.use(compression());

  if (env === 'development' || env === 'test') {
    app.use(express.static(path.join(config.root, '.tmp')));
  }

  if (env === 'production') {
    // TODO: Causes errors
    app.use(favicon(path.join(config.root, 'client/assets/images', 'favicon.ico')));
  }

  // app.use(forceDomain({
  //   hostname: config.host,
  //   hostname: config.port,
  //   protocol: 'https',
  //   type: 'permanent'
  // }));

  app.set('appPath', path.join(config.root, 'client'));
  app.use(express.static(app.get('appPath'), { index: '_' }));
  // app.use(express.static(app.get('appPath')));
  app.use(morgan('dev'));

  app.set('views', config.root + '/server/views');
  app.engine('html', require('ejs').renderFile);
  app.set('view engine', 'html');

  app.use(bodyParser.urlencoded({
    extended: false
  }));
  app.use(bodyParser.json());
  app.use(methodOverride());
  app.use(cookieParser());
  app.use(passport.initialize());

  // Persist sessions with MongoStore / sequelizeStore
  // We need to enable sessions for passport-twitter because it's an
  // oauth 1.0 strategy, and Lusca depends on sessions
  app.use(session({
    secret: config.secrets.session,
    saveUninitialized: true,
    resave: false,
    store: new Store(sqldb.sequelize)
  }));

  // app.all(/.*/, function (req, res, next) {
  //   let host = req.header("host");
  //   let protocol = req.protocol;
  //   const url = `${protocol}://${host}${req.url}`;
  //   const xforwardedfor = req.headers['x-forwarded-for'];
  //   const xforwarded = req.headers['x-forwarded'];
  //   const forwardedfor = req.headers['forwarded-for'];
  //   const forwarded = req.headers['forwarded'];
  //   console.log(url);
  //   console.log('x-forwarded-for:', xforwardedfor, 'x-forwarded:', xforwarded, 'forwarded-for:', forwardedfor, 'forwarded:', forwarded);
  //   // if (host.match(/^www\..*/i)) {
  //     next();
  //   // } else {
  //   //   //but url comes in like this so doesn't work: http://10.112.0.169/
  //   //   res.redirect(301, `${protocol}://www.${host}${req.url}`);
  //   // }
  // });

  /**
   * Lusca - express server security
   * https://github.com/krakenjs/lusca
   */
  if (env !== 'test' && !process.env.SAUCE_USERNAME) {
    app.use(lusca({
      xframe: 'SAMEORIGIN',
      hsts: {
        maxAge: 31536000, //1 year, in seconds
        includeSubDomains: true,
        preload: true
      },
      xssProtection: true
    }));
  }

  if ('development' === env) {
    app.use(require('connect-livereload')({
      ignore: [
        /^\/api\/(.*)/,
        /\.js(\?.*)?$/, /\.css(\?.*)?$/, /\.svg(\?.*)?$/, /\.ico(\?.*)?$/, /\.woff(\?.*)?$/,
        /\.png(\?.*)?$/, /\.jpg(\?.*)?$/, /\.jpeg(\?.*)?$/, /\.gif(\?.*)?$/, /\.pdf(\?.*)?$/
      ]
    }));
  }

  if ('development' === env || 'test' === env) {
    app.use(errorHandler()); // Error handler - has to be last
  }
}
