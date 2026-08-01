import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { App } from "./App"
import { config, loadConfig } from "./config"
import { palette } from "./theme"

loadConfig()

if (process.argv.slice(2).includes("serve")) {
  const { serve } = await import("./server")
  await serve(config.port)
} else {
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    targetFps: 30,
    backgroundColor: palette.void,
  })
  createRoot(renderer).render(<App />)
}
