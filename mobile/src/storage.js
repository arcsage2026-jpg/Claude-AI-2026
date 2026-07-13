import AsyncStorage from "@react-native-async-storage/async-storage";

export const nativeStorage = {
  async get(key) {
    return AsyncStorage.getItem(key);
  },
  async set(key, value) {
    return AsyncStorage.setItem(key, value);
  },
};
