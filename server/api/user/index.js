'use strict';

import {Router} from 'express';
import * as controller from './user.controller';
import * as followController from './user.follow.controller';
import * as auth from '../../auth/auth.service';
import multer from 'multer';

const router = new Router();

// Profile pictures are cropped and re-encoded before storage, so the upload
// only needs to live in memory for the length of the request.
const pictureUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype))
});

function uploadPicture(req, res, next) {
  pictureUpload.single('picture')(req, res, err => {
    if (err) {
      return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
        message: err.code === 'LIMIT_FILE_SIZE' ? 'Pictures can be up to 5 MB' : err.message
      });
    }
    next();
  });
}

router.get('/', auth.hasRole('admin'), controller.index);
router.delete('/:id', auth.hasRole('admin'), controller.destroy);
router.get('/me', auth.isAuthenticated(), controller.me);
router.post('/handle/check', controller.checkHandle);
router.put('/:id/password', auth.isAuthenticated(), controller.changePassword);
router.put('/:id/preferences', auth.isAuthenticated(), controller.savePreferences);
router.patch('/me', auth.isAuthenticated(), controller.patch);
router.put('/me/picture', auth.isAuthenticated(), uploadPicture, controller.uploadPicture);
router.delete('/me/picture', auth.isAuthenticated(), controller.removePicture);
router.get('/:id/follow', auth.tryGetUser(), followController.followStatus);
router.get('/:id/following', auth.isAuthenticated(), followController.listFollowing);
router.post('/:id/follow', auth.isAuthenticated(), followController.follow);
router.delete('/:id/follow', auth.isAuthenticated(), followController.unfollow);
router.get('/:id', auth.isAuthenticated(), controller.show);
router.post('/', controller.create);

module.exports = router;
