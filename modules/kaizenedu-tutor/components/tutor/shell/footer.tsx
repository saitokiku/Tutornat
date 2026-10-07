import Link from 'next/link';

import { publicConfig } from '@/kaizen.config';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';

const LINKS = [
  { href: PRODUCT_ROUTES.legalTerms, label: 'Terms' },
  { href: PRODUCT_ROUTES.legalPrivacy, label: 'Privacy' },
  { href: PRODUCT_ROUTES.legalAi, label: 'AI disclosure' },
  { href: PRODUCT_ROUTES.support, label: 'Support' },
] as const;

/** Legal links, the way to reach a person, and the one attribution line the MIT license asks for (spec §11.1). */
export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <nav aria-label="Legal and support">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-sm underline-offset-4 hover:text-foreground hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p>
          {publicConfig.product.workingName}. {publicConfig.product.attribution}.
        </p>
      </div>
    </footer>
  );
}
