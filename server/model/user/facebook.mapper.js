import * as _ from 'lodash';
import User from './user';

export function facebookMapper(inUser, profile) {

    let user = new User(inUser),
        updatedFields = [],
        prop;

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

    return { user, updatedFields };
}