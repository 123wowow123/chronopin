'use strict';

import passport from 'passport';
import config from '../config/environment';
import * as log from '../log';
import jwt from 'jsonwebtoken';
import expressJwt from 'express-jwt';
import compose from 'composable-middleware';
import {
  User
} from '../model';

const tokenExpiresIn = 60 * 60 * 5;

let validateJwt = expressJwt({
  secret: config.secrets.session
});

/**
 * Attaches the user object to the request if authenticated
 * Otherwise returns 403
 */
export function isAuthenticated() {
  return compose()
    // Validate jwt
    .use(function(req, res, next) {
      // allow access_token to be passed through query parameter as well
      if (req.query && req.query.hasOwnProperty('access_token')) {
        req.headers.authorization = 'Bearer ' + req.query.access_token;
      }
      validateJwt(req, res, next);
    })
    // Attach user to request
    .use(function(req, res, next) {
      User.getById(+req.user.id)
        .then(({
          user
        }) => {
          if (!user) {
            return res.status(401).end();
          }
          req.user = user;
          next();
          return null;
        })
        .catch(err => next(err));
    });
}

/**
 * Attaches the user object to the request if authenticated
 * Otherwise proceed to the next function
 */

export function tryGetUser() {
  return compose()
    // Validate jwt
    .use(function(req, res, next) {
      // allow access_token to be passed through query parameter as well
      if (req.query && req.query.hasOwnProperty('access_token')) {
        req.headers.authorization = 'Bearer ' + req.query.access_token;
      }

      if (!req.headers.authorization || req.headers.authorization === 'Bearer ') {
        next();
      } else {
        validateJwt(req, res, next); //if validation fales then return to next function
      }
      return null;
    })
    // Attach user to request
    .use(function(req, res, next) {
      if (!req.user || req.user.id === undefined) {
        next();
      } else {
        User.getById(+req.user.id)
          .then(({
            user
          }) => {
            if (!user) {
              req.user = null;
            }
            req.user = user;
            next();
          })
          .catch(err => next(err));
      }
      return null;
    });
}

/**
 * Checks if the user role meets the minimum requirements of the route
 */
export function hasRole(roleRequired) {
  if (!roleRequired) {
    throw new Error('Required role needs to be set');
  }

  return compose()
    .use(isAuthenticated())
    .use(function meetsRequirements(req, res, next) {
      if (config.userRoles.indexOf(req.user.role) >=
        config.userRoles.indexOf(roleRequired)) {
        next();
      } else {
        res.status(403).send('Forbidden');
      }
    });
}

/**
 * Returns a jwt token signed by the app secret
 */
export function signToken(id, role) {
  return jwt.sign({
    id: id,
    role: role
  }, config.secrets.session, {
    expiresIn: tokenExpiresIn
  });
}

/**
 * Set token cookie directly for oAuth strategies
 */
export function setTokenCookie(req, res) {
  // log.info('setTokenCookie', req.user)
  if (!req.user) {
    return res.status(404).send('It looks like you aren\'t logged in, please try again.');
  }
  var token = signToken(+req.user.id, req.user.role);
  res.cookie('token', token);
  res.redirect('/');
}
