export function pascalToCamelKeepSuffix(str) {
  const words = str.match(/[A-Z][a-z0-9]*|[A-Z]+(?![a-z])/g);
  if (!words) return str;

  const last = words[words.length - 1];
  const isSuffixAllCaps = /^[A-Z]+$/.test(last);

  const camelWords = words.map((w, i) => {
    if (i === 0) return w.charAt(0).toLowerCase() + w.slice(1);
    if (i === words.length - 1 && isSuffixAllCaps) return w;
    return w;
  });

  return camelWords.join('');
}

export function transformKeysPascalToCamel(obj) {
  if (Array.isArray(obj)) {
    return obj.map(transformKeysPascalToCamel);
  }

  if (obj !== null && typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      if (!Object.hasOwnProperty.call(obj, key)) continue;

      const newKey = pascalToCamelKeepSuffix(key);
      const value = obj[key];

      newObj[newKey] = transformKeysPascalToCamel(value);
    }
    return newObj;
  }

  // Trường hợp không phải obj hoặc array (string, number, bool, null)
  return obj;
}
