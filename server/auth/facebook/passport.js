'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setup = setup;

var _passport = require('passport');

var _passport2 = _interopRequireDefault(_passport);

var _passportFacebook = require('passport-facebook');

var _user = require('../../api/user/user.controller');

var userController = _interopRequireWildcard(_user);

var _model = require('../../model');

var _log = require('../../log');

var log = _interopRequireWildcard(_log);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function setup(config) {
  _passport2.default.use(new _passportFacebook.Strategy({
    clientID: config.facebook.clientID,
    clientSecret: config.facebook.clientSecret,
    callbackURL: config.facebook.callbackURL,
    profileFields: ['first_name', 'last_name', 'emails',
    //'age_range',
    'locale', 'picture', 'timezone', 'updated_time', 'verified', 'gender', 'about'
    //'birthday',
    //'education',
    //'location'
    ]
  }, function (accessToken, refreshToken, profile, done) {
    // console.log('facebook profile', profile);

    _model.User.getByFacebookId(profile.id).then(function (_ref) {
      var user = _ref.user;

      log.info('facebook profile', log.stringify(profile));
      log.infoBlue('current chronopin user', log.stringify(user));

      // update empty fields

      var _facebookMapper = (0, _model.facebookMapper)(user, profile),
          updatedUser = _facebookMapper.user,
          updatedFields = _facebookMapper.updatedFields;

      if (user && !updatedFields.length) {
        return done(null, user);
      }

      if (user && updatedFields.length) {
        log.info("user updated the following profile properties", log.stringify(updatedFields));
        return updatedUser.update().then(function (_ref2) {
          var user = _ref2.user;

          done(null, user);
        }).catch(function (err) {
          return done(err);
        });
      }

      updatedUser.role = 'user';
      updatedUser.role = 'facebook';

      log.infoBlue('new chronopin user', log.stringify(updatedUser));

      // var request = require('request');
      // request.post((process.env.DOMAIN || '') + '/api/users', user, function (error, response, body) {
      //   if (!error && response.statusCode == 200) {
      //     console.log(body) // Print the google web page.
      //   }
      // })

      userController.addEntity(updatedUser).then(function (_ref3) {
        var user = _ref3.user;

        done(null, user);
      }).catch(function (err) {
        return done(err);
      });
    }).catch(function (err) {
      return done(err);
    });
  }));
} // Facebook Permission Doc: https://developers.facebook.com/docs/facebook-login/permissions
// Graph API Explorer: https://developers.facebook.com/tools/explorer/145634995501895/?method=GET&path=%7Buser-id%7D&version=v2.8
//# sourceMappingURL=passport.js.map
