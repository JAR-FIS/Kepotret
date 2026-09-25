# \# Kepotret Engineering Instructions

#

# \## Project Context

#

# Kepotret is a web-based digital disposable camera platform for events.

#

# The product is designed primarily for:

# \- Wedding Organizer / Event Organizer

# \- Wedding events

# \- Personal events

# \- Communities

# \- Sports and competitions

# \- Trips and travel

# \- Corporate and organizational events

#

# Guests access an event album using QR code or shared link.

#

# Guests do not need an account.

#

# Guests capture photos directly from the browser camera.

#

# Photo upload from device storage is not supported.

#

# \---

#

# \## Source of Truth

#

# Always follow the approved project documentation.

#

# Priority order:

#

# 1\. Approved Product Requirements Document (PRD)

# 2\. Approved BPMN and Use Case document

# 3\. Approved DFD and ERD

# 4\. Approved architecture documentation

# 5\. OpenAPI contract

# 6\. Approved UI/UX specifications

# 7\. Existing implementation

#

# If implementation conflicts with an approved document, do not silently modify the product behavior.

#

# Report the conflict first.

#

# Do not invent missing product requirements.

#

# \---

#

# \## Product Rules

#

# Important locked product rules include:

#

# \- Guests do not log in.

# \- Guest names are not credentials.

# \- Duplicate guest names are allowed.

# \- Guests capture photos only using the browser camera.

# \- Device photo upload is not supported.

# \- Guests cannot capture photos after the event ends.

# \- Event duration is maximum 5 days.

# \- Albums can be created maximum 3 months in advance.

# \- Free quota is 30 photos per album.

# \- Maximum album capacity is 10,000 photos.

# \- Soft-deleted photos still count toward quota.

# \- Photo maximum size is 700000 bytes.

# \- Publish delay options are:

# &#x20; - D+1

# &#x20; - D+3

# &#x20; - D+5

# &#x20; - D+7

# \- Payment and capacity upgrades are per album.

# \- Upgrade/payment closes 120 minutes before event end.

# \- Refunds are not supported.

# \- Guest count is finalized at the end of the event.

#

# Do not change these rules unless explicitly instructed.

#

# \---

#

# \## API Contract

#

# The OpenAPI contract is the source of truth for frontend/backend integration.

#

# Rules:

#

# \- Do not create handwritten duplicate API DTOs.

# \- Prefer generated types and API clients.

# \- Do not modify the OpenAPI contract unless explicitly instructed.

# \- Report API contract inconsistencies before implementing workarounds.

# \- Breaking API changes require explicit approval.

#

# \---

#

# \## Engineering Priorities

#

# Prioritize in this order:

#

# 1\. Correctness

# 2\. Security

# 3\. Maintainability

# 4\. Simplicity

# 5\. Testing

# 6\. Developer experience

# 7\. Performance

# 8\. Scalability

#

# Avoid unnecessary abstraction.

#

# Avoid premature optimization.

#

# Do not introduce new dependencies without clear justification.

#

# \---

#

# \## Security

#

# Never:

#

# \- commit secrets

# \- expose API keys

# \- disable security controls to make tests pass

# \- weaken authentication or authorization

# \- bypass validation

# \- trust user input without validation

#

# Sensitive configuration must come from environment variables or approved secret management.

#

# \---

#

# \## Coding Rules

#

# Before modifying code:

#

# 1\. inspect relevant existing code

# 2\. inspect related project documentation

# 3\. understand existing architecture

# 4\. identify dependencies

# 5\. identify possible side effects

#

# Do not refactor unrelated code during feature implementation.

#

# Prefer small, reviewable changes.

#

# Maintain existing conventions unless there is a strong technical reason to change them.

#

# \---

#

# \## Testing

#

# After implementation, run all applicable validation:

#

# \- lint

# \- typecheck

# \- unit tests

# \- integration tests

# \- build

#

# For critical flows also validate:

#

# \- error state

# \- empty state

# \- loading state

# \- permission behavior

# \- edge cases

# \- responsive behavior

#

# Do not claim completion if relevant checks are failing.

#

# \---

#

# \## Git

#

# Do not work directly on main/master for feature development.

#

# Use feature branches.

#

# Examples:

#

# \- feat/landing-page

# \- feat/auth

# \- feat/album-dashboard

# \- feat/guest-camera

# \- fix/photo-quota

# \- chore/update-openapi-client

#

# Do not commit automatically unless explicitly instructed.

#

# Before completion, report:

#

# \- files changed

# \- major implementation decisions

# \- tests executed

# \- failures

# \- assumptions

# \- unresolved risks

#

# \---

#

# \## OpenAI Documentation

#

# Always use the OpenAI developer documentation MCP server when working with:

#

# \- OpenAI API

# \- Codex

# \- MCP

# \- OpenAI plugins

# \- OpenAI SDKs

# \- OpenAI platform features

#

# Do not rely solely on model memory for OpenAI platform behavior.

#

# \---

#

# \## Agent Behavior

#

# For large tasks:

#

# 1\. inspect

# 2\. analyze

# 3\. propose plan

# 4\. implement

# 5\. validate

# 6\. report

#

# Do not perform broad refactors unless explicitly requested.

#

# If a task requires changing architecture, business rules, API contracts, or database schema, report it before proceeding.

#

# If requirements are ambiguous, stop and identify the ambiguity rather than inventing behavior.

