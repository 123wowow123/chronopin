import sharp from 'sharp';

function shrinkImageSharp(bufferOrLocalPath, options) {
  return sharp(bufferOrLocalPath)
    .metadata()
    .then(image => {
      // do stuff with the image (if no exception)
      let originalWidth = image.width;
      let originalHeight = image.height;

      return new Promise((resolve, reject) => {
        if (originalWidth <= options.uploadWidth) { // rename to max width?
          let sharpStream = sharp(bufferOrLocalPath, { animated: true });

          if (options && options.type === 'jpeg') {
            sharpStream = sharpStream.jpeg({
              quality: 100,
              chromaSubsampling: '4:4:4'
            })
          } else {
            sharpStream = sharpStream.webp({ effort: 6 })
          }

          sharpStream.toBuffer((err, buffer, info) => {
            if (err) {
              reject(err);
            }
            let output = {
              buffer: buffer,
              width: info.width,
              height: info.height,
              originalWidth: originalWidth,
              originalHeight: originalHeight,
              type: info.format,
              passThrough: true
            };
            return resolve(output);
          });
        } else {
          let sharpStream = sharp(bufferOrLocalPath, { animated: true })
            .resize({ width: options.uploadWidth });

          if (options && options.type === 'jpeg') {
            sharpStream = sharpStream.jpeg({
              quality: 100,
              chromaSubsampling: '4:4:4'
            })
          } else {
            sharpStream = sharpStream.webp({ effort: 6 })
          }

          sharpStream.toBuffer((err, buffer, info) => {
            if (err) {
              reject(err);
            }
            let output = {
              buffer: buffer,
              width: info.width,
              height: info.height,
              originalWidth: originalWidth,
              originalHeight: originalHeight,
              type: info.format
            };
            return resolve(output);
          });
        }
      });
    });
}

export function shrinkFromBuffer(buffer, options) {
  return shrinkImageSharp(buffer, options);
}


export function shrinkFromPath(localPath, options) {
  return shrinkImageSharp(localPath, options);
}