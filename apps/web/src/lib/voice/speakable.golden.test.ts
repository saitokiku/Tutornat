import { describe, expect, it } from "vitest";
import { UNSPOKEN } from "./numbers";
import { speakable } from "./speakable";

// The golden table for what the voice says (live tutor spec §2.8). Every rule of the number speller
// has a row in each language, and every probe the critics ran on the old speakable() (spec §0.2) is
// here with what a teacher would say. Listen to a new row once through the real voice before adding it.

const EN: [string, string][] = [
  // §0.2 probes
  ["It dropped to -2 degrees.", "It dropped to negative two degrees."],
  ["Shade 5/16 of it.", "Shade five sixteenths of it."],
  ["That is 7/20.", "That is seven twentieths."],
  ["Meet at 3:30.", "Meet at three thirty."],
  ["It costs $2.50.", "It costs two dollars and fifty cents."],
  ["There are 1,250 seats.", "There are one thousand two hundred fifty seats."],
  ["She came 2nd.", "She came second."],
  ["√16 is 4.", "the square root of sixteen is four."],
  ["50% of them.", "fifty percent of them."],
  ["Try 3 → 4 → 5", "Try three four five"],
  ["Some, e.g. apples.", "Some, for example apples."],
  ["3 x 4 = 12", "three times four equals twelve"],
  ["Eat 2 1/2 pies.", "Eat two and a half pies."],
  // integers
  ["105", "one hundred five"],
  ["1250", "one thousand two hundred fifty"],
  ["That's 1,000,000.", "That's one million."],
  ["999,999,999", "nine hundred ninety-nine million nine hundred ninety-nine thousand nine hundred ninety-nine"],
  ["Count 1,2,3", "Count one, two, three"],
  ["**12** apples", "twelve apples"],
  // negatives
  ["-3 + 5 = 2", "negative three plus five equals two"],
  ["(-2)", "(negative two)"],
  ["−7", "negative seven"],
  // decimals
  ["3.75", "three point seven five"],
  ["0.5", "zero point five"],
  [".5", "point five"],
  ["4.125", "four point one two five"],
  // fractions
  ["1/4", "one fourth"],
  ["3/4", "three fourths"],
  ["1/2 is 2/4.", "one half is two fourths."],
  ["5/23", "five over twenty-three"],
  ["7/100", "seven hundredths"],
  ["3/1000", "three thousandths"],
  ["-2/3", "negative two thirds"],
  ["Is it 3/4 or 2/4?", "Is it three fourths or two fourths?"],
  ["$\\frac{3}{4}$ of it", "three fourths of it"],
  ["3 3/4 cups", "three and three fourths cups"],
  // dates stay dates
  ["Your test is on 10/12.", "Your test is on October twelfth."],
  ["Due 10/14.", "Due October fourteenth."],
  ["Work on 2/3 first.", "Work on two thirds first."],
  // times
  ["3:05", "three oh five"],
  ["3:00", "three o'clock"],
  ["3:15", "three fifteen"],
  ["3:45", "three forty-five"],
  ["Lunch is at 12:30 p.m.", "Lunch is at twelve thirty p.m."],
  ["3:00 pm", "three pm"],
  ["A ratio of 3:4", "A ratio of three to four"],
  // money
  ["$0.75", "seventy-five cents"],
  ["$1", "one dollar"],
  ["$1.01", "one dollar and one cent"],
  ["$1,250", "one thousand two hundred fifty dollars"],
  ["75¢", "seventy-five cents"],
  // percent
  ["2.5%", "two point five percent"],
  ["100%", "one hundred percent"],
  // ordinals
  ["1st", "first"],
  ["3rd", "third"],
  ["12th", "twelfth"],
  ["20th", "twentieth"],
  ["21st", "twenty-first"],
  // operators
  ["3x4=12", "three times four equals twelve"],
  ["5 · 6", "five times six"],
  ["A = l × w", "A equals l times w"],
  ["2x + 3 = 7", "two x plus three equals seven"],
  ["12 ÷ 3 = 4", "twelve divided by three equals four"],
  ["3 < 5", "three is less than five"],
  ["x ≠ 4", "x is not equal to four"],
  ["x^2 + 1", "x squared plus one"],
  ["5³", "five cubed"],
  ["2^n", "two to the power of n"],
  ["10^-3", "ten to the power of negative three"],
  ["3 × 10^5", "three times ten to the power of five"],
  // units
  ["5 cm long", "five centimeters long"],
  ["1 kg", "one kilogram"],
  ["1 ft", "one foot"],
  ["3 ft", "three feet"],
  ["12 cm²", "twelve square centimeters"],
  ["3 in by 4 in", "three inches by four inches"],
  ["Put 3 in the box.", "Put three in the box."],
  ["72°F", "seventy-two degrees Fahrenheit"],
  ["20 °C", "twenty degrees Celsius"],
  ["90°", "ninety degrees"],
  // symbols and abbreviations
  ["| a | b |", "a b"],
  ["• Count them.", "Count them."],
  ["Add them, i.e. combine.", "Add them, that is combine."],
  ["pens, pencils, etc.", "pens, pencils, and so on."],
  ["Let me check that.Your answer is close.", "Let me check that. Your answer is close."],
  // ranges
  ["pages 3-5", "pages three to five"],
  ["grades 3–5", "grades three to five"],
  // phone numbers, digit by digit
  ["Call or text 988 any time.", "Call or text nine eight eight any time."],
  ["Call 1-800-422-4453.", "Call one, eight zero zero, four two two, four four five three."],
  ["If you are in danger, call 911.", "If you are in danger, call nine one one."],
];

const ES: [string, string][] = [
  // §0.2 probes
  ["Son las 3:30", "Son las tres y media"],
  ["0.5", "cero punto cinco"],
  ["5 x 3", "cinco por tres"],
  ["1.250", "mil doscientos cincuenta"],
  ["3,5", "tres coma cinco"],
  ["2 1/2", "dos y medio"],
  // integers and "un / una"
  ["100", "cien"],
  ["16", "dieciséis"],
  ["1,250", "mil doscientos cincuenta"],
  ["1.000.000", "un millón"],
  ["2.000.000", "dos millones"],
  ["1 manzana", "una manzana"],
  ["21 manzanas", "veintiuna manzanas"],
  ["1 libro", "un libro"],
  ["21 libros", "veintiún libros"],
  ["31 días", "treinta y un días"],
  ["1 canción", "una canción"],
  ["1 ciudad", "una ciudad"],
  ["Es 1.", "Es uno."],
  ["Son 21.", "Son veintiuno."],
  ["200 manzanas", "doscientas manzanas"],
  ["101 libros", "ciento un libros"],
  // negatives
  ["-2", "menos dos"],
  ["−3 + 5", "menos tres más cinco"],
  // decimals
  ["3.75", "tres punto setenta y cinco"],
  ["0,05", "cero coma cero cinco"],
  ["3,1416", "tres coma uno cuatro uno seis"],
  // fractions
  ["5/16", "cinco dieciseisavos"],
  ["1/4", "un cuarto"],
  ["3/4", "tres cuartos"],
  ["1/2", "un medio"],
  ["2/3", "dos tercios"],
  ["7/20", "siete veinteavos"],
  ["1/11", "un onceavo"],
  ["5/23", "cinco sobre veintitrés"],
  ["1/100", "un centésimo"],
  ["3/1000", "tres milésimos"],
  ["2 1/3", "dos y un tercio"],
  ["3 3/4", "tres y tres cuartos"],
  ["¿Es 3/4 o 2/4?", "¿Es tres cuartos o dos cuartos?"],
  ["El examen es el 3/4.", "El examen es el tres de abril."],
  // times
  ["3:15", "tres y cuarto"],
  ["3:00", "tres en punto"],
  ["3:05", "tres y cinco"],
  ["3:45", "tres y cuarenta y cinco"],
  ["1:30", "una y media"],
  ["Es la 1:00.", "Es la una en punto."],
  // money and percent
  ["$2.50", "dos dólares con cincuenta centavos"],
  ["$0.75", "setenta y cinco centavos"],
  ["$1", "un dólar"],
  ["50%", "cincuenta por ciento"],
  // ordinals
  ["1.º", "primero"],
  ["1.ª", "primera"],
  ["1er", "primer"],
  ["3ro", "tercero"],
  ["2da", "segunda"],
  ["20.º", "vigésimo"],
  ["El 1er lugar", "El primer lugar"],
  ["La 2.ª pregunta", "La segunda pregunta"],
  // operators and letters
  ["6 × 7 = 42", "seis por siete es igual a cuarenta y dos"],
  ["8 − 5 = 3", "ocho menos cinco es igual a tres"],
  ["12 ÷ 3", "doce entre tres"],
  ["√16", "la raíz cuadrada de dieciséis"],
  ["x^2", "equis al cuadrado"],
  ["x^3", "equis al cubo"],
  ["2^n", "dos elevado a ene"],
  ["3x", "tres equis"],
  ["x = 4", "equis es igual a cuatro"],
  ["y = 2x", "ye es igual a dos equis"],
  ["3 y 4", "tres y cuatro"],
  ["x ≠ 4", "equis es distinto de cuatro"],
  // units
  ["1 cm", "un centímetro"],
  ["5 cm", "cinco centímetros"],
  ["12 cm²", "doce centímetros cuadrados"],
  ["1 kg", "un kilogramo"],
  ["20 °C", "veinte grados Celsius"],
  // symbols and abbreviations
  ["p. ej. dos", "por ejemplo dos"],
  ["lápices, etc.", "lápices, etcétera."],
  ["Prueba 3 → 4", "Prueba tres cuatro"],
  ["páginas 3–5", "páginas tres a cinco"],
  // phone numbers
  ["Llama al 911.", "Llama al nueve uno uno."],
  ["Puedes llamar o enviar un mensaje al 988 a cualquier hora.", "Puedes llamar o enviar un mensaje al nueve ocho ocho a cualquier hora."],
  ["Llama a Childhelp al 1-800-422-4453.", "Llama a Childhelp al uno, ocho cero cero, cuatro dos dos, cuatro cuatro cinco tres."],
];

describe("what the voice says (golden table)", () => {
  it("has at least 60 rows in each language", () => {
    expect(EN.length).toBeGreaterThanOrEqual(60);
    expect(ES.length).toBeGreaterThanOrEqual(60);
  });

  it.each(EN)("en: %s", (written, said) => {
    expect(speakable(written, "en").text).toBe(said);
  });

  it.each(ES)("es: %s", (written, said) => {
    expect(speakable(written, "es").text).toBe(said);
  });

  it("never leaves a digit or a number symbol for the voice", () => {
    for (const [written] of EN) expect(speakable(written, "en").text, written).not.toMatch(UNSPOKEN);
    for (const [written] of ES) expect(speakable(written, "es").text, written).not.toMatch(UNSPOKEN);
  });

  it("every spoken word still points at the written word it came from", () => {
    for (const [written] of [...EN, ...ES]) {
      const sp = speakable(written, "en");
      const n = written.split(/\s+/).filter(Boolean).length;
      expect(sp.words.length).toBe(sp.text.split(/\s+/).filter(Boolean).length);
      expect(sp.words.every((w, k) => w >= 0 && w < n && (k === 0 || w >= sp.words[k - 1]))).toBe(true);
    }
  });
});
