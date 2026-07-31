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
      width={34}
      border
      borderStyle="rounded"
      borderColor={palette.downlink}
      title="² FLEET"
      titleAlignment="left"
      titleColor={palette.downlink}
      flexDirection="column"
    >
      <scrollbox flexGrow={1} stickyScroll={false}>
        <box flexDirection="column" gap={1} paddingTop={1} paddingBottom={1}>
          {servers.map((s) => (
            <FleetCard key={s.id} server={s} selected={s.name === selected} />
          ))}
        </box>
      </scrollbox>
    </box>
  )
}
