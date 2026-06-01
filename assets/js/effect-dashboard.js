/* ==========================================================================
   FFSS Effect: Dashboard
   Fake NOC/SOC ops dashboard — 12 widgets driven by synthetic data.
   Vanilla JS + Canvas 2D. No chart libs, no map libs.
   ========================================================================== */
(function () {
    'use strict';

    const grid = document.getElementById('dash-grid');
    if (!grid) return;

    FFSS.initFullscreenHUD({ effectName: 'Dashboard' });

    // ---- Utils ----------------------------------------------------------
    const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
    const rand = (a, b) => Math.random() * (b - a) + a;
    const irand = (a, b) => Math.floor(rand(a, b + 1));
    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    // CSS-pixel size getter for canvas widgets — keeps logic resolution-independent.
    function fitCanvas(canvas) {
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(2, Math.floor(rect.width));
        const h = Math.max(2, Math.floor(rect.height));
        const r = dpr();
        if (canvas.width !== w * r || canvas.height !== h * r) {
            canvas.width = w * r;
            canvas.height = h * r;
        }
        return { w: w, h: h, r: r };
    }

    function fmtNumber(n, decimals) {
        if (n >= 1e6) return (n / 1e6).toFixed(decimals == null ? 2 : decimals) + 'M';
        if (n >= 1e3) return Math.round(n).toLocaleString();
        if (decimals != null) return n.toFixed(decimals);
        return Math.round(n).toString();
    }

    function fmtCurrency(n) {
        if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
        if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
        return '$' + Math.round(n);
    }

    // Random-walk generator with optional clamping & sine-modulated drift.
    function makeWalker(opts) {
        const o = opts || {};
        let v = o.start != null ? o.start : 50;
        const min = o.min != null ? o.min : 0;
        const max = o.max != null ? o.max : 100;
        const stepMag = o.stepMag != null ? o.stepMag : 1.5;
        const drift = o.drift != null ? o.drift : 0;
        let t = Math.random() * 1000;
        return function step() {
            t += 1;
            const sineDrift = Math.sin(t * 0.03) * (drift * 2);
            v += (Math.random() - 0.5) * stepMag * 2 + sineDrift;
            v = clamp(v, min, max);
            // Occasional spike
            if (Math.random() < 0.01) v = clamp(v + (Math.random() - 0.5) * (max - min) * 0.3, min, max);
            return v;
        };
    }

    // Tween numeric values smoothly.
    function makeTween(initial) {
        let cur = initial;
        let target = initial;
        let from = initial;
        let t = 1;
        let dur = 0.5;
        return {
            setTarget(newTarget, durSec) {
                from = cur;
                target = newTarget;
                t = 0;
                dur = durSec || 0.5;
            },
            update(dt) {
                if (t < 1) {
                    t = Math.min(1, t + dt / dur);
                    // ease-out cubic
                    const e = 1 - Math.pow(1 - t, 3);
                    cur = from + (target - from) * e;
                }
                return cur;
            },
            value() { return cur; }
        };
    }

    // ---- Panel factory --------------------------------------------------
    function makePanel(cls, title, badge) {
        const panel = document.createElement('section');
        panel.className = 'dash-panel ' + cls;

        const head = document.createElement('div');
        head.className = 'dash-panel__head';
        const t = document.createElement('h3');
        t.className = 'dash-panel__title';
        t.textContent = title;
        head.appendChild(t);
        if (badge) {
            const b = document.createElement('span');
            b.className = 'dash-panel__badge';
            b.textContent = badge;
            head.appendChild(b);
        }
        panel.appendChild(head);

        const body = document.createElement('div');
        body.className = 'dash-panel__body';
        panel.appendChild(body);

        grid.appendChild(panel);
        return { panel, body, titleEl: t };
    }

    // ====================================================================
    // Widget: Big stat card (number + delta + sparkline)
    // ====================================================================
    function StatCard(cls, title, badge, fmt, opts) {
        const { body } = makePanel(cls, title, badge);

        const valueEl = document.createElement('div');
        valueEl.className = 'dash-stat__value';
        valueEl.textContent = '--';
        body.appendChild(valueEl);

        const deltaEl = document.createElement('div');
        deltaEl.className = 'dash-stat__delta dash-stat__delta--up';
        deltaEl.textContent = '▲ +0.0%';
        body.appendChild(deltaEl);

        const canvas = document.createElement('canvas');
        canvas.className = 'dash-canvas dash-stat__spark';
        body.appendChild(canvas);

        const walker = makeWalker(opts);
        const tween = makeTween(walker());
        const history = [];
        const HIST = 40;
        let lastTarget = tween.value();
        let updateTimer = 0;
        const UPDATE_EVERY = opts.updateEvery || 2;

        return {
            update(dt) {
                updateTimer += dt;
                if (updateTimer >= UPDATE_EVERY) {
                    updateTimer = 0;
                    const next = walker();
                    tween.setTarget(next, 0.6);
                    history.push(next);
                    if (history.length > HIST) history.shift();
                    lastTarget = next;
                }
                const v = tween.update(dt);
                valueEl.textContent = fmt(v);

                // Delta vs N samples ago
                if (history.length >= 8) {
                    const past = history[Math.max(0, history.length - 8)];
                    const pct = past ? ((lastTarget - past) / past) * 100 : 0;
                    if (pct >= 0) {
                        deltaEl.className = 'dash-stat__delta dash-stat__delta--up';
                        deltaEl.textContent = '▲ +' + pct.toFixed(2) + '%';
                    } else {
                        deltaEl.className = 'dash-stat__delta dash-stat__delta--down';
                        deltaEl.textContent = '▼ ' + pct.toFixed(2) + '%';
                    }
                }
            },
            draw() {
                if (history.length < 2) return;
                const { w, h, r } = fitCanvas(canvas);
                const ctx = canvas.getContext('2d');
                ctx.setTransform(r, 0, 0, r, 0, 0);
                ctx.clearRect(0, 0, w, h);

                let lo = Infinity, hi = -Infinity;
                for (const v of history) {
                    if (v < lo) lo = v;
                    if (v > hi) hi = v;
                }
                if (hi === lo) hi = lo + 1;
                const pad = 2;
                const xs = (i) => pad + (i / (history.length - 1)) * (w - pad * 2);
                const ys = (v) => (h - pad) - ((v - lo) / (hi - lo)) * (h - pad * 2);

                // Filled area
                const grad = ctx.createLinearGradient(0, 0, 0, h);
                grad.addColorStop(0, 'rgba(255, 170, 0, 0.4)');
                grad.addColorStop(1, 'rgba(255, 170, 0, 0)');
                ctx.beginPath();
                ctx.moveTo(xs(0), h);
                for (let i = 0; i < history.length; i++) ctx.lineTo(xs(i), ys(history[i]));
                ctx.lineTo(xs(history.length - 1), h);
                ctx.closePath();
                ctx.fillStyle = grad;
                ctx.fill();

                // Stroke
                ctx.beginPath();
                for (let i = 0; i < history.length; i++) {
                    const x = xs(i), y = ys(history[i]);
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.strokeStyle = '#ffaa00';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        };
    }

    // ====================================================================
    // Widget: Real-time line chart (multi-series, scrolling)
    // ====================================================================
    function LineChart(cls, title, badge, seriesCount, label) {
        const { body } = makePanel(cls, title, badge);
        const canvas = document.createElement('canvas');
        canvas.className = 'dash-canvas';
        canvas.style.flex = '1 1 auto';
        canvas.style.minHeight = '0';
        body.appendChild(canvas);

        const N = 80;
        const series = [];
        const colors = ['#ffaa00', '#5cf6ff', '#a98bff'];
        for (let s = 0; s < seriesCount; s++) {
            const w = makeWalker({ start: rand(30, 70), min: 5, max: 95, stepMag: 4, drift: 1 });
            const data = [];
            for (let i = 0; i < N; i++) data.push(w());
            series.push({ data, walker: w, color: colors[s % colors.length] });
        }

        let stepTimer = 0;
        const STEP = 0.6;

        return {
            update(dt) {
                stepTimer += dt;
                if (stepTimer >= STEP) {
                    stepTimer = 0;
                    for (const s of series) {
                        s.data.push(s.walker());
                        s.data.shift();
                    }
                }
            },
            draw() {
                const { w, h, r } = fitCanvas(canvas);
                const ctx = canvas.getContext('2d');
                ctx.setTransform(r, 0, 0, r, 0, 0);
                ctx.clearRect(0, 0, w, h);

                // Grid
                ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                ctx.lineWidth = 1;
                for (let i = 1; i < 5; i++) {
                    const y = (i / 5) * h;
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(w, y);
                    ctx.stroke();
                }

                const lo = 0, hi = 100;
                for (const s of series) {
                    ctx.beginPath();
                    for (let i = 0; i < s.data.length; i++) {
                        const x = (i / (s.data.length - 1)) * w;
                        const y = h - ((s.data[i] - lo) / (hi - lo)) * h;
                        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                    }
                    ctx.strokeStyle = s.color;
                    ctx.lineWidth = 1.5;
                    ctx.shadowColor = s.color;
                    ctx.shadowBlur = 8;
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }

                // Y-axis ticks
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.font = '10px "JetBrains Mono", monospace';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText('100', 4, 2);
                ctx.fillText('0',   4, h - 14);

                if (label) {
                    ctx.textAlign = 'right';
                    ctx.fillText(label, w - 4, 2);
                }
            }
        };
    }

    // ====================================================================
    // Widget: Area chart (network-like in/out)
    // ====================================================================
    function AreaChart(cls, title, badge) {
        const { body } = makePanel(cls, title, badge);
        const canvas = document.createElement('canvas');
        canvas.className = 'dash-canvas';
        canvas.style.flex = '1 1 auto';
        canvas.style.minHeight = '0';
        body.appendChild(canvas);

        const N = 100;
        const seriesIn = [];
        const seriesOut = [];
        const wIn = makeWalker({ start: 60, min: 10, max: 95, stepMag: 5, drift: 2 });
        const wOut = makeWalker({ start: 30, min: 5,  max: 80, stepMag: 4, drift: 2 });
        for (let i = 0; i < N; i++) { seriesIn.push(wIn()); seriesOut.push(wOut()); }

        let stepTimer = 0;
        const STEP = 0.4;

        return {
            update(dt) {
                stepTimer += dt;
                if (stepTimer >= STEP) {
                    stepTimer = 0;
                    seriesIn.push(wIn()); seriesIn.shift();
                    seriesOut.push(wOut()); seriesOut.shift();
                }
            },
            draw() {
                const { w, h, r } = fitCanvas(canvas);
                const ctx = canvas.getContext('2d');
                ctx.setTransform(r, 0, 0, r, 0, 0);
                ctx.clearRect(0, 0, w, h);

                function drawArea(arr, fill1, fill0, stroke) {
                    const grad = ctx.createLinearGradient(0, 0, 0, h);
                    grad.addColorStop(0, fill1);
                    grad.addColorStop(1, fill0);
                    ctx.beginPath();
                    ctx.moveTo(0, h);
                    for (let i = 0; i < arr.length; i++) {
                        const x = (i / (arr.length - 1)) * w;
                        const y = h - (arr[i] / 100) * h;
                        ctx.lineTo(x, y);
                    }
                    ctx.lineTo(w, h);
                    ctx.closePath();
                    ctx.fillStyle = grad;
                    ctx.fill();
                    ctx.beginPath();
                    for (let i = 0; i < arr.length; i++) {
                        const x = (i / (arr.length - 1)) * w;
                        const y = h - (arr[i] / 100) * h;
                        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                    }
                    ctx.strokeStyle = stroke;
                    ctx.lineWidth = 1.25;
                    ctx.stroke();
                }

                drawArea(seriesIn,  'rgba(92, 246, 255, 0.32)', 'rgba(92, 246, 255, 0)', '#5cf6ff');
                drawArea(seriesOut, 'rgba(255, 170, 0, 0.28)', 'rgba(255, 170, 0, 0)',  '#ffaa00');

                // Legend
                ctx.font = '10px "JetBrains Mono", monospace';
                ctx.textBaseline = 'top';
                ctx.fillStyle = '#5cf6ff';
                ctx.fillText('▮ IN  ' + seriesIn[seriesIn.length - 1].toFixed(1) + ' Mbps', 8, 4);
                ctx.fillStyle = '#ffaa00';
                ctx.fillText('▮ OUT ' + seriesOut[seriesOut.length - 1].toFixed(1) + ' Mbps', 8, 18);
            }
        };
    }

    // ====================================================================
    // Widget: Radial gauge
    // ====================================================================
    function Gauge(cls, title, badge, label) {
        const { body } = makePanel(cls, title, badge);
        const canvas = document.createElement('canvas');
        canvas.className = 'dash-canvas';
        canvas.style.flex = '1 1 auto';
        canvas.style.minHeight = '0';
        body.appendChild(canvas);

        const walker = makeWalker({ start: 60, min: 8, max: 95, stepMag: 6, drift: 2 });
        const tween = makeTween(walker());
        let updateTimer = 0;

        return {
            update(dt) {
                updateTimer += dt;
                if (updateTimer >= 1.5) {
                    updateTimer = 0;
                    tween.setTarget(walker(), 1.0);
                }
                tween.update(dt);
            },
            draw() {
                const { w, h, r } = fitCanvas(canvas);
                const ctx = canvas.getContext('2d');
                ctx.setTransform(r, 0, 0, r, 0, 0);
                ctx.clearRect(0, 0, w, h);

                const cx = w / 2;
                const cy = h * 0.6;
                const radius = Math.min(w, h * 1.2) * 0.42;
                const start = Math.PI * 0.75;
                const end   = Math.PI * 2.25;
                const v = tween.value();
                const t = v / 100;

                // Background arc
                ctx.beginPath();
                ctx.arc(cx, cy, radius, start, end);
                ctx.strokeStyle = '#262d38';
                ctx.lineWidth = 12;
                ctx.lineCap = 'round';
                ctx.stroke();

                // Color zones (drawn as ticks behind value arc)
                const zones = [
                    { from: 0,    to: 0.6,  color: '#2ecc71' },
                    { from: 0.6,  to: 0.85, color: '#f1c40f' },
                    { from: 0.85, to: 1.0,  color: '#ff4d5e' },
                ];
                ctx.lineWidth = 4;
                for (const z of zones) {
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius + 10, start + (end - start) * z.from, start + (end - start) * z.to);
                    ctx.strokeStyle = z.color + '99';
                    ctx.stroke();
                }

                // Value arc
                ctx.beginPath();
                ctx.arc(cx, cy, radius, start, start + (end - start) * t);
                const color = v < 60 ? '#2ecc71' : (v < 85 ? '#f1c40f' : '#ff4d5e');
                ctx.strokeStyle = color;
                ctx.lineWidth = 12;
                ctx.shadowColor = color;
                ctx.shadowBlur = 10;
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Center text
                ctx.fillStyle = color;
                ctx.font = 'bold 26px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(v.toFixed(1) + '%', cx, cy - 4);

                ctx.fillStyle = '#8a93a3';
                ctx.font = '10px "Lexend", sans-serif';
                ctx.fillText(label || '', cx, cy + 22);
            }
        };
    }

    // ====================================================================
    // Widget: Bar chart
    // ====================================================================
    function BarChart(cls, title, badge, count, labels) {
        const { body } = makePanel(cls, title, badge);
        const canvas = document.createElement('canvas');
        canvas.className = 'dash-canvas';
        canvas.style.flex = '1 1 auto';
        canvas.style.minHeight = '0';
        body.appendChild(canvas);

        const tweens = [];
        const walkers = [];
        for (let i = 0; i < count; i++) {
            const w = makeWalker({ start: rand(20, 80), min: 5, max: 100, stepMag: 8, drift: 1 });
            walkers.push(w);
            tweens.push(makeTween(w()));
        }
        let timer = 0;

        return {
            update(dt) {
                timer += dt;
                if (timer >= 1.8) {
                    timer = 0;
                    for (let i = 0; i < count; i++) tweens[i].setTarget(walkers[i](), 0.8);
                }
                for (const t of tweens) t.update(dt);
            },
            draw() {
                const { w, h, r } = fitCanvas(canvas);
                const ctx = canvas.getContext('2d');
                ctx.setTransform(r, 0, 0, r, 0, 0);
                ctx.clearRect(0, 0, w, h);

                const padX = 8, padY = 18;
                const usableW = w - padX * 2;
                const usableH = h - padY - 14;
                const barW = (usableW / count) * 0.62;
                const gap  = (usableW / count) * 0.38;

                ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                for (let i = 0; i < 4; i++) {
                    const y = padY + (i / 4) * usableH;
                    ctx.beginPath();
                    ctx.moveTo(padX, y);
                    ctx.lineTo(w - padX, y);
                    ctx.stroke();
                }

                for (let i = 0; i < count; i++) {
                    const v = tweens[i].value();
                    const x = padX + i * (barW + gap) + gap / 2;
                    const bh = (v / 100) * usableH;
                    const y = padY + (usableH - bh);
                    const grad = ctx.createLinearGradient(0, y, 0, padY + usableH);
                    grad.addColorStop(0, '#ffaa00');
                    grad.addColorStop(1, 'rgba(255, 170, 0, 0.3)');
                    ctx.fillStyle = grad;
                    ctx.fillRect(x, y, barW, bh);

                    if (labels && labels[i]) {
                        ctx.fillStyle = '#5a6373';
                        ctx.font = '9px "JetBrains Mono", monospace';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'top';
                        ctx.fillText(labels[i], x + barW / 2, padY + usableH + 2);
                    }
                }
            }
        };
    }

    // ====================================================================
    // Widget: Status grid (colored cells)
    // ====================================================================
    function StatusGrid(cls, title, badge, count) {
        const { body } = makePanel(cls, title, badge);
        const wrap = document.createElement('div');
        wrap.className = 'dash-status-grid';
        body.appendChild(wrap);

        const cells = [];
        for (let i = 0; i < count; i++) {
            const c = document.createElement('div');
            c.className = 'dash-status-cell';
            // Most cells start green; a sprinkle warn/alert
            const r = Math.random();
            if (r < 0.04) c.classList.add('alert');
            else if (r < 0.14) c.classList.add('warn');
            wrap.appendChild(c);
            cells.push(c);
        }

        let timer = 0;
        return {
            update(dt) {
                timer += dt;
                if (timer >= 1.0) {
                    timer = 0;
                    // Flip a few random cells
                    const flips = irand(2, 6);
                    for (let i = 0; i < flips; i++) {
                        const cell = cells[irand(0, cells.length - 1)];
                        cell.classList.remove('warn', 'alert', 'off');
                        const r = Math.random();
                        if (r < 0.06) cell.classList.add('alert');
                        else if (r < 0.18) cell.classList.add('warn');
                        else if (r < 0.22) cell.classList.add('off');
                    }
                }
            },
            draw() { /* DOM-driven */ }
        };
    }

    // ====================================================================
    // Widget: Donut chart
    // ====================================================================
    function Donut(cls, title, badge, segments) {
        const { body } = makePanel(cls, title, badge);
        const canvas = document.createElement('canvas');
        canvas.className = 'dash-canvas';
        canvas.style.flex = '1 1 auto';
        canvas.style.minHeight = '0';
        body.appendChild(canvas);

        const colors = ['#ffaa00', '#5cf6ff', '#a98bff', '#2ecc71', '#ff4d5e'];
        const tweens = segments.map(s => makeTween(s.value));
        const walkers = segments.map(s => makeWalker({ start: s.value, min: 5, max: 60, stepMag: 3 }));
        let timer = 0;

        return {
            update(dt) {
                timer += dt;
                if (timer >= 2.0) {
                    timer = 0;
                    for (let i = 0; i < tweens.length; i++) tweens[i].setTarget(walkers[i](), 1.0);
                }
                for (const t of tweens) t.update(dt);
            },
            draw() {
                const { w, h, r } = fitCanvas(canvas);
                const ctx = canvas.getContext('2d');
                ctx.setTransform(r, 0, 0, r, 0, 0);
                ctx.clearRect(0, 0, w, h);

                const cx = w * 0.38;
                const cy = h / 2;
                const radius = Math.min(w * 0.35, h * 0.42);
                const inner = radius * 0.6;

                let total = 0;
                for (const t of tweens) total += t.value();
                if (total === 0) total = 1;

                let a0 = -Math.PI / 2;
                for (let i = 0; i < tweens.length; i++) {
                    const frac = tweens[i].value() / total;
                    const a1 = a0 + frac * Math.PI * 2;
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius, a0, a1);
                    ctx.arc(cx, cy, inner, a1, a0, true);
                    ctx.closePath();
                    ctx.fillStyle = colors[i % colors.length];
                    ctx.shadowColor = colors[i % colors.length];
                    ctx.shadowBlur = 6;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    a0 = a1;
                }

                // Legend
                const lx = w * 0.62;
                ctx.font = '11px "Lexend", sans-serif';
                ctx.textBaseline = 'middle';
                for (let i = 0; i < tweens.length; i++) {
                    const ly = (h / (tweens.length + 1)) * (i + 1);
                    const v = tweens[i].value();
                    const pct = ((v / total) * 100).toFixed(1);
                    ctx.fillStyle = colors[i % colors.length];
                    ctx.fillRect(lx, ly - 4, 8, 8);
                    ctx.fillStyle = '#d8dae3';
                    ctx.fillText(segments[i].label, lx + 14, ly);
                    ctx.fillStyle = '#8a93a3';
                    ctx.font = '10px "JetBrains Mono", monospace';
                    ctx.textAlign = 'right';
                    ctx.fillText(pct + '%', w - 6, ly);
                    ctx.font = '11px "Lexend", sans-serif';
                    ctx.textAlign = 'left';
                }
            }
        };
    }

    // ====================================================================
    // Widget: Activity feed
    // ====================================================================
    function ActivityFeed(cls, title, badge) {
        const { body } = makePanel(cls, title, badge);
        const feed = document.createElement('div');
        feed.className = 'dash-feed';
        body.appendChild(feed);

        const messages = [
            ['info',  'Cache invalidated for user_'],
            ['info',  'Webhook delivered: stripe.payment_intent.succeeded'],
            ['ok',    'Health check passed for service api-'],
            ['info',  'New session started from '],
            ['warn',  'Slow query detected: SELECT * FROM orders WHERE...'],
            ['info',  'Background job completed: send_digest'],
            ['ok',    'Backup completed: db_'],
            ['info',  'Rate limit window reset for tenant '],
            ['warn',  'High memory usage on node-'],
            ['error', 'Failed to connect to upstream redis-'],
            ['info',  'User logged in: '],
            ['info',  'API token rotated for service '],
            ['ok',    'Deploy succeeded: rev '],
            ['warn',  'Retry attempt 2/3 for job '],
            ['info',  'Indexing batch '],
            ['error', '5xx burst detected on endpoint /api/v1/'],
            ['ok',    'Migration applied: '],
        ];
        function tagOf(t) {
            return { info: 'INFO', warn: 'WARN', error: 'ERROR', ok: 'OK' }[t];
        }
        function suffix(t) {
            const r = irand(0, 99999);
            return r.toString();
        }

        let timer = 0;
        const MAX_LINES = 16;
        function pad2(n) { return String(n).padStart(2, '0'); }

        return {
            update(dt) {
                timer += dt;
                if (timer >= rand(0.7, 1.6)) {
                    timer = 0;
                    const m = messages[irand(0, messages.length - 1)];
                    const d = new Date();
                    const time = pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
                    const line = document.createElement('span');
                    line.className = 'dash-feed__line';
                    line.innerHTML = '<span class="dash-feed__time">' + time + '</span>'
                        + '<span class="dash-feed__tag-' + m[0] + '">[' + tagOf(m[0]) + ']</span> '
                        + escapeHtml(m[1] + suffix(m[0]));
                    feed.insertBefore(line, feed.firstChild);
                    while (feed.childNodes.length > MAX_LINES) feed.removeChild(feed.lastChild);
                }
            },
            draw() { /* DOM */ }
        };
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    // ====================================================================
    // Widget: Heatmap (7×24)
    // ====================================================================
    function Heatmap(cls, title, badge) {
        const { body } = makePanel(cls, title, badge);
        const wrap = document.createElement('div');
        wrap.className = 'dash-heatmap';
        body.appendChild(wrap);

        const cells = [];
        for (let i = 0; i < 7 * 24; i++) {
            const c = document.createElement('div');
            c.className = 'dash-heat-cell';
            wrap.appendChild(c);
            cells.push({ el: c, v: Math.random() });
        }

        function paint() {
            for (const cell of cells) {
                const v = cell.v;
                const alpha = Math.pow(v, 1.4);
                cell.el.style.background = 'rgba(255, 170, 0, ' + alpha.toFixed(2) + ')';
            }
        }
        paint();

        let timer = 0;
        return {
            update(dt) {
                timer += dt;
                if (timer >= 1.5) {
                    timer = 0;
                    // Drift a bunch of cells slightly
                    for (let i = 0; i < 25; i++) {
                        const c = cells[irand(0, cells.length - 1)];
                        c.v = clamp(c.v + (Math.random() - 0.5) * 0.3, 0, 1);
                    }
                    paint();
                }
            },
            draw() { /* DOM */ }
        };
    }

    // ====================================================================
    // Widget: Sparkline rows
    // ====================================================================
    function SparkRows(cls, title, badge, rows) {
        const { body } = makePanel(cls, title, badge);
        const items = [];
        for (const r of rows) {
            const row = document.createElement('div');
            row.className = 'dash-spark-row';
            const label = document.createElement('div');
            label.className = 'dash-spark-row__label';
            label.textContent = r.label;
            const value = document.createElement('div');
            value.className = 'dash-spark-row__value';
            value.textContent = '--';
            const canvas = document.createElement('canvas');
            canvas.className = 'dash-spark-row__canvas';
            row.appendChild(label);
            row.appendChild(value);
            row.appendChild(canvas);
            body.appendChild(row);

            const walker = makeWalker(r.opts || { start: rand(20, 80), min: 0, max: 100, stepMag: 4 });
            const history = [];
            for (let i = 0; i < 20; i++) history.push(walker());
            items.push({ valueEl: value, canvas, walker, history, fmt: r.fmt });
        }

        let stepTimer = 0;
        return {
            update(dt) {
                stepTimer += dt;
                if (stepTimer >= 0.8) {
                    stepTimer = 0;
                    for (const it of items) {
                        it.history.push(it.walker());
                        it.history.shift();
                        it.valueEl.textContent = it.fmt(it.history[it.history.length - 1]);
                    }
                }
            },
            draw() {
                for (const it of items) {
                    const { w, h, r } = fitCanvas(it.canvas);
                    const ctx = it.canvas.getContext('2d');
                    ctx.setTransform(r, 0, 0, r, 0, 0);
                    ctx.clearRect(0, 0, w, h);

                    let lo = Infinity, hi = -Infinity;
                    for (const v of it.history) {
                        if (v < lo) lo = v;
                        if (v > hi) hi = v;
                    }
                    if (hi === lo) hi = lo + 1;

                    ctx.beginPath();
                    for (let i = 0; i < it.history.length; i++) {
                        const x = (i / (it.history.length - 1)) * w;
                        const y = (h - 2) - ((it.history[i] - lo) / (hi - lo)) * (h - 4);
                        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                    }
                    ctx.strokeStyle = '#5cf6ff';
                    ctx.lineWidth = 1.25;
                    ctx.stroke();
                }
            }
        };
    }

    // ====================================================================
    // Widget: Map with pulses
    // ====================================================================
    function MapWidget(cls, title, badge) {
        const { body } = makePanel(cls, title, badge);
        const map = document.createElement('div');
        map.className = 'dash-map';
        body.appendChild(map);

        // Simplified abstract continent silhouette via SVG paths.
        // (Not real geography — purely vibes.)
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('class', 'dash-map__svg');
        svg.setAttribute('viewBox', '0 0 200 100');
        svg.setAttribute('preserveAspectRatio', 'none');

        // Latitude lines for context
        for (let i = 1; i < 5; i++) {
            const ln = document.createElementNS(svgNS, 'line');
            ln.setAttribute('x1', 0);
            ln.setAttribute('y1', i * 20);
            ln.setAttribute('x2', 200);
            ln.setAttribute('y2', i * 20);
            ln.setAttribute('stroke', 'rgba(108, 248, 255, 0.07)');
            ln.setAttribute('stroke-width', '0.4');
            svg.appendChild(ln);
        }
        for (let i = 1; i < 8; i++) {
            const ln = document.createElementNS(svgNS, 'line');
            ln.setAttribute('x1', i * 25);
            ln.setAttribute('y1', 0);
            ln.setAttribute('x2', i * 25);
            ln.setAttribute('y2', 100);
            ln.setAttribute('stroke', 'rgba(108, 248, 255, 0.07)');
            ln.setAttribute('stroke-width', '0.4');
            svg.appendChild(ln);
        }

        // Stylized landmasses (purely decorative blobs)
        const blobs = [
            'M 12 30 Q 28 22 40 28 Q 52 32 56 44 Q 50 56 38 58 Q 22 60 14 50 Q 8 40 12 30 Z',
            'M 70 22 Q 92 18 108 26 Q 120 32 118 46 Q 110 56 96 58 Q 78 56 72 46 Q 64 32 70 22 Z',
            'M 132 24 Q 156 18 172 28 Q 184 38 180 50 Q 168 60 152 60 Q 134 56 130 44 Q 126 32 132 24 Z',
            'M 30 70 Q 50 64 64 72 Q 70 82 60 88 Q 42 92 32 84 Q 24 78 30 70 Z',
            'M 110 70 Q 130 64 144 72 Q 152 82 140 90 Q 122 94 112 86 Q 104 78 110 70 Z',
        ];
        for (const d of blobs) {
            const p = document.createElementNS(svgNS, 'path');
            p.setAttribute('d', d);
            p.setAttribute('class', 'land');
            svg.appendChild(p);
        }

        map.appendChild(svg);

        let timer = 0;
        const pulses = [];
        const MAX_PULSES = 8;

        function spawnPulse() {
            const p = document.createElement('div');
            p.className = 'dash-map__pulse';
            p.style.left = rand(8, 92) + '%';
            p.style.top  = rand(20, 80) + '%';
            map.appendChild(p);
            pulses.push({ el: p, life: 0, ttl: rand(2.4, 4.0) });
            if (pulses.length > MAX_PULSES) {
                const old = pulses.shift();
                if (old && old.el && old.el.parentNode) old.el.parentNode.removeChild(old.el);
            }
        }

        return {
            update(dt) {
                timer += dt;
                if (timer >= rand(0.5, 1.4)) {
                    timer = 0;
                    spawnPulse();
                }
                for (let i = pulses.length - 1; i >= 0; i--) {
                    pulses[i].life += dt;
                    if (pulses[i].life > pulses[i].ttl) {
                        if (pulses[i].el && pulses[i].el.parentNode) pulses[i].el.parentNode.removeChild(pulses[i].el);
                        pulses.splice(i, 1);
                    }
                }
            },
            draw() { /* DOM/SVG */ }
        };
    }

    // ====================================================================
    // Widget: Progress bars
    // ====================================================================
    function ProgressBars(cls, title, badge, items) {
        const { body } = makePanel(cls, title, badge);
        const wrap = document.createElement('div');
        wrap.className = 'dash-progress';
        body.appendChild(wrap);

        const rows = items.map((it) => {
            const row = document.createElement('div');
            row.className = 'dash-progress__row';
            const head = document.createElement('div');
            head.className = 'dash-progress__row-head';
            const lbl = document.createElement('span');
            lbl.textContent = it.label;
            const pct = document.createElement('span');
            pct.className = 'dash-progress__pct';
            pct.textContent = '0%';
            head.appendChild(lbl);
            head.appendChild(pct);

            const bar = document.createElement('div');
            bar.className = 'dash-progress__bar';
            const fill = document.createElement('div');
            fill.className = 'dash-progress__bar-fill';
            fill.style.width = '0%';
            bar.appendChild(fill);

            row.appendChild(head);
            row.appendChild(bar);
            wrap.appendChild(row);

            const walker = makeWalker(it.opts || { start: rand(10, 80), min: 0, max: 100, stepMag: 5 });
            return { fill, pctEl: pct, walker, current: walker() };
        });

        let timer = 0;
        return {
            update(dt) {
                timer += dt;
                if (timer >= 1.5) {
                    timer = 0;
                    for (const r of rows) {
                        r.current = r.walker();
                        const pct = Math.round(r.current);
                        r.fill.style.width = pct + '%';
                        r.pctEl.textContent = pct + '%';
                    }
                }
            },
            draw() { /* DOM */ }
        };
    }

    // ====================================================================
    // Build widgets
    // ====================================================================
    const widgets = [];

    widgets.push(StatCard('p-stat-uptime',  'UPTIME',       'LIVE',
        v => v.toFixed(2) + '%',
        { start: 99.97, min: 99.85, max: 99.99, stepMag: 0.02, drift: 0, updateEvery: 3 }));

    widgets.push(StatCard('p-stat-rps',     'REQ / SEC',    'LIVE',
        v => fmtNumber(v),
        { start: 12500, min: 6000, max: 22000, stepMag: 800, drift: 200, updateEvery: 1.5 }));

    widgets.push(StatCard('p-stat-users',   'ACTIVE USERS', 'LIVE',
        v => fmtNumber(v),
        { start: 4400, min: 2200, max: 7800, stepMag: 220, drift: 80, updateEvery: 2 }));

    widgets.push(StatCard('p-stat-revenue', 'REVENUE TODAY','LIVE',
        v => fmtCurrency(v),
        { start: 92000, min: 40000, max: 180000, stepMag: 1800, drift: 600, updateEvery: 2.5 }));

    widgets.push(LineChart('p-line', 'API LATENCY (ms)', '3 SVCS', 3, 'p95 / p50 / p99'));
    widgets.push(AreaChart('p-area', 'NETWORK THROUGHPUT', 'eth0'));

    widgets.push(Gauge('p-gauge', 'CPU LOAD', 'cluster', 'avg across nodes'));
    widgets.push(BarChart('p-bars', 'REQUESTS BY REGION', 'last 5m', 8,
        ['us-e', 'us-w', 'eu-w', 'eu-c', 'ap-s', 'ap-ne', 'sa', 'af']));
    widgets.push(Donut('p-donut', 'REQUEST MIX', 'by method', [
        { label: 'GET',    value: 42 },
        { label: 'POST',   value: 28 },
        { label: 'PUT',    value: 12 },
        { label: 'DELETE', value: 6  },
        { label: 'OTHER',  value: 12 },
    ]));
    widgets.push(StatusGrid('p-status', 'SERVICE NODES', '64 NODES', 64));

    widgets.push(ActivityFeed('p-feed', 'EVENT FEED', 'streaming'));
    widgets.push(Heatmap('p-heatmap', 'TRAFFIC HEATMAP', '7d × 24h'));
    widgets.push(SparkRows('p-sparks', 'TOP ENDPOINTS', 'p95', [
        { label: 'GET /api/v1/users',    fmt: v => v.toFixed(0) + 'ms', opts: { start: 42, min: 18, max: 180, stepMag: 6 } },
        { label: 'POST /api/v1/auth',    fmt: v => v.toFixed(0) + 'ms', opts: { start: 88, min: 40, max: 240, stepMag: 8 } },
        { label: 'GET /api/v1/orders',   fmt: v => v.toFixed(0) + 'ms', opts: { start: 64, min: 28, max: 200, stepMag: 7 } },
        { label: 'POST /api/v1/webhooks',fmt: v => v.toFixed(0) + 'ms', opts: { start: 124, min: 60, max: 320, stepMag: 10 } },
        { label: 'GET /api/v1/products', fmt: v => v.toFixed(0) + 'ms', opts: { start: 36, min: 14, max: 160, stepMag: 5 } },
        { label: 'GET /health',          fmt: v => v.toFixed(0) + 'ms', opts: { start: 4,  min: 2,  max: 30,  stepMag: 1 } },
    ]));

    widgets.push(MapWidget('p-map', 'GLOBAL EVENTS', 'realtime'));
    widgets.push(ProgressBars('p-progress', 'BACKGROUND JOBS', 'queue', [
        { label: 'Indexing search documents', opts: { start: 73, min: 0, max: 100, stepMag: 6 } },
        { label: 'Generating thumbnails',     opts: { start: 41, min: 0, max: 100, stepMag: 8 } },
        { label: 'Sending digest emails',     opts: { start: 88, min: 0, max: 100, stepMag: 4 } },
        { label: 'Reconciling payments',      opts: { start: 22, min: 0, max: 100, stepMag: 6 } },
        { label: 'Compacting object storage', opts: { start: 56, min: 0, max: 100, stepMag: 5 } },
    ]));

    // ---- Tick loop ------------------------------------------------------
    // Throttle redraws to ~30 FPS — animations at 60 don't add anything visible
    // for slowly-changing data, and it halves the canvas redraw cost.
    const TARGET_DRAW_DT = 1 / 30;
    let drawAccum = 0;

    const loop = FFSS.createRAFLoop(function (state) {
        const dt = state.delta;
        for (const w of widgets) w.update(dt);
        drawAccum += dt;
        if (drawAccum >= TARGET_DRAW_DT) {
            drawAccum = 0;
            for (const w of widgets) w.draw();
        }
    });
    loop.start();
}());
