import type { Instance } from "../domain"
import { palette } from "../theme"
import { FleetCard } from "./FleetCard"

export function FleetRail({
  instances,
  selected,
}: {
  instances: Instance[]
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
          {instances.map((s) => (
            <FleetCard key={s.id} instance={s} selected={s.name === selected} />
          ))}
        </box>
      </scrollbox>
    </box>
  )
}
