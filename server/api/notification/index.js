'use strict';

import {Router} from 'express';
import * as controller from './notification.controller';
import * as auth from '../../auth/auth.service';

const router = new Router();

router.get('/', auth.isAuthenticated(), controller.index);
router.get('/unread-count', auth.isAuthenticated(), controller.unreadCount);
router.post('/read', auth.isAuthenticated(), controller.markAllRead);

module.exports = router;
