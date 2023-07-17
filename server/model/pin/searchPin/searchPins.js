'use strict';

import * as mssql from 'mssql';
import * as cp from '../../../sqlConnectionPool';
import * as _ from 'lodash';
const rp = require('request-promise');
import {
    Mention,
    SearchPin,
    Pins,
    BasePins
} from '../..';
import { prefixSearchIndex } from './searchHelper';
import * as config from '../../../config/environment';

const pageSize = config.pagination.pageSize;

export default class SearchPins extends BasePins {
    // Properties
    // this.pins
    // this.hits - Number of pins matching query without paging
    // this.took - ElasticSearch Processing Time

    static numberOfResults = 20;

    constructor(pins) {
        super(pins);
    }

    set(pins) {
        if (Array.isArray(pins)) {
            this
                .setPins(pins)
                .setHits(undefined);
        } else if (pins.pins && Number.isInteger(pins.hits)) {
            this
                .setPins(pins.pins)
                .setHits(pins.hits)
                .setTook(pins.took);
        } else {
            throw "Pins cannot set value of arg";
        }
        return this;
    }

    setPins(pins) {
        if (Array.isArray(pins)) {
            this.pins = pins.map(p => new SearchPin(p));
        } else {
            throw "arg is not an array";
        }
        return this;
    }

    setQueryCount(queryCount) {
        throw new Error("Not Implemented");
    }

    setHits(hits) {
        if (Number.isInteger(hits) || hits == null) {
            this.hits = hits;
        } else {
            throw "arg is not an integer, undefined, null";
        }
        return this;
    }

    setTook(esProcessingTime) {
        if (Number.isInteger(esProcessingTime) || esProcessingTime == null) {
            this.took = esProcessingTime;
        } else {
            throw "arg is not an integer, undefined, null";
        }
        return this;
    }

    fromFaiss(result) {
        let pins = result.res.map(p => {
            return {
                // ...p._source,
                // highlight: p.highlight,
                id: p.index,
                searchScore: p.match
            };
        });
        return this
            .set(pins)
            .setHits(result.res.length)
            .setTook(result.took);
    }

    fromElasticSearch(result) {
        let pins = result.hits.hits.map(p => {
            return {
                ...p._source,
                highlight: p.highlight,
                searchScore: p._score
            };
        });
        return this
            .set(pins)
            .setHits(result.hits.total.value)
            .setTook(result.took);
    }

    convertElasticSearchToPins(userId) {
        let outPut = Object.assign({}, this);
        let pins = outPut.pins.map(p => {
            let out = Object.assign({}, p);

            out.favoriteCount = out.favorites.length;
            out.likeCount = out.likes.length;

            if (userId != null) {
                out.favorites.indexOf(userId) != -1
                    ? (out.hasFavorite = true, out)
                    : out;

                out.likes.indexOf(userId) != -1
                    ? (out.hasLike = true, out)
                    : out;
            }

            delete out.favorites;
            delete out.likes;
            return out;
        });

        outPut.pins = pins;
        return outPut;
    }

    uniqByKeepFirst() {
        let seen = new Set();
        this.pins = this.pins.filter(item => {
            let k = item.id;
            return seen.has(k) ? false : seen.add(k);
        });
        return this;
    }

    hydrateAndRemoveUnmatch(pins) {
        //non pure
        const queriedPins = pins.pins;
        this.pins = this.pins.reduce((a, c) => {
            let found = queriedPins.find(p => c.id === p.id);
            if (found) {
                c.set({ ...c, ...found });
                a.push(c);
            }
            return a;
        }, []);
        return this;
    }

    static delete(pinId) {
        return semanticSearchDelete(pinId)
            .then((res) => {
                return res;
            });
    }

    static search(userId, searchText) {
        const semanticPinsPromise = semanticSearch(searchText, SearchPins.numberOfResults)
            .then(res => {
                return new SearchPins().fromFaiss(res);
            });

        const beginMatchPinsPromise = SearchPins.querySearchPin(searchText, searchText)
            .then(res => {
                const searchPins = new SearchPins(res.pins);
                searchPins.pins.forEach(p => {
                    return p.searchScore = 0;
                });
                return searchPins;
            });

        return Promise.all([semanticPinsPromise, beginMatchPinsPromise])
            .then(([semanticPins, beginMatchPins]) => {
                const unionSearchPins = new SearchPins([...beginMatchPins.pins, ...semanticPins.pins]);
                return Pins.queryPinByIds(userId, unionSearchPins)
                    .then(pins => {
                        unionSearchPins
                            .uniqByKeepFirst()
                            .hydrateAndRemoveUnmatch(pins);
                        return unionSearchPins;
                    });
            });
    }

    static searchTags(userId, allTags) {
        return Pins.queryPinByTags(userId, allTags); // TODO: should return SearchPins
    }

    static searchTagsFavorite(userId, allTags) {
        return Pins.queryPinByTagsHasFavorite(userId, allTags); // TODO: should return SearchPins
    }

    static searchFavorite(userId, searchText) {
        if (!searchText) {
            let fromDateTime = new Date();
            return Pins.queryInitialByDateFilterByHasFavorite(fromDateTime, userId, pageSize, pageSize);
        } else {
            return SearchPins.search(userId, searchText)
                .then(searchPins => {
                    return Pins.queryPinByIdsFilterByHasFavorite(searchPins, userId)
                        .then(pins => {
                            searchPins
                                .uniqByKeepFirst()
                                .hydrateAndRemoveUnmatch(pins);
                            return searchPins;
                        });
                });
        }
    }

    static autocomplete(userId, searchText) {
        return autocomplete(searchText)  // TODO: Add semantic Search to results
            .then(res => {
                return new SearchPins().fromElasticSearch(res);
            })
            .then(pins => {
                return pins.convertElasticSearchToPins(userId);
            });
    }

    static autocompleteFavorite(userId, searchText) {
        return autocompleteFavorite(userId, searchText) // TODO: Add semantic Search to results
            .then(res => {
                return new SearchPins().fromElasticSearch(res);
            })
            .then(pins => {
                return pins.convertElasticSearchToPins(userId);
            });
    }

    static querySearchPin(title, description, k = 10) {
        return _querySearchPin(title, description, k)
            .then(res => {
                return new Pins(res);
            });
    }
}

/* Search */

function semanticSearch(searchText, numberOfResults) {
    const serviceUrl = config.faiss.serviceUrl;
    const uri = `${serviceUrl}/faiss/search?q=${encodeURI(searchText)}&k=${numberOfResults}`

    let options = {
        method: 'GET',
        uri: uri,
        json: true // Automatically stringifies the body to JSON
    };

    return rp(options);
};

function semanticSearchDelete(pinId) {
    const serviceUrl = config.faiss.serviceUrl;
    const uri = `${serviceUrl}/faiss/remove`

    let options = {
        method: 'DELETE',
        uri: uri,
        json: true, // Automatically stringifies the body to JSON
        body: {
            "id": pinId
        }
    };

    return rp(options);
};

// https://docs.microsoft.com/en-us/rest/api/searchservice/?redirectedfrom=MSDN
function elasticSearch(searchText) {
    const index = "pins";
    const command = "_search";
    const uri = prefixSearchIndex(index) + "/" + command;
    const searchFields = ["title", "description", "location"];

    let options = {
        method: 'POST',
        uri: uri,
        body: {
            "query": {
                "multi_match": {
                    "query": searchText,
                    "fields": searchFields
                }
            }
        },
        json: true, // Automatically stringifies the body to JSON
        auth: config.elastiSearch.auth
    };

    return rp(options);
};

function elasticSearchFavorite(userId, searchText) {
    const index = "pins";
    const command = "_search";
    const uri = prefixSearchIndex(index) + "/" + command;
    const searchFields = ["title", "description", "location"];

    let options = {
        method: 'POST',
        uri: uri,
        body: {
            "query": {
                "bool": {
                    "must": [
                        {
                            "multi_match": {
                                "query": searchText,
                                "fields": searchFields
                            }
                        },
                        {
                            "match": {
                                "favorites": userId
                            }
                        }
                    ]
                }
            }
        },
        json: true, // Automatically stringifies the body to JSON
        auth: config.elastiSearch.auth
    };

    return rp(options);
};


/* Autocomplete */
function autocomplete(searchText) {
    const index = "pins";
    const command = "_search";
    const uri = prefixSearchIndex(index) + "/" + command;
    const searchFields = ["title", "description", "location"];

    let options = {
        method: 'POST',
        uri: uri,
        body: {
            "_source": "title",
            "query": {
                "multi_match": {
                    "query": searchText,
                    "fields": searchFields
                }
            }
        },
        json: true, // Automatically stringifies the body to JSON
        auth: config.elastiSearch.auth
    };

    return rp(options);
};

function autocompleteFavorite(userId, searchText) {
    const index = "pins";
    const command = "_search";
    const uri = prefixSearchIndex(index) + "/" + command;
    const searchFields = ["title", "description", "location"];

    let options = {
        method: 'POST',
        uri: uri,
        body: {
            "_source": "title",
            "query": {
                "bool": {
                    "must": [
                        {
                            "multi_match": {
                                "query": searchText,
                                "fields": searchFields
                            }
                        },
                        {
                            "match": {
                                "favorites": userId
                            }
                        }
                    ]
                }
            }
        },
        json: true, // Automatically stringifies the body to JSON
        auth: config.elastiSearch.auth
    };

    return rp(options);
};

function _querySearchPin(title, description, k) {
    return cp.getConnection()
        .then(conn => {
            return new Promise(function (resolve, reject) {
                const StoredProcedureName = 'SearchPin';

                let request = new mssql.Request(conn)
                    .input('searchTitle', mssql.NVarChar(64), title.slice(0, 64))
                    .input('searchDescription', mssql.NVarChar(64), description.slice(0, 64))
                    .input('top', mssql.Int, k)
                    .output('queryCount', mssql.Int);

                request.execute(`[dbo].[${StoredProcedureName}]`,
                    function (err, res, returnValue, affected) {
                        let queryCount;
                        if (err) {
                            return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
                        }
                        // ToDo: doesn't always return value
                        try {
                            queryCount = res.output.queryCount;
                        } catch (e) {
                            queryCount = 0;
                        }

                        resolve({
                            pins: res.recordset,
                            queryCount: queryCount
                        });
                    });
            });
        });
}