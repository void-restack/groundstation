import {
  capabilities,
  getPersisted,
  isFirstRun,
  saveConfig,
  type Capabilities,
  type PersistedConfig,
} from "../config"
import { createStore, useStore } from "../lib/store"

interface ConfigUIState {
  persisted: PersistedConfig
  capabilities: Capabilities
  firstRun: boolean
}

const store = createStore<ConfigUIState>({
  persisted: getPersisted(),
  capabilities: { ...capabilities },
  firstRun: isFirstRun(),
})

/** Re-read the config singletons into the reactive store (React sees changes). */
export function syncConfigStore() {
  store.set({ persisted: getPersisted(), capabilities: { ...capabilities }, firstRun: isFirstRun() })
}

export const useConfig = () => useStore(store)
export const useCapabilities = () => useStore(store).capabilities

/** Persist a patch and notify the UI. */
export function applyAndSave(patch: Partial<PersistedConfig>) {
  saveConfig(patch)
  syncConfigStore()
}

/** Dismiss first-run setup without changing anything (writes the current profile). */
export function skipSetup() {
  saveConfig({})
  syncConfigStore()
}
