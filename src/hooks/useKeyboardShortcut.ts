import { useEffect } from 'react'

/** Fires `callback` on Cmd/Ctrl+<key>, from anywhere in the document. */
export function useKeyboardShortcut(key: string, callback: () => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifierPressed = event.metaKey || event.ctrlKey
      if (isModifierPressed && event.key.toLowerCase() === key.toLowerCase()) {
        event.preventDefault()
        callback()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [key, callback])
}
