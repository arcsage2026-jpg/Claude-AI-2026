# CLAUDE.md

Guidance for Claude Code (or any agent) working in this repository.

## Repo shape

This is a multi-app monorepo, not a single product. Each app is independent —
check which one you're actually touching before assuming shared conventions.

- **`/` (root) — Yoddha Protocol**: a 12-week bodyweight training tracker.
  React 18 + Vite web app. Entry `index.html` → `src/`.
- **`/mobile` — Yoddha Protocol mobile**: Expo/React Native port of the same
  app. **Different React major version than the web app** (React 19 here vs
  React 18 at root) — never hoist or share `node_modules` assumptions between
  them; see `mobile/metro.config.js` for how Metro is pinned to avoid
  resolving the wrong copy of React.
- **`/shared`**: framework-agnostic JS (no React/RN imports) used by both the
  web and mobile Yoddha apps — program data, the state-machine hook, the rest
  timer hook. Each platform supplies its own storage adapter
  (`localStorage` on web, `AsyncStorage` on mobile).
- **`/shared3d`**: the procedural 3D exercise avatar (Three.js /
  `@react-three/fiber`), rendered natively on web and packaged into a
  standalone HTML bundle for mobile (see "3D avatar on mobile" below).
- **`/secondbrain` + `/server`**: a separate app (YouTube content studio),
  unrelated to Yoddha — its own Vite entry (`vite.secondbrain.config.js`) and
  a small Express/SQLite backend (`server/`). Don't assume Yoddha conventions
  apply here or vice versa.

When in doubt about which app a file belongs to, check the nearest
`package.json`/Vite config rather than assuming root-level tooling applies.

## Commands

```bash
# Yoddha web app (root)
npm install
npm run dev / build / preview

# Yoddha mobile app
cd mobile && npm install
npx expo start                 # Expo Go, or --web for a browser preview
npx expo start -c              # clear Metro cache — use this after any
                                # shared/ or shared3d/ change before retesting

# Rebuild the 3D avatar bundle mobile loads in its WebView
npm run build:avatar           # writes mobile/assets/avatar/avatarHtml.js
                                # — run this and commit the result any time
                                # /shared3d changes

# Second Brain app (unrelated to Yoddha, root package.json)
npm run dev:secondbrain / build:secondbrain
npm run dev:secondbrain-server / start:secondbrain-server
```

## Non-obvious gotchas worth knowing before you touch these areas

- **Metro monorepo resolution**: `mobile/metro.config.js` sets
  `resolver.disableHierarchicalLookup = true` and an explicit
  `nodeModulesPaths` order. Without it, Metro's default hierarchical lookup
  walks up from `/shared` files and finds the *root* web app's
  `node_modules/react` first, producing two copies of React and "invalid
  hook call" errors. Don't remove this to "simplify" the config.
- **`@react-three/fiber` is pinned to `^8.x`** at the repo root because v9
  requires React 19, and the root web app is on React 18. If you ever bump
  root React to 19, R3F can follow; not before.
- **3D avatar on mobile is a WebView, not native GL.** `@react-three/fiber`
  native (`expo-gl`) was evaluated and found unstable on current Expo/RN new
  architecture, so the mobile avatar instead loads the same Three.js scene as
  a self-contained HTML bundle inside `react-native-webview`
  (`mobile/src/AvatarWebView.js`). Two Android-specific traps already hit and
  fixed here, don't reintroduce them:
  - Loading the bundle via a `file://` URI (through `expo-asset`) hits
    `net::ERR_ACCESS_DENIED` — Android WebView blocks local file access.
    Fixed by passing the HTML directly as an in-memory string via
    `source={{ html }}`.
  - An **empty-string `baseUrl`** in `source={{ html, baseUrl: "" }}` is
    *still* resolved by Android's WebView as a file-scheme-like origin and
    hits the same `net::ERR_ACCESS_DENIED`. It needs a real (even if never
    fetched) `https://` `baseUrl` to get a normal web origin.
- **`expo-notifications` on Android/Expo Go**: Google Play policy forced Expo
  to strip remote-push support from the shared Expo Go app (SDK 53+), and the
  library's internal check for that throws instead of warning. If that throw
  happens at module-load time (e.g. a top-level `Notifications.setNotificationHandler(...)`
  call), it crashes the entire app before anything renders. Any code that
  touches `expo-notifications` setup needs a try/catch around it — see
  `mobile/src/notify.js`. Local notifications and this app's rest-timer use
  case aren't affected by the policy change itself, only by the unguarded
  throw.
- **No 3D model files are used anywhere.** The avatar is procedurally built
  from primitive geometry (capsules/spheres) rigged with nested joint groups
  — see `shared3d/Figure.jsx` and `shared3d/poses.js`. This was a deliberate
  choice (no licensing risk, no interactive Mixamo/Adobe login available in
  an automated session), not a placeholder waiting to be swapped for a real
  model — treat it as the realism ceiling unless the user explicitly sources
  and supplies real rigged model files themselves.

## Conventions

- No test suite exists yet in this repo. Verify web changes with
  `npm run build && npm run preview`; verify mobile layout/logic changes with
  `npx expo start --web` (react-native-web target) — both are screenshottable
  via a headless browser. Neither is a substitute for an on-device Expo Go
  check for anything touching native modules (`expo-notifications`,
  `expo-haptics`, `react-native-webview`).
- Keep `/shared` and `/shared3d` free of platform-specific imports (no
  `react-dom`, no `react-native`). If a platform needs something different,
  it belongs in that platform's own directory with the shared code taking it
  as a parameter/adapter, not a branch inside the shared file.
