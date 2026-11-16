import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const cli = (cwd: string, ...args: string[]) => execFileSync('openspec', args, { cwd, encoding: 'utf8' })

const w = (root: string, rel: string, body: string) => {
  const p = join(root, rel)
  mkdirSync(join(p, '..'), { recursive: true })
  writeFileSync(p, body)
}

/** Builds a repo with the real OpenSpec CLI (init + archive); change artifacts follow OpenSpec's documented format. */
export function makeOpenspecRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'specdeck-os-'))
  cli(root, 'init', '--tools', 'claude')

  mkdirSync(join(root, 'openspec/changes/explore-me'), { recursive: true })
  w(root, 'openspec/changes/propose-me/proposal.md', '## Why\nNeed it.\n\n## What Changes\n- thing\n')

  w(root, 'openspec/changes/old-one/proposal.md', '## Why\nHistoric.\n')
  w(
    root,
    'openspec/changes/old-one/specs/auth/spec.md',
    '## ADDED Requirements\n### Requirement: Login\nThe system SHALL log users in.\n\n#### Scenario: ok\n- **WHEN** a user logs in\n- **THEN** a session exists\n'
  )
  w(root, 'openspec/changes/old-one/tasks.md', '## 1. Do\n- [x] 1.1 Done\n')
  cli(root, 'archive', 'old-one', '--yes')

  w(root, 'openspec/changes/apply-me/proposal.md', '## Why\nPay by SEPA.\n\n## What Changes\n- mandate\n')
  w(
    root,
    'openspec/changes/apply-me/specs/auth/spec.md',
    [
      '## ADDED Requirements',
      '### Requirement: SEPA',
      'The system SHALL collect by SEPA.',
      '',
      '#### Scenario: due',
      '- **WHEN** an invoice is due',
      '- **THEN** a debit is submitted',
      '',
      '## MODIFIED Requirements',
      '### Requirement: Login',
      'The system SHALL log users in with MFA.',
      '',
      '## REMOVED Requirements',
      '### Requirement: Legacy',
      '**Reason**: obsolete',
      '',
      '## RENAMED Requirements',
      '- FROM: `### Requirement: Old name`',
      '- TO: `### Requirement: New name`',
      ''
    ].join('\n')
  )
  w(root, 'openspec/changes/apply-me/tasks.md', '## 1. Impl\n- [x] 1.1 One\n- [ ] 1.2 Two\n- [ ] 1.3 Three\n')
  return root
}
