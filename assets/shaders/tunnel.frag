#version 300 es
precision highp float;

in  vec2 v_uv;
out vec4 outColor;

uniform vec2  iResolution;
uniform float iTime;

// Cyan / magenta neon palette. Cosine-based, returns smoothly varying colors
// across the t parameter — matches the global brand tokens.
vec3 palette(float t) {
    vec3 a = vec3(0.50, 0.50, 0.55);
    vec3 b = vec3(0.50, 0.50, 0.55);
    vec3 c = vec3(0.95, 0.85, 0.85);
    vec3 d = vec3(0.00, 0.55, 0.85);   // shifts cyan -> magenta -> back
    return a + b * cos(6.2831853 * (c * t + d));
}

void main() {
    // Centred screen-space coords, aspect-corrected.
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);

    // Polar coordinates → radial distance + angle.
    float r = length(uv);
    float a = atan(uv.y, uv.x);

    // Tunnel depth: 1/r maps the screen to an infinite tunnel; the time term
    // pulls the tunnel toward the viewer so it feels like flying forward.
    float depth = 0.35 / max(r, 0.0001) + iTime * 0.55;

    // Twisting bands — angle precesses with depth so the bands spiral.
    float twist = a + depth * 0.45;

    // Stripes along depth, modulated by angle. Fract-based banding gives
    // crisp neon rings; the modulation breaks them into segments.
    float bands  = fract(depth);
    float spokes = 0.5 + 0.5 * sin(twist * 8.0 + iTime * 1.2);
    float pattern = smoothstep(0.45, 0.55, bands) * spokes;

    // Two colour layers blended by depth so the palette cycles as we go in.
    vec3 col = palette(depth * 0.15 + 0.05);
    col = mix(col, palette(depth * 0.15 + 0.45), spokes);

    // Rim glow — brighter band pulses outline the tunnel rings.
    float rim = pow(pattern, 1.6);
    col += rim * vec3(0.3, 0.95, 1.0) * 0.6;

    // Centre vignette: pull blacks at far depth so the throat reads as deep.
    float centre = smoothstep(0.0, 0.6, r);
    col *= centre;

    // Warp speed flash: subtle global pulse so the eye gets a tempo.
    col *= 1.0 + 0.08 * sin(iTime * 0.8);

    // Edge falloff prevents corner over-bright when aspect ratio is wide.
    float falloff = smoothstep(1.6, 0.4, length(uv));
    col *= falloff;

    // Tonemap-ish curve so highlights don't blow out on the rims.
    col = col / (col + 0.65);

    outColor = vec4(col, 1.0);
}
