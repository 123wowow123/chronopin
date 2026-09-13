'use strict';

// Splits a search box query into the structured terms a pin card's labels add
// and whatever free text is left over:
//
//   user:ThePinGang company:"Electronic Arts" category:Software iphone
//
// user: takes a name with or without its "@" (user:@ThePinGang), and a bare
// @ThePinGang still works on its own, as it did before user: existed.
//
// A value with spaces is quoted, as the labels write it. Several values for
// one field widen the search (either company), while different fields narrow
// it (this company and this category), so each click on a label is additive.
//
// Quoting is forgiving, since people type these too:
//   company:"Electronic Arts"    the form the labels write
//   company:'Electronic Arts'    single quotes work the same way
//   "company:Electronic Arts"    the whole term quoted, with either kind
//   company:“Electronic Arts”    smart quotes, which Mac and iOS keyboards
//                                substitute as you type
//   company:"Electronic Arts     unclosed - the value runs to the end, so a
//                                query mid-edit still means what it says
//
// No name contains a double quote, so one always delimits. A single quote is
// also an apostrophe (McDonald's), so it only closes a value when a space or
// the end of the query follows it: company:'McDonald's' is one company.

const SMART_DOUBLE_QUOTES = /[“”„‟″]/g;
const SMART_SINGLE_QUOTES = /[‘’‚‛′]/g;

const FIELD = '(company|category|user)';
const DOUBLE_QUOTED = '([^"]*)"?';
const SINGLE_QUOTED = "((?:[^']|'(?!\\s|$))*)'?";

const FIELD_TERM = new RegExp('(^|\\s)(?:' + [
  `"${FIELD}:${DOUBLE_QUOTED}`,     // "company:Electronic Arts"
  `'${FIELD}:${SINGLE_QUOTED}`,     // 'company:Electronic Arts'
  `${FIELD}:"${DOUBLE_QUOTED}`,     // company:"Electronic Arts"
  `${FIELD}:'${SINGLE_QUOTED}`,     // company:'Electronic Arts'
  `${FIELD}:([^\\s"']\\S*)`          // company:Apple, company:McDonald's
].join('|') + ')', 'gi');

const USER_TERM = /(^|\s)(@\S+)/g;

export function parseSearchQuery(searchText) {
  const query = {
    userNames: [],
    companies: [],
    categories: [],
    text: ''
  };

  const normalized = String(searchText || '')
    .replace(SMART_DOUBLE_QUOTES, '"')
    .replace(SMART_SINGLE_QUOTES, "'");

  let rest = normalized.replace(FIELD_TERM, (match, lead, ...rest) => {
    // Each alternative captures a (field, value) pair; exactly one matched.
    const groups = rest.slice(0, -2);
    const at = groups.findIndex((group, index) => index % 2 === 0 && group !== undefined);
    const field = groups[at].toLowerCase();
    const value = groups[at + 1].trim();
    if (field === 'user') {
      _addUserName(query, value);
    } else if (value) {
      _addUnique(field === 'company' ? query.companies : query.categories, value);
    }
    return lead;
  });

  rest = rest.replace(USER_TERM, (match, lead, userName) => {
    _addUserName(query, userName);
    return lead;
  });

  query.text = rest.replace(/\s+/g, ' ').trim();
  return query;
}

export function hasFilters(query) {
  return !!(query.userNames.length || query.companies.length || query.categories.length);
}

// Applies a query's terms to pins that came back from free-text search, so
// "iphone company:Apple" means Apple pins about the iPhone.
export function matchesFilters(query, pin) {
  return _matchesAny(query.userNames, pin.user && pin.user.userName)
    && _matchesAny(query.companies, pin.company)
    && _matchesAny(query.categories, pin.category);
}

// Case-insensitive, like the database's collation, so filtering free-text
// results agrees with what the procedure returns for the same terms.
function _matchesAny(values, actual) {
  if (!values.length) {
    return true;
  }
  const lower = String(actual || '').toLowerCase();
  return values.some(value => value.toLowerCase() === lower);
}

// User names are stored with their "@", so that is the form matched on.
function _addUserName(query, value) {
  const name = value.replace(/^@+/, '').trim();
  if (name) {
    _addUnique(query.userNames, `@${name}`);
  }
}

function _addUnique(list, value) {
  const lower = value.toLowerCase();
  if (!list.some(existing => existing.toLowerCase() === lower)) {
    list.push(value);
  }
}
