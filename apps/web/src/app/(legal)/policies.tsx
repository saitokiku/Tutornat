"use client";

import { LegalPage, type PolicySection } from "./legal";

// The wording lives in i18n (trust.privacy.*, trust.terms.*, trust.retention.*); this file only
// orders it. Every section here describes what the code does today, or says plainly that it is planned.

const contact: PolicySection = { id: "contact", title: "trust.privacy.contact.h", blocks: [{ p: "trust.legal.contact" }] };

const PRIVACY: PolicySection[] = [
  { id: "short", title: "trust.privacy.short.h", blocks: [{ list: ["trust.privacy.short.1", "trust.privacy.short.2", "trust.privacy.short.3", "trust.privacy.short.4", "trust.privacy.short.5"] }] },
  { id: "keep", title: "trust.privacy.keep.h", blocks: [{ list: ["trust.privacy.keep.1", "trust.privacy.keep.2", "trust.privacy.keep.3"] }] },
  { id: "where", title: "trust.privacy.where.h", blocks: [{ p: "trust.privacy.where.1" }, { p: "trust.privacy.where.2" }, { p: "trust.privacy.where.3" }] },
  { id: "ai", title: "trust.privacy.ai.h", blocks: [{ p: "trust.privacy.ai.1" }, { p: "trust.privacy.ai.2" }, { p: "trust.privacy.ai.3" }, { p: "trust.privacy.ai.4" }] },
  { id: "lookups", title: "trust.privacy.know.h", blocks: [{ p: "trust.privacy.know.1" }] },
  { id: "voice", title: "trust.privacy.voice.h", blocks: [{ p: "trust.privacy.voice.1" }, { p: "trust.privacy.voice.2" }, { p: "trust.privacy.voice.3" }] },
  { id: "children", title: "trust.privacy.kids.h", blocks: [{ p: "trust.privacy.kids.1" }, { p: "trust.privacy.kids.2" }, { p: "trust.privacy.kids.3" }] },
  { id: "email", title: "trust.privacy.email.h", blocks: [{ p: "trust.privacy.email.1" }] },
  { id: "dont", title: "trust.privacy.not.h", blocks: [{ p: "trust.privacy.not.1" }] },
  { id: "security", title: "trust.privacy.security.h", blocks: [{ p: "trust.privacy.security.1" }] },
  { id: "logs", title: "trust.privacy.logs.h", blocks: [{ p: "trust.privacy.logs.1" }] },
  { id: "choices", title: "trust.privacy.choices.h", blocks: [{ p: "trust.privacy.choices.1" }] },
  { id: "changes", title: "trust.privacy.changes.h", blocks: [{ p: "trust.privacy.changes.1" }] },
  contact,
];

const TERMS: PolicySection[] = [
  { id: "what", title: "trust.terms.what.h", blocks: [{ p: "trust.terms.what.1" }] },
  { id: "who", title: "trust.terms.who.h", blocks: [{ p: "trust.terms.who.1" }] },
  { id: "records", title: "trust.terms.records.h", blocks: [{ p: "trust.terms.records.1" }] },
  { id: "ai", title: "trust.terms.ai.h", blocks: [{ p: "trust.terms.ai.1" }] },
  { id: "content", title: "trust.terms.content.h", blocks: [{ p: "trust.terms.content.1" }] },
  { id: "use", title: "trust.terms.use.h", blocks: [{ p: "trust.terms.use.1" }] },
  { id: "data", title: "trust.terms.data.h", blocks: [{ p: "trust.terms.data.1" }] },
  { id: "warranty", title: "trust.terms.warranty.h", blocks: [{ p: "trust.terms.warranty.1" }] },
  { id: "price", title: "trust.terms.price.h", blocks: [{ p: "trust.terms.price.1" }] },
  { id: "changes", title: "trust.terms.changes.h", blocks: [{ p: "trust.terms.changes.1" }, { p: "trust.legal.contact" }] },
];

const RETENTION: PolicySection[] = [
  {
    id: "today",
    title: "trust.retention.now.h",
    blocks: [
      {
        rows: [
          ["trust.retention.now.family", "trust.retention.now.familyHow"],
          ["trust.retention.now.learner", "trust.retention.now.learnerHow"],
          ["trust.retention.now.acts", "trust.retention.now.actsHow"],
          ["trust.retention.now.reset", "trust.retention.now.resetHow"],
          ["trust.retention.now.ai", "trust.retention.now.aiHow"],
          ["trust.retention.now.know", "trust.retention.now.knowHow"],
          ["trust.retention.now.email", "trust.retention.now.emailHow"],
          ["trust.retention.now.logs", "trust.retention.now.logsHow"],
        ],
      },
    ],
  },
  {
    id: "later",
    title: "trust.retention.later.h",
    blocks: [
      {
        rows: [
          ["trust.retention.later.record", "trust.retention.later.recordHow"],
          ["trust.retention.later.idle", "trust.retention.later.idleHow"],
          ["trust.retention.later.consent", "trust.retention.later.consentHow"],
          ["trust.retention.later.logs", "trust.retention.later.logsHow"],
        ],
      },
    ],
  },
  { id: "deleting", title: "trust.retention.delete.h", blocks: [{ p: "trust.retention.delete.1" }] },
  contact,
];

export const PrivacyPolicy = () => <LegalPage title="trust.privacy.title" intro="trust.privacy.intro" sections={PRIVACY} />;
export const TermsOfUse = () => <LegalPage title="trust.terms.title" intro="trust.terms.intro" sections={TERMS} />;
export const RetentionPolicy = () => <LegalPage title="trust.retention.title" intro="trust.retention.intro" sections={RETENTION} />;
