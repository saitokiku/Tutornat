import type { Profile } from "@/lib/types";

export function Avatar({ profile, size = "lg" }: { profile: Pick<Profile, "nickname" | "color">; size?: "lg" | "sm" }) {
  return (
    <span
      aria-hidden="true"
      style={{ background: profile.color }}
      className={`grid shrink-0 place-items-center rounded-full font-brand font-semibold text-paper ${size === "lg" ? "size-16 text-t1 sm:size-20" : "size-8 text-sm"}`}
    >
      {profile.nickname.slice(0, 1).toUpperCase()}
    </span>
  );
}
