import { getProvider, registeredProviders } from "../providers/registry"
import type { ProviderId } from "../providers/types"
import { pushToast } from "../state/toast"
import { SearchModal, type SearchItem } from "./SearchModal"

/** Every cloud we intend to support. Availability comes from the registry. */
const KNOWN: { id: ProviderId; label: string }[] = [
  { id: "gcp", label: "Google Cloud" },
  { id: "aws", label: "Amazon Web Services" },
  { id: "azure", label: "Microsoft Azure" },
]

export function ProviderSwitcher({ onClose }: { onClose: () => void }) {
  const available = new Set(registeredProviders().map((p) => p.id))
  const active = getProvider().id
  const items: SearchItem<ProviderId>[] = KNOWN.map((p) => ({
    value: p.id,
    label: p.label,
    hint: p.id === active ? "active" : available.has(p.id) ? "available" : "coming soon",
  }))

  return (
    <SearchModal<ProviderId>
      title="SWITCH PROVIDER"
      placeholder="filter providers…"
      items={items}
      onPick={(id) => {
        if (id === active || available.has(id)) return
        const label = KNOWN.find((p) => p.id === id)?.label ?? id
        pushToast({
          title: `${label} is not available yet`,
          message: "GCP is the only provider for now.",
          variant: "warning",
        })
      }}
      onClose={onClose}
    />
  )
}
