import * as _ from 'lodash';
import User from './user';
import { mapToUserWhenEmpty } from '../../util/mapper';

export function facebookMapper(inUser, profile) {

    const mapping = {
        facebookId: "id",
        firstName: "name.givenName",
        lastName: "name.familyName",
        locale: "_json.locale",
        pictureUrl: "photos[0].value",
        fbVerified: "_json.verified",
        email: "emails[0].value",
        gender: "gender",
        fbUpdatedTime: "_json.updated_time",
        about: "about"
    };

    let user = new User(inUser)

    let updatedFields = mapToUserWhenEmpty(mapping, profile, user);

    // Set default userName is missing
    if (!user.userName) {
        user.userName = [user.firstName, user.lastName].join(" ");
        updatedFields.push({ 'userName': val });
    }

    return { user, updatedFields };
}