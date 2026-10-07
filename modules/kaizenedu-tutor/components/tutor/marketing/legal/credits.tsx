import Link from 'next/link';

import { PRODUCT } from '@/kaizen.config';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';

/**
 * Who made the parts this product is built from.
 *
 * Deliberately not in the header or the main footer nav: nobody arrives at a
 * tutoring site looking for a licence list. It is linked from the question
 * "What is this built on?" in the FAQ and cross-linked from the other legal
 * pages, which is where somebody who wants it will actually look.
 *
 * It is not decoration, though. MIT and Apache-2.0 both require the licence
 * and copyright notice to travel with the software, and CC BY requires
 * attribution of any course material we redistribute. A page like this is the
 * normal way to satisfy that on the web, so it has to stay true: everything
 * listed is something the product actually ships, and nothing is listed to
 * look impressive.
 */

interface Credit {
  name: string;
  href: string;
  licence: string;
  what: string;
}

/** The engine. Its licence is reproduced in full in LICENSE at the repo root. */
const ENGINE: Credit = {
  name: 'OpenMAIC',
  href: 'https://github.com/THU-MAIC/OpenMAIC',
  licence: 'MIT',
  what: 'The classroom engine this product is a fork of: the action pipeline, the whiteboard renderer, the provider layer, and the persistence stack underneath everything here.',
};

/** Load-bearing pieces a reader might reasonably want to look up. */
const SOFTWARE: Credit[] = [
  {
    name: 'Next.js and React',
    href: 'https://nextjs.org',
    licence: 'MIT',
    what: 'The framework and the UI runtime.',
  },
  {
    name: 'Vercel AI SDK',
    href: 'https://sdk.vercel.ai',
    licence: 'Apache-2.0',
    what: 'One interface across model providers, and the streaming the live turn rides on.',
  },
  {
    name: 'Silero VAD, via @ricky0123/vad-web',
    href: 'https://github.com/ricky0123/vad',
    licence: 'MIT',
    what: 'Decides in the browser when your child has stopped speaking, so no audio leaves the device until there is something to send.',
  },
  {
    name: 'ONNX Runtime Web',
    href: 'https://onnxruntime.ai',
    licence: 'MIT',
    what: 'Runs that model on-device.',
  },
  {
    name: 'KaTeX',
    href: 'https://katex.org',
    licence: 'MIT',
    what: 'Renders the maths in a problem as maths rather than as source code.',
  },
  {
    name: 'Tailwind CSS',
    href: 'https://tailwindcss.com',
    licence: 'MIT',
    what: 'The styling system.',
  },
  {
    name: 'Zustand and Immer',
    href: 'https://github.com/pmndrs/zustand',
    licence: 'MIT',
    what: 'Session state on the client.',
  },
  {
    name: 'Lucide',
    href: 'https://lucide.dev',
    licence: 'ISC',
    what: 'The icons.',
  },
  {
    name: 'Inter and Literata',
    href: 'https://fontsource.org',
    licence: 'SIL Open Font License 1.1',
    what: 'The typefaces, self-hosted so no font request reports a reader to anyone.',
  },
  {
    name: 'PostgreSQL, via node-postgres',
    href: 'https://node-postgres.com',
    licence: 'MIT',
    what: 'Everything that is remembered between sessions.',
  },
];

export function Credits() {
  return (
    <article className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <h1 className="nt-h1">Credits</h1>
        <p className="nt-lede">
          {`${PRODUCT.workingName} is built on other people\u2019s work. This is the list, and the licence each piece is used under.`}
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="nt-h2">The engine</h2>
        <p>
          This product is a fork of{' '}
          <Link
            href={ENGINE.href}
            className="underline underline-offset-4"
            rel="noreferrer noopener"
            target="_blank"
          >
            {ENGINE.name}
          </Link>
          , released under the {ENGINE.licence} licence. {ENGINE.what} The full licence text ships
          with the source.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="nt-h2">Open source we ship</h2>
        <ul className="flex flex-col gap-4">
          {SOFTWARE.map((credit) => (
            <li key={credit.name} className="flex flex-col gap-1">
              <p className="font-medium">
                <Link
                  href={credit.href}
                  className="underline underline-offset-4"
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  {credit.name}
                </Link>{' '}
                <span className="nt-small">— {credit.licence}</span>
              </p>
              <p className="nt-small">{credit.what}</p>
            </li>
          ))}
        </ul>
        <p className="nt-small">
          Those are the load-bearing ones. The full dependency list, with every licence, is in the
          source repository.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="nt-h2">Course material</h2>
        <p>
          Every practice question in the tutor is written for this product and reviewed by a person
          before a learner sees it. Nothing is copied from a textbook or a curriculum publisher.
        </p>
        <p className="nt-small">
          If that changes — the openly licensed curricula are good, and using them would be sensible
          — the source and its licence will be named here, question set by question set, before any
          of it reaches a session. That is what those licences require and it is the honest thing to
          do besides.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="nt-h2">Voices and models</h2>
        <p className="nt-small">
          The tutor&rsquo;s thinking, speech and transcription are provided by third-party model
          APIs. Which ones, what they receive, and what they are contractually barred from doing
          with it are set out in the{' '}
          <Link href={PRODUCT_ROUTES.legalAi} className="underline underline-offset-4">
            AI disclosure
          </Link>{' '}
          and the{' '}
          <Link href={PRODUCT_ROUTES.legalPrivacy} className="underline underline-offset-4">
            privacy policy
          </Link>
          , which are the pages that actually matter if you are deciding whether to let your child
          use this.
        </p>
      </section>
    </article>
  );
}
