'use strict';

import express from 'express';
import config from '../config/environment';

// Passport Configuration
require('./local/passport').setup(config);
require('./facebook/passport').setup(config);

var router = express.Router();

router.use('/local', require('./local').default);
router.use('/facebook', require('./facebook').default);

export default router;
