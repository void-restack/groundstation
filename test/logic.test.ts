import { expect, test } from "bun:test"
import { parseLine } from "../src/adapters/ansible"
import { duration, elapsed, flightCode, regionOf } from "../src/lib/format"
import { lerpHex } from "../src/lib/color"

test("flightCode maps zones to callsigns", () => {
  expect(flightCode("us-central1-a")).toBe("USC1·A")
  expect(flightCode("asia-south1-b")).toBe("ASS1·B")
  expect(flightCode("europe-west4-c")).toBe("EUW4·C")
})

test("regionOf strips the cell", () => {
  expect(regionOf("us-central1-a")).toBe("us-central1")
})

test("duration formats human units", () => {
  expect(duration(500)).toBe("500ms")
  expect(duration(4200)).toBe("4.2s")
  expect(duration(90000)).toBe("1m30s")
})

test("elapsed formats mission time", () => {
  const base = new Date(0)
  expect(elapsed(base, 3661_000)).toBe("01:01:01")
  expect(elapsed(base, 90000_000)).toBe("1d 01:00")
})

test("lerpHex interpolates endpoints", () => {
  expect(lerpHex("#000000", "#ffffff", 0)).toBe("#000000")
  expect(lerpHex("#000000", "#ffffff", 1)).toBe("#ffffff")
})

test("parseLine recognises ansible output", () => {
  expect(parseLine("TASK [base : Install essential packages] ****")).toEqual({
    type: "task",
    role: "base",
    name: "Install essential packages",
  })
  expect(parseLine("TASK [Gathering Facts] ***")).toEqual({
    type: "task",
    role: null,
    name: "Gathering Facts",
  })
  expect(parseLine("changed: [lab]")).toEqual({ type: "result", state: "changed", host: "lab" })
  expect(parseLine("ok: [lab]")).toEqual({ type: "result", state: "ok", host: "lab" })
  expect(parseLine("fatal: [lab]: FAILED! => {}")).toMatchObject({ type: "result", state: "failed" })
  expect(parseLine("PLAY RECAP ***")).toEqual({ type: "recap", failures: 0 })
  expect(parseLine("some noise")).toEqual({ type: "log", line: "some noise" })
})
