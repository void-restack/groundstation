import { useEffect, useState } from "react"
import { getProvider } from "../providers/registry"
import type { Choice } from "../providers/types"
import { switchAccount } from "../state/fleet"
import { SearchModal } from "./SearchModal"

export function ProjectSwitcher({
  onClose,
  load = () => getProvider().listAccounts(),
}: {
  onClose: () => void
  load?: () => Promise<Choice[]>
}) {
  const [accounts, setAccounts] = useState<Choice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    load()
      .then((a) => {
        if (alive) setAccounts(a)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <SearchModal<string>
      title="SWITCH PROJECT"
      placeholder={loading ? "loading projects…" : "filter projects…"}
      items={accounts}
      onPick={(v) => {
        onClose()
        void switchAccount(v)
      }}
      onClose={onClose}
    />
  )
}
