## 1. Mandate model

- [ ] 1.1 Add a `sepa_mandates` table/model (customer, provider mandate id, reference, IBAN last 4, holder name, status, consent timestamp, revoked timestamp) with a one-active-per-customer constraint
- [ ] 1.2 Implement IBAN validation and mandate creation, requiring consent (sepa-mandates: create)
- [ ] 1.3 Implement status transitions and forbid `revoked` -> `active`; revoke the old mandate when a new one activates
- [ ] 1.4 Add customer-facing revoke action that calls the provider and records the revocation

## 2. Provider integration

- [ ] 2.1 Add provider client calls for creating, and revoking a SEPA mandate and initiating a debit
- [ ] 2.2 Add an idempotent webhook handler for mandate activated/revoked and debit paid/failed events

## 3. Collection

- [ ] 3.1 Update the collector to choose direct debit for EUR invoices with an `active` mandate, else card
- [ ] 3.2 Add the one-in-flight-attempt guard per invoice
- [ ] 3.3 Implement card fallback for revoked mandates, including a debit failing because of revocation
- [ ] 3.4 Notify the customer when no mandate and no card is available
- [ ] 3.5 Add a feature flag to disable the direct debit path

## 4. Tests

- [ ] 4.1 Tests for each mandate scenario (invalid IBAN, missing consent, lifecycle, revocation)
- [ ] 4.2 Tests for each collection scenario (active mandate, non-EUR, revoked with/without card, in-flight retry)
