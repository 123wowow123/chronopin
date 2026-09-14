'use strict';

import * as response from '../response';

import {
  Notification
} from '../../model';

/**
 * The signed-in user's notifications, newest first
 * GET /api/notifications?limit=30
 */
export function index(req, res) {
  const userId = +req.user.id;
  return Promise.all([
    Notification.list(userId, req.query.limit),
    Notification.unreadCount(userId)
  ])
    .then(([notifications, unreadCount]) => {
      res.json({ notifications, unreadCount });
    })
    .catch(response.handleError(res));
}

/**
 * Just the badge number, for polling
 * GET /api/notifications/unread-count
 */
export function unreadCount(req, res) {
  return Notification.unreadCount(+req.user.id)
    .then(count => {
      res.json({ unreadCount: count });
    })
    .catch(response.handleError(res));
}

/**
 * Marks everything the user has as read (opening the bell)
 * POST /api/notifications/read
 */
export function markAllRead(req, res) {
  return Notification.markAllRead(+req.user.id)
    .then(response.withNoResult(res))
    .catch(response.handleError(res));
}
