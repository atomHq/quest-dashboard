/** sessionStorage helpers that never throw (private mode, disabled storage, SSR). */

export function readJSON<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeJSON(key: string, value: unknown) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable — the flow still works, it just won't survive a redirect.
  }
}

export function removeKey(key: string) {
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // ignore
  }
}
