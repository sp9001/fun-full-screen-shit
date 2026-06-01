/* ==========================================================================
   FFSS Fullscreen Helper
   Shared HUD + animation-loop infrastructure for all effect pages.
   Exposes window.FFSS = { initFullscreenHUD, getDPR, setupCanvas, createRAFLoop }.
   ========================================================================== */
(function (root) {
    'use strict';

    const MAX_DPR = 2;            // Don't render at native 4K — perf trap on Retina
    const HUD_IDLE_MS = 3000;     // Mouse-idle before HUD fades

    function getDPR() {
        return Math.min(window.devicePixelRatio || 1, MAX_DPR);
    }

    /**
     * Resize the canvas backing store to match its CSS size × DPR.
     * Returns true if the size actually changed (so callers can re-set viewport).
     */
    function resizeCanvas(canvas) {
        const dpr = getDPR();
        const cssW = canvas.clientWidth || window.innerWidth;
        const cssH = canvas.clientHeight || window.innerHeight;
        const w = Math.max(1, Math.floor(cssW * dpr));
        const h = Math.max(1, Math.floor(cssH * dpr));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            return true;
        }
        return false;
    }

    /**
     * Wire a canvas up to the viewport: full-screen sizing, DPR-aware backing
     * store, resize listener. Returns a function the caller invokes inside
     * their render loop to keep the canvas correctly sized.
     */
    function setupCanvas(canvas, onResize) {
        // Force CSS size to viewport in case page CSS hasn't loaded yet.
        canvas.style.position = 'fixed';
        canvas.style.inset = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.display = 'block';

        function handleResize() {
            const changed = resizeCanvas(canvas);
            if (changed && typeof onResize === 'function') {
                onResize(canvas.width, canvas.height);
            }
        }

        // Initial size
        resizeCanvas(canvas);

        window.addEventListener('resize', handleResize, { passive: true });
        // Some browsers fire only orientationchange on mobile rotate.
        window.addEventListener('orientationchange', handleResize, { passive: true });

        return handleResize;
    }

    /**
     * Build the HUD overlay (FPS counter, close button, hint text) and inject it.
     * Returns refs the caller can update (fpsEl in particular).
     */
    function buildHUD(effectName) {
        const wrap = document.createElement('div');
        wrap.className = 'ffss-hud';
        wrap.innerHTML = [
            '<div class="ffss-hud__fps" data-ffss-fps>',
            '  <span class="ffss-hud__fps-label">FPS</span>',
            '  <span class="ffss-hud__fps-value" data-ffss-fps-value>--</span>',
            '  <span class="ffss-hud__fps-name">' + escapeHtml(effectName || '') + '</span>',
            '</div>',
            '<a class="ffss-hud__close" href="/" aria-label="Exit effect" data-ffss-close>',
            '  <span aria-hidden="true">&times;</span>',
            '</a>',
            '<div class="ffss-hud__hint" data-ffss-hint>',
            '  Press <kbd>F</kbd> for fullscreen &middot; <kbd>Esc</kbd> to exit',
            '</div>'
        ].join('');
        document.body.appendChild(wrap);
        return {
            wrap: wrap,
            fpsEl: wrap.querySelector('[data-ffss-fps-value]'),
            hintEl: wrap.querySelector('[data-ffss-hint]')
        };
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
        });
    }

    /**
     * Manage HUD visibility based on mouse-idle timeout.
     */
    function attachIdleFade(hudWrap) {
        let idleTimer = null;
        function show() {
            hudWrap.classList.remove('ffss-hud--idle');
            if (idleTimer) clearTimeout(idleTimer);
            idleTimer = setTimeout(function () {
                hudWrap.classList.add('ffss-hud--idle');
            }, HUD_IDLE_MS);
        }
        show();
        window.addEventListener('mousemove', show, { passive: true });
        window.addEventListener('mousedown', show, { passive: true });
        window.addEventListener('keydown', show);
        window.addEventListener('touchstart', show, { passive: true });
    }

    /**
     * Wire up F-for-fullscreen and ESC behaviour. ESC's native exit handles
     * leaving fullscreen mode; we don't intercept it.
     */
    function attachKeyControls() {
        window.addEventListener('keydown', function (ev) {
            if (ev.key === 'f' || ev.key === 'F') {
                if (ev.target && /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
                toggleFullscreen();
            }
        });
    }

    function toggleFullscreen() {
        const doc = document;
        const inFs = doc.fullscreenElement || doc.webkitFullscreenElement;
        if (inFs) {
            (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
        } else {
            const el = doc.documentElement;
            (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
        }
    }

    /**
     * Initialize HUD + key controls + idle fade for an effect page.
     * Returns the hud refs in case the caller wants to read fpsEl.
     */
    function initFullscreenHUD(opts) {
        opts = opts || {};
        const hud = buildHUD(opts.effectName || 'Effect');
        attachIdleFade(hud.wrap);
        attachKeyControls();

        // Pause/resume hooks driven by tab visibility.
        if (typeof opts.onPause === 'function' || typeof opts.onResume === 'function') {
            document.addEventListener('visibilitychange', function () {
                if (document.hidden) {
                    if (opts.onPause) opts.onPause();
                } else {
                    if (opts.onResume) opts.onResume();
                }
            });
        }

        return hud;
    }

    /**
     * Animation loop with smoothed FPS, delta time, and tab-visibility pause.
     * renderFn receives ({ time, delta, frame }). FPS string is auto-written
     * to the HUD if buildHUD has been called.
     */
    function createRAFLoop(renderFn) {
        let rafId = null;
        let running = false;
        let startTs = 0;
        let lastTs = 0;
        let frame = 0;

        // Smoothed FPS (exponential moving average of 1/delta).
        let fpsSmoothed = 60;
        let fpsLastUpdate = 0;
        const fpsEl = document.querySelector('[data-ffss-fps-value]');

        function tick(now) {
            if (!running) return;
            if (!startTs) {
                startTs = now;
                lastTs = now;
            }
            const time = (now - startTs) * 0.001;
            const delta = Math.min(0.1, (now - lastTs) * 0.001); // clamp to avoid huge jumps after pause
            lastTs = now;
            frame++;

            if (delta > 0) {
                const inst = 1 / delta;
                fpsSmoothed = fpsSmoothed * 0.9 + inst * 0.1;
            }
            if (fpsEl && now - fpsLastUpdate > 250) {
                fpsEl.textContent = Math.round(fpsSmoothed).toString();
                fpsLastUpdate = now;
            }

            try {
                renderFn({ time: time, delta: delta, frame: frame });
            } catch (err) {
                console.error('FFSS render error:', err);
                stop();
                return;
            }

            rafId = requestAnimationFrame(tick);
        }

        function start() {
            if (running) return;
            running = true;
            startTs = 0;
            lastTs = 0;
            rafId = requestAnimationFrame(tick);
        }

        function stop() {
            running = false;
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        }

        // Auto-pause on tab blur, resume on focus.
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                stop();
            } else {
                start();
            }
        });

        return { start: start, stop: stop };
    }

    root.FFSS = {
        initFullscreenHUD: initFullscreenHUD,
        getDPR: getDPR,
        setupCanvas: setupCanvas,
        createRAFLoop: createRAFLoop,
        toggleFullscreen: toggleFullscreen
    };
}(window));
