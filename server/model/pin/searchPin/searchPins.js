'use strict';

import * as db from '../../../db';
import * as _ from 'lodash';
import {
    SearchPin,
    Pins,
    BasePins
} from '../..';
import { faissRequest } from './faiss';
import * as config from '../../../config/environment';

const pageSize = config.pagination.pageSize;

export default class SearchPins extends BasePins {
    // Properties
    // this.pins
    // this.hits - Number of pins matching query without paging
    // this.took - search service processing time (ms)

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

    // Copies each hit's searchScore (cosine similarity, higher is more
    // relevant) onto the full pins loaded for those hits, which come back in
    // date order - so a client can keep that order or re-sort by relevance.
    applySearchScores(pins) {
        const scores = new Map(this.pins.map(p => [p.id, p.searchScore]));
        pins.pins.forEach(pin => {
            pin.searchScore = scores.get(pin.id);
        });
        return pins;
    }

    static search(searchText) {
        return semanticSearch(searchText, SearchPins.numberOfResults)
            .then(res => {
                return new SearchPins().fromFaiss(res);
            })
            .then(hits => {
                return Pins.queryPinByIds(hits) // TODO: should return SearchPins
                    .then(pins => hits.applySearchScores(pins));
            });
    }

    // A search made only of label terms (user:, company:, category:).
    static searchFilters(query, favoriteUserId) {
        return Pins.queryPinBySearchFilters(query, favoriteUserId); // TODO: should return SearchPins
    }

    static searchFavorite(userId, searchText) {
        // TODO: should return SearchPins
        if (!searchText) {
            let fromDateTime = new Date();
            return Pins.queryInitialByDateFilterByHasFavorite(fromDateTime, userId, pageSize, pageSize);
        } else {
            return semanticSearch(searchText, SearchPins.numberOfResults)
                .then(res => {
                    return new SearchPins().fromFaiss(res);
                })
                .then(hits => {
                    return Pins.queryPinByIdsFilterByHasFavorite(hits, userId)
                        .then(pins => hits.applySearchScores(pins));
                });
        }
    }

    static querySearchPin(title, description, k = 10) {
        return _querySearchPin(title, description, k)
            .then(res => {
                //console.log('queryInitialByDateFilterByHasFavorite', res);
                return new Pins(res);
            });
    }
}

/* Search */

function semanticSearch(searchText, numberOfResults) {
    return faissRequest('GET', `/search?q=${encodeURIComponent(searchText)}&k=${numberOfResults}`);
}

// Autocomplete: pins whose title or description starts with the typed text,
// compared on their first 64 characters, case-insensitively as SQL Server
// did. k caps the rows returned.
function _querySearchPin(title, description, k) {
    return db.query(`
        SELECT "Pin".*
        FROM "PinBaseView" AS "Pin"
        WHERE "Pin"."utcDeletedDateTime" IS NULL
          AND (left("Pin"."title", 64) ILIKE rtrim(left($1, 64)) || '%'
            OR left("Pin"."description", 64) ILIKE rtrim(left($2, 64)) || '%')
        ORDER BY "Pin"."utcStartDateTime", "Pin"."id", "Pin"."Media.id", "Pin"."Merchant.id"
        LIMIT $3`,
        [title, description, k])
        .then(rows => {
            return {
                pins: rows,
                queryCount: rows.length
            };
        });
}
