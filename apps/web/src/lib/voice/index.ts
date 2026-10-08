// The voice layer for screens (browser side). Server routes use ./server instead.
//
// In a React screen, useVoiceSession() (./session) does all of the below and gives plain state.
// Without React:
//   const v = await voice({ locale, consent, under13: mayBeUnder13(grade), young: isYoung(grade), names: [nickname] });
//   const talk = converse({ input: v.in, output: v.out, locale, names: [nickname], onTurn: send, onBargeIn: stopReply });
//   const feed = sentenceFeed(); void talk.say(feed.sentences); feed.set(replySoFar); … feed.end();
//   talk.listening(); await v.in?.start();  // push-to-talk; v.in.stop() ends the turn. "mhm" never interrupts the tutor
//   …on leaving: talk.dispose(); v.out?.dispose(); v.in?.abort();

export * from "./types";
export { asyncQueue, createChunker, sentenceFeed, sentencesFrom, sentencesOf, splitSentences, type ChunkOptions } from "./chunk";
export { fold, fractionWords, hasName, speakable, wordAt, type Speakable } from "./speakable";
export { isBackchannel, isFillerOnly, words } from "./backchannel";
export { bargeStart, bargeStep, echoByTime, echoMarks, echoScore, echoVerdict, foldWords, wordKind, type BargeAction, type BargeEvent, type BargeState, type PlayedWord } from "./bargein";
export { TURN_DEFAULT, TURN_MANUAL, TURN_YOUNG, emptyTurn, finishTurn, nextCheckAt, shapeOf, silenceNeeded, stepTurn, turnText, turnTracker } from "./turn";
export type { TurnEvent, TurnOptions, TurnShape, TurnState, TurnTracker } from "./turn";
export { browserSpeechIn, browserSpeechOut, browserVoice, speechLang } from "./browser";
export { elevenLabsSpeechOut, pcm16ToFloat32 } from "./elevenlabs";
export { deepgramSpeechIn } from "./deepgram";
export {
  judgeLevels,
  levelOutOfTen,
  listenSelfTest,
  listenTestKey,
  micCapture,
  micOffKey,
  micSelfTest,
  micSupported,
  selfTestKey,
  voiceErrorKey,
  type ListenTest,
  type SelfTest,
  type SelfTestStatus,
} from "./mic";
export { converse, type Converse, type ConverseMetric, type ConverseOptions, type HeardTurn, type MicOffReason } from "./converse";
export { mayBeUnder13, voice, voiceDisclosure, voiceStatus, withFallback, type Voice, type VoiceSetup, type VoiceStatus } from "./select";
export { useVoiceSession, type SessionOptions, type VoiceSession } from "./session";
