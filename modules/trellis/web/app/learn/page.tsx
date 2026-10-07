import { readRecord } from "@/lib/record";
import { OPENING } from "@/lib/tutor";
import { Chat } from "./chat";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const record = await readRecord();
  return (
    <main>
      <h1>Trellis</h1>
      <p className="sub">Adding fractions with unlike denominators · Ada, 9</p>
      <Chat opening={OPENING} initialRecord={record} />
    </main>
  );
}
