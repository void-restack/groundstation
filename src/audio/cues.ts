import { Audio } from "@opentui/core"
import { synthWav, type Tone } from "../lib/wav"

type CueName = "click" | "success" | "fail"

const RECIPES: Record<CueName, { tones: Tone[]; volume: number }> = {
  click: { tones: [{ freq: 1180, ms: 45 }], volume: 0.22 },
  success: { tones: [{ freq: 660, ms: 90 }, { freq: 990, ms: 150 }], volume: 0.45 },
  fail: { tones: [{ freq: 150, ms: 320 }], volume: 0.55 },
}

let audio: Audio | null = null
let muted = false
const handles = new Map<CueName, number>()

export function initAudio() {
  if (audio) return
  try {
    const a = Audio.create({ autoStart: false })
    if (!a.start()) return
    audio = a
    for (const name of Object.keys(RECIPES) as CueName[]) {
      const handle = a.loadSound(synthWav(RECIPES[name].tones))
      if (handle !== null) handles.set(name, handle)
    }
  } catch {
    audio = null
  }
}

function play(name: CueName) {
  if (!audio || muted) return
  const handle = handles.get(name)
  if (handle === undefined) return
  try {
    audio.play(handle, { volume: RECIPES[name].volume })
  } catch {
    /* device vanished mid-session */
  }
}

export const cues = {
  click: () => play("click"),
  success: () => play("success"),
  fail: () => play("fail"),
}

export function toggleMute(): boolean {
  muted = !muted
  return muted
}

export const isMuted = () => muted
