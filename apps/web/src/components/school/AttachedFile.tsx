"use client";

import { useEffect, useState } from "react";
import { btn } from "@/components/ui";
import { useT } from "@/i18n";
import { getBlob, type StoredFile } from "@/lib/blobs";
import { KIND_TAG, sizeLabel } from "@/lib/files";

type Loaded = { state: "loading" } | { state: "missing" } | { state: "ready"; url: string; type: string; size: number; name: string; where: StoredFile["where"] };

/** The photo or PDF kept with a school item, read from this device's file store. */
export function AttachedFile({ blobId, name, title }: { blobId: string; name?: string; title: string }) {
  const t = useT();
  const [file, setFile] = useState<Loaded & { id?: string }>({ state: "loading" });

  useEffect(() => {
    let live = true;
    let url: string | undefined;
    getBlob(blobId).then((f) => {
      if (!live) return;
      if (!f) return setFile({ state: "missing", id: blobId });
      url = URL.createObjectURL(f.blob);
      setFile({ state: "ready", id: blobId, url, type: f.type, size: f.size, name: name || f.name, where: f.where });
    });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [blobId, name]);

  if (file.state === "loading" || file.id !== blobId) return <p className="text-sm text-muted">{t("common.loading")}</p>;
  if (file.state === "missing") return <p className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted">{t("intake.item.fileMissing")}</p>;
  const image = file.type.startsWith("image/");
  return (
    <div className="space-y-2">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element -- a local object URL from the device's file store; next/image can't optimize it
        <img src={file.url} alt={t("intake.item.photoAlt", { title })} className="max-h-[28rem] w-auto max-w-full rounded-md border border-border bg-panel2 object-contain" />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1 truncate font-opmono text-xs text-muted">
          {KIND_TAG[image ? "image" : "pdf"]} · {file.name} · {sizeLabel(file.size)}
        </span>
        <a href={file.url} target="_blank" rel="noopener noreferrer" className={btn("secondary", "md")}>
          {t(image ? "intake.item.openPhoto" : "intake.item.openPdf")} <span className="sr-only">{t("intake.item.newTab")}</span>
        </a>
      </div>
      {/* The browser couldn't keep it on the device (storage full, a private window): say so while it's still here. */}
      {file.where === "memory" && <p className="text-xs text-muted">{t("intake.fileMemory")}</p>}
    </div>
  );
}
