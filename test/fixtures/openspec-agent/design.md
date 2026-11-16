## Context

The repository has no application code yet, so there is no existing invoice, customer or payment module to reuse. This design assumes a conventional billing service with invoices, customers, a stored card per customer, and a payment provider. See proposal.md for motivation; behavior is defined in the specs.

## Goals / Non-Goals

**Goals:**
- One mandate record per customer authorization, with the `pending`/`active`/`revoked` lifecycle.
- A single collection entry point that chooses direct debit or card, so the fallback lives in one place.

**Non-Goals:**
- Retry or dunning policy for failed debits not caused by revocation (for example insufficient funds).
- SEPA Credit Transfer or other bank payment methods.
- Non-EUR direct debit.
- Storing raw IBANs beyond what the provider requires.

## Decisions

- **Delegate mandate handling to the payment provider's SEPA Direct Debit.** The provider owns pre-notification rules, bank communication and return codes; we store a mandate row holding the provider's mandate id, reference, status, last 4 of the IBAN and consent timestamp. Alternative: run our own SEPA file/PAIN.008 exchange with a bank. Rejected: heavy compliance burden for a first version.
- **Status is driven by provider webhooks.** Provider events (activated, revoked/cancelled) update the mandate; the customer-initiated revoke calls the provider and then sets the status. Webhook handling is idempotent by event id.
- **Collection chooses the method at attempt time.** The collector reads the customer's current mandate: `active` and EUR means direct debit, else card. Alternative: store a payment method on the invoice at creation. Rejected: it would go stale when a mandate is revoked.
- **Single in-flight attempt per invoice.** Guarded by a unique constraint/row on in-flight attempts keyed by invoice id, so retries and webhook races do not double-charge.
- **Revocation fallback is event-driven.** A debit failure caused by revocation triggers a card charge through the same collector, after the in-flight attempt is closed.

## Risks / Trade-offs

- SEPA debits settle in days and can be returned weeks later → invoice shows a pending state until settled; late returns are out of scope here and reopen the invoice.
- Webhook delivery can be delayed, so a revoked mandate may still be seen as active → a failed debit with a revocation reason is treated as a revocation and triggers the fallback.
- Storing IBAN data raises privacy exposure → store only the provider id and last 4 digits.

## Migration Plan

Additive: new mandate table and a new status/method on collection attempts. Existing card-only customers are unaffected because no mandate exists for them. Rollback: disable the direct debit path with a feature flag; collection then uses cards only.

## Open Questions

- Which payment provider (Stripe, Adyen, GoCardless, other)? The choice affects webhook names, not the specs.
