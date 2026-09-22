import _ from 'lodash';
import type { Row } from '../db';
import Medium from './medium';
import Merchant from './merchant';
import PinRating from './pinRating';
import PinReference from './pinReference';
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
  'categories',
  'utcStartDateTime',
  'utcEndDateTime',
  'sourceStartDateTime',
  'sourceEndDateTime',
  'originalStartDate',
  'delayReasoning',
  'episodeCount',
  'episodeStatus',
  'marketVolume',
  'allDay',
  'allDayStated',
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
  declare references: PinReference[];
  declare ratings: PinRating[];

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
    } else if (Number.isInteger(pin.user?.id)) {
      // A pin read back from its JSON (the seed backup): the author is only
      // its public fields, and userId is not written out. POST and PUT set
      // the author themselves after this, so a body cannot choose one.
      this.user = new User(_.pick(pin.user, PUBLIC_USER_PROPS));
    }

    this.media = _.get(pin, 'media', []).map((m: Row) => new Medium(m, this));
    this.merchants = _.get(pin, 'merchants', []).map((m: Row) => new Merchant(m, this));
    this.references = (pin.references || []).map((r: Row) => new PinReference(r, this));
    this.ratings = (pin.ratings || []).map((rt: Row) => new PinRating(rt, this));
    // Read-only, from the view: tickers are saved through their own tables.
    this.stocks = Array.isArray(pin.stocks) ? pin.stocks : [];
    // Also read-only, from the view (PinAward, kept by services/pinAwards.ts).
    this.awards = Array.isArray(pin.awards) ? pin.awards : [];
    // Also read-only, from the view (PinTagView): saved by the routes and
    // model/pinTag.ts, never by the pin row's own update.
    this.tags = Array.isArray(pin.tags) ? pin.tags : [];
    // Also read-only, from the view (PinFlightPath, src/server/services/pinFlightPath.ts).
    this.flightPath = pin.flightPath && Array.isArray(pin.flightPath.points) ? pin.flightPath : null;
    // Also read-only, from the view (PinPlace, 0059): where the pin's place is
    // on Google and Yelp. Handles only - the scores are fetched on view, never
    // stored - and, like the ratings, an edit cannot wipe them.
    this.place =
      pin.place && (pin.place.googlePlaceId || pin.place.yelpBusinessId || pin.place.reservationUrl) ? pin.place : null;
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

  addReference(reference: PinReference): this {
    reference.setPin(this);
    if (!this.references) {
      this.references = [];
    }
    this.references.push(reference);
    return this;
  }

  addRating(rating: PinRating): this {
    rating.setPin(this);
    if (!this.ratings) {
      this.ratings = [];
    }
    this.ratings.push(rating);
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
