import type { Server } from "../domain"
import { palette } from "../theme"
import { FleetCard } from "./FleetCard"

export function FleetRail({
  servers,
  selected,
}: {
  servers: Server[]
  selected: string | null
}) {
  return (
    <box
      width={40}
      border
      borderStyle="rounded"
      borderColor={palette.downlink}
      title="² FLEET"
      titleAlignment="left"
      titleColor={palette.downlink}
      flexDirection="column"
    >
      <box flexDirection="row" paddingLeft={3}>
        <text fg={palette.static}>{"NAME".padEnd(17)}{"ZONE".padEnd(8)}TYPE</text>
      </box>
      <scrollbox flexGrow={1}>
        <box flexDirection="column">
          {servers.map((s) => (
            <FleetCard key={s.id} server={s} selected={s.name === selected} />
          ))}
        </box>
      </scrollbox>
    </box>
  )
}
