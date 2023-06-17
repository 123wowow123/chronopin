const fs = require('fs');
import * as _ from 'lodash';
import config from '../../config/environment';
import * as response from '../response';
import fetch from 'node-fetch';
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

function _formatJSON(url, metas) {
    function findInArray(array, name) {
        return array.find(t => {
            return t.property === name || t.name === name || t.rel === name;
        });
    }
    const linkFound = findInArray(metas, 'canonical');
    const link = (linkFound && linkFound.content) || url

    const titleFound = findInArray(metas, 'title') || findInArray(metas, 'og:title');
    const title = titleFound && titleFound.content

    const descriptionFound = findInArray(metas, 'description') || findInArray(metas, 'og:description');
    const description = descriptionFound && descriptionFound.content

    const imageUrlFound = findInArray(metas, 'og:image');
    const imageUrl = imageUrlFound && imageUrlFound.content

    return {
        "success": 1,
        "link": link,
        "meta": {
            "title": title,
            "description": description,
            "image": {
                "url": imageUrl
            }
        }
    }
}

function _fetchMeta(url) {
    function getAllMetas(document) {
        var metas = document.getElementsByTagName('meta');
        var summary = [];
        Array.from(metas)
            .forEach((meta) => {
                var tempsum = {};
                var attributes = meta.getAttributeNames();
                attributes.forEach(function (attribute) {
                    tempsum[attribute] = meta.getAttribute(attribute);
                });
                summary.push(tempsum);
            });
        return summary;
    }

    const promise = new Promise((resolve, reject) => {
        fetch(url)
            .then(response => {
                return response.text();
            })
            .then(body => {
                const dom = new JSDOM(body);
                const jsonRes = getAllMetas(dom.window.document);
                resolve(jsonRes);
            }).catch(err => {
                reject(err);
            });
    });

    return promise;
}

export function fetchUrl(req, res) {
    const url = _.get(req, 'query.url')
    if (!url) {
        return response.handleError(res)("missing url");
    }

    const meta = _fetchMeta(url);
    return meta
        .then(_formatJSON.bind(undefined, url))
        .then(response.withResult(res))
        .catch(response.handleError(res));
}


