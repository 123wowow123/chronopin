'use strict';

import * as response from '../response';

import {
  Pin,
  Comment,
  Comments
} from '../../model';

// Root comments are depth 0 (not a reply); a reply to a root is depth 1,
// a reply to that is depth 2 - three total levels (root + 2 reply levels).
// A reply that would land at depth 3 is rejected.
const MaxReplyDepth = 2;

function _commentDepth(comment) {
  if (!comment.parentCommentId) {
    return Promise.resolve(0);
  }
  return Comment.queryById(comment.parentCommentId)
    .then(({
      comment: parent
    }) => {
      if (!parent) {
        return 0;
      }
      return _commentDepth(parent)
        .then(depth => depth + 1);
    });
}

export function getPinComments(req, res) {
  let pinId = +req.params.id;

  return Comments.getByPinId(pinId)
    .then(({
      comments
    }) => {
      return comments.comments;
    })
    .then(response.withResult(res))
    .catch(response.handleError(res));
}

function _createComment(pinId, user, text, parentCommentId) {
  let newComment = new Comment({
    text: text,
    parentCommentId: parentCommentId || null
  }, user, new Pin({
    id: pinId
  }));

  return newComment.save()
    .then(({
      comment
    }) => {
      return comment;
    });
}

export function createPinComment(req, res) {
  let user = req.user,
    pinId = +req.params.id,
    text = typeof req.body.text === 'string' ? req.body.text.trim() : '',
    parentCommentId = req.body.parentCommentId ? +req.body.parentCommentId : null;

  if (!text) {
    return response.handleError(res, 400)('Comment text is required');
  }

  if (!parentCommentId) {
    return _createComment(pinId, user, text)
      .then(response.withResult(res, 201))
      .catch(response.handleError(res));
  }

  return Comment.queryById(parentCommentId)
    .then(({
      comment: parentComment
    }) => {
      if (!parentComment || +parentComment.pinId !== pinId) {
        return response.handleError(res, 404)('Parent comment not found');
      }
      return _commentDepth(parentComment)
        .then(parentDepth => {
          if (parentDepth + 1 > MaxReplyDepth) {
            return response.handleError(res, 400)('Maximum reply depth reached');
          }
          return _createComment(pinId, user, text, parentCommentId)
            .then(response.withResult(res, 201));
        });
    })
    .catch(response.handleError(res));
}

// Only the comment's own author can edit it, and only within the SP's edit
// window (currently 5 minutes from creation) - enforced in UpdateComment
// itself, since the window has to hold even if this check races a save.
export function updatePinComment(req, res) {
  let user = req.user,
    pinId = +req.params.id,
    commentId = +req.params.commentId,
    text = typeof req.body.text === 'string' ? req.body.text.trim() : '';

  if (!text) {
    return response.handleError(res, 400)('Comment text is required');
  }

  return Comment.queryById(commentId)
    .then(({
      comment
    }) => {
      if (!comment || +comment.pinId !== pinId) {
        return response.handleError(res, 404)('Comment not found');
      }
      if (+comment.userId !== +user.id) {
        return response.handleError(res, 403)('Forbidden');
      }

      comment.text = text;

      return comment.update()
        .then(({
          comment,
          updated
        }) => {
          if (!updated) {
            return response.handleError(res, 403)('Comment can no longer be edited');
          }
          return response.withResult(res)(comment);
        });
    })
    .catch(response.handleError(res));
}

// mark as removed only, and only when the requesting user owns the comment
export function removePinComment(req, res) {
  let user = req.user,
    pinId = +req.params.id,
    commentId = +req.params.commentId;

  return Comment.queryById(commentId)
    .then(({
      comment
    }) => {
      if (!comment || +comment.pinId !== pinId) {
        return response.handleError(res, 404)('Comment not found');
      }
      if (+comment.userId !== +user.id) {
        return response.handleError(res, 403)('Forbidden');
      }
      return comment.delete()
        .then(response.withNoResult(res));
    })
    .catch(response.handleError(res));
}
