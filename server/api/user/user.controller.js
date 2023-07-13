'use strict';

import {
  User,
  Users,
  FollowUser
} from '../../model';
import config from '../../config/environment';
import jwt from 'jsonwebtoken';
import _ from 'lodash';

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
  'about'
];

const pickUserProfileProps = [
  'id',
  'userName',
  'about',
  'utcCreatedDateTime'
];

export function updateEntity(newUser) {
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
  return newUser.save()
    .then((
      user
    ) => {
      let event = "afterCreate";
      UserEmitter.emit(event, user.user);
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

  return addEntity(newUser)
    .then(({
      user
    }) => {
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
  let patchUser = new User(req.body);

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
 * Get a single user by userName
 */
export function profile(req, res, next) {
  let userId = req.user && +req.user.id;
  const userName = req.query.userName;

  const userPromise = User.getUserByUserName(userName);
  const followingPromise = FollowUser.queryFollowingByUserName(userName);
  const followerPromise = FollowUser.queryFollowerByUserName(userName);
  const isFollowingPromise = userId ? FollowUser.queryIsFollowingByUserName(userId, userName) : Promise.resolve({ isFollowing: false });

  return Promise.all([userPromise, followingPromise, followerPromise, isFollowingPromise])
    .then(([user, following, follower, isFollowing]) => {

      if (!user.user) {
        return res.status(404).end();
      }
      const filteredUser = _.pick(user.user, pickUserProfileProps);
      res.json({
        ...filteredUser,
        followingCount: following.count,
        followerCount: follower.count,
        isFollowing: isFollowing.isFollowing
      });

    }).catch(err => next(err));
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
