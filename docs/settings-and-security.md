# Settings & Security

Organization settings live under **Settings** in the account menu.

## Settings hub

**Path:** `/org/[slug]/settings`

Links to all configuration areas. Shows your org name, URL slug, and role.

---

## Members

**Path:** `/org/[slug]/settings/members`

**Access:** owner, admin

- View all organization members.
- Change org roles (admin, member, viewer).
- Remove members from the organization.

> The org **owner** role cannot be removed if you are the only owner. Promote another member to owner first.

---

## Audit log

**Path:** `/org/[slug]/settings/audit`

**Access:** owner, admin

Last 100 security and administration events (member changes, SSO updates, etc.).

For broader change history, use **Activity**.

---

## L10 agenda

**Path:** `/org/[slug]/settings/l10`

**Edit:** owner, admin

### Section time boxes

Set minutes for each L10 section (Segue, Scorecard, Rocks, Headlines, To-Dos, Issues, Conclude).

New meetings snapshot these values at creation. Meetings already in progress keep their original agenda.

### Segue prompts

Configure rotating **personal** and **business best** questions for the Segue section.

---

## Notifications

**Path:** `/org/[slug]/settings/notifications`

**Smoke test:** owner, admin

Verify production email configuration. See [Notifications](./notifications.md).

---

## Security

**Path:** `/org/[slug]/settings/security`

Overview of authentication options with link to SSO configuration.

---

## SSO (Single Sign-On)

**Path:** `/org/[slug]/settings/security/sso`

**View:** owner, admin  
**Configure:** **owner only**

Enterprise SSO setup:

1. Choose provider type (SAML/OIDC).
2. Enter IdP metadata and domains.
3. Map IdP groups to org roles.
4. Test with a pilot user before enforcing.

Domain verification may be required before SSO is enforced.

---

## Your profile

**Path:** `/org/[slug]/profile`

Not under Settings, but user-level configuration:

- Display name
- Email notification preferences

---

## Administrative checklist

| Task | Page |
|------|------|
| Invite new users | People or Members |
| Promote admin | Members |
| Set L10 defaults | L10 agenda |
| Test email | Notifications |
| Enable SSO | Security → SSO |
| Review admin actions | Audit log |
