# Flight Radar (frontend)

This is frontend part for the Flight Radar task. It shows planes moving on a map in real time. All data comes from the WebSocket backend in `../be`

No real planes were harmed. They are all simulated, and a few of them fly in suspiciously straight lines.

## What it does

- Shows all planes on a map. Each plane is rotated in the direction it flies
- Planes move smoothly. The backend sends positions only once per second, so I fill the animation gaps between updates
- Click a plane to select it and see its details. Click it again, click empty map, press `Esc` or hit the ✕ button to unselect
- UX personal update: the camera follows the selected plane. If you drag or zoom the map, it stops following. Select the plane again to follow it again
- There is a searchable list of planes on the left. It does the same selecting as the map
- A small badge shows if the connection is live. If the backend goes down, the app reconnects on its own

## Tech stack

- React 19 + TypeScript (strict mode)
- Vite
- MapLibre GL, with the free CARTO dark basemap (no API key needed)
- Tailwind CSS v4
- Vitest + Testing Library
- ESLint + Prettier

## Getting started

You need Node 22+. If you use nvm, the `.nvmrc` file picks it for you.

Start the backend first (from the repo root):

```bash
cd be
npm install
npm run dev
```

Then start the frontend in a seperate terminal:

```bash
cd fe
nvm use
npm install
npm run dev
```

Open http://localhost:5173 and you should see the map and the planes. The map tiles are loaded from the internet, so yeah! You need to be online

## Configuration

By default the app connects to `ws://localhost:4000`. To use another address, copy `.env.example` to `.env` and change it:

```env
VITE_WS_URL=ws://localhost:4000
```

## Scripts

| Command              | What it does                          |
| -------------------- | ------------------------------------- |
| `npm run dev`        | Starts the dev server                 |
| `npm run build`      | Type-checks and builds for production |
| `npm run preview`    | Serves the production build           |
| `npm test`           | Runs all tests once                   |
| `npm run test:watch` | Runs tests in watch mode              |
| `npm run lint`       | Runs ESLint                           |
| `npm run format`     | Formats the code with Prettier        |

## How it works

There are two WebSocket connections:

1. **Basic feed** (`/ws/planes/basic`). It is open all the time and recieves the position of every plane once per second. If it drops, the app reconnects with a growing delay (1s, 2s, 4s, up to 10s)
2. **Details feed** (`/ws/planes/details`). It is opened only when a plane is selected, and then the app sends a `subscribe` message. If you select another plane, it subscribes again on the same connection. The backend has no "unsubscribe", so when you unselect a plane, the app just closes the connection

The smooth movement lives in `src/lib/tracks.ts`. For every plane I keep the old and the new position. On every animation frame I draw the plane somewhere between them. This means the picture is about one second behind reality, but it never jumps. The basic feed has no heading, so I calculate the direction from the last move. This is the price: 1s

The map is drawn directly with MapLibre, not through React state. Planes are redrawn about 60 times a second, and re-rendering React that often would be too slow

## Project structure

```text
src/
  types/        data types for the backend messages
  lib/          pure helpers: message parsing, maths, unit formatting, smooth movement, reconnecting socket
  hooks/        usePlanes (basic feed) and usePlaneDetails (details feed)
  components/   MapView, PlaneList, PlaneDetailsPanel, ConnectionStatus
  test/         fake WebSocket and test data
  App.tsx       holds the selected plane and the page layout
```

Tests sit next to the files they test (`*.test.ts` and `*.test.tsx`). I added them, because I changed math functions a lot. Tests helped me not to brake anything

## Good to know

- Units from the backend: altitude is in meters, speed in meters per second. The app converts them to feet and knots
- `estimatedArrival` is a timestamp in milliseconds, not a duration. The main README example shows `3600`, which is a bit misleading
- MapLibre 6 can't find its worker file by itself when it is used with Vite, so I set it manually in `MapView.tsx` with `setWorkerUrl`. Without this the map stays empty
