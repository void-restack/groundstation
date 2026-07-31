export interface Tone {
  freq: number
  ms: number
}

const SAMPLE_RATE = 44100

export function synthWav(tones: Tone[], sampleRate = SAMPLE_RATE): Uint8Array {
  const total = tones.reduce((n, t) => n + Math.round((t.ms / 1000) * sampleRate), 0)
  const bytes = new Uint8Array(44 + total * 2)
  const view = new DataView(bytes.buffer)

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
  }

  writeStr(0, "RIFF")
  view.setUint32(4, 36 + total * 2, true)
  writeStr(8, "WAVE")
  writeStr(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, "data")
  view.setUint32(40, total * 2, true)

  let sample = 0
  for (const tone of tones) {
    const count = Math.round((tone.ms / 1000) * sampleRate)
    const attack = Math.min(220, count * 0.2)
    const release = Math.min(880, count * 0.4)
    for (let i = 0; i < count; i++) {
      const env =
        i < attack ? i / attack : i > count - release ? (count - i) / release : 1
      const value = Math.sin((2 * Math.PI * tone.freq * i) / sampleRate) * env * 0.6
      view.setInt16(44 + sample * 2, Math.round(value * 32767), true)
      sample++
    }
  }

  return bytes
}
