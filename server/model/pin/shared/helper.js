import * as _ from 'lodash';

export function mapSubObjectFromQuery(prefix, groupKey, pinRows) {
  const aggregate = [],
    groupByKey = `${prefix}.${groupKey}`,
    startsWithKey = `${prefix}.`;

  let groupedSubRows = _.groupBy(pinRows, row => {
    return row[groupByKey]; // eg: 'Media.id'
  });
  debugger
  Object.entries(groupedSubRows)
    .forEach(([key, subRows]) => {
      let subObj = Object.entries(subRows[0])
        .filter(([key, value]) => {
          return key.startsWith(startsWithKey); // eg: 'Media.'
        })
        .reduce((a, [key, value]) => {
          a[key.substring(6)] = value;
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
