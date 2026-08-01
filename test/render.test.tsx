import { expect, test } from "bun:test"
import { testRender } from "@opentui/react/test-utils"
import { FleetCard } from "../src/components/FleetCard"
import { Glass } from "../src/components/Glass"
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
