import { expect, test } from "bun:test"
import { testRender } from "@opentui/react/test-utils"
import { ActionMenu } from "../src/components/ActionMenu"
import { ConfigForm } from "../src/components/ConfigForm"
import { ConfirmDialog } from "../src/components/ConfirmDialog"
import { DetailDialog } from "../src/components/DetailDialog"
import { FleetCard } from "../src/components/FleetCard"
import { Glass } from "../src/components/Glass"
import { LogView } from "../src/components/LogView"
import { OpRunner } from "../src/components/OpRunner"
import { ProjectSwitcher } from "../src/components/ProjectSwitcher"
import { ProviderSwitcher } from "../src/components/ProviderSwitcher"
import { SearchModal } from "../src/components/SearchModal"
import { ChecklistModal } from "../src/components/ChecklistModal"
import { PromptModal } from "../src/components/PromptModal"
import { ToolsModal } from "../src/components/ToolsModal"
import { Launch } from "../src/screens/Launch"
import { actionsFor, describeLines } from "../src/state/actions"
import { confirm, resolveConfirm } from "../src/state/confirm"
import { showDetail, dismissDetail } from "../src/state/detail"
import { runOp } from "../src/state/oprunner"
import { serverToInstance } from "../src/providers/gcp"
import type { Server } from "../src/domain"

const server: Server = {
  id: "1",
  name: "lab",
  status: "RUNNING",
  zone: "us-central1-a",
  region: "us-central1",
  machineType: "e2-micro",
  externalIp: "203.0.113.21",
  internalIp: "10.128.0.14",
  createdAt: new Date(0),
  hardened: "hardened",
}
const instance = serverToInstance(server, "demo-project")

test("FleetCard shows the instance name and machine type", async () => {
  const setup = await testRender(<FleetCard instance={instance} selected />, { width: 48, height: 4 })
  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("lab")
    expect(frame).toContain("e2-micro")
  } finally {
    setup.renderer.destroy()
  }
})

test("Glass renders details for the selected instance", async () => {
  const setup = await testRender(<Glass instance={instance} />, { width: 50, height: 16 })
  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("lab")
    expect(frame).toContain("203.0.113.21")
  } finally {
    setup.renderer.destroy()
  }
})

test("actionsFor gates lifecycle actions by instance state", () => {
  const running = actionsFor(instance).map((a) => a.id)
  expect(running).toContain("stop")
  expect(running).toContain("delete")
  expect(running).not.toContain("start")

  const stopped = actionsFor({ ...instance, state: "terminated" }).map((a) => a.id)
  expect(stopped).toContain("start")
  expect(stopped).not.toContain("stop")
})

test("ActionMenu lists the state-valid actions for a running instance", async () => {
  const setup = await testRender(<ActionMenu instance={instance} onClose={() => {}} />, {
    width: 60,
    height: 20,
  })
  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("ACTIONS")
    expect(frame).toContain("Stop")
    expect(frame).toContain("Delete")
    expect(frame).not.toContain("Start") // running → start is gated out
  } finally {
    setup.renderer.destroy()
  }
})

test("describeLines renders the normalized instance fields (state + raw)", () => {
  const lines = describeLines(instance)
  expect(lines.some((l) => l.startsWith("PROVIDER") && l.includes("gcp"))).toBe(true)
  expect(lines.some((l) => l.includes("running") && l.includes("(RUNNING)"))).toBe(true)
  expect(lines.some((l) => l.startsWith("SIZE") && l.includes("e2-micro"))).toBe(true)
})

test("DetailDialog renders the instance detail read-out", async () => {
  showDetail("DESCRIBE · lab", describeLines(instance))
  const setup = await testRender(<DetailDialog />, { width: 60, height: 20 })
  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("DESCRIBE")
    expect(frame).toContain("e2-micro")
  } finally {
    dismissDetail()
    setup.renderer.destroy()
  }
})

test("ConfirmDialog shows the effect summary + billing note for a pending request", async () => {
  const pending = confirm({
    title: "Stop lab?",
    message: "Stop lab in us-central1-a.",
    billing: "halts compute; disks still bill",
    mode: "yn",
  })
  const setup = await testRender(<ConfirmDialog />, { width: 60, height: 12 })
  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("Stop lab?")
    expect(frame).toContain("halts compute")
  } finally {
    resolveConfirm(false)
    await pending
    setup.renderer.destroy()
  }
})

test("OpRunner shows the op title and running chrome while an op is in flight", async () => {
  let release = () => {}
  const gate = new Promise<void>((r) => (release = r))
  const done = runOp("stop · lab", async () => {
    await gate
  })
  const setup = await testRender(<OpRunner />, { width: 60, height: 20 })
  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("stop · lab")
    expect(frame).toContain("running")
    expect(frame).toContain("working…")
  } finally {
    release()
    await done
    setup.renderer.destroy()
  }
})

test("ProjectSwitcher renders the project picker via SearchModal", async () => {
  const setup = await testRender(
    <ProjectSwitcher onClose={() => {}} load={async () => [{ value: "proj-a", label: "proj-a", hint: "Project A" }]} />,
    { width: 60, height: 20 },
  )
  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("SWITCH PROJECT")
  } finally {
    setup.renderer.destroy()
  }
})

test("ProviderSwitcher lists clouds and tags unavailable ones coming soon", async () => {
  const setup = await testRender(<ProviderSwitcher onClose={() => {}} />, { width: 60, height: 20 })
  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("SWITCH PROVIDER")
    expect(frame).toContain("Google Cloud")
    expect(frame).toContain("coming soon")
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

test("ConfigForm renders the config fields", async () => {
  const setup = await testRender(<ConfigForm onSave={() => {}} onCancel={() => {}} />, {
    width: 70,
    height: 18,
  })
  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("CLOUD-INIT")
    expect(frame).toContain("SSH KEY")
    expect(frame).toContain("PORT")
  } finally {
    setup.renderer.destroy()
  }
})

test("ToolsModal lists the external dependencies with status", async () => {
  const setup = await testRender(<ToolsModal />, { width: 80, height: 16 })
  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("DEPENDENCIES")
    expect(frame).toContain("gcloud")
    expect(frame).toContain("ssh")
  } finally {
    setup.renderer.destroy()
  }
})

test("Launch form renders sectioned fields inside a scrollbox", async () => {
  const setup = await testRender(<Launch />, { width: 80, height: 30 })
  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("NEW INSTANCE")
    expect(frame).toContain("PRESET") // preset loader at the top of the form
    expect(frame).toContain("LOAD")
    expect(frame).toContain("BASICS")
    expect(frame).toContain("NAME")
  } finally {
    setup.renderer.destroy()
  }
})

test("ChecklistModal renders rows with checkboxes and marks the pre-selected", async () => {
  const items = [
    { value: "a", label: "id_ed25519.pub" },
    { value: "b", label: "google_compute_engine.pub" },
  ]
  const setup = await testRender(
    <ChecklistModal title="AUTHORIZE SSH KEYS" items={items} selected={["b"]} onConfirm={() => {}} onClose={() => {}} />,
    { width: 60, height: 16 },
  )
  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("AUTHORIZE SSH KEYS")
    expect(frame).toContain("id_ed25519.pub")
    expect(frame).toContain("[x]") // the pre-selected key
    expect(frame).toContain("[ ]") // the unselected key
  } finally {
    setup.renderer.destroy()
  }
})

test("PromptModal renders its title and prompt input", async () => {
  const setup = await testRender(
    <PromptModal title="SAVE PRESET" placeholder="name this config" onSubmit={() => {}} onClose={() => {}} />,
    { width: 60, height: 10 },
  )
  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("SAVE PRESET")
    expect(frame).toContain("name this config")
    expect(frame).toContain("enter save")
  } finally {
    setup.renderer.destroy()
  }
})

test("LogView renders streamed lines pinned to the bottom", async () => {
  const setup = await testRender(
    <LogView lines={["awaiting boot", "provisioning host"]} title="OUTPUT" height={6} />,
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
