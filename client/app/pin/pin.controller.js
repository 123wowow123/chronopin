/*jshint unused:false*/
'use strict';

(function () {

  let PinsQuery;

  // Has to match the window UpdateComment enforces server-side - the button
  // hiding client-side is just UX, the real cutoff is in the SP.
  const CommentEditWindowMs = 5 * 60 * 1000;

  // Has to match MaxReplyDepth in pin.comment.controller.js. Root comments
  // are depth 0 (not a reply); this allows 2 levels of reply below that -
  // 3 total levels.
  const MaxReplyDepth = 2;

  class PinController {

    constructor($scope, $stateParams, $interval, socket, pinWebService, searchService, Auth, appConfig, modelInjector, $log) {
      this.$interval = $interval;
      PinsQuery = PinsQuery || modelInjector.getPinsQuery();
      this.pinWebService = pinWebService;
      this.$stateParams = $stateParams;
      this.appConfig = appConfig;
      this.searchService = searchService;

      this.Auth = Auth;
      this.isAdmin = Auth.isAdmin; //bind function so each digest loop it get re-evaluated to determin latest state
      this.searching = false;
      this.pinReady = false;
      //this.pinApp = pinApp;
      this.pinsQuery = new PinsQuery(); ///////

      this.pin;
      this.currentUser = {};
      this.newCommentText = '';
      this.commentError = '';
      this.now = Date.now();
    }

    $onInit() {
      let id = +this.$stateParams.id;

      // Ticks the edit-window check so the Edit button disappears on its own
      // once 5 minutes pass, even if nothing else triggers a digest.
      this.nowTicker = this.$interval(() => {
        this.now = Date.now();
      }, 15000);

      this.Auth.getCurrentUser()
        .then(user => {
          this.currentUser = user;
        });

      this.pinWebService.get(id)
        .then(res => {
          this.pin = res.data;
          this.pinReady = true;
          return res;
        })
        .then(res => {
          this.loadComments(id);
          return res;
        })
        .then(res => {

          this.searching = true;
          this.pinWebService.search({
            q: res.data.title
          })
            .then(res => {
              let pins = res.data.pins;

              pins = pins.filter(pin => {
                return pin.id !== id
              });
              //debugger; // cannot remove need refactor
              let bagsCreated = this.pinsQuery.mergePins(pins);

              this.searching = false;
            })
            .catch(err => {
              this.searching = false;
              throw err;
            });
        });
    }

    $onDestroy() {
      if (this.nowTicker) {
        this.$interval.cancel(this.nowTicker);
      }
    }

    addLike(pin) {
      let id = pin.id;
      if (id) {
        pin.hasLike = true;
        return this.pinWebService.like(id)
          .then(res => {
            pin.likeCount = res.data.likeCount;
          })
          .catch(err => {
            pin.hasLike = false;
          });
      }
    }

    removeLike(pin) {
      let id = pin.id;
      if (id) {
        pin.hasLike = false;
        return this.pinWebService.unlike(id)
          .then(res => {
            pin.likeCount = res.data.likeCount;
          })
          .catch(err => {
            pin.hasLike = false;
          });
      }
    }

    addFavorite(pin) {
      let id = pin.id;
      if (id) {
        pin.hasFavorite = true;
        return this.pinWebService.favorite(id)
          .then(res => {
            pin.favoriteCount = res.data.favoriteCount; //need to get value from server due to concurrency issue
          })
          .catch(err => {
            pin.hasFavorite = false;
          });
      }
    }

    removeFavorite(pin) {
      let id = pin.id;
      if (id) {
        pin.hasFavorite = false;
        return this.pinWebService.unfavorite(id)
          .then(res => {
            pin.favoriteCount = res.data.favoriteCount; //need to get value from server due to concurrency issue
          })
          .catch(err => {
            pin.hasFavorite = false;
          });
      }
    }

    // Whether there is something in .grid__media for the company to overlay.
    // An image pin whose thumbnail is absent or failed to load (imageMissing,
    // set by pin-parallax) leaves that box 0px tall, and the overlay then
    // floats up over the posted line - so those count as image-less.
    hasImage() {
      let media = this.pin && this.pin.media && this.pin.media[0];
      if (!media) {
        return false;
      }
      if (String(media.type) === '1') {
        return !!media.thumbName && !this.imageMissing;
      }
      return true;
    }

    loadComments(pinId) {
      return this.pinWebService.getComments(pinId)
        .then(res => {
          this.pin.comments = this.buildCommentTree(res.data);
        });
    }

    // Nests replies to any depth the data actually has - depth itself is
    // capped server-side (see MaxReplyDepth in pin.comment.controller.js),
    // this just mirrors whatever chain of parentCommentIds comes back.
    buildCommentTree(comments) {
      let byId = {},
        roots = [];

      (comments || []).forEach(c => {
        c.replies = [];
        byId[c.id] = c;
      });

      (comments || []).forEach(c => {
        let parent = c.parentCommentId && byId[c.parentCommentId];
        if (parent) {
          parent.replies.push(c);
        } else {
          roots.push(c);
        }
      });

      this.setCommentDepths(roots, 0);
      return roots;
    }

    setCommentDepths(comments, depth) {
      (comments || []).forEach(c => {
        c.$depth = depth;
        this.setCommentDepths(c.replies, depth + 1);
      });
    }

    addComment(pin) {
      let text = (this.newCommentText || '').trim();
      this.commentError = '';
      if (!text) {
        return;
      }
      return this.pinWebService.addComment(pin.id, {
        text: text
      })
        .then(res => {
          let comment = res.data;
          comment.replies = [];
          comment.$depth = 0;
          pin.comments = pin.comments || [];
          pin.comments.push(comment);
          this.newCommentText = '';
        })
        .catch(err => {
          this.commentError = 'There was a problem posting your comment.';
        });
    }

    canReply(comment) {
      return this.Auth.isLoggedIn() && (comment.$depth || 0) < MaxReplyDepth;
    }

    startReply(comment) {
      comment.$replyText = '';
      comment.$replying = true;
    }

    cancelReply(comment) {
      comment.$replying = false;
      delete comment.$replyText;
    }

    submitReply(pin, comment) {
      let text = (comment.$replyText || '').trim();
      this.commentError = '';
      if (!text) {
        return;
      }
      return this.pinWebService.addComment(pin.id, {
        text: text,
        parentCommentId: comment.id
      })
        .then(res => {
          let reply = res.data;
          reply.replies = [];
          reply.$depth = (comment.$depth || 0) + 1;
          comment.replies = comment.replies || [];
          comment.replies.push(reply);
          comment.$replying = false;
          delete comment.$replyText;
        })
        .catch(err => {
          this.commentError = 'There was a problem posting your reply.';
        });
    }

    // parentComment is only passed when removing a reply, so the reply can
    // be spliced out of its parent's `replies` array instead of pin.comments.
    removeComment(pin, comment, parentComment) {
      return this.pinWebService.removeComment(pin.id, comment.id)
        .then(() => {
          let list = parentComment ? parentComment.replies : pin.comments;
          let filtered = (list || []).filter(c => {
            return c.id !== comment.id;
          });
          if (parentComment) {
            parentComment.replies = filtered;
          } else {
            pin.comments = filtered;
          }
        });
    }

    canRemoveComment(comment) {
      return !!(this.currentUser && this.currentUser.id && comment.userId === this.currentUser.id);
    }

    canEditComment(comment) {
      if (!this.canRemoveComment(comment)) {
        return false;
      }
      let createdAt = new Date(comment.utcCreatedDateTime).getTime();
      return (this.now - createdAt) < CommentEditWindowMs;
    }

    startEditComment(comment) {
      comment.$editText = comment.text;
      comment.$editing = true;
    }

    cancelEditComment(comment) {
      comment.$editing = false;
      delete comment.$editText;
    }

    saveEditComment(pin, comment) {
      let text = (comment.$editText || '').trim();
      if (!text) {
        return;
      }
      return this.pinWebService.updateComment(pin.id, comment.id, {
        text: text
      })
        .then(res => {
          comment.text = res.data.text;
          comment.utcUpdatedDateTime = res.data.utcUpdatedDateTime;
          comment.$editing = false;
          delete comment.$editText;
        })
        .catch(err => {
          this.commentError = 'This comment can no longer be edited.';
        });
    }

  }

  angular.module('chronopinNodeApp')
    .component('pin', {
      templateUrl: 'app/pin/pin.html',
      controller: PinController
    });
})();
