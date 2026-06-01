<?php
$template_override = 'ffss';
require_once 'users/init.php';
require_once $abs_us_root . $us_url_root . 'users/includes/template/prep.php';
?>

</div><!-- close the template container so the hero can run full width -->

<section class="ffss-hero">
    <h1 class="ffss-hero__title">FUN FULL SCREEN SHIT</h1>
    <p class="ffss-hero__subtitle">WebGL eye candy for your monitor</p>
</section>

<section class="ffss-gallery">

    <a class="ffss-card ffss-card--tunnel" href="<?= $us_url_root ?>effects/tunnel.php">
        <div class="ffss-card__preview" aria-hidden="true"></div>
        <div class="ffss-card__body">
            <span class="ffss-card__eyebrow">01 / Raymarched</span>
            <h2 class="ffss-card__title">Hyperspace Tunnel</h2>
            <p class="ffss-card__desc">Raymarched wormhole through neon space.</p>
            <span class="ffss-card__cta">Launch <span class="ffss-card__cta-arrow">&#10230;</span></span>
        </div>
    </a>

    <a class="ffss-card ffss-card--particles" href="<?= $us_url_root ?>effects/particles.php">
        <div class="ffss-card__preview" aria-hidden="true">
            <div class="ffss-card__preview-extra"></div>
        </div>
        <div class="ffss-card__body">
            <span class="ffss-card__eyebrow">02 / GPU Sim</span>
            <h2 class="ffss-card__title">Particle Storm</h2>
            <p class="ffss-card__desc">10,000 GPU particles, mouse-reactive.</p>
            <span class="ffss-card__cta">Launch <span class="ffss-card__cta-arrow">&#10230;</span></span>
        </div>
    </a>

    <a class="ffss-card ffss-card--plasma" href="<?= $us_url_root ?>effects/shader.php">
        <div class="ffss-card__preview" aria-hidden="true"></div>
        <div class="ffss-card__body">
            <span class="ffss-card__eyebrow">03 / Fragment</span>
            <h2 class="ffss-card__title">Plasma Flow</h2>
            <p class="ffss-card__desc">Liquid fragment shader fluid.</p>
            <span class="ffss-card__cta">Launch <span class="ffss-card__cta-arrow">&#10230;</span></span>
        </div>
    </a>

    <a class="ffss-card ffss-card--terminal" href="<?= $us_url_root ?>effects/terminal.php">
        <div class="ffss-card__preview" aria-hidden="true">
            <div class="ffss-card__preview-text">
                <span>$ ./run --mode=chaos</span>
                <span>&gt; init kernel ............ ok</span>
                <span>&gt; mounting /dev/null .... ok</span>
                <span>&gt; spawning daemons ...... 42</span>
                <span>&gt; entropy pool .......... 0xDEADBEEF</span>
                <span>&gt; ready_</span>
            </div>
        </div>
        <div class="ffss-card__body">
            <span class="ffss-card__eyebrow">04 / TTY</span>
            <h2 class="ffss-card__title">Terminal</h2>
            <p class="ffss-card__desc">Hacker aesthetic — endless code, commands, log spam.</p>
            <span class="ffss-card__cta">Launch <span class="ffss-card__cta-arrow">&#10230;</span></span>
        </div>
    </a>

    <a class="ffss-card ffss-card--dashboard" href="<?= $us_url_root ?>effects/dashboard.php">
        <div class="ffss-card__preview" aria-hidden="true">
            <div class="ffss-card__preview-graph"></div>
            <div class="ffss-card__preview-dots">
                <span></span><span></span><span></span>
            </div>
        </div>
        <div class="ffss-card__body">
            <span class="ffss-card__eyebrow">05 / Telemetry</span>
            <h2 class="ffss-card__title">Dashboard</h2>
            <p class="ffss-card__desc">Live ops telemetry — gauges, charts, fake metrics.</p>
            <span class="ffss-card__cta">Launch <span class="ffss-card__cta-arrow">&#10230;</span></span>
        </div>
    </a>

</section>

<div class="<?= $settings->container_open_class ?>"><!-- reopen so the template's footer container_close can close cleanly -->

<?php require_once $abs_us_root . $us_url_root . 'users/includes/html_footer.php'; ?>
