export const TIDAL_SESSION_STORAGE_KEY = 'tidal_session_active'

export const hasTidalSessionFlag = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }
  return localStorage.getItem(TIDAL_SESSION_STORAGE_KEY) === 'true'
}

export const markTidalSessionActive = (): void => {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.setItem(TIDAL_SESSION_STORAGE_KEY, 'true')
}

export const clearTidalSessionActive = (): void => {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.removeItem(TIDAL_SESSION_STORAGE_KEY)
}
