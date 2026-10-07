import type { Locale } from "@/lib/types";
import type { Rng } from "../rng";
import { tr } from "../text";
import type { Choice, ItemBody, Skill } from "../types";

// Kindergarten – grade 2 number work. Young learners answer by tapping a choice; from grade 1 the
// keypad takes over. Every visual gets a text description, every prompt a read-aloud line.

/** Four nearby numbers including `n`, shuffled; never below `min`. */
function nearby(r: Rng, n: number, min = 0, spread = 2): Choice[] {
  const set = new Set([n]);
  while (set.size < 4) set.add(Math.max(min, n + r.int(-spread, spread + 1)));
  return r.shuffle([...set]).map((v) => ({ label: String(v), say: String(v) }));
}
const choiceIndex = (choices: Choice[], n: number) => choices.findIndex((c) => c.label === String(n));

function choiceItem(r: Rng, n: number, body: Omit<ItemBody, "choices" | "input" | "answer">, min = 0): ItemBody {
  const choices = nearby(r, n, min);
  return { ...body, choices, input: "choices", answer: { kind: "choice", index: choiceIndex(choices, n) } };
}

const dotsAlt = (locale: Locale, groups: number[], crossed = 0) => {
  if (groups.length === 1 && !crossed) return tr(locale, `${groups[0]} dots in rows of five`, `${groups[0]} puntos en filas de cinco`);
  if (crossed) return tr(locale, `${groups[0]} dots, ${crossed} of them crossed out`, `${groups[0]} puntos, ${crossed} tachados`);
  return tr(locale, `A group of ${groups[0]} dots and a group of ${groups[1]} dots`, `Un grupo de ${groups[0]} puntos y un grupo de ${groups[1]} puntos`);
};

const clockTime = (h: number, m: number) => `${h}:${String(m).padStart(2, "0")}`;

/**
 * Set the hands to a time on the clock pad: level 1 o'clock, level 2 half hours, level 3 five minutes.
 * The answer is "h:mm". Tagged slips: the long hand on the minutes' number, the hands swapped, the
 * short hand one hour off, and, from half past on, the short hand on the next hour (it is past half
 * way there, so the next number looks like the hour).
 */
function setTheClock(h: number, m: number, level: number, locale: Locale): ItemBody {
  const time = clockTime(h, m);
  const step = level === 1 ? 60 : level === 2 ? 30 : 5;
  const where = m === 0 ? 12 : m / 5; // the number the long hand points to
  const next = h === 12 ? 1 : h + 1;
  const prev = h === 1 ? 12 : h - 1;
  const wrong: { value: string; why: string }[] = [];
  const tag = (value: string, why: string) => value !== time && !wrong.some((w) => w.value === value) && wrong.push({ value, why });
  if (m > 0 && m <= 12 && (m * 5) % step === 0) tag(clockTime(h, (m * 5) % 60), "minutes-as-number");
  if ((h * 5) % step === 0) tag(clockTime(where, (h * 5) % 60), "swapped-hands");
  tag(clockTime(next, m), m >= 30 ? "hour-hand-next-hour" : "hour-off-by-one");
  tag(clockTime(prev, m), "hour-off-by-one");
  const la = h === 1 ? "la" : "las";
  const spoken = m === 0 ? tr(locale, `${h} o'clock`, `${la} ${h} en punto`) : tr(locale, time, `${la} ${time}`);
  const side =
    h === 12 ? ["at the top", "arriba"] : h === 6 ? ["at the bottom", "abajo"] : h < 6 ? ["on the right side", "del lado derecho"] : ["on the left side", "del lado izquierdo"];
  return {
    prompt: [tr(locale, `Set the clock to ${time}.`, `Pon el reloj a ${la} ${time}.`)],
    say: tr(locale, `Set the clock to ${spoken}.`, `Pon el reloj a ${spoken}.`),
    input: "clock",
    pad: { kind: "clock", stepMinutes: step },
    answer: { kind: "text", accept: [time] },
    wrong,
    hints:
      level === 1
        ? [
            tr(locale, "The short hand shows the hour.", "La manecilla corta marca la hora."),
            tr(locale, "At o'clock, the long hand points up to 12.", "En punto, la manecilla larga apunta al 12."),
            tr(locale, `Look for the ${h} ${side[0]} of the clock.`, `Busca el ${h} ${side[1]} del reloj.`),
          ]
        : [
            tr(locale, "The short hand shows the hour. The long hand shows the minutes.", "La manecilla corta marca la hora. La larga marca los minutos."),
            tr(locale, "For the long hand, each number is 5 minutes.", "Para la manecilla larga, cada número vale 5 minutos."),
            m === 0
              ? tr(locale, "At o'clock, the long hand points to 12.", "En punto, la manecilla larga apunta al 12.")
              : tr(locale, `For ${m} minutes, the long hand points to the ${where}.`, `Para ${m} minutos, la manecilla larga apunta al ${where}.`),
          ],
    steps: [
      m === 0 ? tr(locale, "Long hand on 12: o'clock.", "Manecilla larga en el 12: en punto.") : tr(locale, `Long hand on ${where}: ${m} minutes.`, `Manecilla larga en el ${where}: ${m} minutos.`),
      m === 0
        ? tr(locale, `Short hand on ${h}.`, `Manecilla corta en el ${h}.`)
        : tr(locale, `Short hand on ${h}, moving toward ${next} as the minutes pass.`, `Manecilla corta en el ${h}, avanzando hacia el ${next} con los minutos.`),
      tr(locale, `The clock shows ${time}.`, `El reloj marca ${la} ${time}.`),
    ],
    seconds: 15,
  };
}

export const EARLY_MATH: Skill[] = [
  {
    id: "m.count.10",
    subject: "math",
    grade: "K",
    title: { en: "Count up to 10", es: "Contar hasta 10" },
    standard: "K.CC.B.5",
    prereqs: [],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const n = level === 1 ? r.int(1, 5) : r.int(6, 10);
      const top = Math.min(n, 5);
      return choiceItem(
        r,
        n,
        {
          prompt: [tr(locale, "How many dots?", "¿Cuántos puntos hay?")],
          say: tr(locale, "How many dots? Count them.", "¿Cuántos puntos hay? Cuéntalos."),
          visual: { kind: "dots", groups: [n] },
          markable: true,
          alt: dotsAlt(locale, [n]),
          hints: [
            tr(locale, "Touch each dot once as you count.", "Toca cada punto una vez mientras cuentas."),
            tr(locale, "Count the top row first, then keep going.", "Cuenta primero la fila de arriba y luego sigue."),
            tr(locale, `The top row has ${top}. Keep counting from ${top}.`, `La fila de arriba tiene ${top}. Sigue contando desde ${top}.`),
          ],
          steps: [tr(locale, "Say one number for each dot: 1, 2, 3…", "Di un número por cada punto: 1, 2, 3…"), tr(locale, `There are ${n} dots.`, `Hay ${n} puntos.`)],
          seconds: 10,
        },
        1,
      );
    },
  },
  {
    id: "m.count.20",
    subject: "math",
    grade: "K",
    title: { en: "Count up to 20", es: "Contar hasta 20" },
    standard: "K.CC.B.5",
    prereqs: ["m.count.10"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const n = level === 1 ? r.int(11, 15) : r.int(11, 20);
      return choiceItem(r, n, {
        prompt: [tr(locale, "How many in all?", "¿Cuántos hay en total?")],
        say: tr(locale, "How many in all?", "¿Cuántos hay en total?"),
        visual: { kind: "ten-frame", filled: n, frames: 2 },
        markable: true,
        alt: tr(locale, `One full ten-frame and ${n - 10} more`, `Un marco de diez lleno y ${n - 10} más`),
        hints: [
          tr(locale, "A full frame holds 10.", "Un marco lleno tiene 10."),
          tr(locale, "Start at 10 and count the second frame.", "Empieza en 10 y cuenta el segundo marco."),
          tr(locale, `10, then ${n - 10} more.`, `10, y luego ${n - 10} más.`),
        ],
        steps: [tr(locale, `10 and ${n - 10} more make ${n}.`, `10 y ${n - 10} más son ${n}.`)],
        seconds: 10,
      }, 10);
    },
  },
  {
    id: "m.compare.10",
    subject: "math",
    grade: "K",
    title: { en: "Which is more?", es: "¿Cuál es más?" },
    standard: "K.CC.C.6",
    prereqs: ["m.count.10"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const a = r.int(1, 10);
      let b = r.int(1, 10);
      while (b === a) b = r.int(1, 10);
      const choices = r.shuffle([a, b]).map((v) => ({ label: String(v), say: String(v) }));
      return {
        prompt: [tr(locale, "Which number is more?", "¿Qué número es mayor?")],
        say: tr(locale, `Which is more, ${a} or ${b}?`, `¿Qué es más, ${a} o ${b}?`),
        ...(level === 1 ? { visual: { kind: "dots" as const, groups: [a, b] }, markable: true, alt: dotsAlt(locale, [a, b]) } : {}),
        choices,
        input: "choices",
        answer: { kind: "choice", index: choiceIndex(choices, Math.max(a, b)) },
        hints: [
          tr(locale, "Which one would you rather have, if they were cookies?", "Si fueran galletas, ¿cuál preferirías tener?"),
          tr(locale, "Count up from 1. The number you say later is more.", "Cuenta desde 1. El número que dices después es mayor."),
          tr(locale, `Count: is ${Math.min(a, b)} or ${Math.max(a, b)} said first?`, `Cuenta: ¿dices primero ${Math.min(a, b)} o ${Math.max(a, b)}?`),
        ],
        steps: [tr(locale, `${Math.max(a, b)} comes after ${Math.min(a, b)} when you count, so ${Math.max(a, b)} is more.`, `${Math.max(a, b)} viene después de ${Math.min(a, b)} al contar, así que ${Math.max(a, b)} es mayor.`)],
        seconds: 6,
      };
    },
  },
  {
    id: "m.next.number",
    subject: "math",
    grade: "K",
    title: { en: "Number before and after", es: "El número antes y después" },
    standard: "K.CC.A.2",
    prereqs: ["m.count.10"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const max = level === 1 ? 10 : level === 2 ? 20 : 100;
      const after = r.bool(0.65);
      const n = after ? r.int(1, max - 1) : r.int(2, max);
      const want = after ? n + 1 : n - 1;
      // Answered on a number line of ten jumps that holds both numbers (0–10, 10–20, … 90–100), every
      // number labelled, the way a kindergarten wall line is. Tagged slips: the other side, the same number.
      const lo = Math.floor(Math.min(n, want) / 10) * 10;
      const wrong = [
        { value: String(after ? n - 1 : n + 1), why: "before-after-mixed" },
        { value: String(n), why: "picked-the-same-number" },
      ].filter((w) => Number(w.value) >= lo && Number(w.value) <= lo + 10);
      return {
        prompt: after
          ? [tr(locale, `Tap the number that comes after ${n}.`, `Toca el número que viene después del ${n}.`)]
          : [tr(locale, `Tap the number that comes just before ${n}.`, `Toca el número que viene justo antes del ${n}.`)],
        say: after
          ? tr(locale, `Tap the number that comes after ${n}.`, `Toca el número que viene después del ${n}.`)
          : tr(locale, `Tap the number that comes just before ${n}.`, `Toca el número que viene justo antes del ${n}.`),
        input: "number-line",
        pad: { kind: "number-line", min: lo, max: lo + 10, step: 1 },
        wrong,
        answer: { kind: "number", value: want },
        hints: [
          tr(locale, "Count out loud and listen for it.", "Cuenta en voz alta y escúchalo."),
          after ? tr(locale, `Say ${n}, then the next number.`, `Di ${n} y luego el siguiente número.`) : tr(locale, `Count up to ${n}. What did you say right before it?`, `Cuenta hasta ${n}. ¿Qué dijiste justo antes?`),
          after ? tr(locale, `After means one more than ${n}.`, `Después significa uno más que ${n}.`) : tr(locale, `Before means one less than ${n}.`, `Antes significa uno menos que ${n}.`),
        ],
        steps: [after ? tr(locale, `${n}, ${want}. ${want} comes after ${n}.`, `${n}, ${want}. El ${want} viene después del ${n}.`) : tr(locale, `${want}, ${n}. ${want} comes before ${n}.`, `${want}, ${n}. El ${want} viene antes del ${n}.`)],
        seconds: 10,
      };
    },
  },
  {
    id: "m.add.5",
    subject: "math",
    grade: "K",
    title: { en: "Add within 5", es: "Sumar hasta 5" },
    standard: "K.OA.A.5",
    prereqs: ["m.count.10"],
    content: "computed",
    levels: 1,
    generate(r, _level, locale) {
      const a = r.int(0, 4);
      const b = r.int(a === 0 ? 1 : 0, 5 - a);
      return choiceItem(r, a + b, {
        prompt: [`${a} + ${b} = `, { blank: true }],
        say: tr(locale, `${a} plus ${b} is how many?`, `¿${a} más ${b} son cuántos?`),
        visual: { kind: "dots", groups: [a, b] },
        markable: true,
        alt: dotsAlt(locale, [a, b]),
        hints: [
          tr(locale, "Put the two groups together.", "Junta los dos grupos."),
          tr(locale, `Start at ${a} and count ${b} more.`, `Empieza en ${a} y cuenta ${b} más.`),
          tr(locale, `${a}… then ${Array.from({ length: b }, (_, i) => a + i + 1).join(", ")}.`, `${a}… y luego ${Array.from({ length: b }, (_, i) => a + i + 1).join(", ")}.`),
        ],
        steps: [tr(locale, `${a} and ${b} together make ${a + b}.`, `${a} y ${b} juntos son ${a + b}.`)],
        seconds: 6,
      });
    },
  },
  {
    id: "m.sub.5",
    subject: "math",
    grade: "K",
    title: { en: "Take away within 5", es: "Quitar hasta 5" },
    standard: "K.OA.A.5",
    prereqs: ["m.add.5"],
    content: "computed",
    levels: 1,
    generate(r, _level, locale) {
      const a = r.int(2, 5);
      const b = r.int(1, a);
      return choiceItem(r, a - b, {
        prompt: [`${a} − ${b} = `, { blank: true }],
        say: tr(locale, `${a} take away ${b} is how many?`, `¿${a} menos ${b} son cuántos?`),
        visual: { kind: "dots", groups: [a], crossed: b },
        markable: true,
        alt: dotsAlt(locale, [a], b),
        hints: [
          tr(locale, "Count the dots that are not crossed out.", "Cuenta los puntos que no están tachados."),
          tr(locale, `Start with ${a}. Take ${b} away.`, `Empieza con ${a}. Quita ${b}.`),
          tr(locale, `Count back ${b} from ${a}.`, `Cuenta hacia atrás ${b} desde ${a}.`),
        ],
        steps: [tr(locale, `${a} take away ${b} leaves ${a - b}.`, `${a} menos ${b} deja ${a - b}.`)],
        seconds: 6,
      });
    },
  },
  {
    id: "m.make.10",
    subject: "math",
    grade: "K",
    title: { en: "Make 10", es: "Formar 10" },
    standard: "K.OA.A.4",
    prereqs: ["m.add.5"],
    content: "computed",
    levels: 1,
    generate(r, _level, locale) {
      const n = r.int(1, 9);
      return choiceItem(r, 10 - n, {
        prompt: [tr(locale, `${n} and how many more make 10?`, `¿${n} y cuántos más hacen 10?`)],
        say: tr(locale, `${n} and how many more make 10?`, `¿${n} y cuántos más hacen 10?`),
        visual: { kind: "ten-frame", filled: n },
        markable: true,
        alt: tr(locale, `A ten-frame with ${n} filled and ${10 - n} empty`, `Un marco de diez con ${n} llenos y ${10 - n} vacíos`),
        hints: [
          tr(locale, "Look at the empty boxes.", "Mira las casillas vacías."),
          tr(locale, "Each empty box needs one more.", "Cada casilla vacía necesita uno más."),
          tr(locale, `Count the empty boxes, starting from ${n + 1}.`, `Cuenta las casillas vacías, empezando en ${n + 1}.`),
        ],
        steps: [tr(locale, `${n} and ${10 - n} make 10.`, `${n} y ${10 - n} hacen 10.`)],
        seconds: 6,
      });
    },
  },
  {
    id: "m.add.10",
    subject: "math",
    grade: "1",
    title: { en: "Add within 10", es: "Sumar hasta 10" },
    standard: "1.OA.C.6",
    prereqs: ["m.add.5"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const a = r.int(1, 9);
      const b = r.int(1, 10 - a);
      const big = Math.max(a, b), small = Math.min(a, b);
      return {
        prompt: [`${a} + ${b} = `, { blank: true }],
        say: tr(locale, `${a} plus ${b}`, `${a} más ${b}`),
        ...(level === 1 ? { visual: { kind: "dots" as const, groups: [a, b] }, markable: true, alt: dotsAlt(locale, [a, b]) } : {}),
        input: "keypad",
        answer: { kind: "number", value: a + b },
        hints: [
          tr(locale, "Start with the bigger number.", "Empieza con el número más grande."),
          tr(locale, `Start at ${big} and count on ${small}.`, `Empieza en ${big} y cuenta ${small} más.`),
          tr(locale, `${big}… ${Array.from({ length: small }, (_, i) => big + i + 1).join(", ")}`, `${big}… ${Array.from({ length: small }, (_, i) => big + i + 1).join(", ")}`),
        ],
        steps: [tr(locale, `Start at ${big}, count on ${small}: ${a + b}.`, `Empieza en ${big}, cuenta ${small} más: ${a + b}.`)],
        seconds: 5,
      };
    },
  },
  {
    id: "m.sub.10",
    subject: "math",
    grade: "1",
    title: { en: "Subtract within 10", es: "Restar hasta 10" },
    standard: "1.OA.C.6",
    prereqs: ["m.sub.5", "m.add.10"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const a = r.int(2, 10);
      const b = r.int(1, a - 1);
      return {
        prompt: [`${a} − ${b} = `, { blank: true }],
        say: tr(locale, `${a} minus ${b}`, `${a} menos ${b}`),
        ...(level === 1 ? { visual: { kind: "dots" as const, groups: [a], crossed: b }, markable: true, alt: dotsAlt(locale, [a], b) } : {}),
        input: "keypad",
        answer: { kind: "number", value: a - b },
        hints: [
          tr(locale, `Think: ${b} plus what makes ${a}?`, `Piensa: ¿${b} más cuánto hacen ${a}?`),
          tr(locale, `Count up from ${b} to ${a}.`, `Cuenta desde ${b} hasta ${a}.`),
          tr(locale, `${b} + ${a - b} = ${a}… so what is ${a} − ${b}?`, `${b} + ${a - b} = ${a}… entonces, ¿cuánto es ${a} − ${b}?`),
        ],
        steps: [tr(locale, `${b} + ${a - b} = ${a}, so ${a} − ${b} = ${a - b}.`, `${b} + ${a - b} = ${a}, así que ${a} − ${b} = ${a - b}.`)],
        seconds: 5,
      };
    },
  },
  {
    id: "m.add.20",
    subject: "math",
    grade: "1",
    title: { en: "Add within 20", es: "Sumar hasta 20" },
    standard: "1.OA.C.6",
    prereqs: ["m.add.10", "m.make.10"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      let a: number, b: number;
      if (level === 1) {
        a = r.int(10, 17);
        b = r.int(1, 19 - a);
      } else {
        a = r.int(5, 9);
        b = r.int(11 - a, 9);
      }
      const toTen = 10 - a;
      return {
        prompt: [`${a} + ${b} = `, { blank: true }],
        say: tr(locale, `${a} plus ${b}`, `${a} más ${b}`),
        input: "keypad",
        answer: { kind: "number", value: a + b },
        hints:
          level === 1
            ? [
                tr(locale, `${a} is 10 and ${a - 10}.`, `${a} es 10 y ${a - 10}.`),
                tr(locale, `Add the ones: ${a - 10} + ${b}.`, `Suma las unidades: ${a - 10} + ${b}.`),
                tr(locale, `10 + ${a - 10 + b}`, `10 + ${a - 10 + b}`),
              ]
            : [
                tr(locale, "Make a 10 first.", "Forma primero un 10."),
                tr(locale, `${a} needs ${toTen} more to make 10. Take ${toTen} from ${b}.`, `A ${a} le faltan ${toTen} para 10. Toma ${toTen} del ${b}.`),
                tr(locale, `${a} + ${toTen} = 10, and ${b - toTen} is left over.`, `${a} + ${toTen} = 10, y sobran ${b - toTen}.`),
              ],
        steps:
          level === 1
            ? [tr(locale, `${a - 10} + ${b} = ${a - 10 + b}, so ${a} + ${b} = ${a + b}.`, `${a - 10} + ${b} = ${a - 10 + b}, así que ${a} + ${b} = ${a + b}.`)]
            : [
                tr(locale, `Split ${b} into ${toTen} and ${b - toTen}.`, `Separa ${b} en ${toTen} y ${b - toTen}.`),
                `${a} + ${toTen} = 10`,
                `10 + ${b - toTen} = ${a + b}`,
              ],
        seconds: 6,
      };
    },
  },
  {
    id: "m.sub.20",
    subject: "math",
    grade: "1",
    title: { en: "Subtract within 20", es: "Restar hasta 20" },
    standard: "1.OA.C.6",
    prereqs: ["m.sub.10", "m.add.20"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      let a: number, b: number;
      if (level === 1) {
        a = r.int(11, 19);
        b = r.int(1, a - 10);
      } else {
        a = r.int(11, 18);
        b = r.int(a - 9, 9);
      }
      const down = a - 10;
      return {
        prompt: [`${a} − ${b} = `, { blank: true }],
        say: tr(locale, `${a} minus ${b}`, `${a} menos ${b}`),
        input: "keypad",
        answer: { kind: "number", value: a - b },
        hints:
          level === 1
            ? [
                tr(locale, "Look at the ones.", "Mira las unidades."),
                tr(locale, `${a - 10} − ${b} first.`, `Primero ${a - 10} − ${b}.`),
                tr(locale, `10 + ${a - 10 - b}`, `10 + ${a - 10 - b}`),
              ]
            : [
                tr(locale, "Go down to 10 first.", "Baja primero hasta 10."),
                tr(locale, `${a} − ${down} = 10. You still need to take away ${b - down}.`, `${a} − ${down} = 10. Aún falta quitar ${b - down}.`),
                tr(locale, `10 − ${b - down}`, `10 − ${b - down}`),
              ],
        steps:
          level === 1
            ? [tr(locale, `${a - 10} − ${b} = ${a - 10 - b}, so ${a} − ${b} = ${a - b}.`, `${a - 10} − ${b} = ${a - 10 - b}, así que ${a} − ${b} = ${a - b}.`)]
            : [tr(locale, `Split ${b} into ${down} and ${b - down}.`, `Separa ${b} en ${down} y ${b - down}.`), `${a} − ${down} = 10`, `10 − ${b - down} = ${a - b}`],
        seconds: 7,
      };
    },
  },
  {
    id: "m.missing.addend",
    subject: "math",
    grade: "1",
    title: { en: "Find the missing number", es: "Encuentra el número que falta" },
    standard: "1.OA.D.8",
    prereqs: ["m.add.10", "m.sub.10"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const total = level === 1 ? r.int(4, 10) : r.int(11, 20);
      const known = r.int(1, total - 1);
      const first = r.bool();
      return {
        prompt: first ? [{ blank: true }, ` + ${known} = ${total}`] : [`${known} + `, { blank: true }, ` = ${total}`],
        say: first ? tr(locale, `What plus ${known} makes ${total}?`, `¿Qué número más ${known} hace ${total}?`) : tr(locale, `${known} plus what makes ${total}?`, `¿${known} más qué número hace ${total}?`),
        input: "keypad",
        answer: { kind: "number", value: total - known },
        hints: [
          tr(locale, `Start at ${known}. How far to ${total}?`, `Empieza en ${known}. ¿Cuánto falta para ${total}?`),
          tr(locale, `Count up from ${known} to ${total} on your fingers.`, `Cuenta con los dedos desde ${known} hasta ${total}.`),
          tr(locale, `${total} − ${known} gives the same answer.`, `${total} − ${known} da la misma respuesta.`),
        ],
        steps: [tr(locale, `${total} − ${known} = ${total - known}, and ${known} + ${total - known} = ${total}.`, `${total} − ${known} = ${total - known}, y ${known} + ${total - known} = ${total}.`)],
        seconds: 8,
      };
    },
  },
  {
    id: "m.place.tens",
    subject: "math",
    grade: "1",
    title: { en: "Tens and ones", es: "Decenas y unidades" },
    standard: "1.NBT.B.2",
    prereqs: ["m.count.20"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const tens = r.int(1, 9), ones = r.int(0, 9);
      const n = tens * 10 + ones;
      const pictured = level === 1;
      return {
        prompt: pictured
          ? [tr(locale, "What number do the blocks show?", "¿Qué número muestran los bloques?")]
          : [tr(locale, `${tens} tens and ${ones} ones make what number?`, `¿${tens} decenas y ${ones} unidades forman qué número?`)],
        say: pictured ? tr(locale, "What number do the blocks show?", "¿Qué número muestran los bloques?") : tr(locale, `${tens} tens and ${ones} ones make what number?`, `¿${tens} decenas y ${ones} unidades forman qué número?`),
        ...(pictured
          ? { visual: { kind: "base-ten" as const, tens, ones }, alt: tr(locale, `${tens} rods of ten and ${ones} single cubes`, `${tens} barras de diez y ${ones} cubos sueltos`) }
          : {}),
        input: "keypad",
        answer: { kind: "number", value: n },
        hints: [
          tr(locale, "Each long rod is 10. Each small cube is 1.", "Cada barra larga es 10. Cada cubito es 1."),
          tr(locale, `Count the tens: 10, 20, 30… up to ${tens} rods.`, `Cuenta las decenas: 10, 20, 30… hasta ${tens} barras.`),
          tr(locale, `${tens * 10} and ${ones} more.`, `${tens * 10} y ${ones} más.`),
        ],
        steps: [tr(locale, `${tens} tens is ${tens * 10}. ${tens * 10} + ${ones} = ${n}.`, `${tens} decenas son ${tens * 10}. ${tens * 10} + ${ones} = ${n}.`)],
        seconds: 8,
      };
    },
  },
  {
    id: "m.compare.100",
    subject: "math",
    grade: "1",
    title: { en: "Compare numbers to 100", es: "Comparar números hasta 100" },
    standard: "1.NBT.B.3",
    prereqs: ["m.place.tens"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const a = r.int(10, 99);
      // Level 2 keeps the tens equal so the ones decide.
      let b = level === 2 && r.bool(0.7) ? Math.floor(a / 10) * 10 + r.int(0, 9) : r.int(10, 99);
      if (level === 1 && b === a) b = a === 99 ? 98 : a + 1;
      const choices: Choice[] = [
        { label: "<", say: tr(locale, "is less than", "es menor que") },
        { label: ">", say: tr(locale, "is greater than", "es mayor que") },
        { label: "=", say: tr(locale, "is equal to", "es igual a") },
      ];
      const want = a < b ? 0 : a > b ? 1 : 2;
      const sameTens = Math.floor(a / 10) === Math.floor(b / 10);
      return {
        prompt: [`${a} `, { blank: true }, ` ${b}`],
        say: tr(locale, `Compare ${a} and ${b}.`, `Compara ${a} y ${b}.`),
        choices,
        input: "choices",
        answer: { kind: "choice", index: want },
        hints: [
          tr(locale, "Compare the tens first.", "Compara primero las decenas."),
          sameTens ? tr(locale, "The tens are the same, so compare the ones.", "Las decenas son iguales, así que compara las unidades.") : tr(locale, `${a} has ${Math.floor(a / 10)} tens; ${b} has ${Math.floor(b / 10)}.`, `${a} tiene ${Math.floor(a / 10)} decenas; ${b} tiene ${Math.floor(b / 10)}.`),
          tr(locale, "The open side of < or > faces the bigger number.", "El lado abierto de < o > mira hacia el número mayor."),
        ],
        steps: [`${a} ${choices[want].label} ${b}`],
        seconds: 6,
      };
    },
  },
  {
    id: "m.time.clock",
    subject: "math",
    grade: "1",
    title: { en: "Tell time", es: "Decir la hora" },
    standard: "1.MD.B.3",
    prereqs: ["m.count.20"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const h = r.int(1, 12);
      const m = level === 1 ? 0 : level === 2 ? r.pick([0, 30]) : r.int(0, 11) * 5;
      const fmt = (hh: number, mm: number) => `${hh}:${String(mm).padStart(2, "0")}`;
      const options = new Set([fmt(h, m)]);
      while (options.size < 4) {
        const hh = r.int(1, 12), mm = level === 1 ? 0 : level === 2 ? r.pick([0, 30]) : r.int(0, 11) * 5;
        options.add(r.bool(0.4) ? fmt(m === 0 ? hh : h, mm) : fmt(hh, m));
      }
      const choices = r.shuffle([...options]).map((label) => ({ label }));
      // Some problems turn it around: set the hands to a time. Drawn last, so reading problems stay as they were.
      if (r.bool(0.4)) return setTheClock(h, m, level, locale);
      return {
        prompt: [tr(locale, "What time does the clock show?", "¿Qué hora marca el reloj?")],
        say: tr(locale, "What time does the clock show?", "¿Qué hora marca el reloj?"),
        visual: { kind: "clock", h, m },
        alt: tr(locale, `A clock with the short hand near ${h} and the long hand on ${m === 0 ? 12 : m / 5}`, `Un reloj con la manecilla corta cerca del ${h} y la larga en el ${m === 0 ? 12 : m / 5}`),
        choices,
        input: "choices",
        answer: { kind: "choice", index: choices.findIndex((c) => c.label === fmt(h, m)) },
        hints: [
          tr(locale, "The short hand tells the hour.", "La manecilla corta marca la hora."),
          tr(locale, "The long hand tells the minutes. Each number is 5 minutes.", "La manecilla larga marca los minutos. Cada número son 5 minutos."),
          m === 0 ? tr(locale, "Long hand on 12 means o'clock.", "La manecilla larga en el 12 significa en punto.") : tr(locale, `The long hand is on ${m / 5}: count by fives.`, `La manecilla larga está en el ${m / 5}: cuenta de cinco en cinco.`),
        ],
        steps: [tr(locale, `Short hand: ${h}. Long hand: ${m} minutes. It is ${fmt(h, m)}.`, `Manecilla corta: ${h}. Manecilla larga: ${m} minutos. Son las ${fmt(h, m)}.`)],
        seconds: 10,
      };
    },
  },
  {
    id: "m.add.2digit",
    subject: "math",
    grade: "2",
    title: { en: "Add two-digit numbers", es: "Sumar números de dos cifras" },
    standard: "2.NBT.B.5",
    prereqs: ["m.add.20", "m.place.tens"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      let a: number, b: number;
      if (level === 1) {
        const at = r.int(1, 8), ao = r.int(0, 8);
        a = at * 10 + ao;
        b = r.int(1, 9 - at) * 10 + r.int(0, 9 - ao);
      } else {
        const ao = r.int(2, 9);
        a = r.int(1, 7) * 10 + ao;
        b = r.int(1, 8 - Math.floor(a / 10)) * 10 + r.int(10 - ao, 9);
      }
      const ones = (a % 10) + (b % 10);
      const carry = ones >= 10;
      return {
        prompt: [`${a} + ${b} = `, { blank: true }],
        say: tr(locale, `${a} plus ${b}`, `${a} más ${b}`),
        visual: { kind: "column", op: "+", top: a, bottom: b },
        alt: tr(locale, `${a} written above ${b}, lined up to add`, `${a} escrito encima de ${b}, alineados para sumar`),
        input: "keypad",
        answer: { kind: "number", value: a + b },
        hints: [
          tr(locale, "Add the ones first.", "Suma primero las unidades."),
          carry
            ? tr(locale, `${a % 10} + ${b % 10} = ${ones}. Write ${ones % 10} and carry the 1 ten.`, `${a % 10} + ${b % 10} = ${ones}. Escribe ${ones % 10} y lleva 1 decena.`)
            : tr(locale, `${a % 10} + ${b % 10} = ${ones}. Now the tens.`, `${a % 10} + ${b % 10} = ${ones}. Ahora las decenas.`),
          tr(locale, `Tens: ${Math.floor(a / 10)} + ${Math.floor(b / 10)}${carry ? " + 1" : ""}.`, `Decenas: ${Math.floor(a / 10)} + ${Math.floor(b / 10)}${carry ? " + 1" : ""}.`),
        ],
        steps: [
          tr(locale, `Ones: ${a % 10} + ${b % 10} = ${ones}${carry ? `, write ${ones % 10}, carry 1` : ""}.`, `Unidades: ${a % 10} + ${b % 10} = ${ones}${carry ? `, escribe ${ones % 10}, llevas 1` : ""}.`),
          tr(locale, `Tens: ${Math.floor(a / 10)} + ${Math.floor(b / 10)}${carry ? " + 1" : ""} = ${Math.floor((a + b) / 10)}.`, `Decenas: ${Math.floor(a / 10)} + ${Math.floor(b / 10)}${carry ? " + 1" : ""} = ${Math.floor((a + b) / 10)}.`),
          `${a} + ${b} = ${a + b}`,
        ],
        seconds: 20,
      };
    },
  },
  {
    id: "m.sub.2digit",
    subject: "math",
    grade: "2",
    title: { en: "Subtract two-digit numbers", es: "Restar números de dos cifras" },
    standard: "2.NBT.B.5",
    prereqs: ["m.sub.20", "m.place.tens"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      let a: number, b: number;
      if (level === 1) {
        const at = r.int(2, 9), ao = r.int(1, 9);
        a = at * 10 + ao;
        b = r.int(1, at - 1) * 10 + r.int(0, ao);
      } else {
        const ao = r.int(0, 7);
        a = r.int(3, 9) * 10 + ao;
        b = r.int(1, Math.floor(a / 10) - 1) * 10 + r.int(ao + 1, 9);
      }
      const borrow = a % 10 < b % 10;
      return {
        prompt: [`${a} − ${b} = `, { blank: true }],
        say: tr(locale, `${a} minus ${b}`, `${a} menos ${b}`),
        visual: { kind: "column", op: "−", top: a, bottom: b },
        alt: tr(locale, `${a} written above ${b}, lined up to subtract`, `${a} escrito encima de ${b}, alineados para restar`),
        input: "keypad",
        answer: { kind: "number", value: a - b },
        hints: [
          tr(locale, "Start with the ones.", "Empieza por las unidades."),
          borrow
            ? tr(locale, `You can't take ${b % 10} from ${a % 10}. Trade 1 ten for 10 ones: now ${(a % 10) + 10} ones.`, `No puedes quitar ${b % 10} de ${a % 10}. Cambia 1 decena por 10 unidades: ahora tienes ${(a % 10) + 10}.`)
            : tr(locale, `${a % 10} − ${b % 10} = ${(a % 10) - (b % 10)}. Now the tens.`, `${a % 10} − ${b % 10} = ${(a % 10) - (b % 10)}. Ahora las decenas.`),
          borrow
            ? tr(locale, `Ones: ${(a % 10) + 10} − ${b % 10}. Tens: ${Math.floor(a / 10) - 1} − ${Math.floor(b / 10)}.`, `Unidades: ${(a % 10) + 10} − ${b % 10}. Decenas: ${Math.floor(a / 10) - 1} − ${Math.floor(b / 10)}.`)
            : tr(locale, `Tens: ${Math.floor(a / 10)} − ${Math.floor(b / 10)}.`, `Decenas: ${Math.floor(a / 10)} − ${Math.floor(b / 10)}.`),
        ],
        steps: borrow
          ? [
              tr(locale, `Trade a ten: ${a} is ${Math.floor(a / 10) - 1} tens and ${(a % 10) + 10} ones.`, `Cambia una decena: ${a} son ${Math.floor(a / 10) - 1} decenas y ${(a % 10) + 10} unidades.`),
              tr(locale, `Ones: ${(a % 10) + 10} − ${b % 10} = ${(a % 10) + 10 - (b % 10)}. Tens: ${Math.floor(a / 10) - 1} − ${Math.floor(b / 10)} = ${Math.floor(a / 10) - 1 - Math.floor(b / 10)}.`, `Unidades: ${(a % 10) + 10} − ${b % 10} = ${(a % 10) + 10 - (b % 10)}. Decenas: ${Math.floor(a / 10) - 1} − ${Math.floor(b / 10)} = ${Math.floor(a / 10) - 1 - Math.floor(b / 10)}.`),
              `${a} − ${b} = ${a - b}`,
            ]
          : [`${a % 10} − ${b % 10} = ${(a % 10) - (b % 10)}`, `${Math.floor(a / 10)} − ${Math.floor(b / 10)} = ${Math.floor(a / 10) - Math.floor(b / 10)}`, `${a} − ${b} = ${a - b}`],
        seconds: 20,
      };
    },
  },
  {
    id: "m.skip.count",
    subject: "math",
    grade: "2",
    title: { en: "Skip count", es: "Contar de tanto en tanto" },
    standard: "2.NBT.A.2",
    prereqs: ["m.next.number"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const by = level === 1 ? r.pick([2, 5, 10]) : r.pick([5, 10, 100]);
      const start = by * r.int(0, level === 1 ? 6 : 8);
      const seq = [0, 1, 2, 3].map((k) => start + by * k);
      return {
        prompt: [`${seq.slice(0, 3).join(", ")}, `, { blank: true }],
        say: tr(locale, `${seq.slice(0, 3).join(", ")}, what comes next?`, `${seq.slice(0, 3).join(", ")}, ¿qué sigue?`),
        input: "keypad",
        answer: { kind: "number", value: seq[3] },
        hints: [
          tr(locale, "How much does it grow each time?", "¿Cuánto crece cada vez?"),
          tr(locale, `It goes up by ${by}.`, `Sube de ${by} en ${by}.`),
          `${seq[2]} + ${by}`,
        ],
        steps: [tr(locale, `Each number is ${by} more. ${seq[2]} + ${by} = ${seq[3]}.`, `Cada número es ${by} más. ${seq[2]} + ${by} = ${seq[3]}.`)],
        seconds: 6,
      };
    },
  },
  {
    id: "m.addsub.1000",
    subject: "math",
    grade: "2",
    title: { en: "Add and subtract within 1000", es: "Sumar y restar hasta 1000" },
    standard: "2.NBT.B.7",
    prereqs: ["m.add.2digit", "m.sub.2digit"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const add = level === 1;
      const a = add ? r.int(100, 600) : r.int(300, 999);
      const b = add ? r.int(100, 999 - a) : r.int(100, a - 50);
      const want = add ? a + b : a - b;
      return {
        prompt: [`${a} ${add ? "+" : "−"} ${b} = `, { blank: true }],
        say: add ? tr(locale, `${a} plus ${b}`, `${a} más ${b}`) : tr(locale, `${a} minus ${b}`, `${a} menos ${b}`),
        visual: { kind: "column", op: add ? "+" : "−", top: a, bottom: b },
        alt: tr(locale, `${a} written above ${b}, lined up`, `${a} escrito encima de ${b}, alineados`),
        input: "keypad",
        answer: { kind: "number", value: want },
        hints: [
          tr(locale, "Line up ones, tens and hundreds. Start at the ones.", "Alinea unidades, decenas y centenas. Empieza por las unidades."),
          add ? tr(locale, "If a column makes 10 or more, carry 1 to the next column.", "Si una columna suma 10 o más, lleva 1 a la siguiente.") : tr(locale, "If the top digit is smaller, trade 1 from the next column.", "Si la cifra de arriba es menor, pide 1 a la columna siguiente."),
          tr(locale, `Hundreds: ${Math.floor(a / 100)} ${add ? "+" : "−"} ${Math.floor(b / 100)}, adjusted for any carry or trade.`, `Centenas: ${Math.floor(a / 100)} ${add ? "+" : "−"} ${Math.floor(b / 100)}, ajustando lo que llevas o pides.`),
        ],
        steps: [tr(locale, `Work right to left, one column at a time: ${a} ${add ? "+" : "−"} ${b} = ${want}.`, `Trabaja de derecha a izquierda, una columna a la vez: ${a} ${add ? "+" : "−"} ${b} = ${want}.`)],
        seconds: 30,
      };
    },
  },
];
