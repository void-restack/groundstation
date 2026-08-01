export interface ExecResult {
  stdout: string
  stderr: string
  code: number
}

export async function exec(cmd: string[], cwd?: string): Promise<ExecResult> {
  const proc = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "pipe" })
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return { stdout, stderr, code }
}

export async function execJSON<T>(cmd: string[], cwd?: string): Promise<T> {
  const { stdout, stderr, code } = await exec(cmd, cwd)
  if (code !== 0) throw new Error(stderr.trim() || `${cmd[0]} exited ${code}`)
  return JSON.parse(stdout) as T
}

export interface StreamOptions {
  cwd?: string
  env?: Record<string, string>
  /** fed to the process stdin then closed — e.g. a script piped into `ssh … bash -s`. */
  stdin?: string
}

export async function streamLines(
  cmd: string[],
  onLine: (line: string) => void,
  opts: StreamOptions = {},
): Promise<number> {
  const proc = Bun.spawn(cmd, {
    cwd: opts.cwd,
    env: opts.env ? { ...process.env, ...opts.env } : process.env,
    stdin: opts.stdin != null ? new TextEncoder().encode(opts.stdin) : "ignore",
    stdout: "pipe",
    stderr: "pipe",
  })
  const decoder = new TextDecoder()
  const pump = async (s: ReadableStream<Uint8Array>) => {
    const reader = s.getReader()
    let buffer = ""
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let nl: number
      while ((nl = buffer.indexOf("\n")) !== -1) {
        onLine(buffer.slice(0, nl))
        buffer = buffer.slice(nl + 1)
      }
    }
    if (buffer.length > 0) onLine(buffer)
  }
  await Promise.all([pump(proc.stdout), pump(proc.stderr)])
  return proc.exited
}
