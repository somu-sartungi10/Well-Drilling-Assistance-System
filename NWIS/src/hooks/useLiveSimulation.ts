import { useEffect } from "react"
import { useAppStore } from "@/store/useAppStore"

/** Advances depth every 1.5 s while playing; speed multiplies the step. */
export function useLiveSimulation() {
  const playing = useAppStore((s) => s.playing)
  const speed = useAppStore((s) => s.speed)

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      const st = useAppStore.getState()
      const next = st.liveDepthM + 8 * st.speed
      if (next >= 3450) {
        useAppStore.setState({ liveDepthM: 3450 })
        st.setPlaying(false)
        st.tick()
        return
      }
      useAppStore.setState({ liveDepthM: next })
      st.tick()
    }, 1500)
    return () => clearInterval(id)
  }, [playing, speed])
}
