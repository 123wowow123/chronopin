'use strict';

import * as mssql from 'mssql';
import * as cp from '../../sqlConnectionPool';
import * as _ from 'lodash';
import { extractQueryTags, extractTagsHtml } from '../pin/shared/helper'
import {
  BasePin
} from '..';

// _pin
const prop = [
  'id',
  'pinId',
  'tag'
];

export default class Mention {
  constructor(mention, pin) {

    if (mention) {
      this.set(mention, pin);
    }
  }

  set(mention, pin) {
    if (mention) {
      for (let i = 0; i < prop.length; i++) {
        this[prop[i]] = mention[prop[i]];
      }

      if (pin instanceof BasePin) {
        this._pin = pin;
      }
      else if (mention._pin && mention._pin instanceof BasePin) {
        this._pin = mention._pin;
      }
      else if (Number.isInteger(mention.pinId)) {
        this.pinId = mention.pinId;
      }

    } else {
      throw "mention cannot set value of arg";
    }

    return this;
  }

  save() {
    return _createPinMentionLinkMSSQL(this, this.pinId)
      .then(newMention => {
        return this.set(newMention);
      });
  }

  deleteByPinId() {
    return _deleteByPinIdMSSQL(this.pinId);
  }

  setPin(pin) {
    this._pin = pin;
    return this;
  }

  toJSON() {
    // omits own and inherited properties with null values
    return _.omitBy(this, (value, key) => {
      return key.startsWith('_')
        || _.isNull(value);
    });
  }

  static deleteByPinId(pinId) {
    return new Mention({
      pinId: pinId
    }).deleteByPinId();
  }

  static scrapeMentionQuery(text) {
    const tagObj = extractQueryTags(text);
    return tagObj;
  }

  static scrapeAllMentionQuery(text) {
    const tagObj = Mention.scrapeMentionQuery(text);
    return tagObj.allTags;
  }

  static scrapeMentionHtml(text) {
    const tagObj = extractTagsHtml(text);
    return tagObj;
  }

  static scrapeAllMentionHtml(text) {
    const tagObj = Mention.scrapeMentionHtml(text);
    return tagObj.allTags;
  }

}

const MentionPrototype = Mention.prototype;

Object.defineProperty(MentionPrototype, '_pin', {
  enumerable: false,
  configurable: false,
  writable: true
});

Object.defineProperty(MentionPrototype, 'pinId', {
  get: function () {
    return this._pin && this._pin.id;
  },
  set: function (id) {
    if (this._pin) {
      this._pin.id = id;
    } else {
      this._pin = new BasePin({
        id: id
      });
    }
  },
  enumerable: true,
  configurable: false
});

function _createPinMentionLinkMSSQL(mention, pinId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise((resolve, reject) => {
        const StoredProcedureName = 'CreatePinMentionLink';
        let request = new mssql.Request(conn)
          .input('pinId', mssql.Int, pinId)
          .input('tag', mssql.NVarChar(1028), mention.tag)

          .output('id', mssql.Int);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            let queryCount, id;
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            try {
              id = res.output.id;
            } catch (e) {
              id = 0;
            }
            mention.id = id;
            resolve(mention);
          });
      });
    });
}

function _deleteByPinIdMSSQL(pinId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'DeletePinMentionByPinId';
        let request = new mssql.Request(conn)
          .input('pinId', mssql.Int, pinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            return resolve({
              pinId
            });
          });
      });
    });
}
