'use strict';

import rp from 'request-promise';
import {
    SearchPin,
    Pins,
    BasePins
} from '../..';
import { prefixSearchIndex } from './searchHelper';
import * as config from '../../../config/environment';

export default class SearchPins extends BasePins {
    // Properties
    // this.pins
    // this.hits - Number of pins matching query without paging
    // this.took - ElasticSearch Processing Time

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

    static search(userId, searchText) {
        return semanticSearch(searchText)
            .then(res => {
                return new SearchPins().fromFaiss(res);
            })
            .then(pins => {
                return Pins.queryPinByIds(pins); // TODO: should return SearchPins
            });
    }

    static searchFavorite(userId, searchText) {
        return semanticSearch(searchText)
            .then(res => {
                return new SearchPins().fromFaiss(res);
            })
            .then(pins => {
                return Pins.queryPinByIdsFilterByHasFavorite(pins, userId); // TODO: should return SearchPins
            });
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
}

/* Search */

function semanticSearch(searchText) {
    const serviceUrl = config.faiss.serviceUrl;
    const uri = `${serviceUrl}/faiss/search?q=${searchText}`

    let options = {
        method: 'GET',
        uri: uri,
        json: true // Automatically stringifies the body to JSON
    };

    return rp(options);
};

// https://docs.microsoft.com/en-us/rest/api/searchservice/?redirectedfrom=MSDN
function elasticSearch(searchText) {
    const index = "pins";
    const command = "_search";
    const uri = prefixSearchIndex(index) + "/" + command;
    const searchFields = ["title", "description", "address"];

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
    const searchFields = ["title", "description", "address"];

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
    const searchFields = ["title", "description", "address"];

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
    const searchFields = ["title", "description", "address"];

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