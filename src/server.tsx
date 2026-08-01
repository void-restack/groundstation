import { createRoot } from "@opentui/react"
import { createServer } from "@opentui/ssh"
import { mkdirSync } from "fs"
import { join } from "path"
import { App } from "./App"
import { capabilities, config, configDir } from "./config"

export async function serve(port = config.port) {
  const authorizedKeys = config.authorizedKeys

  if (!capabilities.canServe) {
    console.error(`GROUNDSTATION: no authorized keys at ${authorizedKeys}`)
    console.error("add public keys there, or set GND_AUTHORIZED_KEYS, before serving over SSH.")
    process.exitCode = 1
    return
  }

  const dir = configDir()
  mkdirSync(dir, { recursive: true })
  const hostKeyPath = process.env.GND_HOST_KEY ?? join(dir, "host_key")

  const server = createServer({
    hostKey: { path: hostKeyPath },
    auth: { publicKey: { authorizedKeys } },
  }).serve((session) => {
    const root = createRoot(session.renderer)
    root.render(<App />)
    session.onClose(() => root.unmount())
  })

  const info = await server.listen(port)
  console.log(`GROUNDSTATION serving over SSH on ${info.host}:${info.port}`)
  console.log(`connect: ssh -p ${info.port} ${info.host}`)
}
