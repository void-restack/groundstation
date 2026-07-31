import type { Server } from "../domain"
import { statusVisual } from "../lib/status"
import { palette } from "../theme"

export function HealthHorizon({ servers }: { servers: Server[] }) {
  if (servers.length === 0) {
    return <text fg={palette.hairline}>{"─".repeat(24)}</text>
  }
  return (
    <box flexDirection="row" height={1} paddingLeft={1} paddingRight={1}>
      {servers.map((s) => (
        <text key={s.id} fg={statusVisual(s.status).color}>
          ━━
        </text>
      ))}
    </box>
  )
}
