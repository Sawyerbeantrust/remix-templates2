const memoryStorage: Record<string, string> = {};

export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("localStorage.getItem failed, using fallback:", e);
      return memoryStorage[key] || null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("localStorage.setItem failed, using fallback:", e);
      memoryStorage[key] = value;
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("localStorage.removeItem failed, using fallback:", e);
      delete memoryStorage[key];
    }
  }
};

const sessionMemoryStorage: Record<string, string> = {};

export const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      console.warn("sessionStorage.getItem failed, using fallback:", e);
      return sessionMemoryStorage[key] || null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {
      console.warn("sessionStorage.setItem failed, using fallback:", e);
      sessionMemoryStorage[key] = value;
    }
  },
  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      console.warn("sessionStorage.removeItem failed, using fallback:", e);
      delete sessionMemoryStorage[key];
    }
  }
};
