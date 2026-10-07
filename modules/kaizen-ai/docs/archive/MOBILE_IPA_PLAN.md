# Mobile (iOS/Android) plan

## Position
Responsive web ships first — the dashboard is already phone-first. The repo's
`client/` directory is a working Expo SDK 56 scaffold (builds clean) that will
become the native app.

## Path to TestFlight
1. `client/` already targets iOS/Android/web from one codebase (Expo Router,
   NativeWind). Point its API layer at the deployed web app's `/api/*` routes —
   they authenticate via the same Supabase JWT (`Authorization: Bearer`), which
   is why the API was built header-based, not cookie-based.
2. Auth: `@supabase/supabase-js` with AsyncStorage (already wired in
   `client/lib/supabase.ts`).
3. Voice on mobile: `/api/voice/realtime-token` mints ephemeral OpenAI Realtime
   sessions → native WebRTC (react-native-webrtc). No long-lived keys on device.
4. Build: EAS — `eas build --profile preview --platform ios` → TestFlight.
   Requires an Apple Developer account ($99/yr). Android: internal testing track.
5. Push notifications (study reminders, streak saves): expo-notifications +
   a scheduled job reading `student_concept_mastery.due_date`.

## What must be native vs web
Native: mic/WebRTC voice, push notifications, offline cache.
Everything else reuses the same API and design tokens.
