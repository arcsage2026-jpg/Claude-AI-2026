# Yoddha Protocol

A 12-week integrated bodyweight training tracker — Shaolin Kung Fu, Yoga & Surya/Chandra Namaskar, Hindu squats & Dand, pull-ups, military calisthenics, and Tai Chi — built as a React web app.

## What it does

- **Today** — the current day's session with per-block checkmarks and volume that scales automatically by training phase (Foundation / Build / Advanced).
- **Week** — an overview of all 7 days with completion status.
- **Program** — full reference tables (Surya/Chandra Namaskar, Hanuman Dand, pull-up ladder, military calisthenics, Tai Chi, Shaolin dynamic methods & Iron Body holds), the yoga asana ladder, and the Beej Mantra chakra chart.
- **Progress** — sessions logged, current week/phase, and controls to advance weeks or reset progress.

The 12-week arc auto-advances by phase (weeks 1–4 Foundation, 5–8 Build, 9–12 Advanced) with deload weeks at 4, 8, and 12. Progress is saved to `localStorage` on-device.

## Getting started

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

## Stack

- React 18 + Vite
- Tailwind CSS
- [lucide-react](https://lucide.dev/) icons

## Source material

The full 12-week program (exercise banks, progression tables, safety notes) lives in [`docs/YoddhaProtocolTrainingProgram.md`](docs/YoddhaProtocolTrainingProgram.md).
