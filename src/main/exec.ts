import { execFile } from 'node:child_process'

export function run(bin: string, args: string[], cwd: string, timeoutMs = 20000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { cwd, timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, windowsHide: true }, (err, stdout) =>
      err ? reject(err) : resolve(stdout)
    )
  })
}

export interface Captured {
  ok: boolean
  exitCode: number | null
  output: string
}

/** Runs a command and returns stdout+stderr even when it fails (for display after a confirmed run). */
export function runCapture(bin: string, args: string[], cwd: string, timeoutMs = 120000): Promise<Captured> {
  return new Promise((resolve) => {
    execFile(bin, args, { cwd, timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      const code = err ? (err as { code?: number | string }).code : 0
      resolve({
        ok: !err,
        exitCode: typeof code === 'number' ? code : null,
        output: `${stdout}${stderr}`.replace(/\x1b\[[0-9;]*m/g, '').trim()
      })
    })
  })
}
