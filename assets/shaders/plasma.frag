#version 300 es
precision highp float;

in  vec2 v_uv;
out vec4 outColor;

uniform vec2  iResolution;
uniform float iTime;
uniform vec2  iMouse;       // 0..1 normalised, (-1,-1) when no mouse data

// --- Hash / noise helpers ----------------------------------------------------
// Standard 2D value-noise hash. Cheap; good enough for fluid-y plasma.
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    // Smoothstep'd interpolation gives soft, plasma-ish gradients.
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i + vec2(0.0, 0.0));
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// fBm (4 octaves). Domain warping is what gives plasma its fluid feel — we
// sample fBm, then *use* that result as a coordinate offset for the next sample.
float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
        v += amp * vnoise(p);
        p *= 2.07;        // non-integer scale avoids noticeable repetition
        amp *= 0.5;
    }
    return v;
}

// Cyan / teal palette with magenta highlights — matches FFSS brand tokens.
vec3 palette(float t) {
    vec3 a = vec3(0.18, 0.38, 0.55);
    vec3 b = vec3(0.45, 0.55, 0.45);
    vec3 c = vec3(1.00, 1.00, 1.00);
    vec3 d = vec3(0.00, 0.20, 0.55);
    return a + b * cos(6.2831853 * (c * t + d));
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);

    // Mouse perturbation: a soft well in normalised space pushes the flow field.
    vec2 m = iMouse;
    vec2 mouseOffset = vec2(0.0);
    if (m.x >= 0.0) {
        vec2 mp = (m - 0.5) * vec2(iResolution.x / iResolution.y, 1.0) * 2.0;
        vec2 d = uv - mp;
        float falloff = exp(-dot(d, d) * 1.4);
        mouseOffset = d * falloff * 0.6;
    }

    float t = iTime * 0.18;

    // Domain-warp depth 1: feed time + position into fBm to get a smooth flow vector.
    vec2 q = vec2(
        fbm(uv * 1.4 + vec2(0.0, t)),
        fbm(uv * 1.4 + vec2(5.2, -t))
    );

    // Domain-warp depth 2: warp again with the previous result. Two passes is
    // the sweet spot — one is too clean, three eats your GPU for marginal gain.
    vec2 r = vec2(
        fbm(uv * 1.7 + 4.0 * q + vec2(1.7, 9.2) + t * 0.6 + mouseOffset),
        fbm(uv * 1.7 + 4.0 * q + vec2(8.3, 2.8) - t * 0.6 + mouseOffset)
    );

    float f = fbm(uv * 1.9 + 4.0 * r);

    vec3 col = palette(f * 0.9 + 0.05);

    // Magenta highlights where the field is "hot" (high fBm) — gives the eye
    // somewhere to land; without this it's just teal soup.
    float hot = smoothstep(0.55, 0.95, f);
    col = mix(col, vec3(1.0, 0.22, 0.92), hot * 0.45);

    // Soft global glow tied to the mouse so cursor presence "lights" the plasma.
    if (m.x >= 0.0) {
        vec2 mp = (m - 0.5) * vec2(iResolution.x / iResolution.y, 1.0) * 2.0;
        float halo = exp(-dot(uv - mp, uv - mp) * 2.5);
        col += vec3(0.0, 0.95, 1.0) * halo * 0.25;
    }

    // Edge falloff so the corners breathe slightly.
    float falloff = smoothstep(1.6, 0.2, length(uv));
    col *= 0.6 + 0.4 * falloff;

    // Reinhard tonemap.
    col = col / (col + 0.7);

    outColor = vec4(col, 1.0);
}
