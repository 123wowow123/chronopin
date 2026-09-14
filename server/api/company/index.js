'use strict';

import {Router} from 'express';
import * as controller from './company.controller';

const router = new Router();

router.get('/', controller.index);

module.exports = router;
