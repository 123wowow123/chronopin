import * as _ from 'lodash';

export const mapToUserWhenEmpty = (mapping, profile, user) => {
    const updatedFields = [];
    Object.entries(mapping)
        .forEach(([k, m]) => {
            let val = _.get(profile, m);
            if (!user[k] && user[k] != val) {
                user[k] = val;
                updatedFields.push({ [k]: val });
            }
        });
        return updatedFields;
}