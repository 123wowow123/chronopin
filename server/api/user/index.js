'use strict';

import {Router} from 'express';
import * as controller from './user.controller';
import * as followController from './user.follow.controller';
import * as auth from '../../auth/auth.service';

const router = new Router();

// Profile use userName as id
router.get('/profile', auth.tryGetUser(), controller.profile);

// Create Follow association
router.post('/follow', auth.isAuthenticated(), followController.create); // afterFollow
router.post('/unfollow', auth.isAuthenticated(), followController.destroy); // afterUnfollow

// Bell functionality
router.get('/getAggregateUnreadCount', auth.tryGetUser(), followController.getAggregateUnreadCount);
router.post('/getAggregateUnread', auth.tryGetUser(), followController.getAggregateUnread);
// router.post('/updateLastCheckedAggregateUnread', auth.tryGetUser(), followController.updateLastCheckedAggregateUnread);

router.get('/', auth.hasRole('admin'), controller.index);
router.delete('/:id', auth.hasRole('admin'), controller.destroy);
router.get('/me', auth.isAuthenticated(), controller.me);
router.post('/handle/check', controller.checkHandle);
router.put('/:id/password', auth.isAuthenticated(), controller.changePassword);
router.patch('/me', auth.isAuthenticated(), controller.patch);
router.get('/:id', auth.isAuthenticated(), controller.show);
router.post('/', controller.create);

module.exports = router;
