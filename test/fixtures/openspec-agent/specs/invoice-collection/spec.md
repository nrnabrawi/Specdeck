## Purpose

Defines how due invoices are collected from a customer: by SEPA direct debit when an active mandate exists, otherwise by card.

## ADDED Requirements

### Requirement: Collect due invoices by direct debit
When an invoice becomes due and its customer has an `active` SEPA mandate, the system SHALL collect it by SEPA direct debit for the invoice amount in EUR, and SHALL NOT charge the customer's card.

#### Scenario: Active mandate
- **WHEN** an invoice is due and the customer has an `active` mandate
- **THEN** a direct debit for the invoice amount is initiated against the mandate and no card charge is made

#### Scenario: Debit succeeds
- **WHEN** the direct debit is confirmed as paid
- **THEN** the invoice is marked paid

#### Scenario: Non-EUR invoice
- **WHEN** an invoice is not denominated in EUR
- **THEN** it is collected by card as before, even if an active mandate exists

### Requirement: Fall back to card when mandate is revoked
When an invoice is due and the customer has no `active` mandate because it was revoked, the system SHALL collect the invoice from the customer's card on file.

#### Scenario: Revoked mandate, card on file
- **WHEN** an invoice is due, the customer's mandate is `revoked` and a card is on file
- **THEN** the invoice is charged to the card

#### Scenario: Revocation while a debit is pending
- **WHEN** a mandate is revoked while a direct debit for an invoice is still unsettled and that debit then fails because of the revocation
- **THEN** the invoice is charged to the card on file

#### Scenario: Revoked mandate, no card
- **WHEN** an invoice is due, the mandate is `revoked` and no card is on file
- **THEN** the invoice stays unpaid and the customer is notified to provide a payment method

### Requirement: No double collection
The system SHALL NOT collect the same invoice amount more than once. An invoice SHALL have at most one in-flight collection attempt at a time.

#### Scenario: Retry after earlier attempt is unsettled
- **WHEN** collection of an invoice is triggered while a direct debit for it is still in flight
- **THEN** no second charge is started
