const getVideoId = require('get-video-id');
const rp = require('request-promise');
const _ = require('lodash');
const {
    Pin,
    Medium
} = require('../model');
const config = require('../config/environment');
const mediumID = config.mediumID;

export function _getYoutubePost(pageUrl) {
    const postPromise = _getYoutubeAndWrapInMediumSync(pageUrl)
        .then(({ res, medium }) => {
            // Wraps everythig in Pin
            const newPin = new Pin();
            newPin.title = _.get(res, "items[0].snippet.title")
            newPin.description = _.get(res, "items[0].snippet.description")
            newPin.addMedium(medium);
            return newPin;
        })
        .catch(e => {
            console.log(e);
            throw e;
        })
    return postPromise;
}

export function _getYoutubeAndWrapInMediumSync(pageUrl) {
    const { id } = getVideoId(pageUrl);
    const promise = _getYoutubeEmbed(id)
        .then(res => {
            // Wraps youtube to Medium
            const medium = _youtubeEmbedToMedium(res);
            return {
                res,
                medium
            };
        });
    return promise;
}

function _youtubeEmbedToMedium(res) {
    const iframeSrcRegex = /(?<=src=").*?(?=[\?"])/
    const html = _.get(res, "items[0].player.embedHtml")
    const originalUrl = html.match(iframeSrcRegex)[0];
    // const replacedHtml  = html.replace(originalUrl, originalUrl + "?start=225")
    const medium = new Medium({
        type: mediumID.youtube,
        html: html,
        originalUrl: originalUrl
    });
    return medium
}

function _getYoutubeEmbed(youtubeId) {
    const YOUTUBE_API_KEY = config.youtube.YOUTUBE_API_KEY;
    const uri = `https://www.googleapis.com/youtube/v3/videos?part=player,snippet&id=${youtubeId}&maxResults=1&key=${YOUTUBE_API_KEY}`;
    const options = {
        method: 'GET',
        uri: uri,
        json: true, // Automatically stringifies the body to JSON
    };

    return rp(options);
}