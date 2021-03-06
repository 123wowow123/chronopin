'use strict';

import rp from 'request-promise';
import {
    SearchPin,
    BasePins
} from '../..';
import { prefixSearchIndex } from './searchHelper';

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
            .setHits(result.hits.total)
            .setTook(result.took);
    }

    convertToPins(userId) {
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
        return search(searchText)
            .then(res => {
                return new SearchPins().fromElasticSearch(res);
            })
            .then(pins => {
                return pins.convertToPins(userId);
            });
    }

    static searchFavorite(userId, searchText) {
        return searchFavorite(userId, searchText)
            .then(res => {
                return new SearchPins().fromElasticSearch(res);
            })
            .then(pins => {
                return pins.convertToPins(userId);
            });
    }

    static autocomplete(userId, searchText) {
        return autocomplete(searchText)
            .then(res => {
                return new SearchPins().fromElasticSearch(res);
            })
            .then(pins => {
                return pins.convertToPins(userId);
            });
    }

    static autocompleteFavorite(userId, searchText) {
        return autocompleteFavorite(userId, searchText)
            .then(res => {
                return new SearchPins().fromElasticSearch(res);
            })
            .then(pins => {
                return pins.convertToPins(userId);
            });
    }
}

/* Search */

// https://docs.microsoft.com/en-us/rest/api/searchservice/?redirectedfrom=MSDN
function search(searchText) {
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
        json: true // Automatically stringifies the body to JSON
    };

    return rp(options);
};

function searchFavorite(userId, searchText) {
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
        json: true // Automatically stringifies the body to JSON
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
        json: true // Automatically stringifies the body to JSON
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
        json: true // Automatically stringifies the body to JSON
    };

    return rp(options);
};