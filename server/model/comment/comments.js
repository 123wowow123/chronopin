'use strict';

import * as db from '../../db';

import {
  Comment
} from '..';

export default class Comments {
  // Properties
  // this.comments

  constructor(comments) {
    if (comments) {
      this.set(comments);
    }
  }

  set(comments) {
    if (Array.isArray(comments)) {
      this.setComments(comments);
    } else {
      throw "Comments cannot set value of arg";
    }
    return this;
  }

  setComments(comments) {
    if (Array.isArray(comments)) {
      this.comments = comments.map(c => {
        return new Comment(c);
      });
    } else {
      throw "arg is not an array";
    }
    return this;
  }

  // Re-inserts each comment with its original id preserved (Comment.save
  // keeps an id it is given), so parentCommentId
  // chains still resolve correctly afterward with no remapping needed.
  // Sequential like BasePins.save(), so a parent always lands before a
  // reply that references it.
  save() {
    return (this.comments || [])
      .reduce((prev, c) => prev.then(() => c.save()), Promise.resolve());
  }

  static getByPinId(pinId) {
    return _getByPinId(pinId);
  }

  static getAll() {
    return _getAll();
  }
}

// Every live comment, oldest first, so a parent always comes before its
// replies: seeding can walk this list once.
function _getAll() {
  return db.query(`
    SELECT "id", "text", "userId", "pinId", "parentCommentId", "utcCreatedDateTime", "utcUpdatedDateTime"
    FROM "Comment"
    WHERE "utcDeletedDateTime" IS NULL
    ORDER BY "utcCreatedDateTime" ASC, "id" ASC`)
    .then(rows => {
      return {
        comments: new Comments(rows)
      };
    })
    .catch(err => {
      console.log("Comments getAll err", err);
      throw err;
    });
}

function _getByPinId(pinId) {
  return db.query(`
    SELECT "Comment"."id", "Comment"."text", "Comment"."userId", "Comment"."pinId",
           "Comment"."parentCommentId", "Comment"."utcCreatedDateTime", "Comment"."utcUpdatedDateTime",
           "User"."userName" AS "User.userName"
    FROM "Comment"
      LEFT JOIN "User" ON "Comment"."userId" = "User"."id"
    WHERE "Comment"."pinId" = $1 AND "Comment"."utcDeletedDateTime" IS NULL
    ORDER BY "Comment"."utcCreatedDateTime" ASC, "Comment"."id" ASC`, [pinId])
    .then(rows => {
      return {
        comments: new Comments(rows)
      };
    })
    .catch(err => {
      console.log("Comments getByPinId err", err);
      throw err;
    });
}
