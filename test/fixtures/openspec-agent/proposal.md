## Why

EU customers want to pay by SEPA direct debit instead of cards. Cards cost more per transaction, and many EU customers prefer or require direct debit for recurring invoices.

## What Changes

- Add a SEPA mandate model: a customer's authorization to debit an IBAN, with a lifecycle (pending, active, revoked).
- Collect due invoices by SEPA direct debit when the customer has an active mandate.
- When a mandate is revoked, fall back to the customer's card for collecting due invoices.

## Capabilities

### New Capabilities
- `sepa-mandates`: creating, storing and revoking a customer's SEPA mandate, and its lifecycle states.
- `invoice-collection`: how due invoices are collected, preferring direct debit on an active mandate and falling back to card when the mandate is revoked.

### Modified Capabilities
<!-- None: openspec/specs/ is empty, so there is no existing payment spec to modify. -->

## Impact

- The repository contains no application code yet (only OpenSpec scaffolding), so there are no existing modules to modify. Payment, invoice and customer code is assumed to be created or integrated later; the design records the assumptions.
- A payment provider with SEPA Direct Debit support is needed (provider choice is an open question in design.md).
- New persisted data: mandates, linked to customers.
