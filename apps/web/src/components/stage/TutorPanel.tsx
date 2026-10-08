"use client";

import { KaizenMark } from "@/components/brand";
import { TutorChat, type HelpGate } from "@/components/tutor/TutorChat";
import { useT } from "@/i18n";
import type { Profile, Scene } from "@/lib/types";
import { sceneSpeech } from "./scenes";

/** What is on screen, in words, so the tutor can talk about the scene the learner is looking at. */
function sceneText(scene: Scene) {
  if (scene.kind === "quiz") return [scene.title, ...scene.questions.map((q) => `${q.prompt} Choices: ${q.choices.join(" / ")}`)].join("\n");
  return sceneSpeech(scene);
}

/** The tutor's seat on the lesson stage, aware of the scene on screen. */
export function TutorPanel({ learner, lessonTitle, scene, beforeHelp }: { learner: Profile; lessonTitle: string; scene: Scene; beforeHelp?: HelpGate }) {
  const t = useT();
  return (
    <aside aria-labelledby="tutor-title" className="flex h-full max-h-[70dvh] min-h-96 flex-col rounded-lg border border-border bg-panel">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <KaizenMark size={24} />
        <h2 id="tutor-title" className="font-brand text-t3 font-semibold text-ink">
          {t("tutor.title")}
        </h2>
      </div>
      <TutorChat key={scene.id} setup={{ learner, surface: "lesson", lesson: { title: lessonTitle, scene: sceneText(scene).slice(0, 1600) }, title: lessonTitle, beforeHelp }} />
    </aside>
  );
}
