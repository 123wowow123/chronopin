'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.shrink = shrink;

var _jimp = require('jimp');

var _jimp2 = _interopRequireDefault(_jimp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Faster but needs 64 bit node running on Azure
// export function shrink(buffer, options) {
//
//   let originalWidth, originalHeight;
//   const image = sharp(buffer);
//
//   return image
//     .metadata()
//     .then(metadata => {
//       originalWidth = metadata.width;
//       originalHeight = metadata.height;
//
//       return image
//         .resize(options.width)
//         .max()
//         .toBuffer({
//           resolveWithObject: true
//         });
//     })
//     .then(obj => {
//       const output = {
//         buffer: obj.data,
//         width: obj.info.width,
//         height: obj.info.height,
//         originalWidth: originalWidth,
//         originalHeight: originalHeight,
//         extention: "." + obj.info.format
//       };
//
//       return output;
//     });
//
// }


function shrink(buffer, options) {
  var originalWidth = void 0,
      originalHeight = void 0;
  //const image = sharp(buffer);

  return _jimp2.default.read(buffer).then(function (image) {
    // do stuff with the image (if no exception)
    var originalWidth = image.bitmap.width;
    var originalHeight = image.bitmap.height;

    if (originalWidth <= options.width) {
      // rename to max width?
      var output = {
        buffer: image.bitmap.data,
        width: originalWidth,
        height: originalHeight,
        originalWidth: originalWidth,
        originalHeight: originalHeight,
        type: image.getMIME()
      };
      return output;
    } else {

      return image.resize(options.width, _jimp2.default.AUTO).getBuffer(_jimp2.default.AUTO, function (err, buffer) {
        var output = {
          buffer: buffer,
          width: image.bitmap.width,
          height: image.bitmap.height,
          originalWidth: originalWidth,
          originalHeight: originalHeight,
          type: image.getMIME()
        };
        return output;
      });
    }
  });
} // http://sharp.dimens.io/en/stable/
// import sharp from 'sharp';
//# sourceMappingURL=index.js.map
