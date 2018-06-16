'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.facebookMapper = facebookMapper;

var _lodash = require('lodash');

var _ = _interopRequireWildcard(_lodash);

var _user = require('./user');

var _user2 = _interopRequireDefault(_user);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function facebookMapper(inUser, profile) {

    var user = new _user2.default(inUser),
        updatedFields = [],
        prop = void 0;

    prop = 'id';
    if (user.facebookId !== _.get(profile, prop)) {
        user.facebookId = profile.id;
        updatedFields.push(prop);
    }

    prop = 'name.givenName';
    if (user.firstName !== _.get(profile, prop)) {
        user.firstName = profile.name.givenName;
        updatedFields.push(prop);
    }

    prop = 'name.familyName';
    if (user.lastName !== _.get(profile, prop)) {
        user.lastName = profile.name.familyName;
        updatedFields.push(prop);
    }

    prop = 'gender';
    if (user.gender !== _.get(profile, prop)) {
        user.gender = profile.gender;
        updatedFields.push(prop);
    }

    prop = '_json.locale';
    if (user.locale !== _.get(profile, prop)) {
        user.locale = profile._json.locale;
        updatedFields.push(prop);
    }

    prop = 'photos[0].value';
    if (user.pictureUrl !== _.get(profile, prop)) {
        user.pictureUrl = profile.photos[0].value;
        updatedFields.push(prop);
    }

    prop = '_json.updated_time';
    if (user.fbUpdatedTime !== _.get(profile, prop)) {
        user.fbUpdatedTime = profile._json.updated_time;
        updatedFields.push(prop);
    }

    prop = '_json.verified';
    if (user.fbverified !== _.get(profile, prop)) {
        user.fbverified = profile._json.verified;
        updatedFields.push(prop);
    }

    prop = 'emails[0].value';
    if (user.email !== _.get(profile, prop)) {
        user.email = profile.emails[0].value;
        updatedFields.push(prop);
    }

    prop = 'about';
    if (user.about !== _.get(profile, prop)) {
        user.about = profile.about;
        updatedFields.push(prop);
    }

    return { user: user, updatedFields: updatedFields };
}
//# sourceMappingURL=facebook.mapper.js.map
