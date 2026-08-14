# Yoddha Protocol

A 12-week integrated bodyweight training tracker — Shaolin Kung Fu, Yoga & Surya/Chandra Namaskar, Hindu squats & Dand, pull-ups, military calisthenics, and Tai Chi — built as a React web app.

## What it does

- **Today** — the current day's session with per-block checkmarks and volume that scales automatically by training phase (Foundation / Build / Advanced).
- **Week** — an overview of all 7 days with completion status.
- **Program** — full reference tables (Surya/Chandra Namaskar, Hanuman Dand, pull-up ladder, military calisthenics, Tai Chi, Shaolin dynamic methods & Iron Body holds), the yoga asana ladder, and the Beej Mantra chakra chart.
- **Progress** — sessions logged, current week/phase, and controls to advance weeks or reset progress.
- **Exercise detail sheet** — tap any exercise to open a sheet with a 3D avatar (male/female toggle) demonstrating the movement, quick set logging (reps/weight/duration/rounds), a rest timer with notifications, and a per-exercise history.

The 12-week arc auto-advances by phase (weeks 1–4 Foundation, 5–8 Build, 9–12 Advanced) with deload weeks at 4, 8, and 12. Progress is saved on-device (`localStorage` on web, `AsyncStorage` on mobile).

This repo ships both a **web app** (`/`) and a **mobile app** (`/mobile`, Expo/React Native), sharing the program data and state logic from `/shared`.

## Web app

```bash
npm install
npm run dev
```

Then open the printed local URL in your browser.

### Build for production

```bash
npm run build
npm run preview
```

**Stack**: React 18 + Vite, Tailwind CSS, [lucide-react](https://lucide.dev/) icons.

## Mobile app (Expo)

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with the [Expo Go](https://expo.dev/go) app on your phone, or press `i`/`a` for an iOS/Android simulator (requires Xcode/Android Studio).

**Stack**: Expo SDK 57, React Native, [lucide-react-native](https://lucide.dev/) icons, `@react-native-async-storage/async-storage`, `expo-notifications`, `expo-haptics`, `react-native-webview`.

> **Status of on-device testing**: verified running in Expo Go on a real Android device. Two real bugs only showed up there and are now fixed: (1) `expo-notifications` hard-crashed the whole app at startup in Expo Go on Android — Google Play policy forced Expo to strip remote-push support from the shared Expo Go app, and the internal check for that now throws instead of warning; local notifications aren't affected, but the setup call needed a try/catch (see `mobile/src/notify.js`). (2) The WebView-based 3D avatar failed to load at all (`net::ERR_ACCESS_DENIED` loading a local `file://` asset) — fixed by passing the HTML directly as an in-memory string instead of a file URI (see the 3D avatar section below). The scheduled background rest-timer notification itself is Expo-Go-restricted per (1) and still needs a development-build check (see below) to confirm it fires when backgrounded.

### If Expo Go's SDK version doesn't match this project

Expo Go only supports one SDK version at a time. If your installed Expo Go is older than this project's SDK (57), either update Expo Go from the Play Store / App Store, or build a custom **development client** — an app matching this project's exact SDK, installed once, with no Expo Go version constraint at all:

```bash
npm install -g eas-cli   # or use npx eas-cli each time instead
eas login                # needs a free expo.dev account
cd mobile
eas build:configure      # links this project to your Expo account (writes a projectId into app.json)
eas build --profile development --platform android   # or --platform ios
```

That queues a cloud build (a few minutes) and gives you a download link/QR code for the resulting APK — install it on your phone like any app, then run `npx expo start --dev-client` instead of `npx expo start` and connect through that installed app instead of Expo Go.

## Shared logic (`/shared`)

Framework-agnostic JS shared by both apps:
- `theme.js` — color palette and element-color helpers
- `program.js` — the full 12-week program data (days, blocks, reference tables, yoga ladder, Beej Mantra chart), each exercise block with a stable `id` and `logType` (`reps` / `reps+weight` / `duration` / `rounds`), plus phase/deload helpers
- `useYoddhaState.js` — the state machine (day/week navigation, toggles, progress, per-exercise logs), parameterized by a storage adapter so each platform supplies its own persistence backend
- `useRestTimer.js` — a pure countdown hook; each platform wires its own completion side effect (web: Notification API + a Web Audio beep; mobile: `expo-notifications` + `expo-haptics`)

## 3D exercise avatar (`/shared3d`)

A procedurally-built humanoid (no external 3D model files — see the note on realism below) rendered with Three.js / `@react-three/fiber`:
- `Figure.jsx` — the rig: nested joint groups (pelvis → spine → chest → shoulders/arms; pelvis → hips → legs) built from primitive capsule/sphere meshes, with male/female variants as proportion + color differences, not separate geometry
- `poses.js` — a catalog of ~15 named joint-angle poses, each exercise mapped to one pose or a pair that's lerp-animated back and forth for a looping "rep"

**On web**, the avatar renders directly via `@react-three/fiber`'s `<Canvas>` inside the detail sheet (`src/ExerciseAvatar.jsx`).

**On mobile**, rather than the native `@react-three/fiber` + `expo-gl` rendering path (found to be unstable on current Expo/React Native versions), the same scene is built as a single self-contained HTML file (`npm run build:avatar`, using `vite-plugin-singlefile`) and loaded inside a `react-native-webview` (`mobile/src/AvatarWebView.js`). It's passed to the WebView as an in-memory HTML string (`source={{ html }}`, via `mobile/assets/avatar/avatarHtml.js` — a JS module wrapping the built markup as a string constant) rather than as a `file://` URI — loading local files in an Android WebView needs explicit file-access permissions and hit a hard `net::ERR_ACCESS_DENIED` in on-device testing, so passing the markup directly sidesteps that whole class of problem. Run `npm run build:avatar` at the repo root any time `/shared3d` changes — it regenerates `mobile/assets/avatar/avatarHtml.js`, which is committed since Expo needs it available at build time.

**On realism**: photorealistic rigged/animated models (e.g. Mixamo) would require an interactive login and third-party asset licensing this couldn't do safely in an automated session — the procedural approach here is the realism ceiling achievable without external assets or a human doing that sourcing.

## Source material

The full 12-week program (exercise banks, progression tables, safety notes) lives in [`docs/YoddhaProtocolTrainingProgram.md`](docs/YoddhaProtocolTrainingProgram.md).

## Second Brain — YouTube content studio (`/secondbrain`, `/server`)

An unrelated second app that also lives in this repo: a "second brain" for planning YouTube videos, from raw idea through to published. It's a separate React SPA (`/secondbrain`) backed by a small Express + SQLite API (`/server`) — its own database, its own dev server, no shared state with the Yoddha Protocol tracker above.

**What it does**
- **Board** — a Kanban view of every video idea moving through five stages: Idea → Scripting → Filming → Editing → Published. Drag a card between columns, or open it and pick a stage directly.
- **Idea capture** — quickly add a title, one-line summary, tags, and (optionally) which channel it's for.
- **Script workspace** — per-idea structured fields for Hook / Body / Call-to-action, autosaved ~600ms after you stop typing.
- **Research & sources** — attach links, freeform notes, or pasted transcripts to an idea, so the material you're drawing from lives next to the script.
- **Channels** — track the YouTube channel(s) you're planning for (name, handle, URL, subscriber count, notes), and assign ideas to one.

**Stack**: React 18 + Vite + Tailwind on the frontend (same toolchain as the app above); Express + [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) on the backend, storing data in a local `server/data/secondbrain.sqlite3` file (gitignored — every environment gets its own).

**Run it locally** (two processes, in separate terminals):

```bash
npm install
npm run dev:secondbrain-server   # API on http://localhost:5175
npm run dev:secondbrain          # Vite dev server on http://localhost:5174, proxies /api to the server above
```

Then open http://localhost:5174. `npm run build:secondbrain` produces a static production build in `dist-secondbrain/`; the built frontend still needs the API server running (`npm run start:secondbrain-server`) somewhere it can reach at `/api`.

**API surface**: `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/:id`, `PATCH /api/projects/:id/stage`, `PUT /api/projects/:id/script`, `GET/POST /api/projects/:id/sources`, `PUT/DELETE /api/sources/:id`, `GET/POST/PUT/DELETE /api/channels`.
