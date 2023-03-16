'use strict';

import {Router} from 'express';
import * as controller from './isso.controller';
import * as auth from '../auth/auth.service';

const router = new Router();

router.get('/', controller.index);
router.delete('/id/:id', auth.isAuthenticated(), controller.destroy);
router.get('/config', controller.getConfig);
router.post('/count', controller.count);
router.post('/new', auth.isAuthenticated(), controller.create);

router.post('/id/:id/like', controller.like);
router.post('/id/:id/dislike', controller.dislike);

module.exports = router;
