const qualitiesMap: Readonly<Record<number, { name: string; namePrefix: string; value: number }>> = Object.freeze({
  10: { name: '全新', namePrefix: '全', value: 10 },
  9: { name: '9成新', namePrefix: '九', value: 9 },
  8: { name: '8成新', namePrefix: '八', value: 8 },
  7: { name: '7成新', namePrefix: '七', value: 7 },
  6: { name: '6成新', namePrefix: '六', value: 6 },
  // 5: {name: '5成新', value: 5},
  // 4: {name: '4成新', value: 4},
  // 3: {name: '3成新', value: 3},
  // 2: {name: '2成新', value: 2},
  // 1: {name: '1成新', value: 1},
});

export function getQualitiesMap() {
  return qualitiesMap;
}

export function getQualityName(quality: number) {
  return qualitiesMap[quality]?.name;
}

export function getContentDesc(content: string, len?: number) {
  content = content.substring(0, len ?? 20);
  const firstLR = content.indexOf('\n');
  if (firstLR !== -1) {
    content = content.substring(0, content.indexOf('\n')) // 从第一个回车截断
  }
  return content;
}