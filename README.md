# Kinematika MVP

## Run

```bash
cd /workspace/kinematics-app/web
npm install
npm run dev -- --host
```

Phone: open http://<LAN-IP>:5173 on same Wi-Fi.

## Build

```bash
npm run build
npm run preview -- --host
```

## Works
- Freehand straighten to segment
- schemaVersion 1 model, JSON export
- Long-press joint sheet (CS labels)
- Templates 4-bar + slider-crank with analytic Play
- PNG export, undo, pan/pinch

## Stubbed
- General constraint solver
- MP4 export
- Service worker
- Circle/slot gestures, joint drag
