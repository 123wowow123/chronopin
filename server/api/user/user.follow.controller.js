'use strict';

import * as response from '../response';

import {
  User,
  Follow
} from '../../model';

// Every answer is the followed user's follow status as the caller now sees it,
// so the client can redraw the button and counts from one response.
function _sendStatus(res, userId, viewerId, statusCode) {
  return Follow.status(userId, viewerId)
    .then(status => {
      res.status(statusCode || 200).json(Object.assign({ userId }, status));
    });
}

// The followee as a positive integer id that belongs to a live user; answers
// 400/404 itself and resolves null when it is not.
function _followee(req, res) {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(400).json({ message: 'user id must be a positive integer' });
    return Promise.resolve(null);
  }
  return User.getById(userId)
    .then(({ user }) => {
      if (!user) {
        res.status(404).end();
        return null;
      }
      return userId;
    });
}

/**
 * Follow counts for a user, and whether the caller follows them
 * GET /api/users/:id/follow (signed in or not)
 */
export function followStatus(req, res) {
  const viewerId = req.user ? +req.user.id : null;
  return _followee(req, res)
    .then(userId => userId && _sendStatus(res, userId, viewerId))
    .catch(response.handleError(res));
}

/**
 * POST /api/users/:id/follow
 */
export function follow(req, res) {
  const followerId = +req.user.id;
  return _followee(req, res)
    .then(userId => {
      if (!userId) {
        return;
      }
      if (userId === followerId) {
        return res.status(400).json({ message: 'you cannot follow yourself' });
      }
      return Follow.follow(followerId, userId)
        .then(({ changed }) => _sendStatus(res, userId, followerId, changed ? 201 : 200));
    })
    .catch(response.handleError(res));
}

/**
 * DELETE /api/users/:id/follow
 */
export function unfollow(req, res) {
  const followerId = +req.user.id;
  return _followee(req, res)
    .then(userId => {
      if (!userId) {
        return;
      }
      return Follow.unfollow(followerId, userId)
        .then(() => _sendStatus(res, userId, followerId));
    })
    .catch(response.handleError(res));
}
