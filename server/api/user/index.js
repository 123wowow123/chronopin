'use strict';

import {Router} from 'express';
import * as controller from './user.controller';
import * as followController from './user.follow.controller';
import * as auth from '../../auth/auth.service';

const router = new Router();

router.get('/', auth.hasRole('admin'), controller.index);
router.delete('/:id', auth.hasRole('admin'), controller.destroy);
router.get('/me', auth.isAuthenticated(), controller.me);
router.post('/handle/check', controller.checkHandle);
router.put('/:id/password', auth.isAuthenticated(), controller.changePassword);
router.put('/:id/preferences', auth.isAuthenticated(), controller.savePreferences);
router.patch('/me', auth.isAuthenticated(), controller.patch);
router.get('/:id/follow', auth.tryGetUser(), followController.followStatus);
router.post('/:id/follow', auth.isAuthenticated(), followController.follow);
router.delete('/:id/follow', auth.isAuthenticated(), followController.unfollow);
router.get('/:id', auth.isAuthenticated(), controller.show);
router.post('/', controller.create);

module.exports = router;
