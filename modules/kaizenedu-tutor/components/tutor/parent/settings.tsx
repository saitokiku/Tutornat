'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { parentApi } from '@/lib/tutor/client';
import type { ParentSettings, SettingsResponse } from '@/lib/tutor/wire';

import { InlineNotice } from '@/components/tutor/shell/states';
import { Async } from '@/components/tutor/ui/async';
import { NtButton } from '@/components/tutor/ui/button';
import { CheckboxField, Fieldset } from '@/components/tutor/ui/fields';
import { FormError } from '@/components/tutor/ui/form-error';
import { Section } from '@/components/tutor/ui/section';
import { useLoad } from '@/components/tutor/ui/use-load';

/**
 * Account settings (spec §5.10 C, D16, R18). The camera switch is held shut
 * while the operator gate is shut, and every recovery-ladder step can be
 * turned off by the parent, because attention handling is theirs to limit.
 */

const LADDER_STEPS: ReadonlyArray<{ step: number; label: string; note?: string }> = [
  { step: 1, label: 'A change of pace and using the learner’s name' },
  { step: 2, label: 'A short, direct question that needs an answer' },
  { step: 3, label: 'Switching to the whiteboard: draw, point, or tap' },
  { step: 4, label: 'A 20 to 30 second turn on the current skill' },
  { step: 5, label: 'A movement break, then back to the lesson', note: 'Ages 4 to 8 only.' },
  {
    step: 6,
    label: 'Pause the session and tell you',
    note: 'Runs when the learner is away for more than two minutes.',
  },
];

export function SettingsPanel() {
  const loaded = useLoad(parentApi.getSettings);
  return (
    <Async loaded={loaded} label="Loading settings" lines={5}>
      {(data) => <SettingsForm data={data} onSaved={(next) => loaded.setData(() => next)} />}
    </Async>
  );
}

function SettingsForm({
  data,
  onSaved,
}: {
  data: SettingsResponse;
  onSaved: (next: SettingsResponse) => void;
}) {
  // `Async` unmounts this form while a reload is in flight, so the initial
  // state is always the freshly loaded settings.
  const [settings, setSettings] = useState<ParentSettings>(data.settings);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleStep(step: number, off: boolean) {
    setSaved(false);
    setSettings((current) => ({
      ...current,
      recoveryStepsDisabled: off
        ? [...new Set([...current.recoveryStepsDisabled, step])].sort((a, b) => a - b)
        : current.recoveryStepsDisabled.filter((entry) => entry !== step),
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await parentApi.updateSettings(settings);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved(result.data);
    setSaved(true);
    toast.success('Settings saved.');
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-8">
      <Section title="Reports" description="What lands in your inbox.">
        <CheckboxField
          id="settings-weekly-email"
          checked={settings.weeklyEmail}
          onChange={(event) => {
            setSaved(false);
            setSettings((current) => ({ ...current, weeklyEmail: event.target.checked }));
          }}
          label="Send me the weekly report by email"
          hint="One message a week with the same figures as the report page. No other marketing is sent."
        />
      </Section>

      <Section
        title="Camera"
        description="Attention sensing runs in the browser. No image, landmark, or template ever leaves the device."
      >
        {data.gates.cameraSensingEnabled ? null : (
          <InlineNotice title="The camera is switched off for this deployment">
            The operator keeps camera sensing shut until the notice and consent language for it have
            been reviewed. The switch below stays off until then.
          </InlineNotice>
        )}
        <CheckboxField
          id="settings-camera"
          checked={settings.cameraSensing}
          disabled={!data.gates.cameraSensingEnabled}
          onChange={(event) => {
            setSaved(false);
            setSettings((current) => ({ ...current, cameraSensing: event.target.checked }));
          }}
          label="Allow attention sensing with the camera"
          hint="Applies to profiles whose band uses the camera, and only after you have given camera consent for that profile."
        />
      </Section>

      <Section
        title="How the tutor handles drifting attention"
        description="One step per ten seconds, stopping as soon as the learner is back. Switch off any step you do not want used."
      >
        <Fieldset legend="Steps to switch off">
          {LADDER_STEPS.map((entry) => (
            <CheckboxField
              key={entry.step}
              id={`settings-step-${entry.step}`}
              checked={settings.recoveryStepsDisabled.includes(entry.step)}
              onChange={(event) => toggleStep(entry.step, event.target.checked)}
              label={`Step ${entry.step}: ${entry.label}`}
              hint={entry.note}
            />
          ))}
        </Fieldset>
        <p className="nt-small">
          Sessions end at their scheduled length whatever attention does, and none of these steps
          hands out a reward. What the sensor measured is reported to you and used for nothing else.
        </p>
      </Section>

      <FormError message={error} />

      <div className="flex flex-wrap items-center gap-3">
        <NtButton type="submit" busy={busy}>
          {busy ? 'Saving' : 'Save settings'}
        </NtButton>
        {saved ? (
          <p role="status" className="nt-small">
            Saved.
          </p>
        ) : null}
      </div>
    </form>
  );
}
