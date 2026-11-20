self.onmessage = (event) => {
  const { id, pattern, flags, source } = event.data;
  try {
    const re = new RegExp(pattern, flags + 'g');
    const matches = [];
    let result;
    let truncated = false;
    while ((result = re.exec(source)) !== null) {
      if (matches.length >= 500) { truncated = true; break; }
      matches.push({
        start: result.index,
        end: result.index + result[0].length,
        value: result[0],
        groups: result.slice(1).map((value, i) => ({ name: String(i + 1), value: value ?? null })),
        named: Object.entries(result.groups || {}).map(([name, value]) => ({ name, value: value ?? null }))
      });
      // Prevent endless loops with zero-length matches. Advance by one UTF-16 code unit.
      if (result[0] === '') re.lastIndex++;
    }
    self.postMessage({ id, matches, truncated });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};
