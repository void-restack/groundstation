import { createRoot } from "@opentui/react"
import { createServer } from "@opentui/ssh"
import { mkdirSync } from "fs"
import { homedir } from "os"
import { dirname, join } from "path"
import { App } from "./App"

export async function serve(port = 2222) {
  const authorizedKeys = process.env.GND_AUTHORIZED_KEYS ?? join(homedir(), ".ssh", "deploy_osiris_01.pub")

  const hostKeyPath = process.env.GND_HOST_KEY ?? join(homedir(), ".config", "groundstation", "host_key")
  mkdirSync(dirname(hostKeyPath), { recursive: true })

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
