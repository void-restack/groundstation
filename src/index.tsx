import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { App } from "./App"
import { palette } from "./theme"

if (process.argv.slice(2).includes("serve")) {
  const { serve } = await import("./server")
  await serve(Number(process.env.GND_PORT ?? 2222))
} else {
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    targetFps: 30,
    backgroundColor: palette.void,
  })
  createRoot(renderer).render(<App />)
}
