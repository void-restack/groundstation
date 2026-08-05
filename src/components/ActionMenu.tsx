import type { Instance } from "../domain"
import { actionsFor, dispatch, type InstanceAction } from "../state/actions"
import { SearchModal, type SearchItem } from "./SearchModal"

export function ActionMenu({ instance, onClose }: { instance: Instance; onClose: () => void }) {
  const items = actionsFor(instance).map(
    (a): SearchItem<InstanceAction> => ({
      value: a,
      label: a.label,
      hint: a.billing ? `${a.kind} ${a.billing}` : a.kind,
    }),
  )
  return (
    <SearchModal<InstanceAction>
      title={`ACTIONS · ${instance.name}`}
      placeholder="filter actions…"
      items={items}
      onPick={(a) => {
        onClose()
        void dispatch(a, instance)
      }}
      onClose={onClose}
    />
  )
}
