'use strict';

import config from '../config/environment';
import _ from 'lodash';
const rp = require('request-promise');

const commentUri = `https://comment.chronopin.com`

function respondWithResult(res) {
    return function (proxyRes) {
        res.status(proxyRes.statusCode).json(proxyRes.body);
    };
}

function handleError(res) {
    return function (err) {
        const statusCode = err.statusCode || 500;
        res.status(statusCode).send(err.error);
    };
}

/**
 * Get list of comments
 */
export function index(req, res) {
    const uri = commentUri + req.url;
    const options = {
        method: 'GET',
        uri: uri,
        json: true, // Automatically stringifies the body to JSON
        resolveWithFullResponse: true
    };

    return rp(options)
        .then(respondWithResult(res))
        .catch(handleError(res));
}

/**
 * Creates a new comment
 */
export function create(req, res, next) {
    let user = _.get(req, 'user');
    let body = _.get(req, 'body');
    const uri = commentUri + req.url;
    const options = {
        method: 'POST',
        uri: uri,
        json: true, // Automatically stringifies the body to JSON
        body: Object.assign(body, {
            email: user.email,
            author: user.userName
        }),
        resolveWithFullResponse: true
    };

    return rp(options)
        .then(respondWithResult(res))
        .catch(handleError(res));
}

/**
 * Deletes a comment
 */
export function destroy(req, res) {
    let user = _.get(req, 'user');
    // let id = req.params.id;
    const uri = commentUri + req.url;
    const options = {
        method: 'DELETE',
        uri: uri,
        json: true, // Automatically stringifies the body to JSON
        resolveWithFullResponse: true
    };

    return rp(options)
        .then(respondWithResult(res))
        .catch(handleError(res));
}

/**
 * Get config
 */
export function getConfig(req, res, next) {
    const uri = commentUri + req.url;
    const options = {
        method: 'GET',
        uri: uri,
        json: true, // Automatically stringifies the body to JSON
        resolveWithFullResponse: true
    };

    return rp(options)
        .then(respondWithResult(res))
        .catch(handleError(res));
}

/**
 * Get count
 */
export function count(req, res, next) {
    let body = _.get(req, 'body');
    const uri = commentUri + req.url;
    const options = {
        method: 'POST',
        uri: uri,
        json: true, // Automatically stringifies the body to JSON
        body: body,
        resolveWithFullResponse: true
    };

    return rp(options)
        .then(respondWithResult(res))
        .catch(handleError(res));
}

export function like(req, res, next) {
    let body = _.get(req, 'body');
    const uri = commentUri + req.url;
    const options = {
        method: 'POST',
        uri: uri,
        json: true, // Automatically stringifies the body to JSON
        body: body,
        resolveWithFullResponse: true
    };

    return rp(options)
        .then(respondWithResult(res))
        .catch(handleError(res));
}

export function dislike(req, res, next) {
    let body = _.get(req, 'body');
    const uri = commentUri + req.url;
    const options = {
        method: 'POST',
        uri: uri,
        json: true, // Automatically stringifies the body to JSON
        body: body,
        resolveWithFullResponse: true
    };

    return rp(options)
        .then(respondWithResult(res))
        .catch(handleError(res));
}