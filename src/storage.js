export const webStorage = {
  async get(key) {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  },
  async set(key, value) {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  },
};
