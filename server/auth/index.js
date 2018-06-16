'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _passport = require('passport');

var _passport2 = _interopRequireDefault(_passport);

var _environment = require('../config/environment');

var _environment2 = _interopRequireDefault(_environment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Passport Configuration
require('./local/passport').setup(_environment2.default);
require('./facebook/passport').setup(_environment2.default);

var router = _express2.default.Router();

router.use('/local', require('./local').default);
router.use('/facebook', require('./facebook').default);

exports.default = router;
//# sourceMappingURL=index.js.map
