import * as _ from 'lodash';

export function mapSubObjectFromQuery(prefix, groupKey, pinRows) {
  const aggregate = [],
    groupByKey = `${prefix}.${groupKey}`,
    startsWithKey = `${prefix}.`;

  let groupedSubRows = _.groupBy(
    pinRows.filter(t => t[groupByKey]),
    row => {
      return row[groupByKey]; // eg: 'Media.id'
    });

  Object.entries(groupedSubRows)
    .forEach(([key, subRows]) => {
      let subObj = Object.entries(subRows[0])
        .filter(([key, value]) => {
          return key.startsWith(startsWithKey); // eg: 'Media.'
        })
        .reduce((a, [key, value]) => {
          a[key.substring(startsWithKey.length)] = value;
          return a;
        }, {});

      if (Object.keys(subObj).length) {
        aggregate.push(subObj);
      }
    });

  return aggregate.length
    ? aggregate
    : undefined;
}

export function extractTags(searchText) {
  const matchHashString = /(?<!class="chrono-hash-highlight">)(#[A-z\d-]+)(?:<|\b)/g;
  const matchAtString = /(?<!class="chrono-at-highlight">)(@[A-z\d-]+)(?:<|\b)/g;
  const matchDollarString = /(?<!class="chrono-dollar-highlight">)(\$[A-z]+[\d-]?)(?:<|\b)/g;
  const hashTags = [];
  const atTags = [];
  const dollarTags = [];
  let result1, result2, result3;

  while ((result1 = matchHashString.exec(searchText)) !== null) {
    let matchString = result1[1];
    if (!hashTags.includes(matchString)) {
      hashTags.push(matchString);
    }
  }

  while ((result2 = matchAtString.exec(searchText)) !== null) {
    let matchString = result2[1];
    if (!atTags.includes(matchString)) {
      atTags.push(matchString);
    }
  }

  while ((result3 = matchDollarString.exec(searchText)) !== null) {
    let matchString = result3[1];
    if (!dollarTags.includes(matchString)) {
      dollarTags.push(matchString);
    }
  }

  const allTags = [
    ...hashTags,
    ...atTags,
    ...dollarTags
  ];

  return {
    hashTags,
    atTags,
    dollarTags,
    allTags
  };
}