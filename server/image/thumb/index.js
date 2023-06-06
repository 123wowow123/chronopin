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
          sharp(bufferOrLocalPath, { animated: true })
            .webp({ effort: 6 })
            .toBuffer((err, buffer, info) => {
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
          sharp(bufferOrLocalPath, { animated: true })
            .resize({ width: options.uploadWidth })
            .webp({ effort: 6 })
            .toBuffer((err, buffer, info) => {
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