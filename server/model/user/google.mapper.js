import * as _ from 'lodash';
import User from './user';
import { mapToUserWhenEmpty } from '../../util/mapper';
import { handleValidateReg } from '../../util/validation';

export function googleMapper(inUser, profile, handle) {

    const mapping = {
        googleId: "id",
        firstName: "name.givenName",
        lastName: "name.familyName",
        locale: "_json.locale",
        pictureUrl: "photos[0].value",
        googleVerified: "emails[0].verified",
        email: "emails[0].value"
    };

    let user = new User(inUser);

    let updatedFields = mapToUserWhenEmpty(mapping, profile, user);

    // Add userName is it hasn't been set
    if (!user.userName && handle && handle.length > 1 && handleValidateReg.test(handle.substring(1))) {
        user.userName = handle;
        updatedFields.push({ 'userName': handle });
    }

    return { user, updatedFields };
}