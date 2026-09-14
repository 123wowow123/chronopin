import * as db from '../../../db';
import Company from '../../company/company';

// Inserts a pin and sets pin.id. A pin that already carries an id (seeding,
// the SQL Server transfer) keeps it; otherwise the database assigns one.
// pin.company is a name; it is stored as a reference to its Company row.
export function createPin(pin, userId) {
    return Company.applyToPin(pin).then(() => _insertPin(pin, userId));
}

function _insertPin(pin, userId) {
    const hasId = pin.id != null;
    const columns = [
        'parentId', 'title', 'description', 'sourceUrl', 'longFormSummary',
        'dateConfidence', 'dateConfidenceReasoning', 'companyId',
        'category', 'address', 'priceLowerBound', 'priceUpperBound', 'price',
        'priceCurrency', 'tip', 'utcStartDateTime', 'utcEndDateTime', 'allDay',
        'userId', 'utcCreatedDateTime', 'utcUpdatedDateTime', 'utcDeletedDateTime'
    ];
    const values = [
        pin.parentId, pin.title, pin.description, pin.sourceUrl, pin.longFormSummary,
        pin.dateConfidence, pin.dateConfidenceReasoning, pin.companyId,
        pin.category, pin.address, pin.priceLowerBound, pin.priceUpperBound, pin.price,
        pin.priceCurrency, pin.tip, pin.utcStartDateTime, pin.utcEndDateTime,
        pin.allDay == null ? false : pin.allDay,
        userId, pin.utcCreatedDateTime || new Date(), pin.utcUpdatedDateTime, pin.utcDeletedDateTime
    ].map(_nullIfUndefined);

    if (hasId) {
        columns.unshift('id');
        values.unshift(pin.id);
    }

    const placeholders = values.map((value, i) => `$${i + 1}`);
    values.push(_nullIfUndefined(pin.latitude), _nullIfUndefined(pin.longitude));
    const lat = `$${values.length - 1}`;
    const lng = `$${values.length}`;

    return db.query(`
        INSERT INTO "Pin" (${columns.map(c => `"${c}"`).join(', ')}, "location")
        VALUES (${placeholders.join(', ')}, ${locationSql(lat, lng)})
        RETURNING "id"`, values)
        .then(rows => {
            pin.id = rows[0].id;
            return hasId ? advanceIdSequence('Pin') : undefined;
        })
        .then(() => {
            return {
                pin: pin
            };
        });
}

// An insert with an explicit id does not move the identity sequence the way
// SQL Server's IDENTITY_INSERT did, so the next ordinary insert would reuse
// that id. Moves the sequence past the highest id in the table.
export function advanceIdSequence(table) {
    return db.query(
        `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), GREATEST((SELECT MAX("id") FROM "${table}"), 1))`);
}

// A geography point from latitude/longitude parameters, or NULL when either
// is missing - a pin with no coordinates simply has no map.
export function locationSql(latParam, lngParam) {
    return `CASE WHEN ${latParam}::double precision IS NULL OR ${lngParam}::double precision IS NULL THEN NULL
        ELSE ST_SetSRID(ST_MakePoint(${lngParam}::double precision, ${latParam}::double precision), 4326)::geography END`;
}

function _nullIfUndefined(value) {
    return value === undefined ? null : value;
}
