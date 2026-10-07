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

// Common asks for the universal box, one of each kind of door: school work, a test, practice, a question.
export const INTAKE_EXAMPLES: Record<Locale, Record<Band, string[]>> = {
  en: {
    k2: ["Counting worksheet due tomorrow", "Spelling test on Friday", "Practice adding to 10", "Why do leaves change color?"],
    "35": ["Fractions worksheet due Friday", "Multiplication quiz next Tuesday", "Practice times tables", "How does the water cycle work?"],
    "68": ["Ratios homework due tomorrow", "Science test on Friday", "Practice negative numbers", "How do cells divide?"],
    "9": ["Linear functions worksheet due Thursday", "Chemistry quiz on Friday", "Practice slope", "What is a chemical reaction?"],
    adult: ["Reading assignment due Monday", "Exam next Friday", "Practice percentages", "How do vaccines work?"],
  },
  es: {
    k2: ["Hoja de sumas para mañana", "Prueba de ortografía el viernes", "Practicar sumas hasta 10", "¿Por qué cambian de color las hojas?"],
    "35": ["Tarea de fracciones para el viernes", "Examen de multiplicación el próximo martes", "Practicar las tablas de multiplicar", "¿Cómo funciona el ciclo del agua?"],
    "68": ["Tarea de razones para mañana", "Examen de ciencias el viernes", "Practicar números negativos", "¿Cómo se dividen las células?"],
    "9": ["Hoja de funciones lineales para el jueves", "Prueba de química el viernes", "Practicar pendiente", "¿Qué es una reacción química?"],
    adult: ["Lectura para el lunes", "Examen el próximo viernes", "Practicar porcentajes", "¿Cómo funcionan las vacunas?"],
  },
};
