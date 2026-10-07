import type { Band } from "@/catalogue";
import type { Locale } from "@/lib/types";

// Example goals by grade band. Chips fill the box; they never submit.
export const EXAMPLES: Record<Locale, Record<Band, string[]>> = {
  en: {
    k2: ["Counting to 100", "Why do leaves change color?", "Telling a story in order"],
    "35": ["Fractions", "The water cycle", "Writing a strong opening"],
    "68": ["Negative numbers", "How cells work", "Building an argument"],
    "9": ["Linear functions", "Chemical reactions", "Analyzing a speech"],
    adult: ["Reading a balance sheet", "How vaccines work", "Writing a clear email"],
  },
  es: {
    k2: ["Contar hasta 100", "¿Por qué cambian de color las hojas?", "Contar un cuento en orden"],
    "35": ["Fracciones", "El ciclo del agua", "Empezar bien un texto"],
    "68": ["Números negativos", "Cómo funcionan las células", "Armar un argumento"],
    "9": ["Funciones lineales", "Reacciones químicas", "Analizar un discurso"],
    adult: ["Leer un balance general", "Cómo funcionan las vacunas", "Escribir un correo claro"],
  },
};
