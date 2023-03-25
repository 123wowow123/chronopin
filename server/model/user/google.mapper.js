import * as _ from 'lodash';
import User from './user';
import { mapToUserWhenEmpty } from '../../util/mapper';

export function googleMapper(inUser, profile) {

    const mapping = {
        googleId: "id",
        firstName: "name.givenName",
        lastName: "name.familyName",
        locale: "_json.locale",
        pictureUrl: "photos[0].value",
        googleVerified: "emails[0].verified",
        email: "emails[0].value",
        userName: "displayName" // Set default userName is missing
    };

    let user = new User(inUser);

    let updatedFields = mapToUserWhenEmpty(mapping, profile, user);

    return { user, updatedFields };
}