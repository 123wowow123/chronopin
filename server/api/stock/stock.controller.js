const fs = require('fs');
import * as _ from 'lodash';
import config from '../../config/environment';
import * as response from '../response';
import fetch from 'node-fetch';

const apiKey = config.stock.TD_API_KEY;
function _fetch(symbol) {
    const promise = new Promise((resolve, reject) => {
        fetch(`https://api.tdameritrade.com/v1/marketdata/quotes?apikey=${apiKey}&symbol=${symbol}`)
            .then(response => {
                return response.json();
            }).then(body => {
                const lastPrice = body[symbol].lastPrice;
                const netPercentChangeInDouble = body[symbol].lastPrice;
                resolve({
                    lastPrice,
                    netPercentChangeInDouble
                });
            }).catch(err => {
                reject(err);
            });
    });
    return promise;
}

export function quotes(req, res) {
    const symbol = _.get(req, 'query.symbol', '').toUpperCase()
    if (!symbol) {
        return response.handleError(res)("missing symbol");
    }

    const meta = _fetch(symbol);
    return meta
        .then(response.withResult(res))
        .catch(response.handleError(res));
}


// http://localhost:9000/api/stock/quotes?symbol=gme