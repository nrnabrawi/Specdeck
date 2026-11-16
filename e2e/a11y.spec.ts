import { _electron as electron, expect, test } from '@playwright/test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// AC-004: automated WCAG 2.1 A/AA scan of every page in light and dark. Needs `npm run build` first.
// Electron cannot open the extra page AxeBuilder needs, so axe-core itself is evaluated inside the page.
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')
const ROUTES = ['/', '/board', '/specs', '/wizard', '/activity', '/stats', '/addons', '/onboarding', '/quick']

test('no WCAG 2.1 AA violations on any page, light or dark', async () => {
  test.setTimeout(180_000)
  const data = mkdtempSync(join(tmpdir(), 'sd-a11y-data-'))
  const repo = mkdtempSync(join(tmpdir(), 'sd-a11y-repo-'))
  const change = join(repo, 'openspec', 'changes', 'demo-change')
  mkdirSync(change, { recursive: true })
  writeFileSync(join(repo, 'openspec', 'config.yaml'), 'schema: spec-driven\n')
  writeFileSync(join(change, 'proposal.md'), '## Why\nWhy.\n\n## What Changes\n- thing\n')
  writeFileSync(join(change, 'tasks.md'), '## 1. A\n- [x] 1.1 one\n- [ ] 1.2 two\n')
  const app = await electron.launch({ args: ['.', '--no-sandbox', `--user-data-dir=${data}`] })
  try {
    await app.firstWindow()
    await expect.poll(() => app.windows().filter((w) => w.url() && !w.url().includes('quick')).length).toBe(1)
    const page = app.windows().find((w) => w.url() && !w.url().includes('quick'))!
    await page.evaluate((p) => window.specdeck.invoke('projects:add', { path: p, name: 'a11y', framework: 'openspec' }), repo)
    const base = page.url().split('#')[0]
    const bad: string[] = []
    for (const theme of ['light', 'dark']) {
      await page.evaluate((t) => document.documentElement.classList.toggle('dark', t === 'dark'), theme)
      for (const route of ROUTES) {
        await page.evaluate((r) => {
          location.hash = '#' + r
          location.reload()
        }, route)
        await page.waitForLoadState('load')
        await page.waitForTimeout(700)
        await page.evaluate((t) => document.documentElement.classList.toggle('dark', t === 'dark'), theme)
        await page.waitForTimeout(500) // let colour transitions finish
        await page.evaluate(axeSource)
        const violations = await page.evaluate(async () => {
          const r = await (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
          })
          return r.violations.map((v) => ({ id: v.id, n: v.nodes.length, first: v.nodes[0].target.join(' ') }))
        })
        for (const v of violations) bad.push(`${theme} ${route}: ${v.id} (${v.n}) ${v.first}`)
      }
    }
    expect(base).toContain('index.html')
    expect(bad).toEqual([])

    // Keyboard: everything reachable by Tab shows a focus indicator (outline or ring), and the palette opens and closes by key.
    for (const route of ['/', '/board', '/specs', '/wizard', '/addons']) {
      await page.evaluate((r) => {
        location.hash = '#' + r
        location.reload()
      }, route)
      await page.waitForLoadState('load')
      await page.waitForTimeout(700)
      const seen = new Set<string>()
      for (let i = 0; i < 60; i++) {
        await page.keyboard.press('Tab')
        const f = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement
          if (!el || el === document.body) return null
          const cs = getComputedStyle(el)
          const visible = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none'
          return { id: el.tagName + ':' + (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30), visible }
        })
        if (f && !f.visible) bad.push(`no focus indicator on ${route}: ${f.id}`)
        if (f) seen.add(f.id)
      }
      expect(seen.size, `${route} reachable by Tab`).toBeGreaterThan(5)
    }
    await page.keyboard.press('Control+k')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(bad).toEqual([])
  } finally {
    await app.close()
    rmSync(data, { recursive: true, force: true })
    rmSync(repo, { recursive: true, force: true })
  }
})
