## Purpose

Defines the SEPA mandate: a customer's recorded authorization to debit their IBAN, and the lifecycle states that decide whether it can be used for collection.

## ADDED Requirements

### Requirement: Create a SEPA mandate
The system SHALL let a customer create a SEPA mandate by supplying an account holder name, a valid IBAN and explicit consent. The mandate SHALL get a unique mandate reference and record the consent timestamp.

#### Scenario: Valid mandate created
- **WHEN** a customer submits a valid IBAN, account holder name and consent
- **THEN** a mandate is stored with a unique reference, the consent timestamp and status `pending` or `active` as the payment provider confirms

#### Scenario: Invalid IBAN rejected
- **WHEN** a customer submits an IBAN that fails validation
- **THEN** no mandate is created and the customer receives a validation error

#### Scenario: Consent missing
- **WHEN** a customer submits mandate details without consent
- **THEN** no mandate is created and the customer receives an error

### Requirement: Mandate lifecycle
A mandate SHALL be in exactly one of the states `pending`, `active` or `revoked`. Only an `active` mandate SHALL be usable for collection. A `revoked` mandate SHALL never return to `active`; the customer must create a new mandate.

#### Scenario: Mandate activated
- **WHEN** the payment provider confirms a `pending` mandate
- **THEN** its status becomes `active`

#### Scenario: Revoked mandate stays revoked
- **WHEN** a mandate is `revoked`
- **THEN** it cannot be set to `active` again

### Requirement: Revoke a mandate
The system SHALL set a mandate to `revoked` when the customer revokes it or when the payment provider reports it as cancelled or revoked. A customer SHALL have at most one `active` mandate at a time.

#### Scenario: Customer revokes
- **WHEN** a customer revokes their active mandate
- **THEN** its status becomes `revoked` and the revocation time is recorded

#### Scenario: Provider reports revocation
- **WHEN** the payment provider reports that a mandate was revoked (for example by the customer's bank)
- **THEN** the mandate status becomes `revoked`

#### Scenario: New mandate replaces active one
- **WHEN** a customer activates a new mandate while another is `active`
- **THEN** the earlier mandate becomes `revoked`
