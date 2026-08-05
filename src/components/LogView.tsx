import { palette } from "../theme"

const MAX = 500

/**
 * A scrollable, auto-following log. `stickyStart="bottom"` pins the view to the
 * newest line as content streams in, but releases when the user scrolls up.
 * Lines are capped so a long run stays bounded. Wrap in a titled border by
 * passing `title`, or drop it into an existing panel with a fixed `height`.
 */
export function LogView({
  lines,
  title,
  height,
}: {
  lines: string[]
  title?: string
  height?: number
}) {
  const view = lines.length > MAX ? lines.slice(-MAX) : lines

  const body = (
    <scrollbox
      flexGrow={height === undefined ? 1 : undefined}
      height={height}
      stickyScroll
      stickyStart="bottom"
      paddingLeft={1}
      paddingRight={1}
    >
      {view.map((line, i) => (
        <text key={i} fg={palette.muted}>
          {line}
        </text>
      ))}
    </scrollbox>
  )

  if (!title) return body
  return (
    <box flexGrow={1} border borderStyle="rounded" borderColor={palette.border} title={` ${title} `}>
      {body}
    </box>
  )
}
