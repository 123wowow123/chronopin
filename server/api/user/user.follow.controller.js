'use strict';

import {
  FollowUser,
  User
} from '../../model';
import config from '../../config/environment';

import {
  EventEmitter
} from 'events';

const UserFollowEmitter = new EventEmitter();

export function addEntity(entity) {
  return entity.save()
    .then((
      entity
    ) => {
      let event = "afterFollow";
      UserFollowEmitter.emit(event, entity.followUser);
      return entity;
    });
}

export function removeEntity(entityIn) {
  return entityIn.delete()
    .then(() => {
      let event = "afterUnfollow";
      UserFollowEmitter.emit(event, entityIn);
      return entityIn;
    });
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function (err) {
    res.status(statusCode).send(err);
  };
}

export function index(req, res) {
  let userId = req.user && +req.user.id;
  return FollowUser.queryFollowingByUserName(userId)
    .then(({
      follows
    }) => {
      res.status(200).json(follows);
    })
    .catch(handleError(res));
}

export function create(req, res, next) {
  const userName = req.query.userName;
  let userId = req.user && +req.user.id;

  return User.getUserByUserName(userName)
    .then(followingUserRes => {
      let followingUser = followingUserRes.user;
      let newFollowUser = new FollowUser({
        userId
      }).setFollowUser(followingUser);

      return addEntity(newFollowUser)
        .then(({
          followUser
        }) => {
          res.status(200).json(followUser);
        });
    })
    .catch(handleError(res));
}

export function destroy(req, res) {
  const userName = req.query.userName;
  let userId = req.user && +req.user.id;

  return User.getUserByUserName(userName)
    .then(followingUserRes => {
      let followingUser = followingUserRes.user;
      let newFollowUser = new FollowUser({
        userId
      }).setFollowUser(followingUser);

      return removeEntity(newFollowUser)
        .then(() => {
          res.status(204).end();
        });
    })
    .catch(handleError(res));
}

export {
  UserFollowEmitter
};
