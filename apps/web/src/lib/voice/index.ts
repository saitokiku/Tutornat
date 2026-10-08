// The voice layer for screens (browser side). Server routes use ./server instead.
//
// In the app: VoiceRoot (./root, mounted once in app/layout.tsx) builds the learner's one voice, and
// screens read it — useAppVoice() for state, useSpeak() for a Hear button, narration or read-aloud,
// useTutorVoice() for the talking tutor (the live loop of ./conversation). WIRING.md says how each
// screen moves onto it. Without React:
//   const v = await voice({ locale, consent, under13: mayBeUnder13(grade), band: bandOf(grade), names: [nickname] });
//   const talk = converse({ input: v.in, output: v.out, locale, names: [nickname], onTurn: send, onBargeIn: stopReply });
//   const feed = sentenceFeed({ mode: "voice" }); void talk.say(feed.sentences); feed.write(delta); … feed.end();
//   await v.in?.start({ turns: "auto", band });
//   …on leaving: talk.dispose(); v.out?.dispose(); v.in?.abort();

export * from "./types";
export { asyncQueue, createChunker, sentenceFeed, sentencesFrom, sentencesOf, splitSentences, type ChunkOptions, type FeedOptions } from "./chunk";
export { fold, fractionWords, hasName, speakable, wordAt, type Speakable } from "./speakable";
export { cardinal, numberWords, ordinal, sayNumbers, UNSPOKEN } from "./numbers";
export { isBackchannel, isFillerOnly, isHolding, words } from "./backchannel";
export { bargeStart, bargeStep, echoByTime, echoMarks, echoScore, echoVerdict, foldWords, wordKind, type BargeAction, type BargeEvent, type BargeState, type PlayedWord } from "./bargein";
export { TURN_DEFAULT, TURN_MANUAL, TURN_YOUNG, emptyTurn, finishTurn, nextCheckAt, shapeOf, silenceNeeded, stepTurn, turnOptions, turnText, turnTracker } from "./turn";
export type { TurnEvent, TurnOptions, TurnShape, TurnState, TurnTracker } from "./turn";
export { ANSWER_END_MS, BANDS, FLUX, NOVA, SENTENCE_PAUSE, TURN_WINDOWS, bandOf, voiceSpeed } from "./bands";
export { chooseVoice, isOnline, loadVoices, pickBrowserVoice, rankVoices, tierOf, type Tier, type VoicePick } from "./voices";
export { audibleAtMs, latencyMs, micSession, playbackSession, resumeWithin, setAudioSession, sharedAudio, unlockAudio } from "./audio";
export { createPlayer, type Player } from "./player";
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
export { convStart, convStep, heardPrefix, wakeAt, type ConvEvent, type ConvState, type Effect, type Mode, type Notice, type Phase } from "./conversation";
export { addressesSomeoneElse } from "./addressee";
export { GATES, metricOf, percentile, postMetric, segments, type Segments, type TurnMarks, type VoiceMetric } from "./metrics";
export { mayBeUnder13, voice, voiceDisclosure, voiceStatus, withFallback, type Voice, type VoiceSetup, type VoiceStatus } from "./select";
export { appSpeechOut, type AppSpeechOut } from "./app-out";
export { appSay, appSilence, useAppVoice, useSpeak, VoiceProvider, VoiceRoot, type AppVoice, type Speaker, type VoiceLearner } from "./root";
export { useTutorVoice, type SendInfo, type TutorVoice, type TutorVoiceOptions } from "./tutor-voice";
export { useVoiceSession, type SessionOptions, type VoiceSession } from "./session";
