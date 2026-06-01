# Fun Full Screen Shit

WebGL eye candy for your monitor — a collection of full-screen visual effects you can launch in your browser and walk away from. Stick one on a spare screen, a projector, or behind you on a video call and look 10× more interesting than you are.

## The Effects

| # | Effect | What it is |
|---|--------|-----------|
| 01 | **Hyperspace Tunnel** | Raymarched wormhole through neon space |
| 02 | **Particle Storm** | 10,000 GPU particles, mouse-reactive |
| 03 | **Plasma Flow** | Liquid fragment-shader fluid |
| 04 | **Terminal** | Hacker aesthetic — endless code, commands, log spam |
| 05 | **Dashboard** | Live ops telemetry — gauges, charts, fake metrics |

Each effect runs full screen on its own page under `effects/`. The homepage (`index.php`) is a gallery that links out to all of them.

## How It Works

The site is built on **UserSpice 5.8** for page security and user management, with a fully custom visual layer (no UserSpice template inheritance). The front-end is the real product: vanilla HTML/CSS/JS plus WebGL shaders.

- `index.php` — gallery landing page
- `effects/` — one PHP page per full-screen effect
- `assets/css/` — global + page styles
- `assets/js/` — effect logic
- `assets/shaders/` — GLSL fragment/vertex shaders
- `usersc/templates/ffss/` — the custom `ffss` template (header, nav, footer, design system)

## Setup

1. Copy the project into your web folder.
2. Have a MySQL/MariaDB database ready (or let UserSpice create one during install).
3. Browse to the web folder and follow the on-screen UserSpice installer.
4. Default logins after install — `admin` / `password` and `user` / `password`. **Change these immediately.**

See `instructions.txt` for the full install walkthrough and `SECURITY.md` for security notes.

## Tech Stack

- **Backend:** PHP + UserSpice 5.8, MySQL/MariaDB
- **Frontend:** Vanilla HTML/CSS/JS, WebGL, GLSL shaders
- **Fonts:** Lexend
