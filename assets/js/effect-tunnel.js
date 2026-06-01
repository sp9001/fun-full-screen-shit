/* ==========================================================================
   FFSS Effect: Hyperspace Tunnel
   Loads the raymarched tunnel fragment shader and runs a fullscreen pass.
   ========================================================================== */
(function () {
    'use strict';

    const canvas = document.getElementById('stage');
    if (!canvas) {
        console.error('FFSS Tunnel: no canvas#stage on page');
        return;
    }

    const ctx = FFSS_GL.getGLContext(canvas);
    if (!ctx) {
        document.body.innerHTML = '<p style="color:#fff;font-family:sans-serif;padding:2rem;">WebGL not supported in this browser.</p>';
        return;
    }
    const gl = ctx.gl;

    // The shader file is authored as #version 300 es (WebGL2). If we somehow
    // landed on WebGL1, bail with a friendly message rather than render garbage.
    if (!ctx.isWebGL2) {
        document.body.innerHTML = '<p style="color:#fff;font-family:sans-serif;padding:2rem;">This effect needs WebGL2 (most modern browsers support it).</p>';
        return;
    }

    // Resolve shader path relative to the page so the install path doesn't matter.
    const shaderUrl = new URL('../assets/shaders/tunnel.frag', window.location.href).toString();

    FFSS_GL.loadShaderFile(shaderUrl).then(function (fragSrc) {
        const program = FFSS_GL.createProgram(gl, FFSS_GL.FULLSCREEN_VERT_300, fragSrc);
        gl.useProgram(program);

        const tri = FFSS_GL.createFullscreenTriangle(gl, program);
        const uResolution = gl.getUniformLocation(program, 'iResolution');
        const uTime       = gl.getUniformLocation(program, 'iTime');

        // Initialize HUD before sizing — close button + FPS readout appear immediately.
        FFSS.initFullscreenHUD({ effectName: 'Hyperspace Tunnel' });

        FFSS.setupCanvas(canvas, function (w, h) {
            gl.viewport(0, 0, w, h);
        });
        gl.viewport(0, 0, canvas.width, canvas.height);

        const loop = FFSS.createRAFLoop(function (state) {
            gl.useProgram(program);
            gl.uniform2f(uResolution, canvas.width, canvas.height);
            gl.uniform1f(uTime, state.time);
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
