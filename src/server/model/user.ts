import { pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import _ from 'lodash';
import * as db from '../db';
import type { Row } from '../db';
import { handleValidateReg, mapToUserWhenEmpty } from '../util/mapper';

const pbkdf2Async = promisify(pbkdf2);
const randomBytesAsync = promisify(randomBytes);

const authTypes = ['github', 'twitter', 'facebook', 'google', 'apple'];
const PASSWORD_ITERATIONS = 10000;
const PASSWORD_KEY_LENGTH = 64;
const SALT_BYTES = 16;

const prop = [
  'id',
  'userName',
  'firstName',
  'lastName',
  'birthday',
  'gender',
  'locale',
  'facebookId',
  'googleId',
  'appleId',
  'pictureUrl',
  'fbUpdatedTime',
  'fbVerified',
  'googleVerified',
  'about',
  'email',
  'password',
  'role',
  'provider',
  'salt',
  'websiteUrl',
  'defaultFilterSpanPreference',
  'themePreference',
  'localePreference',
  'showCardStockPrices',
  'utcCreatedDateTime',
  'utcUpdatedDateTime',
  'utcDeletedDateTime',
];

// What any endpoint may send back about a user. Never the password hash or salt.
export const pickUserProps = [
  'id',
  'userName',
  'firstName',
  'lastName',
  'birthday',
  'email',
  'role',
  'provider',
  'pictureUrl',
  'defaultFilterSpanPreference',
  'themePreference',
  'localePreference',
  'showCardStockPrices',
];

// What somebody may change about themselves through the generic patch route.
// Without this, every truthy property in the model's own list is writable
// straight from the request body - `role` included.
export const patchableUserProps = ['userName', 'firstName', 'lastName', 'birthday', 'email'];

// Which unique index (0046) a failed insert or update hit: another live
// account already has this email or @handle. Null for any other error.
export function takenField(err: unknown): 'email' | 'userName' | null {
  const { code, constraint } = (err ?? {}) as { code?: string; constraint?: string };
  if (code !== '23505') return null;
  if (constraint === 'User_email_key') return 'email';
  if (constraint === 'User_userName_key') return 'userName';
  return null;
}

// The 409 body for takenField: `code` for the forms to translate, `message`
// in English for API clients.
export function takenBody(field: 'email' | 'userName') {
  return field === 'email'
    ? { code: 'emailTaken', message: 'An account with this email already exists.' }
    : { code: 'handleTaken', message: 'This user handle is taken.' };
}

export default class User {
  [key: string]: any;
  declare id: number;
  declare userName: string;
  declare email: string;
  declare role: string;
  declare birthday: string | null | undefined;
  declare provider: string;
  declare password: string | null | undefined;
  declare salt: string | null | undefined;
  declare pictureUrl: string | null | undefined;
  declare defaultFilterSpanPreference: string | null | undefined;
  declare themePreference: string | null | undefined;
  declare localePreference: string | null | undefined;
  declare showCardStockPrices: boolean | undefined;

  constructor(user?: Row | null) {
    if (user) {
      this.set(user);
    }
  }

  set(user: Row): this {
    if (!user) {
      throw new Error('User cannot set value of arg');
    }
    for (const key of prop) {
      this[key] = user[key];
    }
    return this;
  }

  // Copies only the truthy values over.
  patchSet(user: Row): this {
    for (const key of prop) {
      if (user[key]) {
        this[key] = user[key];
      }
    }
    return this;
  }

  // Whether password matches the stored hash.
  async authenticate(password: string): Promise<boolean> {
    if (!this.password) {
      return false;
    }
    const hashed = await this.encryptPassword(password);
    if (!hashed) {
      return false;
    }
    const a = Buffer.from(hashed);
    const b = Buffer.from(this.password);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  async encryptPassword(password: string): Promise<string | null> {
    if (!password || !this.salt) {
      return null;
    }
    const key = await pbkdf2Async(
      password,
      Buffer.from(this.salt, 'base64'),
      PASSWORD_ITERATIONS,
      PASSWORD_KEY_LENGTH,
      'sha512',
    );
    return key.toString('base64');
  }

  // Replaces a plain-text password on the object with its hash and a new salt.
  private async hashPassword() {
    if (!this.password) {
      return;
    }
    if (!this.password.length && authTypes.indexOf(this.provider) === -1) {
      throw new Error('Invalid password');
    }
    this.salt = (await randomBytesAsync(SALT_BYTES)).toString('base64');
    this.password = await this.encryptPassword(this.password);
  }

  // save and update always rehash the password they carry.
  async save() {
    await this.hashPassword();
    return createUser(this);
  }

  // Inserts a backed-up user as-is: password is already a hash with its salt.
  restore() {
    return createUser(this);
  }

  async update() {
    await this.hashPassword();
    return updateUser(this);
  }

  patchWithoutPassword() {
    return updateUser(this);
  }

  // A soft delete.
  async delete() {
    const rows = await db.query(
      `UPDATE "User" SET "utcDeletedDateTime" = now() WHERE "id" = $1 RETURNING "utcDeletedDateTime"`,
      [this.id],
    );
    const utcDeletedDateTime = rows.length ? rows[0].utcDeletedDateTime : undefined;
    this.utcDeletedDateTime = utcDeletedDateTime;
    return { utcDeletedDateTime, user: this };
  }

  // Removes the row outright.
  async adminDelete() {
    await db.query(`DELETE FROM "User" WHERE "id" = $1`, [this.id]);
    this.utcDeletedDateTime = undefined;
    return { user: this };
  }

  pick(properties: string[]): Row {
    return _.pick(this, properties);
  }

  toJSON(): Row {
    return _.omitBy(this, _.isNull);
  }

  static getById(id: number | string) {
    return getOne('"id" = $1', id);
  }

  static getByFacebookId(facebookId: string) {
    return getOne('"facebookId" = $1', facebookId);
  }

  static getByGoogleId(googleId: string) {
    return getOne('"googleId" = $1', googleId);
  }

  static getByAppleId(appleId: string) {
    return getOne('"appleId" = $1', appleId);
  }

  static getByEmail(email: string | undefined) {
    return getOne('"email" = $1', email);
  }

  static getUserByUserName(handle: string) {
    return getOne('"userName" = $1', handle);
  }
}

// Every lookup loads the whole row. An update writes every column from the
// loaded object, so a lookup that left a column out would clear it on the
// next save. Endpoints pick what they send (pickUserProps), so loading more
// exposes nothing.
const USER_COLUMNS = [
  'id', 'userName', 'firstName', 'lastName', 'birthday', 'gender', 'locale', 'facebookId', 'googleId', 'appleId',
  'pictureUrl', 'fbUpdatedTime', 'fbVerified', 'googleVerified', 'about', 'email', 'password',
  'role', 'provider', 'salt', 'websiteUrl', 'defaultFilterSpanPreference', 'themePreference', 'localePreference', 'showCardStockPrices',
  'utcCreatedDateTime', 'utcUpdatedDateTime',
];

// The editable columns, in the order create and update bind them.
const WRITE_COLUMNS = [
  'userName', 'firstName', 'lastName', 'birthday', 'gender', 'locale', 'facebookId', 'googleId', 'appleId',
  'pictureUrl', 'fbUpdatedTime', 'fbVerified', 'googleVerified', 'about', 'email',
  'password', 'provider', 'role', 'salt', 'websiteUrl',
];

function value(v: unknown) {
  return v === undefined ? null : v;
}

// birthday is a `date` (0058), and the empty string a cleared form field
// sends is not one, so an empty birthday is written as a null.
function writeValue(user: User, column: string) {
  return column === 'birthday' ? user[column] || null : value(user[column]);
}

// pg hands a bare `date` back as the server's own local midnight, which in a
// zone ahead of UTC is the day before. Day columns are read as day keys, as
// the pins' dates are (0042).
function selectColumn(column: string) {
  return column === 'birthday' ? `to_char("birthday", 'YYYY-MM-DD') AS "birthday"` : `"${column}"`;
}

async function createUser(user: User) {
  const columns = WRITE_COLUMNS.concat(['defaultFilterSpanPreference', 'themePreference', 'localePreference', 'showCardStockPrices', 'utcCreatedDateTime', 'utcUpdatedDateTime', 'utcDeletedDateTime']);
  const values = WRITE_COLUMNS.map((c) => writeValue(user, c))
    // utcUpdatedDateTime has always been written from utcCreatedDateTime.
    .concat([
      value(user.defaultFilterSpanPreference),
      value(user.themePreference),
      value(user.localePreference),
      // A boolean with a default: never written as null.
      user.showCardStockPrices !== false,
      user.utcCreatedDateTime || new Date(),
      value(user.utcCreatedDateTime),
      value(user.utcDeletedDateTime),
    ]);

  const hasId = user.id != null;
  if (hasId) {
    columns.unshift('id');
    values.unshift(user.id);
  }

  const rows = await db.query(
    `
    INSERT INTO "User" (${columns.map((c) => `"${c}"`).join(', ')})
    VALUES (${values.map((_v, i) => `$${i + 1}`).join(', ')})
    RETURNING "id"`,
    values,
  );
  user.id = rows[0].id;
  // An explicit id (seeding) does not advance the identity sequence.
  if (hasId) {
    await db.query(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), GREATEST((SELECT MAX("id") FROM "User"), 1))`);
  }
  return { user };
}

async function updateUser(user: User) {
  // Written from whatever the object carries, so every caller has to load the
  // row before updating it or a saved preference is cleared.
  const columns = WRITE_COLUMNS.concat('defaultFilterSpanPreference', 'themePreference', 'localePreference', 'showCardStockPrices');
  const values = WRITE_COLUMNS.map((c) => writeValue(user, c)).concat(
    user.defaultFilterSpanPreference || null,
    user.themePreference || null,
    user.localePreference || null,
    user.showCardStockPrices !== false,
    user.id,
  );

  await db.query(
    `
    UPDATE "User"
    SET ${columns.map((c, i) => `"${c}" = $${i + 1}`).join(',\n        ')},
        "utcUpdatedDateTime" = now()
    WHERE "id" = $${values.length}`,
    values,
  );
  return { user };
}

// Resolves { user } for the live (not soft-deleted) row matching where, or
// { user: undefined }. userName and email are citext, so those lookups ignore case.
async function getOne(where: string, param: unknown): Promise<{ user: User | undefined }> {
  const rows = await db.query(
    `
    SELECT ${USER_COLUMNS.map(selectColumn).join(', ')}
    FROM "User"
    WHERE ${where} AND "utcDeletedDateTime" IS NULL`,
    [param],
  );
  return { user: rows.length ? new User(rows[0]) : undefined };
}

export class Users {
  // Every live user, oldest first, trimmed to properties. Still User
  // instances, so nulls drop out of the JSON as they do for one user.
  // When every account was created, deleted ones included, for the admin
  // sign-up statistics.
  static async listCreated(): Promise<{ utcCreatedDateTime: Date; deleted: boolean }[]> {
    return db.query(`
    SELECT "utcCreatedDateTime", "utcDeletedDateTime" IS NOT NULL AS "deleted"
    FROM "User"
    ORDER BY "utcCreatedDateTime"`);
  }

  static async getAll(properties: string[]): Promise<User[]> {
    const rows = await db.query(`
    SELECT ${USER_COLUMNS.map(selectColumn).join(', ')}
    FROM "User"
    WHERE "utcDeletedDateTime" IS NULL
    ORDER BY "id"`);
    return rows.map((row) => new User(new User(row).pick(properties)));
  }
}

// A social login's profile, mapped onto an existing user's empty fields (or a
// new user). handle is the @name picked on the sign-up page before leaving for
// the provider, used only when the user has none yet.
type ProfileMapping = Record<string, string>;

function mapProfile(mapping: ProfileMapping, inUser: User | undefined, profile: unknown, handle?: string) {
  const user = new User(inUser);
  const updatedFields = mapToUserWhenEmpty(mapping, profile, user);

  if (!user.userName && handle && handle.length > 1 && handleValidateReg.test(handle.substring(1))) {
    user.userName = handle;
    updatedFields.push({ userName: handle });
  }
  return { user, updatedFields };
}

// Profiles are normalised to the passport shape ({ id, name: { givenName,
// familyName }, emails: [{ value, verified }], photos: [{ value }], _json }),
// which these paths were written against.
export function facebookMapper(inUser: User | undefined, profile: unknown, handle?: string) {
  return mapProfile(
    {
      facebookId: 'id',
      firstName: 'name.givenName',
      lastName: 'name.familyName',
      locale: '_json.locale',
      pictureUrl: 'photos[0].value',
      fbVerified: '_json.verified',
      email: 'emails[0].value',
      gender: 'gender',
      fbUpdatedTime: '_json.updated_time',
      about: 'about',
    },
    inUser,
    profile,
    handle,
  );
}

// Apple shares less than the others: no picture, no locale, and a name only
// on the very first authorisation.
export function appleMapper(inUser: User | undefined, profile: unknown, handle?: string) {
  return mapProfile(
    {
      appleId: 'id',
      firstName: 'name.givenName',
      lastName: 'name.familyName',
      email: 'emails[0].value',
    },
    inUser,
    profile,
    handle,
  );
}

export function googleMapper(inUser: User | undefined, profile: unknown, handle?: string) {
  return mapProfile(
    {
      googleId: 'id',
      firstName: 'name.givenName',
      lastName: 'name.familyName',
      locale: '_json.locale',
      pictureUrl: 'photos[0].value',
      googleVerified: 'emails[0].verified',
      email: 'emails[0].value',
    },
    inUser,
    profile,
    handle,
  );
}
