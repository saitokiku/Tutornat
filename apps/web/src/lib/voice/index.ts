// The voice layer for screens (browser side). Server routes use ./server instead.
//
// In a React screen, useVoiceSession() (./session) does all of the below and gives plain state.
// Without React:
//   const v = await voice({ locale, consent, under13: mayBeUnder13(grade), young: isYoung(grade), names: [nickname] });
//   const talk = converse({ input: v.in, output: v.out, onTurn: send });
//   const feed = sentenceFeed(); void talk.say(feed.sentences); feed.set(replySoFar); … feed.end();
//   await v.in?.start();  // mic on; turns end by themselves; "mhm" never interrupts the tutor

export * from "./types";
export { asyncQueue, createChunker, sentenceFeed, sentencesFrom, sentencesOf, splitSentences, type ChunkOptions } from "./chunk";
export { fractionWords, speakable, wordAt, type Speakable } from "./speakable";
export { isBackchannel, isFillerOnly, words } from "./backchannel";
export { BARGE_IN_MS, echoScore, echoVerdict, shouldBargeIn, type BargeInput } from "./bargein";
export { TURN_DEFAULT, TURN_MANUAL, TURN_YOUNG, emptyTurn, finishTurn, nextCheckAt, shapeOf, silenceNeeded, stepTurn, turnText, turnTracker } from "./turn";
export type { TurnEvent, TurnOptions, TurnShape, TurnState, TurnTracker } from "./turn";
export { browserSpeechIn, browserSpeechOut, pickVoice, speechLang } from "./browser";
export { elevenLabsSpeechOut, pcm16ToFloat32 } from "./elevenlabs";
export { deepgramSpeechIn } from "./deepgram";
export { judgeLevels, levelOutOfTen, micCapture, micSelfTest, micSupported, selfTestKey, voiceErrorKey, type SelfTest, type SelfTestStatus } from "./mic";
export { converse, type ConverseOptions } from "./converse";
export { isYoung, mayBeUnder13, voice, voiceDisclosure, voiceStatus, type Voice, type VoiceSetup, type VoiceStatus } from "./select";
export { useVoiceSession, type SessionOptions, type VoiceSession } from "./session";
