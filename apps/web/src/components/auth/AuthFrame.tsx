"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { KaizenLogo } from "@/components/brand";
import { useT } from "@/i18n";

export function AuthFrame({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="px-5 py-5 sm:px-8">
        <KaizenLogo size={32} href="/" />
      </header>
      <main className="flex flex-1 items-start justify-center px-5 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-[26rem]">{children}</div>
      </main>
      <footer className="px-5 pb-6 text-center text-xs text-muted">{t("auth.demoNote")}</footer>
    </div>
  );
}

export function AuthCard({ title, body, children, footer }: { title: string; body?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="animate-fade-up">
      <h1 className="font-brand text-t1 font-semibold text-ink">{title}</h1>
      {body && <p className="mt-2 text-sm text-muted">{body}</p>}
      <div className="mt-7 rounded-lg border border-border bg-panel p-6 shadow-soft sm:p-7">{children}</div>
      {footer && <p className="mt-6 text-center text-sm text-muted">{footer}</p>}
    </div>
  );
}

export const TextLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="font-semibold text-ink underline decoration-border underline-offset-4 hover:decoration-accent">
    {children}
  </Link>
);
