import _ from 'lodash';

export const handleValidateReg = /^[a-zA-Z0-9-_]+$/;

// Copies profile fields onto the user wherever the user has no value yet, and
// lists what changed. mapping is { userProp: 'lodash.path.in.profile' }.
export function mapToUserWhenEmpty(
  mapping: Record<string, string>,
  profile: unknown,
  user: Record<string, any>,
): Record<string, unknown>[] {
  const updatedFields: Record<string, unknown>[] = [];
  Object.entries(mapping).forEach(([k, m]) => {
    const val = _.get(profile, m);
    if (!user[k] && user[k] != val) {
      user[k] = val;
      updatedFields.push({ [k]: val });
    }
  });
  return updatedFields;
}
