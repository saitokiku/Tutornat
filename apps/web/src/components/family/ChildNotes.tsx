"use client";

import { useRef, useState } from "react";
import { IconTrash } from "@/components/icons";
import { Button } from "@/components/ui";
import { useLocale, useT } from "@/i18n";
import { shortDate } from "@/lib/format";
import { addNote, removeNote } from "@/lib/profiles";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";

const SHOWN = 10;

/**
 * Notes about one learner: a grown-up's, and the tutor's and the safety screen's, each marked.
 * Deleting asks first. Focus never drops to the page: cancel returns to that note's delete button,
 * and a delete moves on to the next note's (or the heading, when none is left).
 */
export function ChildNotes({ child }: { child: Profile }) {
  const t = useT();
  const locale = useLocale();
  const notes = useStore((s) => s.notes.filter((n) => n.profileId === child.id).sort((a, b) => b.at - a.at));
  const [text, setText] = useState("");
  const [asking, setAsking] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const trash = useRef(new Map<string, HTMLButtonElement>());
  const id = `child-notes-${child.id}`;
  const shown = all ? notes : notes.slice(0, SHOWN);
  const focusLater = (noteId?: string) => requestAnimationFrame(() => (noteId ? trash.current.get(noteId) : document.getElementById(id))?.focus());
  const remove = (noteId: string) => {
    const i = shown.findIndex((n) => n.id === noteId);
    const next = shown[i + 1] ?? shown[i - 1];
    removeNote(noteId);
    setAsking(null);
    focusLater(next?.id);
  };
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} tabIndex={-1} className="font-brand text-t2 font-semibold text-ink outline-none">
        {t("family.notes")}
      </h2>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          addNote(child.id, text);
          setText("");
        }}
      >
        <label htmlFor={`${id}-new`} className="sr-only">
          {t("family.addNote")}
        </label>
        <textarea id={`${id}-new`} rows={2} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("family.notePlaceholder")} className="k-input resize-y text-sm" />
        <Button type="submit" variant="secondary" disabled={!text.trim()}>
          {t("family.addNote")}
        </Button>
      </form>
      {notes.length === 0 ? (
        <p className="text-sm text-muted">{t("lm.notes.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((n) => (
            <li key={n.id} className={`rounded-md px-4 py-3 ${n.from === "safety" ? "border border-accent/60 bg-panel" : "bg-panel2"}`}>
              <div className="flex items-start gap-3">
                <p className="min-w-0 flex-1 whitespace-pre-line break-words text-sm text-ink">
                  {n.from && <span className="mr-1 font-semibold">{t(n.from === "safety" ? "child.fromSafety" : "child.fromTutor")}</span>}
                  {n.text}
                </p>
                <span className="shrink-0 pt-0.5 font-opmono text-xs text-muted">{shortDate(n.at, locale)}</span>
                {asking !== n.id && (
                  <button
                    ref={(el) => void (el ? trash.current.set(n.id, el) : trash.current.delete(n.id))}
                    type="button"
                    onClick={() => setAsking(n.id)}
                    aria-label={t("family.deleteNote")}
                    className="-my-2 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-panel hover:text-bad"
                  >
                    <IconTrash size={16} />
                  </button>
                )}
              </div>
              {asking === n.id && (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2">
                  <p id={`${id}-ask`} className="min-w-0 flex-1 text-sm text-ink">
                    {t("lm.notes.deleteAsk")}
                  </p>
                  <Button variant="ghost" aria-describedby={`${id}-ask`} onClick={() => (setAsking(null), focusLater(n.id))}>
                    {t("common.cancel")}
                  </Button>
                  <Button variant="secondary" aria-describedby={`${id}-ask`} autoFocus onClick={() => remove(n.id)}>
                    {t("common.confirmDelete")}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {notes.length > SHOWN && (
        <Button variant="ghost" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? t("lm.list.fewer") : t("lm.list.all", { n: notes.length })}
        </Button>
      )}
    </section>
  );
}
