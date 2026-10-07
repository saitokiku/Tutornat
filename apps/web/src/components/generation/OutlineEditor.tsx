"use client";

import { IconChevronDown, IconChevronUp, IconPlus, IconX } from "@/components/icons";
import { Button } from "@/components/ui";
import { useT } from "@/i18n";
import { newId } from "@/lib/store";
import type { Lesson } from "@/lib/types";

/** Rename, reorder (buttons, not drag-only), remove and add lessons. Read-only while `locked`. */
export function OutlineEditor({ lessons, onChange, locked }: { lessons: Lesson[]; onChange: (l: Lesson[]) => void; locked: boolean }) {
  const t = useT();
  const move = (i: number, d: -1 | 1) => {
    const next = [...lessons];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
    // Reordering moves the row's DOM node, which drops focus; put it back on the same control.
    const [same, other] = d < 0 ? ["up", "down"] : ["down", "up"];
    requestAnimationFrame(() => {
      const el = document.getElementById(`${lessons[i].id}-${same}`) as HTMLButtonElement | null;
      (el && !el.disabled ? el : document.getElementById(`${lessons[i].id}-${other}`))?.focus();
    });
  };
  return (
    <div>
      <ol className="divide-y divide-border overflow-hidden rounded-md border border-border bg-panel">
        {lessons.map((l, i) => (
          <li key={l.id} className="flex items-start gap-3 px-4 py-3.5 animate-fade-up sm:px-5">
            <span className="mt-2.5 w-5 shrink-0 font-opmono text-xs tabular-nums text-muted">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <input
                aria-label={t("gen.lessonTitle", { n: i + 1 })}
                value={l.title}
                readOnly={locked}
                maxLength={120}
                onChange={(e) => onChange(lessons.map((x) => (x.id === l.id ? { ...x, title: e.target.value } : x)))}
                className="w-full rounded-sm border border-transparent bg-transparent px-2 py-1.5 text-sm font-semibold text-ink hover:border-border focus:border-accent focus:outline-none read-only:hover:border-transparent"
              />
              {l.summary && <p className="px-2 text-xs text-muted">{l.summary}</p>}
            </div>
            {!locked && (
              <div className="flex shrink-0 items-center gap-0.5">
                <IconButton id={`${l.id}-up`} label={t("gen.moveUp", { title: l.title })} disabled={i === 0} onClick={() => move(i, -1)}>
                  <IconChevronUp size={16} />
                </IconButton>
                <IconButton id={`${l.id}-down`} label={t("gen.moveDown", { title: l.title })} disabled={i === lessons.length - 1} onClick={() => move(i, 1)}>
                  <IconChevronDown size={16} />
                </IconButton>
                <IconButton label={t("gen.remove", { title: l.title })} disabled={lessons.length === 1} onClick={() => onChange(lessons.filter((x) => x.id !== l.id))}>
                  <IconX size={16} />
                </IconButton>
              </div>
            )}
          </li>
        ))}
      </ol>
      {!locked && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onChange([...lessons, { id: newId(), title: t("gen.newLesson"), summary: "", minutes: lessons[0]?.minutes ?? 10, scenes: [] }])}
          >
            <IconPlus size={14} /> {t("gen.addLesson")}
          </Button>
          {lessons.length === 1 && <span className="text-xs text-muted">{t("gen.needOne")}</span>}
        </div>
      )}
    </div>
  );
}

function IconButton({ label, children, ...props }: { label: string; children: React.ReactNode; disabled?: boolean; onClick: () => void; id?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      {...props}
      className="grid size-9 place-items-center rounded-full text-muted hover:bg-panel2 hover:text-ink disabled:opacity-25"
    >
      {children}
    </button>
  );
}
