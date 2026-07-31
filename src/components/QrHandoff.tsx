import { useKeyboard } from "@opentui/react"
import { registerQRCode } from "@opentui/qrcode/react"
import { sshCommand } from "../adapters/ssh"
import type { Server } from "../domain"
import { setQr } from "../state/ui"
import { palette } from "../theme"

registerQRCode()

export function QrHandoff({ server }: { server: Server }) {
  const command = sshCommand(server)
  useKeyboard((key) => {
    if (key.name === "escape" || key.name === "q") setQr(false)
  })

  return (
    <box
      position="absolute"
      left="30%"
      top={3}
      border
      borderStyle="double"
      borderColor={palette.downlink}
      backgroundColor={palette.panel}
      title=" HANDOFF "
      titleAlignment="center"
      flexDirection="column"
      alignItems="center"
      padding={1}
      gap={1}
      zIndex={100}
    >
      <text fg={palette.starlight}>{server.name}</text>
      {command ? (
        <>
          <qr-code content={command} quietZone={4} scale={1} fit="contain" />
          <text fg={palette.static}>scan to uplink from your phone</text>
        </>
      ) : (
        <text fg={palette.caution}>no external IP</text>
      )}
      <text fg={palette.hairline}>[esc] close</text>
    </box>
  )
}
