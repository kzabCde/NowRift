import { saveStarted, saveFinished } from "./status";
const queue = new Map<string, string>();
let timer: ReturnType<typeof setTimeout> | undefined,
  listening = false;
export const preferences = {
  get(key: string) {
    return queue.get(key) ?? localStorage.getItem(key);
  },
  set(key: string, value: string) {
    if (queue.has(key)) queue.set(key, value);
    saveStarted("preferences");
    try {
      localStorage.setItem(key, value);
      saveFinished(undefined, "preferences");
    } catch (error) {
      saveFinished(error, "preferences");
      throw error;
    }
  },
  remove(key: string) {
    if (queue.delete(key) && !queue.size) {
      clearTimeout(timer);
      saveFinished(undefined, "preferences");
    }
    saveStarted("preferences");
    try {
      localStorage.removeItem(key);
      saveFinished(undefined, "preferences");
    } catch (error) {
      saveFinished(error, "preferences");
      throw error;
    }
  },
  queue(key: string, value: string) {
    if (!queue.size) saveStarted("preferences");
    queue.set(key, value);
    clearTimeout(timer);
    timer = setTimeout(() => preferences.flush(), 250);
    if (!listening && typeof window !== "undefined") {
      listening = true;
      window.addEventListener("pagehide", () => preferences.flush());
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) preferences.flush();
      });
    }
  },
  flush() {
    clearTimeout(timer);
    if (!queue.size) return;
    try {
      for (const [key, value] of queue) localStorage.setItem(key, value);
      queue.clear();
      saveFinished(undefined, "preferences");
    } catch (error) {
      queue.clear();
      saveFinished(error, "preferences");
    }
  },
  best(key: string, kills: number) {
    const value = Number(preferences.get(key));
    preferences.set(
      key,
      String(Math.max(Number.isFinite(value) ? value : 0, kills)),
    );
  },
};
