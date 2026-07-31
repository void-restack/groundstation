import type { BoxRenderable } from "@opentui/core"
import { useRenderer } from "@opentui/react"
import { THREE, ThreeRenderable } from "@opentui/three"
import { useEffect, useRef } from "react"
import type { Server } from "../domain"
import { latLngToVec3, regionLatLng } from "../lib/geo"
import { palette } from "../theme"

function regionColor(list: Server[]): string {
  if (list.some((s) => s.status === "TERMINATED" || s.status === "SUSPENDED")) return palette.flare
  if (list.some((s) => s.status !== "RUNNING")) return palette.caution
  return palette.nominal
}

function uniqueRegions(servers: Server[]): Map<string, Server[]> {
  const map = new Map<string, Server[]>()
  for (const s of servers) {
    const list = map.get(s.region) ?? []
    list.push(s)
    map.set(s.region, list)
  }
  return map
}

export function Globe({ servers }: { servers: Server[] }) {
  const renderer = useRenderer()
  const ref = useRef<BoxRenderable | null>(null)

  useEffect(() => {
    const target = ref.current
    if (!target) return

    const scene = new THREE.Scene()
    scene.add(new THREE.AmbientLight(new THREE.Color(0.4, 0.4, 0.45), 1))
    const key = new THREE.DirectionalLight(new THREE.Color(1, 0.96, 0.9), 1.1)
    key.position.set(2.5, 2, 3)
    scene.add(key)

    const group = new THREE.Group()
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 16),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.hairline), wireframe: true }),
    )
    group.add(globe)

    for (const [region, list] of uniqueRegions(servers)) {
      const [lat, lng] = regionLatLng(region)
      const [x, y, z] = latLngToVec3(lat, lng, 1.03)
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(regionColor(list)) }),
      )
      marker.position.set(x, y, z)
      group.add(marker)
    }
    scene.add(group)

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.set(0, 0.4, 3)
    camera.lookAt(0, 0, 0)

    let view: ThreeRenderable | null = null
    try {
      view = new ThreeRenderable(renderer, {
        width: "100%",
        height: "100%",
        scene,
        camera,
        autoAspect: true,
        renderer: { alpha: true, focalLength: 8 },
      })
      target.add(view)
    } catch {
      return
    }

    const spin = setInterval(() => {
      group.rotation.y += 0.02
    }, 33)
    spin.unref?.()

    return () => {
      clearInterval(spin)
      try {
        view?.destroy()
      } catch {
        /* already gone */
      }
    }
  }, [renderer, servers])

  return <box ref={ref} flexGrow={1} />
}
