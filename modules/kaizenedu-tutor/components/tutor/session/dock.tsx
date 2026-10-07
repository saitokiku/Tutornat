'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Flag, Mic, MicOff, MoreHorizontal, PhoneOff, Radio, Send } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { InputPreference, MicStatus } from './use-tutor-session';

export interface DockProps {
  preference: InputPreference;
  onPreference: (next: InputPreference) => void;
  mic: MicStatus;
  micMessage: string | null;
  onRequestMic: () => void;
  muted: boolean;
  onMuted: (next: boolean) => void;
  talking: boolean;
  onPressToTalk: () => void;
  onReleaseToTalk: () => void;
  onCancelToTalk: () => void;
  onSubmitText: (text: string) => void;
  onEnd: () => void;
  onReport: () => void;
}

/**
 * The dock, one row (D36): the voice control, the text field, send, end, and
 * a small menu for the rest (hands-free, mute, report). The text field is
 * available in every state and is the only input when the microphone is
 * denied or missing — a session must never be unusable because a browser said
 * no to a permission (CLAUDE.md screen states; spec §5.10 A).
 *
 * The voice control is one of: "Use the microphone" while nothing has been
 * asked (a text session starts this way), hold-to-talk (a pointer press: down
 * starts recording and interrupts the tutor, up sends the clip;
 * `setPointerCapture` keeps the press alive when the finger slides off the
 * button, and a cancel drops the clip rather than sending half an utterance),
 * or, hands-free, a listening indicator that mutes when pressed.
 */
export function Dock({
  preference,
  onPreference,
  mic,
  micMessage,
  onRequestMic,
  muted,
  onMuted,
  talking,
  onPressToTalk,
  onReleaseToTalk,
  onCancelToTalk,
  onSubmitText,
  onEnd,
  onReport,
}: DockProps) {
  const [text, setText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const inputId = useId();
  const menuId = useId();
  const voiceUnavailable = mic === 'denied' || mic === 'unsupported' || mic === 'busy';
  const micOffered = mic === 'unknown' || mic === 'requesting';

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    onSubmitText(value);
    setText('');
  };

  const down = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (muted) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    onPressToTalk();
  };
  const up = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onReleaseToTalk();
  };

  const choose = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

  return (
    <div className="nt-dock">
      {voiceUnavailable ? (
        <p className="nt-small" role="status">
          {micMessage ?? 'The microphone is not available. Type your answers.'}
        </p>
      ) : null}

      <div className="nt-dock-row">
        {voiceUnavailable ? null : micOffered ? (
          <button
            type="button"
            className="nt-talk"
            data-offer="true"
            onClick={onRequestMic}
            aria-busy={mic === 'requesting' || undefined}
            disabled={mic === 'requesting'}
          >
            <Mic className="size-5" aria-hidden="true" />
            <span className="nt-talk-label">Use the microphone</span>
          </button>
        ) : preference === 'push-to-talk' ? (
          <button
            type="button"
            className="nt-talk"
            data-talking={talking ? 'true' : 'false'}
            disabled={muted}
            onPointerDown={down}
            onPointerUp={up}
            onPointerCancel={onCancelToTalk}
            onContextMenu={(event) => event.preventDefault()}
            aria-label={talking ? 'Release to send' : 'Hold to talk'}
          >
            <Mic className="size-5" aria-hidden="true" />
            <span className="nt-talk-label">{talking ? 'Release to send' : 'Hold to talk'}</span>
          </button>
        ) : (
          <button
            type="button"
            className="nt-talk"
            data-live={muted ? 'false' : 'true'}
            aria-pressed={!muted}
            aria-label={muted ? 'Microphone off. Turn it back on' : 'Listening. Mute'}
            onClick={() => onMuted(!muted)}
          >
            {muted ? (
              <MicOff className="size-5" aria-hidden="true" />
            ) : (
              <Radio className="size-5" aria-hidden="true" />
            )}
            <span className="nt-talk-label">{muted ? 'Mic off' : 'Listening'}</span>
          </button>
        )}

        <form className="nt-dock-form" onSubmit={submit}>
          <label className="sr-only" htmlFor={inputId}>
            Type to the tutor
          </label>
          <input
            id={inputId}
            className="nt-dock-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={voiceUnavailable ? 'Type your answer' : 'Or type'}
            autoComplete="off"
            enterKeyHint="send"
          />
          <button
            type="submit"
            className="nt-icon-button nt-dock-send"
            aria-label="Send"
            disabled={text.trim().length === 0}
          >
            <Send className="size-5" aria-hidden="true" />
          </button>
        </form>

        <button
          type="button"
          className="nt-icon-button nt-icon-button-danger"
          aria-label="End session"
          title="End session"
          onClick={onEnd}
        >
          <PhoneOff className="size-5" aria-hidden="true" />
        </button>

        <div className="nt-dock-more" ref={menuRef}>
          <button
            type="button"
            className="nt-icon-button"
            aria-label="More"
            title="More"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreHorizontal className="size-5" aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div id={menuId} role="menu" className="nt-menu">
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={preference === 'hands-free'}
                className={cn('nt-menu-item', preference === 'hands-free' && 'is-on')}
                disabled={voiceUnavailable || micOffered}
                onClick={choose(() =>
                  onPreference(preference === 'hands-free' ? 'push-to-talk' : 'hands-free'),
                )}
              >
                <Radio className="size-4" aria-hidden="true" />
                Hands-free listening
              </button>
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={muted}
                className={cn('nt-menu-item', muted && 'is-on')}
                disabled={voiceUnavailable || micOffered}
                onClick={choose(() => onMuted(!muted))}
              >
                <MicOff className="size-4" aria-hidden="true" />
                {muted ? 'Microphone off' : 'Mute the microphone'}
              </button>
              <button
                type="button"
                role="menuitem"
                className="nt-menu-item"
                onClick={choose(onReport)}
              >
                <Flag className="size-4" aria-hidden="true" />
                Report a problem
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
