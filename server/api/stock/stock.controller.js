const fs = require('fs');
import * as _ from 'lodash';
import config from '../../config/environment';
import * as response from '../response';
import fetch from 'node-fetch';
import * as cache from '../../util/cache';

const quoteURL = 'https://api.tdameritrade.com/v1/marketdata/quotes';
const apiKey = config.stock.TD_API_KEY;
const stockPrefix = cache.key.stockPrefix;
const ttl = 3600000; // 5 minutes
function _fetch(symbol) {
    const promise = new Promise((resolve, reject) => {
        const cacheKey = `${stockPrefix}${symbol}`;
        const data = cache.getWithExpiry(cacheKey);
        if (data) {
            //console.log('cache stock quote query');
            resolve(data);
        } else {
            //console.log('new stock quote query');
            fetch(`${quoteURL}?apikey=${apiKey}&symbol=${symbol}`)
                .then(response => {
                    return response.json();
                }).then(body => {
                    const lastPrice = body[symbol].lastPrice;
                    const netPercentChangeInDouble = body[symbol].netPercentChangeInDouble;
                    const data = {
                        lastPrice,
                        netPercentChangeInDouble
                    };
                    cache.setWithExpiry(cacheKey, data, ttl);
                    resolve(data);
                }).catch(err => {
                    reject(err);
                });
        }
    });
    return promise;
}

export function quotes(req, res) {
    const symbol = _.get(req, 'query.symbol', '').toUpperCase();
    if (!symbol) {
        return response.handleError(res)("missing symbol");
    }

    const meta = _fetch(symbol);
    return meta
        .then(response.withResult(res))
        .catch(response.handleError(res));
}


// http://localhost:9000/api/stock/quotes?symbol=gme