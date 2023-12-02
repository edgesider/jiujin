const qualitiesMap = Object.freeze({
  10: {name: '全新', value: 10},
  9: {name: '9成新', value: 9},
  8: {name: '8成新', value: 8},
  7: {name: '7成新', value: 7},
  6: {name: '6成新', value: 6},
  // 5: {name: '5成新', value: 5},
  // 4: {name: '4成新', value: 4},
  // 3: {name: '3成新', value: 3},
  // 2: {name: '2成新', value: 2},
  // 1: {name: '1成新', value: 1},
});

function getQualitiesMap() {
  return qualitiesMap;
}

function getQualityName(quality) {
  return qualitiesMap[quality]?.name;
}

module.exports = {
  getQualitiesMap,
  getQualityName,
}
