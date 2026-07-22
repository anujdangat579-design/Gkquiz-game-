const KEY = 'gk_theme'

export function getStoredTheme() {
  return localStorage.getItem(KEY) || 'dark'
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark')
}

export function setTheme(theme) {
  localStorage.setItem(KEY, theme)
  applyTheme(theme)
}

export function toggleTheme() {
  const next = getStoredTheme() === 'light' ? 'dark' : 'light'
  setTheme(next)
  return next
}
