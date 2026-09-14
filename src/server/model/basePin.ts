import _ from 'lodash';
import type { Row } from '../db';
import Medium from './medium';
import Merchant from './merchant';
import User from './user';

export const BasePinProp = [
  'id',
  'parentId',
  'rootThread',
  'title',
  'description',
  'sourceUrl',
  'longFormSummary',
  'address',
  'latitude',
  'longitude',
  'priceLowerBound',
  'priceUpperBound',
  'price',
  'priceCurrency',
  'tip',
  'dateConfidence',
  'dateConfidenceReasoning',
  'companyId',
  'company',
  'companyWikiUrl',
  'companyLogoUrl',
  'category',
  'utcStartDateTime',
  'utcEndDateTime',
  'allDay',
  'utcCreatedDateTime',
  'utcUpdatedDateTime',
  'utcDeletedDateTime',
];

// What a pin may say about its author.
const PUBLIC_USER_PROPS = ['id', 'userName', 'pictureUrl'];

// The model classes copy whatever columns they are given, so their instances
// are open records. Fields are `declare`d, never initialised: a class field
// would become an own property and hide the accessors defined on the
// prototype below (userId), which are part of the JSON a pin serialises to.
export default class BasePin {
  [key: string]: any;
  declare _prop: string[];
  declare id: number;
  declare title: string;
  declare user?: User;
  declare userId: number | null;
  declare media: Medium[];
  declare merchants: Merchant[];

  constructor(pin?: Row | null, user?: User | null, prop?: string[]) {
    this._prop = prop || BasePinProp;
    if (pin) {
      this.set(pin, user);
    }
  }

  set(pin: Row, user?: User | null): this {
    if (!pin) {
      throw new Error('Pin cannot set value of arg');
    }
    this._prop.forEach((key) => {
      this[key] = pin[key];
    });

    if (user && user instanceof User) {
      this.user = user;
    } else if (pin.user && pin.user instanceof User) {
      this.user = pin.user;
    } else if (Number.isInteger(pin.userId)) {
      this.userId = pin.userId;
      this.user!.userName = BasePin.getPinUserName(pin)!;
      this.user!.pictureUrl = pin['User.pictureUrl'] || undefined;
    }

    this.media = _.get(pin, 'media', []).map((m: Row) => new Medium(m, this));
    this.merchants = _.get(pin, 'merchants', []).map((m: Row) => new Merchant(m, this));
    return this;
  }

  save(): Promise<unknown> {
    throw new Error('Not Implemented');
  }

  update(): Promise<unknown> {
    throw new Error('Not Implemented');
  }

  delete(): Promise<unknown> {
    throw new Error('Not Implemented');
  }

  setUser(user: User): this {
    if (!(user instanceof User)) {
      throw new Error('user not instance of User');
    }
    this.user = user;
    return this;
  }

  findMediumByOriginalUrl(originalUrl: string) {
    return (this.media || []).find((m) => m.originalUrl === originalUrl);
  }

  addMedium(medium: Medium): this {
    if (!(medium instanceof Medium)) {
      throw new Error('medium not instance of Medium');
    }
    medium.setPin(this);
    if (!this.media) {
      this.media = [];
    }
    this.media.push(medium);
    return this;
  }

  unshiftMedium(medium: Medium): this {
    if (!(medium instanceof Medium)) {
      throw new Error('medium not instance of Medium');
    }
    medium.setPin(this);
    if (!this.media) {
      this.media = [];
    }
    this.media.unshift(medium);
    return this;
  }

  addMedia(media: Row[] | undefined): this {
    (media || []).forEach((m) => {
      this.addMedium(new Medium(m));
    });
    return this;
  }

  addMerchants(merchants: Row[] | undefined): this {
    (merchants || []).forEach((m) => {
      this.addMerchant(new Merchant(m));
    });
    return this;
  }

  addMerchant(merchant: Merchant): this {
    if (!(merchant instanceof Merchant)) {
      throw new Error('merchant not instance of Merchant');
    }
    merchant.setPin(this);
    if (!this.merchants) {
      this.merchants = [];
    }
    this.merchants.push(merchant);
    return this;
  }

  toJSON(): Row {
    // Own and inherited enumerable properties, leaving out private ones,
    // nulls and empty arrays.
    const json: Row = _.omitBy(
      this,
      (value, key) => key.startsWith('_') || _.isNull(value) || (Array.isArray(value) && !value.length),
    );
    // Only the author's public fields. Creating a pin sets the signed-in user
    // (the whole row) as its user, and the pin is then sent back in the
    // response and broadcast to every connected browser - which used to
    // include the author's password hash, salt and email.
    if (json.user) {
      json.user = _.omitBy(_.pick(json.user, PUBLIC_USER_PROPS), _.isNil);
    }
    return json;
  }

  static getPinUserName(pinRow: Row): string | undefined {
    return pinRow['User.userName'] || undefined;
  }
}

Object.defineProperty(BasePin.prototype, 'userId', {
  get(this: BasePin) {
    return _.get(this, 'user.id', null);
  },
  set(this: BasePin, id: number) {
    if (this.user && this.user instanceof User) {
      this.user.id = id;
    } else {
      this.user = new User({ id });
    }
  },
  enumerable: true,
  configurable: false,
});
