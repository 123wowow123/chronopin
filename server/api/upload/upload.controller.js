const fs = require('fs');
import config from '../../config/environment';
import * as response from '../response';
import {
    Medium
} from '../../model';

function _formatJSON(medium) {
    return {
        "success": 1,
        "file": {
            "url": config.thumbUrlPrefix + medium.thumbName,
            "attributes": {
                "width": medium.thumbWidth,
                "height": medium.thumbHeight
            }
            // ... and any additional fields you want to store, such as width, height, color, extension, etc
        }
    }
}

export function uploadFile(req, res) {
    const filePath = req.file.path;
    if (!filePath) {
        return response.handleError(res)("missing file path");
    }

    // save original large image ?
    return Medium.createAndSaveToCDNFromLocalPath(filePath)
        .then((data) => {
            // cleanup temp file
            if (fs.existsSync(filePath)) {
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.log(err);
                    }
                    console.log('deleted temp', filePath);
                });
            }
            return data;
        })
        .then(_formatJSON)
        .then(response.withResult(res))
        .catch(response.handleError(res));
}

export function fetchUrl(req, res) {
    const imageUrl = req.body.url;
    if (!imageUrl) {
        return response.handleError(res)("missing url");
    }
    return Medium.createAndSaveToCDN(imageUrl)
        .then(_formatJSON)
        .then(response.withResult(res))
        .catch(response.handleError(res));
}


