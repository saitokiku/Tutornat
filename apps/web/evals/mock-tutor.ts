import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { sentences } from "@/lib/ai/build";

// A stand-in for the tutor model that follows the tutor's rules the way a good model should: it
// reads only what a real model reads (the system prompt, the conversation and tool results), calls
// the real tools, and says at most two short sentences and one question built from what the tools
// returned. It lets `npm run evals` exercise the whole server path — safety screen, context, tools,
// streaming, metering — without a key, and it is the reference the checks are proven against.

type CallOptions = Parameters<MockLanguageModelV4["doStream"]>[0];
type Prompt = CallOptions["prompt"];
type Chunk = Awaited<ReturnType<MockLanguageModelV4["doStream"]>>["stream"] extends ReadableStream<infer C> ? C : never;

const SAY = {
  en: {
    right: (x: string) => `Yes, ${x} is right. How did you work it out?`,
    notYet: (x: string) => `Not yet: ${x} doesn't fit this one. What was your first step?`,
    notice: "What do you notice now?",
    similar: "Here is a similar problem, worked out on the board. Which step would help with yours?",
    look: "Look at the picture on the board. What do you notice?",
    tryFirst: "Try it first, and I will check it with you. What do you think it is?",
    whereStuck: "Read it once more and tell me the first step you would take. What part is unclear?",
    upset: "This one is tricky, and it is fine to slow down. Do you want a hint or a short break?",
    decline: "I can't write it for you, but I can help you plan it. What is the main point you want to make?",
    practice: (title: string) => `There is practice on ${title} on the board. What do you already know about it?`,
    startTalk: "Let's start with what you already know. What have you heard about it?",
    explainBack: "Tell me how you got it, one step at a time. What did you do first?",
    picture: { moon: "The Moon with its right side lit by the Sun", matter: "Particles of water close together, sliding past each other", line: "A number line from 0 to 10" },
  },
  es: {
    right: (x: string) => `Sí, ${x} es correcto. ¿Cómo lo resolviste?`,
    notYet: (x: string) => `Todavía no: ${x} no funciona aquí. ¿Cuál fue tu primer paso?`,
    notice: "¿Qué notas ahora?",
    similar: "Aquí tienes un problema parecido, resuelto en la pizarra. ¿Qué paso te sirve para el tuyo?",
    look: "Mira el dibujo en la pizarra. ¿Qué notas?",
    tryFirst: "Inténtalo primero y lo revisamos juntos. ¿Qué crees que es?",
    whereStuck: "Léelo otra vez y dime el primer paso que darías. ¿Qué parte no está clara?",
    upset: "Este es difícil, y está bien ir más despacio. ¿Quieres una pista o un descanso corto?",
    decline: "No puedo escribirlo por ti, pero te ayudo a planearlo. ¿Cuál es la idea principal que quieres defender?",
    practice: (title: string) => `En la pizarra hay práctica de ${title}. ¿Qué sabes ya del tema?`,
    startTalk: "Empecemos por lo que ya sabes. ¿Qué has oído del tema?",
    explainBack: "Cuéntame cómo lo obtuviste, paso a paso. ¿Qué hiciste primero?",
    picture: { moon: "La Luna con su lado derecho iluminado por el Sol", matter: "Partículas de agua juntas que se deslizan unas sobre otras", line: "Una recta numérica del 0 al 10" },
  },
};

const textOf = (content: Prompt[number]["content"]) =>
  typeof content === "string" ? content : content.map((p) => ("text" in p && typeof p.text === "string" ? p.text : "")).join(" ");

/** The answer a learner offers in a message ("is it 4?", "I got -3", "¿son las 3:00?"), or null. */
export function attemptIn(said: string): string | null {
  const s = said.trim();
  if (/^-?\d+(?:[./:]\d+)?$/.test(s)) return s;
  const m = /(?<!\p{L})(?:i think it'?s|i think it is|is it|it'?s|it is|i got|my answer is|creo que es|¿?son las|¿?es|me dio)\s+(.+?)\s*[?.!]*$/iu.exec(s);
  const answer = m?.[1].replace(/^¿/, "");
  return answer && !/^(wrong|right|correct|hard|easy|this|that|ok|okay|mal|bien|correcto|difícil)$/i.test(answer) ? answer : null;
}

function picture(system: string, said: string, es: boolean) {
  const t = SAY[es ? "es" : "en"].picture;
  const about = `${system} ${said}`.toLowerCase();
  if (/moon|luna/.test(about)) return { visual: { kind: "moon", phase: 0.25 }, description: t.moon };
  if (/water|matter|agua|materia|líquido/.test(about)) return { visual: { kind: "particles", state: "liquid" }, description: t.matter };
  return { visual: { kind: "number-line", min: 0, max: 10, marks: [] }, description: t.line };
}

/** Decides one step: a tool call, or the words that end the turn. */
export function decide(prompt: Prompt): { tool: string; input: unknown } | { text: string } {
  const system = prompt.filter((m) => m.role === "system").map((m) => textOf(m.content)).join("\n");
  const es = system.includes("Reply in Spanish");
  const say = SAY[es ? "es" : "en"];
  const lastUser = prompt.findLastIndex((m) => m.role === "user");
  const said = lastUser >= 0 ? textOf(prompt[lastUser].content) : "";
  const turn = prompt.slice(lastUser + 1);
  const calls = turn.flatMap((m) => (m.role === "assistant" ? m.content.filter((p) => p.type === "tool-call") : []));
  const results = turn.flatMap((m) => (m.role === "tool" ? m.content.filter((p) => p.type === "tool-result") : []));

  if (results.length) {
    const last = results.at(-1)!;
    const out = (last.output.type === "json" ? last.output.value : null) as Record<string, unknown> | null;
    const input = calls.find((c) => c.toolCallId === last.toolCallId)?.input as Record<string, unknown> | undefined;
    switch (last.toolName) {
      case "check_answer":
        return { text: out?.correct === true ? say.right(String(input?.answer)) : out?.correct === false ? say.notYet(String(input?.answer)) : say.whereStuck };
      case "next_hint": {
        const hint = typeof out?.hint === "string" ? sentences(out.hint).slice(0, 2).join(" ") : null;
        if (!hint) return { text: say.whereStuck };
        return { text: hint.endsWith("?") ? hint : `${hint} ${say.notice}` };
      }
      case "similar_problem":
        return { text: say.similar };
      case "show_visual":
        return { text: say.look };
      case "find_skill": {
        const skills = (out?.skills ?? []) as { skillId: string; title: string }[];
        if (!skills.length) return { text: say.startTalk };
        return { tool: "start_practice", input: { skillId: skills[0].skillId, reason: skills[0].title } };
      }
      case "start_practice": {
        const found = results.find((r) => r.toolName === "find_skill");
        const skills = ((found?.output.type === "json" ? (found.output.value as { skills?: { title: string }[] }).skills : null) ?? []) as { title: string }[];
        return { text: skills[0] ? say.practice(skills[0].title) : say.startTalk };
      }
      default:
        return { text: say.whereStuck };
    }
  }

  const s = said.toLowerCase();
  const problem = system.includes("working on a practice problem");
  const homework = /wants help with schoolwork: "(.*?)"/.exec(system)?.[1];
  const lesson = system.includes("The learner is in a lesson");
  const lastAnswer = /Their last answer: "(.*?)"/.exec(system)?.[1];
  const solved = /\b(is right|es correcto)\b/.test(prompt.slice(0, lastUser).map((m) => (m.role === "assistant" ? textOf(m.content) : "")).join(" "));
  const attempt = problem ? attemptIn(said) : null;

  if (problem && lastAnswer && !attempt && /wrong|why|por qu|mal/.test(s)) return { tool: "check_answer", input: { answer: lastAnswer } };
  if (attempt) return { tool: "check_answer", input: { answer: attempt } };
  if (/write (my|it|the)|do it for me|escribe (mi|el)|hazlo por m/.test(s)) return { text: say.decline };
  if (/hard|hate|difícil|dificil|odio|can'?t do|no puedo/.test(s) && !/hint|pista/.test(s)) return { text: say.upset };
  if (problem) {
    if (/hint|pista|help|ayuda|stuck|no s[eé]|don'?t know|no entiendo|don'?t get|mean|what'?s an?\b|qué es|que significa/.test(s)) return { tool: "next_hint", input: {} };
    if (/similar|example|another one|parecido|ejemplo|otro|show me how|muéstrame/.test(s)) return { tool: "similar_problem", input: {} };
    if (/tell me|just|answer|dime|respuesta|give me/.test(s)) return { text: say.tryFirst };
    if (/why|por qu|explain|explica|different way/.test(s)) return solved ? { text: say.explainBack } : { tool: "show_visual", input: picture(system, said, es) };
    return { text: say.whereStuck };
  }
  if (lesson) return { tool: "show_visual", input: picture(system, said, es) };
  return { tool: "find_skill", input: { query: homework ?? said } };
}

const tokens = (chars: number) => Math.ceil(chars / 4);

export function mockTutor() {
  let call = 0;
  return new MockLanguageModelV4({
    provider: "mock",
    modelId: "mock-tutor",
    doStream: async ({ prompt, tools }) => {
      const step = decide(prompt);
      const id = `call-${++call}`;
      const out = "text" in step ? step.text : JSON.stringify(step.input);
      // Rough counts of what a real call carries: the prompt and the tool definitions, at four characters a token.
      const sent = tokens(JSON.stringify(prompt).length + JSON.stringify(tools ?? []).length);
      const usage = { inputTokens: { total: sent, noCache: sent, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: tokens(out.length), text: tokens(out.length), reasoning: 0 } };
      const chunks: Chunk[] =
        "text" in step
          ? [{ type: "text-start", id }, { type: "text-delta", id, delta: step.text }, { type: "text-end", id }, { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage }]
          : [{ type: "tool-call", toolCallId: id, toolName: step.tool, input: JSON.stringify(step.input) }, { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage }];
      return { stream: simulateReadableStream({ chunks }) };
    },
  });
}
