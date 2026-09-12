'use strict';

import {
  User,
  Users
} from '../../model';
import config from '../../config/environment';
import jwt from 'jsonwebtoken';
import _ from 'lodash';
import * as createdFilter from '../../util/createdFilter';

import {
  EventEmitter
} from 'events';

const UserEmitter = new EventEmitter();
const pickUserProps = [
  'id',
  'userName',
  'firstName',
  'lastName',
  'email',
  'role',
  'provider',
  'defaultFilterSpanPreference'
];

// What somebody may change about themselves through the generic patch route.
// Without this, every truthy property in the model's own list is writable
// straight from the request body - `role` included, so a signed-in user could
// make themselves an admin by patching their own profile.
const patchableUserProps = [
  'userName',
  'firstName',
  'lastName',
  'email'
];

export function updateEntity(newUser) {
  //debugger
  return newUser.update()
    .then(({
      user
    }) => {
      let event = "afterUpdate";
      UserEmitter.emit(event, user);
      return user;
    });
}

export function patchEntity(newUser) {
  //debugger
  return newUser.patchWithoutPassword()
    .then(({
      user
    }) => {
      let event = "afterPatch";
      UserEmitter.emit(event, user);
      return user;
    });
}

export function addEntity(newUser) {
  //debugger
  return newUser.save()
    .then(({
      user
    }) => {
      let event = "afterCreate";
      UserEmitter.emit(event, user);
      return user;
    });
}

function validationError(res, statusCode) {
  statusCode = statusCode || 422;
  return function (err) {
    res.status(statusCode).json(err);
  };
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function (err) {
    res.status(statusCode).send(err);
  };
}

/**
 * Get list of users
 * restriction: 'admin'
 */
export function index(req, res) {
  return Users.getAll(pickUserProps)
    .then(({
      users
    }) => {
      res.status(200).json(users);
    })
    .catch(handleError(res));
}

/**
 * Creates a new user
 */
export function create(req, res, next) {
  var newUser = new User(req.body);
  newUser.provider = 'local';
  newUser.role = 'user';

  // addEntity resolves the user itself, not a { user } wrapper: destructuring
  // one here left `user` undefined, so signup answered 422 with the serialised
  // TypeError even though the row had already been inserted.
  return addEntity(newUser)
    .then(user => {
      var token = jwt.sign({
        id: user.id
      }, config.secrets.session, {
        expiresIn: 60 * 60 * 5
      });
      res.json({
        token
      });
    })
    .catch(validationError(res));
}

/**
 * Patch a new user
 */
export function patch(req, res, next) {
  let patchUser = new User(_.pick(req.body, patchableUserProps));

  let userId = +req.user.id;
  return User.getById(userId)
    .then(({
      user
    }) => { // don't ever give out the password or salt
      if (!user) {
        return res.status(401).end();
      }

      const patchedUser = user.patchSet(patchUser);
      return patchEntity(patchedUser)
        .then((
          user
        ) => {
          let token = jwt.sign({
            id: user.id
          }, config.secrets.session, {
            expiresIn: 60 * 60 * 5
          });
          res.json({
            token
          });
        })
        .catch(validationError(res));

      // res.json(
      //   user.pick(pickUserProps));
    })
    .catch(err => next(err));

}

/**
 * Get a single user
 */
export function show(req, res, next) {
  let userId = req.params.id;

  return User.getById(userId)
    .then(({
      user
    }) => {
      if (!user) {
        return res.status(404).end();
      }
      res.json(user.profile);
    })
    .catch(err => next(err));
}

/**
 * Deletes a user
 * restriction: 'admin'
 */
export function destroy(req, res) {
  return new User({
    id: req.params.id
  }).delete()
    .then(function () {
      res.status(204).end();
    })
    .catch(handleError(res));
}

/**
 * Change a users password
 */
export function changePassword(req, res, next) {
  let userId = +req.user.id;
  let oldPass = String(req.body.oldPassword);
  let newPass = String(req.body.newPassword);

  return User.getById(userId)
    .then(({
      user
    }) => {
      if (user.authenticate(oldPass)) {
        user.password = newPass;
        return user.update()
          .then(() => {
            res.status(204).end();
          })
          .catch(validationError(res));
      } else {
        return res.status(403).end();
      }
    });
}

/**
 * Save the signed-in user's own preferences
 *
 * Deliberately narrow: it takes one named field off the body and writes it to
 * the row the token identifies, rather than patching across whatever
 * properties the request happens to carry.
 */
export function savePreferences(req, res, next) {
  let userId = +req.user.id;
  let raw = req.body.defaultFilterSpanPreference;

  if (raw !== null && raw !== undefined && typeof raw !== 'string') {
    return res.status(400).json({
      message: 'defaultFilterSpanPreference must be a span string or null'
    });
  }

  // Stored normalised even though the validator would accept "1 D": the filter
  // reads the value back with a stricter pattern than the one that validates
  // it here, and would show an empty button for a span it cannot parse.
  let within = (raw || '').trim().toLowerCase().replace(/\s+/g, '') || null;

  // Nothing chosen clears the preference, putting the combo back on the span
  // it falls back to.
  if (within && !createdFilter.isValidSpan(within)) {
    return res.status(400).json({
      message: `defaultFilterSpanPreference is not a span the filter accepts: '${within}'`
    });
  }

  return User.getById(userId)
    .then(({
      user
    }) => {
      if (!user) {
        return res.status(401).end();
      }
      user.defaultFilterSpanPreference = within;
      return patchEntity(user)
        .then(() => {
          res.status(204).end();
        })
        .catch(validationError(res));
    })
    .catch(err => next(err));
}

/**
 * Get my info
 */
export function me(req, res, next) {
  let userId = +req.user.id;
  return User.getById(userId)
    .then(({
      user
    }) => { // don't ever give out the password or salt
      if (!user) {
        return res.status(401).end();
      }
      res.json(
        user.pick(pickUserProps));
    })
    .catch(err => next(err));
}

/**
 * Check Handle Available
 */
export function checkHandle(req, res, next) {
  let handle = String(req.body.handle);
  return User.getUserByUserName(handle)
    .then(({
      user
    }) => {
      res.json({
        available: !user
      });
    })
    .catch(err => next(err));
}

/**
 * Authentication callback
 */
export function authCallback(req, res, next) {
  res.redirect('/');
}

export {
  UserEmitter
};
