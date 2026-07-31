import type { Server } from "../domain"
import { MeterStat } from "./Meter"
import { Panel } from "./Panel"

export function Overview({ servers }: { servers: Server[] }) {
  const total = servers.length || 1
  const nominal = servers.filter((s) => s.status === "RUNNING").length
  const hardened = servers.filter((s) => s.hardened === "hardened").length

  const byRegion = new Map<string, number>()
  for (const s of servers) byRegion.set(s.region, (byRegion.get(s.region) ?? 0) + 1)
  const regions = [...byRegion.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)

  return (
    <Panel index={1} title="OVERVIEW" height={3} right={`${servers.length} vessels`}>
      <box flexDirection="row" gap={4} paddingLeft={1} paddingRight={1}>
        <MeterStat label="NOMINAL" value={nominal / total} caption={`${nominal}/${servers.length}`} />
        <MeterStat label="HARDENED" value={hardened / total} caption={`${hardened}/${servers.length}`} />
        {regions.map(([region, count]) => (
          <MeterStat key={region} label={region} value={count / total} caption={String(count)} width={10} />
        ))}
      </box>
    </Panel>
  )
}
