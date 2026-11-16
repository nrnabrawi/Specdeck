import { execFile } from 'node:child_process'

export function run(bin: string, args: string[], cwd: string, timeoutMs = 20000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { cwd, timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, windowsHide: true }, (err, stdout) =>
      err ? reject(err) : resolve(stdout)
    )
  })
}
