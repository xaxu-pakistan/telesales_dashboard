const cache = new Map();
const TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedData(key) {
  const item = cache.get(key);
  if (!item) return null;
  
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  
  return item.data;
}

export function setCachedData(key, data) {
  cache.set(key, {
    data,
    expiry: Date.now() + TTL
  });
}
