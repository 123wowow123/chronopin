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
  //debugger
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
  const matchHashString = /(?<!class="chrono-hash-highlight">)(?<!href="\/search\?q=)(#[A-z\d-]+)/g;
  const matchAtString = /(?<!class="chrono-at-highlight">)(@[A-z\d-]+)/g;
  const hashTags = [];
  const atTags = [];
  let result1, result2;

  while ((result1 = matchHashString.exec(searchText)) !== null) {
    let matchString = result1[1];
    hashTags.push(matchString);
  }

  while ((result2 = matchAtString.exec(searchText)) !== null) {
    let matchString = result2[1];
    atTags.push(matchString);
  }
  return {
    hashTags,
    atTags
  };
}