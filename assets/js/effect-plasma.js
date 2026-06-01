/* ==========================================================================
   FFSS Effect: Plasma Flow
   Domain-warped fragment shader, mouse drives a perturbation uniform.
   ========================================================================== */
(function () {
    'use strict';

    const canvas = document.getElementById('stage');
    if (!canvas) return;

    const ctx = FFSS_GL.getGLContext(canvas);
    if (!ctx) {
        document.body.innerHTML = '<p style="color:#fff;font-family:sans-serif;padding:2rem;">WebGL not supported in this browser.</p>';
        return;
    }
    if (!ctx.isWebGL2) {
        document.body.innerHTML = '<p style="color:#fff;font-family:sans-serif;padding:2rem;">This effect needs WebGL2.</p>';
        return;
    }
    const gl = ctx.gl;

    // Mouse state — keep at (-1,-1) until first move so the shader can branch.
    const mouse = { x: -1, y: -1 };
    window.addEventListener('mousemove', function (ev) {
        mouse.x = ev.clientX / window.innerWidth;
        mouse.y = 1.0 - (ev.clientY / window.innerHeight);
    }, { passive: true });
    window.addEventListener('touchmove', function (ev) {
        if (ev.touches.length) {
            mouse.x = ev.touches[0].clientX / window.innerWidth;
            mouse.y = 1.0 - (ev.touches[0].clientY / window.innerHeight);
        }
    }, { passive: true });

    const shaderUrl = new URL('../assets/shaders/plasma.frag', window.location.href).toString();

    FFSS_GL.loadShaderFile(shaderUrl).then(function (fragSrc) {
        const program = FFSS_GL.createProgram(gl, FFSS_GL.FULLSCREEN_VERT_300, fragSrc);
        gl.useProgram(program);

        const tri = FFSS_GL.createFullscreenTriangle(gl, program);
        const uResolution = gl.getUniformLocation(program, 'iResolution');
        const uTime       = gl.getUniformLocation(program, 'iTime');
        const uMouse      = gl.getUniformLocation(program, 'iMouse');

        FFSS.initFullscreenHUD({ effectName: 'Plasma Flow' });

        FFSS.setupCanvas(canvas, function (w, h) {
            gl.viewport(0, 0, w, h);
        });
        gl.viewport(0, 0, canvas.width, canvas.height);

        const loop = FFSS.createRAFLoop(function (state) {
            gl.useProgram(program);
            gl.uniform2f(uResolution, canvas.width, canvas.height);
            gl.uniform1f(uTime, state.time);
            gl.uniform2f(uMouse, mouse.x, mouse.y);
            tri.draw();
        });
        loop.start();
    }).catch(function (err) {
        console.error(err);
        document.body.insertAdjacentHTML('beforeend',
            '<pre style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#ff00e6;background:#000;padding:1rem;border:1px solid #ff00e6;font-family:monospace;max-width:80vw;white-space:pre-wrap;">' +
            String(err.message || err).replace(/[<>&]/g, '') + '</pre>'
        );
    });
}());
