import type { Instance } from "../domain"
import { MeterStat } from "./Meter"
import { Panel } from "./Panel"

export function Overview({ instances }: { instances: Instance[] }) {
  const total = instances.length || 1
  const nominal = instances.filter((s) => s.state === "running").length
  const hardened = instances.filter((s) => s.hardened === "hardened").length

  const byRegion = new Map<string, number>()
  for (const s of instances) byRegion.set(s.region, (byRegion.get(s.region) ?? 0) + 1)
  const regions = [...byRegion.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)

  return (
    <Panel index={1} title="OVERVIEW" height={3} right={`${instances.length} vessels`}>
      <box flexDirection="row" gap={4} paddingLeft={1} paddingRight={1}>
        <MeterStat label="NOMINAL" value={nominal / total} caption={`${nominal}/${instances.length}`} />
        <MeterStat label="HARDENED" value={hardened / total} caption={`${hardened}/${instances.length}`} />
        {regions.map(([region, count]) => (
          <MeterStat key={region} label={region} value={count / total} caption={String(count)} width={10} />
        ))}
      </box>
    </Panel>
  )
}
