import { expect, test } from "bun:test"
import { testRender } from "@opentui/react/test-utils"
import { FleetCard } from "../src/components/FleetCard"
import { Glass } from "../src/components/Glass"
import { LogView } from "../src/components/LogView"
import { SearchModal } from "../src/components/SearchModal"
import type { Server } from "../src/domain"

const server: Server = {
  id: "1",
  name: "lab",
  status: "RUNNING",
  zone: "us-central1-a",
  region: "us-central1",
  flightCode: "USC1·A",
  machineType: "e2-micro",
  externalIp: "203.0.113.21",
  internalIp: "10.128.0.14",
  createdAt: new Date(0),
  hardened: "hardened",
}

test("FleetCard shows the vessel name and machine type", async () => {
  const setup = await testRender(<FleetCard server={server} selected />, { width: 34, height: 4 })
  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("lab")
    expect(frame).toContain("e2-micro")
  } finally {
    setup.renderer.destroy()
  }
})

test("Glass renders telemetry for the selected vessel", async () => {
  const setup = await testRender(<Glass server={server} />, { width: 50, height: 16 })
  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("lab")
    expect(frame).toContain("203.0.113.21")
  } finally {
    setup.renderer.destroy()
  }
})

test("SearchModal renders its title and the filterable items", async () => {
  const items = [
    { value: "a", label: "us-central1-a" },
    { value: "b", label: "europe-west1-b" },
  ]
  const setup = await testRender(
    <SearchModal title="ZONE" items={items} onPick={() => {}} onClose={() => {}} />,
    { width: 60, height: 20 },
  )
  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("ZONE")
    expect(frame).toContain("us-central1-a")
  } finally {
    setup.renderer.destroy()
  }
})

test("LogView renders streamed lines pinned to the bottom", async () => {
  const setup = await testRender(
    <LogView lines={["awaiting boot", "provisioning host"]} title="DOWNLINK" height={6} />,
    { width: 40, height: 8 },
  )
  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("provisioning host")
  } finally {
    setup.renderer.destroy()
  }
})
