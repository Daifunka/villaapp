import { onMounted, onUnmounted, shallowRef } from 'vue'

export function useScrollState() {
  const scrolled = shallowRef(false)
  const showBackToTop = shallowRef(false)
  let frame = 0
  const update = () => {
    if (frame) return
    frame = requestAnimationFrame(() => {
      const top = window.scrollY
      scrolled.value = top > 48
      showBackToTop.value = top > 360
      frame = 0
    })
  }
  onMounted(() => window.addEventListener('scroll', update, { passive: true }))
  onUnmounted(() => { window.removeEventListener('scroll', update); if (frame) cancelAnimationFrame(frame) })
  return { scrolled, showBackToTop, scrollToTop: () => window.scrollTo({ top: 0, behavior: 'smooth' }) }
}
