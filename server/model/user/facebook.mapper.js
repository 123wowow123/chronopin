import * as _ from 'lodash';
import User from './user';

export function facebookMapper(inUser, profile) {

    let user = new User(inUser),
        updatedFields = [],
        prop,
        val;

    prop = 'id';
    val = _.get(profile, prop);
    if (user.facebookId != val) {
        user.facebookId = val;
        updatedFields.push({[prop]: val});
    }

    prop = 'name.givenName';
    val = _.get(profile, prop);
    if (user.firstName != val) {
        user.firstName = val;
        updatedFields.push({[prop]: val});
    }

    prop = 'name.familyName';
    val = _.get(profile, prop);
    if (user.lastName != val) {
        user.lastName = val;
        updatedFields.push({[prop]: val});
    }

    prop = 'gender';
    val = _.get(profile, prop);
    if (user.gender != val) {
        user.gender = val;
        updatedFields.push({[prop]: val});
    }

    prop = '_json.locale';
    val = _.get(profile, prop);
    if (user.locale != val) {
        user.locale = val;
        updatedFields.push({[prop]: val});
    }

    prop = 'photos[0].value';
    val = _.get(profile, prop);
    if (user.pictureUrl != val) {
        user.pictureUrl = val;
        updatedFields.push({[prop]: val});
    }

    prop = '_json.updated_time';
    val = _.get(profile, prop);
    if (user.fbUpdatedTime != val) {
        user.fbUpdatedTime = val;
        updatedFields.push({[prop]: val});
    }

    prop = '_json.verified';
    val = _.get(profile, prop);
    if (user.fbverified != val) {
        user.fbverified = val;
        updatedFields.push({[prop]: val});
    }

    prop = 'emails[0].value';
    val = _.get(profile, prop);
    if (user.email != val) {
        user.email = val;
        updatedFields.push({[prop]: val});
    }

    prop = 'about';
    val = _.get(profile, prop);
    if (user.about != val) {
        user.about = val;
        updatedFields.push({[prop]: val});
    }

    // Set default userName is missing
    if (!user.userName) {
        user.userName = [user.firstName, user.lastName].join(" ");
        updatedFields.push({'userName': val});
    }

    return { user, updatedFields };
}