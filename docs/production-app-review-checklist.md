# Production app publication checklist

This is the living checklist for publishing `family-memory-assistant` through Meta App Review. Keep statuses evidence-based. A task is not complete merely because the code or dashboard configuration exists; it is complete when the relevant Meta screen, API response, deployment check, or recording has been verified.

## Status legend

- **BLOCKED** — prevents submission or approval.
- **PENDING** — known work remains.
- **VERIFY** — may be configured, but evidence is still required.
- **READY** — verified with current evidence.
- **NOT APPLICABLE** — confirmed not required, with a reason recorded.

## 1. Meta verification

### BLOCKED — Connect a verified business portfolio

**Dashboard evidence:** the App Review **Verification** step shows:

- App: `family-memory-assistant`
- Connected business portfolio: `Embedded`
- Status: **Unverified**
- Action: **Start verification**

**Required action:**

1. Ensure the correct business portfolio is connected to the Meta app.
2. A person with full control of that business portfolio must select **Start verification**.
3. Complete Meta Business Verification using the requested legal business details and documents.
4. Confirm the portfolio status changes from **Unverified** to **Verified**.
5. Confirm the app remains connected to that verified portfolio after verification.
6. Save a redacted screenshot or dashboard confirmation as evidence.

**Dependency:** the person completing this must have full control of the business portfolio. This cannot be completed by a developer account that only has partial access.

**Do not submit as complete while the portfolio is still marked `Unverified`.**

## 2. App settings

### PENDING — Confirm app identity and contact details

Verify the following in Meta App settings:

- App name is `family-memory-assistant` or the intended public product name.
- App icon and description are suitable for reviewers.
- Privacy Policy URL is public, stable, and describes WhatsApp messages, stored memories, D1 persistence, retention, deletion, and access controls.
- Terms of Service URL is present if required by the selected use case.
- Contact email is monitored.
- App domains and callback domains match the deployed production Worker and any public documentation.
- The production callback URL is stable and uses HTTPS.

### VERIFY — Production WhatsApp assets

Confirm through Meta's dashboard and, where possible, the Graph API that:

- The intended production WABA is connected to the app.
- The intended production phone-number ID is selected, not the Meta test phone.
- The production phone is `CONNECTED` and `VERIFIED`.
- The production WABA is subscribed to the app.
- The production app secrets/configuration reference the production phone and WABA IDs.
- Test and production WABA values are not mixed.

## 3. Requested permissions and allowed usage

### PENDING — `whatsapp_business_messaging`

The screenshot shows these allowed-usage steps:

- **Pending:** Describe how the app uses this permission or feature.
- **Pending:** Upload the end-to-end user-experience screencast.
- **Complete:** Perform the required API test calls — green tick shown.
- **Pending:** Agree to comply with allowed usage.

The description and screencast should show:

1. An approved user sends `My driving test is 12 October 2026`.
2. The assistant replies that it saved the fact.
3. The user later asks `When is my driving test?`.
4. The assistant retrieves the stored date.
5. A split-screen recording shows WhatsApp on one side and `wrangler tail` for the deployed Worker on the other.

Reference: [`app-review-screencasts.md`](app-review-screencasts.md).

### PENDING — `public_profile`

The screenshot shows this allowed-usage step:

- **Pending:** Agree to comply with allowed usage.

No description or screencast is shown as required for this permission in the current dashboard view. Open the `Get started` flow, review the policy, and complete the agreement. Record any additional step Meta reveals.

### PENDING — `whatsapp_business_management`

The screenshot shows these allowed-usage steps:

- **Pending:** Describe how the app uses this permission or feature.
- **Pending:** Upload the end-to-end user-experience screencast.
- **Complete:** Perform the required API test calls — green tick shown.
- **Pending:** Agree to comply with allowed usage.

This permission is required by the selected Meta use case and should remain requested. Document its truthful purpose:

- During onboarding, it allows the app/operator to identify and authorize the correct WhatsApp Business Account and phone-number asset.
- This is important where separate test and production/Embedded WABAs exist.
- The selected WABA and phone-number IDs configure the messaging integration.
- It is not used to inspect family conversations or unrelated business assets.

Prepare the second screencast/API evidence showing the authorized WABA/phone asset selection or discovery flow. Redact IDs, tokens, phone numbers, legal business information, and unrelated assets. Do not claim that the family-memory chat provides a general WABA management dashboard; the current Worker does not implement that feature.

### PENDING — Complete the remaining allowed-usage steps

The green API-test ticks do not complete the allowed-usage section. Before submission:

- Complete the messaging permission description.
- Upload the messaging end-to-end screencast.
- Agree to allowed usage for `whatsapp_business_messaging`.
- Agree to allowed usage for `public_profile`.
- Complete the management permission description.
- Upload the management/onboarding screencast.
- Agree to allowed usage for `whatsapp_business_management`.
- Confirm all three permission cards show completed status, not only the API-test row.

## 4. Data handling

### BLOCKED — Complete Meta data-handling disclosure

The screenshot shows the Data handling form is not completed. The visible unanswered fields are:

#### `processor-0` — data processors or service providers

**Pending:** Select **Yes** or **No** in response to whether data processors or service providers will access Platform Data obtained from Meta.

This cannot be answered from the repository alone. Inventory the actual organizations that can access Meta-derived data on the app's behalf, such as Cloudflare Workers/D1, hosting providers, logging/monitoring providers, AI providers, support tools, or the developer's own company if applicable. The answer must match the Privacy Policy and contractual arrangements.

#### `responsible-1` — responsible person or legal entity

**Pending:** Enter the legal name of the person or entity responsible for all Platform Data Meta shares with the app.

Do not enter the product name unless it is also the actual legal data controller. Confirm the appropriate controller/business name with the person responsible for the business and, where necessary, legal/privacy advice.

#### `responsible-2` — country

**Pending:** Select the country where the responsible person or entity is located.

This must match the responsible entity entered above and the app's legal/privacy information.

#### `requests-3` — public-authority requests in the last 12 months

**Pending:** Select the truthful answer for whether personal data or personal information was provided to public authorities in response to national-security requests during the past 12 months.

Do not guess. For a small private family assistant, the likely answer may be **No**, but the person responsible for the data must confirm it.

#### `requests-4` — policies/processes for public-authority requests

**Pending:** Select every policy or process that genuinely exists, including:

- Required review of the legality of requests.
- Provisions for challenging unlawful requests.
- Data minimization / minimum necessary disclosure.
- Documentation of requests and responses.
- Or **None of the above** if none exists.

Do not select policies merely because they would be desirable in the future. If the organization has no documented process, the answer must say so or the organization must create the process before claiming it exists.

#### Additional Data handling questions

The screenshot only shows the first visible portion of the form. Scroll through the remainder and record every additional unanswered question before submission. At minimum, prepare accurate answers covering:

- What WhatsApp message content is collected.
- That original inbound messages are stored in Cloudflare D1.
- What structured facts are extracted and why.
- How source message IDs and timestamps are retained.
- Retention and deletion behavior.
- Who can access the data.
- Whether data is shared with AI or other third parties.
- Encryption and access controls.
- How users request deletion or correction.
- Treatment of sensitive health-related messages.

The answers must match the actual implementation and the Privacy Policy. Do not describe future functionality as if it already exists. This section requires organizational/legal decisions; it should not be completed by guessing based only on application code.

## 5. Reviewer instructions

### PENDING — Write complete reviewer instructions

Include:

- The WhatsApp test number and reviewer/test sender details through Meta's secure review fields, never in Git or public documents.
- How to start the conversation.
- The exact save message:

  ```text
  My driving test is 12 October 2026
  ```

- The expected confirmation.
- The exact retrieval message:

  ```text
  When is my driving test?
  ```

- The expected retrieved answer.
- What to do if the first webhook takes a few seconds.
- Confirmation that the test sender is approved in the application's `people` table.
- Any test credentials or access instructions requested by Meta, supplied only through Meta's private review fields.
- A clear explanation of why each requested permission is needed.

## 6. Production Worker and Cloudflare readiness

### VERIFY — Deployable production Worker

- Production Wrangler dry run succeeds.
- Production D1 binding points to the intended database.
- Production migrations have been applied.
- Production secrets are set with `wrangler secret put` and are not committed.
- The production Worker uses the production phone-number ID and WABA ID.
- `GET /webhooks/whatsapp` passes Meta verification.
- Signed webhook deliveries return `200`.
- Invalid signatures are rejected.
- Unknown senders receive no reply and are not stored.
- Duplicate webhook deliveries are deduplicated.
- Outbound replies are sent inside the WhatsApp reply window.
- `wrangler tail` shows the production request/event path during testing.

### READY — Local engineering checks

Currently verified in this repository:

- OrbStack Docker daemon starts and is usable.
- Docker Compose starts the local Worker.
- Local D1 migration is applied.
- Local `/dev/fixture` returns `200`.
- TypeScript typecheck passes.
- Automated tests pass.
- Production and Meta-test Wrangler dry runs pass.

Local readiness does not replace production verification.

## 7. Privacy, security, and operational evidence

### PENDING — Rotate exposed credentials if necessary

The local `.dev.vars` file is ignored by Git, but it contains live-looking Meta and Cloudflare credentials. Rotate any credential that has appeared in a screenshot, recording, chat transcript, shared terminal, or other external location.

### PENDING — Confirm privacy policy and deletion process

The product must be able to explain:

- How a person can request access, correction, or deletion.
- How inactive people are disabled.
- How original messages and derived facts are removed or retained.
- How health-related information is protected.
- That private information is not automatically forwarded to trusted contacts.

### PENDING — Prepare production monitoring

Before submission testing:

- Know how to run `wrangler tail`.
- Record the deployed Worker name and URL privately.
- Confirm who can respond to failed webhook or Graph API requests.
- Confirm how to revoke or rotate the WhatsApp access token.
- Confirm how to disable an approved sender quickly.

## 8. Final submission gate

Do not submit until all of the following are true:

- [ ] Business portfolio is **Verified**, not merely connected.
- [ ] Correct production WABA and phone are confirmed.
- [ ] Required permissions have accurate descriptions.
- [ ] Both screencasts are recorded and redacted.
- [ ] Required API test calls have succeeded.
- [ ] Data-handling answers match the implementation and Privacy Policy.
- [ ] Reviewer instructions are complete and reproducible.
- [ ] Production webhook verification works.
- [ ] Real production messaging flow has been tested while watching `wrangler tail`.
- [ ] No secrets or private family data appear in submitted evidence.
- [ ] Any exposed credentials have been rotated.

## Evidence log

Add dates, screenshots, API responses, and notes here as each item is completed. Redact credentials, access tokens, private phone numbers, business documents, and family data before storing evidence in the repository.

| Date | Checklist item | Evidence location | Status | Notes |
|---|---|---|---|---|
|  | Business portfolio verification |  | BLOCKED | Connected portfolio currently shows `Unverified`. |
|  | `whatsapp_business_messaging` screencast | [`app-review-screencasts.md`](app-review-screencasts.md) | PENDING |  |
|  | `whatsapp_business_management` screencast/API evidence | [`app-review-screencasts.md`](app-review-screencasts.md) | PENDING | Required by selected use case. |
