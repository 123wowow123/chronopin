// http://sharp.dimens.io/en/stable/
// import sharp from 'sharp';
import Jimp from 'jimp';

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


export function shrink(buffer, options) {
  let originalWidth, originalHeight;
  //const image = sharp(buffer);

  return Jimp.read(buffer)
    .then(image => {
      // do stuff with the image (if no exception)
      let originalWidth = image.bitmap.width;
      let originalHeight = image.bitmap.height;

      if (originalWidth <= options.width) { // rename to max width?
        const output = {
          buffer: image.bitmap.data,
          width: originalWidth,
          height: originalHeight,
          originalWidth: originalWidth,
          originalHeight: originalHeight,
          type: image.getMIME()
        };
        return output;

      } else {

        return image
          .resize(options.width, Jimp.AUTO)
          .getBuffer(Jimp.AUTO, (err, buffer) => {
            const output = {
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

}
