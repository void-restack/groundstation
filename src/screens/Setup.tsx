import { config } from "../config"
import { ConfigForm } from "../components/ConfigForm"
import { applyAndSave, skipSetup } from "../state/config"
import { useProject } from "../state/fleet"
import { glyph, palette } from "../theme"

/**
 * First-run setup. The fleet view already works from the gcloud login alone, so
 * every field here is optional — this screen just lets the operator wire up
 * provisioning + uplink up front instead of hunting for env vars. Both save and
 * skip write the config file, so it never nags twice.
 */
export function Setup() {
  const project = useProject()

  return (
    <box flexDirection="column" width="100%" height="100%" padding={2} gap={1} backgroundColor={palette.void}>
      <text fg={palette.beacon}>GROUNDSTATION {glyph.sep} MISSION SETUP</text>
      <text fg={palette.static}>
        First contact. The board flies from your gcloud login alone — the fields below are optional and
        only unlock provisioning and uplink. Change them anytime with [ , ].
      </text>

      <box flexDirection="row" gap={2} marginTop={1}>
        <text fg={palette.static}>
          operator {glyph.arrowRight} <span fg={palette.starlight}>{config.deployUser}</span>
        </text>
        <text fg={palette.static}>
          gcloud project {glyph.arrowRight} <span fg={palette.starlight}>{project || "resolving…"}</span>
        </text>
      </box>

      <box
        marginTop={1}
        border
        borderStyle="double"
        borderColor={palette.downlink}
        title=" FLIGHT CONFIG "
        padding={1}
      >
        <ConfigForm
          onSave={(patch) => applyAndSave(patch)}
          onCancel={() => skipSetup()}
          saveLabel="save & launch"
          cancelLabel="skip for now"
        />
      </box>
    </box>
  )
}
