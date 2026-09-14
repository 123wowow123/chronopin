'use strict';

import {Router} from 'express';
import * as controller from './specialtyDay.controller';

const router = new Router();

router.get('/', controller.index);
router.get('/:monthDay', controller.show);

module.exports = router;
