function _onlyUniqueAndNonEmpty(value, index, self) {
  return value && self.indexOf(value) === index;
}

export function uniqueAndNonEmpty(strings) {
  return strings.filter(_onlyUniqueAndNonEmpty);
}
