/* ==========================================================================
   FFSS Effect: Particle Storm
   10k+ GPU particles in a curl-noise-flavoured field, mouse-reactive.
   Uses Three.js (loaded via CDN by particles.php).
   ========================================================================== */
(function () {
    'use strict';

    if (typeof THREE === 'undefined') {
        document.body.innerHTML = '<p style="color:#fff;font-family:sans-serif;padding:2rem;">Three.js failed to load.</p>';
        return;
    }

    const canvas = document.getElementById('stage');
    if (!canvas) return;

    // --- Renderer ----------------------------------------------------------
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(FFSS.getDPR());
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x02030a, 1.0);

    // --- Scene / camera ----------------------------------------------------
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        55,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );
    camera.position.set(0, 0, 6.5);

    // --- Particles ---------------------------------------------------------
    const COUNT = 14000;     // 10k+ requested; 14k still hits 60fps on integrated graphics
    const positions = new Float32Array(COUNT * 3);
    const seeds     = new Float32Array(COUNT * 3);

    // Seed positions along a noisy torus — gives the field shape before the
    // shader does its dynamic flow. The initial spread also encodes per-particle
    // randomness used in the vertex shader (size variation, phase offsets).
    const torusR = 2.4;     // major radius
    const torusr = 1.0;     // minor radius
    for (let i = 0; i < COUNT; i++) {
        const u = Math.random() * Math.PI * 2;
        const v = Math.random() * Math.PI * 2;
        const jitter = (Math.random() - 0.5) * 0.5;
        const r = torusR + (torusr + jitter) * Math.cos(v);
        positions[i * 3 + 0] = r * Math.cos(u);
        positions[i * 3 + 1] = (torusr + jitter) * Math.sin(v);
        positions[i * 3 + 2] = r * Math.sin(u);

        seeds[i * 3 + 0] = Math.random();
        seeds[i * 3 + 1] = Math.random();
        seeds[i * 3 + 2] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('seed',     new THREE.BufferAttribute(seeds, 3));

    // --- Shaders -----------------------------------------------------------
    // Curl-noise flow approximation: cheap pseudo-curl from sine-based vector
    // field. Real curl-of-noise would be more authentic but ~3x more expensive.
    const vertSrc = `
        attribute vec3 seed;
        uniform float uTime;
        uniform vec3  uMouse;       // world-space mouse target
        uniform float uMouseStrength;
        uniform float uPixelRatio;
        uniform float uSize;
        varying float vVel;
        varying float vSeed;

        // Cheap "curl-ish" flow: rotate by sin/cos of position so divergence is low.
        vec3 flow(vec3 p, float t) {
            vec3 a = vec3(
                sin(p.y * 1.3 + t * 0.7),
                sin(p.z * 1.1 - t * 0.6),
                sin(p.x * 1.2 + t * 0.5)
            );
            vec3 b = vec3(
                cos(p.z * 0.9 + t * 0.4),
                cos(p.x * 1.0 - t * 0.5),
                cos(p.y * 1.1 + t * 0.6)
            );
            return cross(a, b) * 0.35;
        }

        void main() {
            vec3 p = position;
            float phase = seed.x * 6.2831853;
            float t = uTime + phase * 0.2;

            // Slow oscillation in the seed-defined direction so static torus breathes.
            p += flow(p * 0.45, t) * (0.6 + seed.y * 0.6);

            // Mouse repulsion / attraction. Falloff is gaussian-ish so the
            // effect is local — far particles aren't disturbed.
            vec3 toMouse = uMouse - p;
            float d2 = dot(toMouse, toMouse);
            float falloff = exp(-d2 * 0.45);
            // Push particles around the cursor (negative = repel).
            p += -normalize(toMouse + 1e-4) * falloff * uMouseStrength;

            // Estimate "velocity" magnitude from the displacement so the FS can colour by it.
            vVel = length(flow(p * 0.45, t)) + falloff * uMouseStrength * 0.5;
            vSeed = seed.z;

            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;

            // Perspective-correct point size. Multiplied by DPR so it stays
            // visually consistent across screen densities.
            float sz = uSize * (1.0 + seed.z * 1.2);
            gl_PointSize = sz * uPixelRatio * (300.0 / -mv.z);
        }
    `;

    const fragSrc = `
        precision highp float;
        varying float vVel;
        varying float vSeed;

        // Cyan -> magenta gradient based on velocity, with per-particle hue jitter.
        vec3 palette(float t) {
            vec3 cyan    = vec3(0.0, 0.94, 1.0);
            vec3 magenta = vec3(1.0, 0.0, 0.90);
            vec3 white   = vec3(1.0, 0.92, 1.0);
            vec3 c = mix(cyan, magenta, clamp(t, 0.0, 1.0));
            return mix(c, white, smoothstep(0.7, 1.2, t));
        }

        void main() {
            // Soft circular sprite: distance from point centre, smooth falloff.
            vec2 uv = gl_PointCoord - 0.5;
            float r = length(uv);
            if (r > 0.5) discard;
            float alpha = pow(1.0 - r * 2.0, 1.6);

            float velMix = clamp(vVel * 1.6 + vSeed * 0.2, 0.0, 1.4);
            vec3 col = palette(velMix);

            // Additive-friendly: pre-multiplied feel. Three.js handles the
            // additive blend on the material side.
            gl_FragColor = vec4(col * alpha, alpha);
        }
    `;

    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime:          { value: 0 },
            uMouse:         { value: new THREE.Vector3(999, 999, 999) }, // far away = no influence
            uMouseStrength: { value: 0.0 },
            uPixelRatio:    { value: FFSS.getDPR() },
            uSize:          { value: 5.5 }
        },
        vertexShader: vertSrc,
        fragmentShader: fragSrc,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // --- Mouse → world ray -------------------------------------------------
    const mouseNDC = new THREE.Vector2(-2, -2);  // off-screen by default
    const mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);   // z = 0 plane
    const raycaster = new THREE.Raycaster();
    const worldMouse = new THREE.Vector3(999, 999, 999);
    let mouseActive = false;
    let mouseStrengthTarget = 0.0;

    function onPointerMove(ev) {
        const x = ev.touches ? ev.touches[0].clientX : ev.clientX;
        const y = ev.touches ? ev.touches[0].clientY : ev.clientY;
        mouseNDC.x = (x / window.innerWidth) * 2 - 1;
        mouseNDC.y = -((y / window.innerHeight) * 2 - 1);
        mouseActive = true;
        mouseStrengthTarget = 0.7;
    }
    function onPointerLeave() {
        mouseActive = false;
        mouseStrengthTarget = 0.0;
    }
    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('mouseleave', onPointerLeave);
    window.addEventListener('touchend', onPointerLeave);

    // --- HUD + resize ------------------------------------------------------
    FFSS.initFullscreenHUD({ effectName: 'Particle Storm' });

    function onResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setPixelRatio(FFSS.getDPR());
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        material.uniforms.uPixelRatio.value = FFSS.getDPR();
    }
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });
    onResize();

    // --- Loop --------------------------------------------------------------
    const loop = FFSS.createRAFLoop(function (state) {
        // Slow camera drift — keeps things alive even when nothing is interacting.
        camera.position.x = Math.sin(state.time * 0.12) * 0.6;
        camera.position.y = Math.cos(state.time * 0.09) * 0.4;
        camera.lookAt(0, 0, 0);

        // Resolve mouse to a world-space point on z=0 plane.
        if (mouseActive) {
            raycaster.setFromCamera(mouseNDC, camera);
            const hit = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(mousePlane, hit)) {
                worldMouse.copy(hit);
            }
        } else {
            worldMouse.set(999, 999, 999);
        }

        // Smooth strength so cursor entry/exit isn't abrupt.
        const cur = material.uniforms.uMouseStrength.value;
        material.uniforms.uMouseStrength.value = cur + (mouseStrengthTarget - cur) * 0.08;

        material.uniforms.uTime.value = state.time;
        material.uniforms.uMouse.value.copy(worldMouse);

        // Slow rotation of the whole field gives the parallax cue that this is 3D.
        points.rotation.y = state.time * 0.05;
        points.rotation.x = Math.sin(state.time * 0.07) * 0.2;

        renderer.render(scene, camera);
    });
    loop.start();
}());
