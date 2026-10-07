import LegalShell from '@/components/LegalShell';
export const metadata = { title: 'Open-Source Licenses - Kaizen' };

// An attribution page is a reference, not an essay: the thing a reader (or a
// license auditor) wants is "which license, and which packages under it". So
// the inventory is a definition list keyed on the SPDX identifier rather than a
// bullet run that buries the identifier mid-sentence. The identifiers are set
// as <code>, which LegalShell already styles, because that is what they are.
// The identifier sits above its entry rather than in a side rail, matching the
// inventory on /privacy: a rail would set every entry to its own measure, and
// these entries are sentences that should read at the page's one measure.
//
// Font names track app/layout.js. If the loaded families change, this list is
// the attribution that has to change with them.
const LICENSES = [
  {
    id: 'MIT',
    note: 'the large majority',
    body: 'Next.js, React, Supabase JS, Stripe SDK, Anthropic SDK, KaTeX, mermaid, motion, react-markdown and the remark/rehype ecosystem, react-syntax-highlighter, Tailwind CSS, and others.',
  },
  {
    id: 'BSD-2-Clause',
    body: '@daily-co/daily-js, mammoth.',
  },
  {
    id: 'Apache-2.0, BSD-3-Clause, ISC',
    body: 'and other permissive licenses, for the remaining transitive components.',
  },
  {
    id: 'LGPL-3.0-or-later',
    body: 'the prebuilt libvips image library (@img/sharp-libvips), used unmodified and only on our servers for image processing, never shipped to your browser. Its license text and source are available from the sharp project.',
  },
  {
    id: 'SIL Open Font License',
    body: 'Schibsted Grotesk, Instrument Sans, and IBM Plex Mono, used via Google Fonts and self-hosted at build.',
  },
];

export default function Licenses() {
  return (
    <LegalShell title="Open-Source Licenses" updated="August 2026">
      <p className="text-t3 text-ink">
        Kaizen is proprietary software, built with open-source components we&apos;re grateful for.
        This page satisfies the attribution requirements of their licenses.
      </p>

      <h2 id="what-we-use" className="scroll-mt-24">What we use</h2>
      <dl className="border-y border-border">
        {LICENSES.map(({ id, note, body }) => (
          <div
            key={id}
            className="grid gap-1 border-t border-border py-4 first:border-t-0"
          >
            <dt>
              <code>{id}</code>
              {note ? <span className="ml-2 text-sm text-muted">({note})</span> : null}
            </dt>
            <dd className="text-ink/85">{body}</dd>
          </div>
        ))}
      </dl>
      <p>
        Where a component is dual-licensed (for example jszip, &quot;MIT OR GPL-3.0-or-later&quot;),
        Kaizen elects the <strong>MIT</strong> license.
      </p>

      <h2 id="inventory" className="scroll-mt-24">Complete inventory</h2>
      <p>
        The machine-generated inventory, every installed package with its version, license
        identifier, and the full license texts of our direct dependencies, is maintained in the
        repository as <code>THIRD_PARTY_NOTICES.md</code> and generated from the dependency tree
        we actually install. The file states the date it was generated, so you can see how current
        it is. Want a copy? Email hello@kaizenedu.net and we&apos;ll send it same-day.
      </p>

      <h2 id="copyleft" className="scroll-mt-24">Copyleft position</h2>
      <p>
        No GPL- or AGPL-only components are included. The only copyleft-family component is the
        LGPL-licensed libvips binary noted above, used server-side as a replaceable, unmodified
        library. The code we ship to browsers is free of copyleft components.
      </p>
    </LegalShell>
  );
}
