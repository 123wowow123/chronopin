// http://sharp.dimens.io/en/stable/
// import sharp from 'sharp';
import Jimp from 'jimp';

export function shrinkImage(bufferOrLocalPath, options) {
  return Jimp.read(bufferOrLocalPath)
    .then(image => {
      // do stuff with the image (if no exception)
      let originalWidth = image.bitmap.width;
      let originalHeight = image.bitmap.height;

      if (originalWidth <= options.uploadImageWidth) { // rename to max width?
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
        let output;
        image
          .resize(options.uploadImageWidth, Jimp.AUTO)
          .getBuffer(Jimp.AUTO, (err, buffer) => {
            output = {
              buffer: buffer,
              width: image.bitmap.width,
              height: image.bitmap.height,
              originalWidth: originalWidth,
              originalHeight: originalHeight,
              type: image.getMIME()
            };
          });
        return output;
      }
    });

}


export function shrinkFromBuffer(buffer, options) {
  return shrinkImage(buffer, options);
}


export function shrinkFromPath(localPath, options) {
  return shrinkImage(localPath, options);
}