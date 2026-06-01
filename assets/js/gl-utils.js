/* ==========================================================================
   FFSS WebGL Utilities
   Shared low-level WebGL helpers used by tunnel and plasma effects.
   Exposes everything via window.FFSS_GL — no module system, just script tags.
   ========================================================================== */
(function (root) {
    'use strict';

    /**
     * Compile a GLSL shader. Returns the compiled shader, or throws with the
     * full info-log so dev-time errors are obvious in the console.
     */
    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const log = gl.getShaderInfoLog(shader);
            const kind = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
            gl.deleteShader(shader);
            throw new Error('FFSS_GL: ' + kind + ' shader compile error:\n' + log);
        }
        return shader;
    }

    /**
     * Link a vertex + fragment program. Throws on link failure.
     */
    function createProgram(gl, vertSrc, fragSrc) {
        const vs = createShader(gl, gl.VERTEX_SHADER, vertSrc);
        const fs = createShader(gl, gl.FRAGMENT_SHADER, fragSrc);
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const log = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error('FFSS_GL: program link error:\n' + log);
        }
        // Shaders can be flagged for deletion immediately — they stay alive
        // while the program references them and free up after detach.
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        return program;
    }

    /**
     * Fetch a .glsl/.frag/.vert source file as plain text.
     */
    function loadShaderFile(url) {
        return fetch(url, { cache: 'force-cache' }).then(function (res) {
            if (!res.ok) {
                throw new Error('FFSS_GL: failed to load shader ' + url + ' (' + res.status + ')');
            }
            return res.text();
        });
    }

    /**
     * Set up a single full-screen triangle (covers the viewport with one draw call,
     * which is faster than a quad and avoids the diagonal seam artifact).
     * The triangle vertices are at NDC (-1,-1), (3,-1), (-1,3) — the GPU clips
     * the excess and we get a perfectly screen-filling fragment pass.
     *
     * Returns the buffer + a helper to bind/draw it for a given program.
     */
    function createFullscreenTriangle(gl, program) {
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,
             3, -1,
            -1,  3
        ]), gl.STATIC_DRAW);

        const aPos = gl.getAttribLocation(program, 'a_position');

        // WebGL2 supports VAOs natively; if available, capture state once.
        let vao = null;
        if (gl.createVertexArray) {
            vao = gl.createVertexArray();
            gl.bindVertexArray(vao);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.enableVertexAttribArray(aPos);
            gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
            gl.bindVertexArray(null);
        }

        return {
            buffer: buffer,
            vao: vao,
            draw: function () {
                if (vao) {
                    gl.bindVertexArray(vao);
                } else {
                    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                    gl.enableVertexAttribArray(aPos);
                    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
                }
                gl.drawArrays(gl.TRIANGLES, 0, 3);
                if (vao) gl.bindVertexArray(null);
            }
        };
    }

    /**
     * Trivial fullscreen-quad/triangle vertex shader.
     * Works for both WebGL1 (GLSL ES 1.00) and as a baseline.
     */
    const FULLSCREEN_VERT_300 = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
    // a_position is already in clip space (-1..3 triangle). Map to 0..1 uv.
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    const FULLSCREEN_VERT_100 = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    /**
     * Try WebGL2 first, fall back to WebGL1 for ancient browsers.
     * Returns { gl, isWebGL2 } or null if both fail.
     */
    function getGLContext(canvas, opts) {
        const options = Object.assign({
            antialias: false,        // we shade pixel-perfect; AA is wasted
            alpha: false,            // opaque canvas → cheaper composite
            depth: false,
            stencil: false,
            premultipliedAlpha: true,
            preserveDrawingBuffer: false,
            powerPreference: 'high-performance'
        }, opts || {});

        let gl = canvas.getContext('webgl2', options);
        if (gl) return { gl: gl, isWebGL2: true };

        gl = canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
        if (gl) return { gl: gl, isWebGL2: false };

        return null;
    }

    root.FFSS_GL = {
        createShader: createShader,
        createProgram: createProgram,
        loadShaderFile: loadShaderFile,
        createFullscreenTriangle: createFullscreenTriangle,
        getGLContext: getGLContext,
        FULLSCREEN_VERT_300: FULLSCREEN_VERT_300,
        FULLSCREEN_VERT_100: FULLSCREEN_VERT_100
    };
}(window));
