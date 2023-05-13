const rp = require('request-promise');
const _ = require('lodash');
const {
    Pin,
    Medium
} = require('../model');
const config = require('../config/environment');
const mediumID = config.mediumID;

export function _getTwitterPost(pageUrl) {
    const postPromise = _getTwitterAndWrapInMediumSync(pageUrl)
        .then(({ res, medium }) => {
            const newPin = new Pin();
            newPin.addMedium(medium);
            return newPin;
        }).catch(e => {
            console.log(e)
            throw e;
        });
    return postPromise;
}

export function _getTwitterAndWrapInMediumSync(pageUrl) {
    const twitterId = _getTwitterId(pageUrl);
    if (!twitterId) {
        return Promise.reject(twitterId);
    }
    const promise = _getTwitterEmbed(twitterId)
        .then(res => {
            // Wraps youtube to Medium
            const medium = _twitterEmbedToMedium(res);
            return {
                res,
                medium
            };
        });
    return promise;
}

function _twitterEmbedToMedium(res) {
    const medium = new Medium({
        type: mediumID.twitter,
        html: res.html,
        originalUrl: res.url,
        authorName: res.author_name,
        authorUrl: res.author_url
    });
    return medium;
}

function _getTwitterId(pageUrl) {
    const regex = /\/(\d+)$/
    const match = pageUrl.match(regex);
    let twitterId = match && match[1] || null;

    if (!twitterId) {
        // Find digits
        const reg = /^(\d+)$/
        const digitMatch = pageUrl.match(reg);
        twitterId = digitMatch && digitMatch[1] || null;
    }
    return twitterId;
}

function _getTwitterEmbed(twitterId) {
    const uri = `https://publish.twitter.com/oembed?url=https://twitter.com/Interior/status/${twitterId}`;
    const options = {
        method: 'GET',
        uri: uri,
        json: true, // Automatically stringifies the body to JSON
    };
    return rp(options);
};