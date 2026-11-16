import { _electron as electron, expect, test } from '@playwright/test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Needs `npm run build` first. Uses a throwaway user-data dir and a tiny OpenSpec repo; no network, no agent runs.
test('launches, adds a project without the folder dialog, shows the board, keyboard reaches the palette', async () => {
  const data = mkdtempSync(join(tmpdir(), 'sd-e2e-data-'))
  const repo = mkdtempSync(join(tmpdir(), 'sd-e2e-repo-'))
  const change = join(repo, 'openspec', 'changes', 'demo-change')
  mkdirSync(change, { recursive: true })
  writeFileSync(join(repo, 'openspec', 'config.yaml'), 'schema: spec-driven\n')
  writeFileSync(join(change, 'proposal.md'), '## Why\nSmoke.\n\n## What Changes\n- thing\n')
  writeFileSync(join(change, 'tasks.md'), '## 1. A\n- [x] 1.1 one\n- [ ] 1.2 two\n')

  const app = await electron.launch({ args: ['.', '--no-sandbox', `--user-data-dir=${data}`] })
  try {
    await app.firstWindow()
    // the hidden tray panel (/quick) is also a window; the main one has no /quick in its URL
    await expect.poll(() => app.windows().filter((w) => w.url() && !w.url().includes('quick')).length).toBe(1)
    const page = app.windows().find((w) => w.url() && !w.url().includes('quick'))!
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await expect(page.getByRole('heading', { name: /Which spec-driven framework/ })).toBeVisible()

    await page.evaluate((p) => window.specdeck.invoke('projects:add', { path: p, name: 'smoke', framework: 'openspec' }), repo)
    const [proj] = await page.evaluate(() => window.specdeck.invoke('projects:list', undefined))
    await page.evaluate((id) => window.specdeck.invoke('active:set', { id }), proj.id)
    // the page cached an empty project list; reload at the dashboard route so the app reads the new one
    await page.evaluate(() => {
      location.hash = '#/'
      location.reload()
    })
    await page.getByRole('link', { name: 'Board', exact: true }).click()
    await expect(page.getByText('demo-change').first()).toBeVisible()

    await page.keyboard.press('Control+k')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    expect(errors).toEqual([])
  } finally {
    await app.close()
    rmSync(data, { recursive: true, force: true })
    rmSync(repo, { recursive: true, force: true })
  }
})
