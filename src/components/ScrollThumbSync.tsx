'use client'

import { useEffect } from 'react'

/**
 * Overlay scrollbar for elements marked `data-scroll-thumb`. Their native
 * scrollbar is hidden (it would take width from the panels); while one scrolls,
 * a thin fixed thumb fades in over its right edge, then fades out again.
 */
export function ScrollThumbSync() {
  useEffect(() => {
    const thumb = document.createElement('div')
    thumb.setAttribute('aria-hidden', 'true')
    Object.assign(thumb.style, {
      position: 'fixed',
      width: '4px',
      borderRadius: '2px',
      background: 'var(--color-raised-2, #888)',
      opacity: '0',
      transition: 'opacity 200ms',
      pointerEvents: 'none',
      zIndex: '60',
    })
    document.body.appendChild(thumb)
    let timer: ReturnType<typeof setTimeout> | undefined
    const onScroll = (e: Event) => {
      const el = e.target
      if (!(el instanceof HTMLElement) || !(el.hasAttribute('data-scroll-thumb') || el.classList.contains('scroll-thumb'))) return
      const { scrollTop, scrollHeight, clientHeight } = el
      if (scrollHeight <= clientHeight + 1) return
      const r = el.getBoundingClientRect()
      const h = Math.max(24, (clientHeight / scrollHeight) * clientHeight)
      const top = r.top + (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - h)
      thumb.style.height = `${h}px`
      thumb.style.top = `${top}px`
      thumb.style.left = `${r.right - 6}px`
      thumb.style.opacity = '0.9'
      clearTimeout(timer)
      timer = setTimeout(() => {
        thumb.style.opacity = '0'
      }, 800)
    }
    document.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('scroll', onScroll, true)
      clearTimeout(timer)
      thumb.remove()
    }
  }, [])
  return null
}
