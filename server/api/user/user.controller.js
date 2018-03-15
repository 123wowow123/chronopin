'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.UserEmitter = undefined;
exports.addEntity = addEntity;
exports.index = index;
exports.create = create;
exports.show = show;
exports.destroy = destroy;
exports.changePassword = changePassword;
exports.me = me;
exports.authCallback = authCallback;

var _model = require('../../model');

var _environment = require('../../config/environment');

var _environment2 = _interopRequireDefault(_environment);

var _jsonwebtoken = require('jsonwebtoken');

var _jsonwebtoken2 = _interopRequireDefault(_jsonwebtoken);

var _events = require('events');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var UserEmitter = new _events.EventEmitter();
var pickUserProps = ['id', 'firstName', 'lastName', 'email', 'role', 'provider'];

function addEntity(newUser) {
  //debugger
  return newUser.save().then(function (_ref) {
    var user = _ref.user;

    var event = "afterCreate";
    UserEmitter.emit(event, user);
    return user;
  });
}

function validationError(res, statusCode) {
  statusCode = statusCode || 422;
  return function (err) {
    res.status(statusCode).json(err);
  };
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function (err) {
    res.status(statusCode).send(err);
  };
}

/**
 * Get list of users
 * restriction: 'admin'
 */
function index(req, res) {
  return _model.Users.getAll(pickUserProps).then(function (_ref2) {
    var users = _ref2.users;

    res.status(200).json(users);
  }).catch(handleError(res));
}

/**
 * Creates a new user
 */
function create(req, res, next) {
  var newUser = new _model.User(req.body);
  newUser.provider = 'local';
  newUser.role = 'user';

  return addEntity(newUser).then(function (_ref3) {
    var user = _ref3.user;

    var token = _jsonwebtoken2.default.sign({
      id: user.id
    }, _environment2.default.secrets.session, {
      expiresIn: 60 * 60 * 5
    });
    res.json({
      token: token
    });
  }).catch(validationError(res));
}

/**
 * Get a single user
 */
function show(req, res, next) {
  var userId = req.params.id;

  return _model.User.getById(userId).then(function (_ref4) {
    var user = _ref4.user;

    if (!user) {
      return res.status(404).end();
    }
    res.json(user.profile);
  }).catch(function (err) {
    return next(err);
  });
}

/**
 * Deletes a user
 * restriction: 'admin'
 */
function destroy(req, res) {
  return new _model.User({
    id: req.params.id
  }).delete().then(function () {
    res.status(204).end();
  }).catch(handleError(res));
}

/**
 * Change a users password
 */
function changePassword(req, res, next) {
  var userId = +req.user.id;
  var oldPass = String(req.body.oldPassword);
  var newPass = String(req.body.newPassword);

  return _model.User.getById(userId).then(function (_ref5) {
    var user = _ref5.user;

    if (user.authenticate(oldPass)) {
      user.password = newPass;
      return user.update().then(function () {
        res.status(204).end();
      }).catch(validationError(res));
    } else {
      return res.status(403).end();
    }
  });
}

/**
 * Get my info
 */
function me(req, res, next) {
  var userId = +req.user.id;
  return _model.User.getById(userId).then(function (_ref6) {
    var user = _ref6.user;
    // don't ever give out the password or salt
    if (!user) {
      return res.status(401).end();
    }
    res.json(user.pick(pickUserProps));
  }).catch(function (err) {
    return next(err);
  });
}

/**
 * Authentication callback
 */
function authCallback(req, res, next) {
  res.redirect('/');
}

exports.UserEmitter = UserEmitter;
//# sourceMappingURL=user.controller.js.map
