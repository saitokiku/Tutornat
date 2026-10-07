/**
 * The shared read-aloud button draws 40 px. Practice needs 44 px targets, and 56 px for K–2 learners,
 * so every Hear in practice takes this size (the important flag beats the button's own size).
 */
export const hearSize = (young?: boolean) => (young ? "size-14!" : "size-11!");
