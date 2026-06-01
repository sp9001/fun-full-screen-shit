<?php
require_once($abs_us_root.$us_url_root.'users/includes/template/header1_must_include.php');
?>
<meta name="viewport" content="width=device-width, initial-scale=1">

<!-- Bootstrap 5: kept for grid + spacing utilities only -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css" integrity="sha512-jnSuA4Ss2PkkikSOLtYs8BlYIeeIK1h99ty4YfvRPAlzr377vr3CXDb7sb7eEEBYjDtcYj+AjBH3FLv5uSJuXg==" crossorigin="anonymous" referrerpolicy="no-referrer" />

<!-- FontAwesome (available for any icon needs) -->
<link rel="stylesheet" href="<?=$us_url_root?>users/fonts/css/fontawesome.min.css">
<link rel="stylesheet" href="<?=$us_url_root?>users/fonts/css/brands.min.css">
<link rel="stylesheet" href="<?=$us_url_root?>users/fonts/css/solid.min.css">

<!-- Lexend for UI; JetBrains Mono for the wordmark -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">

<?php require_once $abs_us_root . $us_url_root . "users/js/jquery.php"; ?>
<script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/js/bootstrap.bundle.min.js" integrity="sha512-7Pi/otdlbbCR+LnW+F7PwFcSDJOuUJB3OxtEHbg4vSMvzvJjde4Po1v4BR9Gdc9aXNUNFVUY+SK51wWT8WF0Gg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>

<style media="screen">
:root {
    /* Brand: dark base with electric cyan/magenta neon */
    --brand-primary:        #00f0ff;
    --brand-primary-light:  #6cf8ff;
    --brand-primary-dark:   #00b8c6;
    --brand-primary-glow:   rgba(0, 240, 255, 0.18);

    --brand-secondary:      #ff00e6;
    --brand-secondary-light:#ff66f0;
    --brand-secondary-dark: #c200ad;
    --brand-secondary-glow: rgba(255, 0, 230, 0.18);

    --brand-accent:         #7c5cff;   /* purple bridge between cyan and magenta */
    --brand-bg:             #0a0a12;
    --brand-bg-elevated:    #11111d;
    --brand-bg-card:        #161624;

    /* Neutrals tuned for a near-black canvas */
    --gray-50:  #f5f6fa;
    --gray-100: #d8dae3;
    --gray-200: #9da1b3;
    --gray-400: #6b6f82;
    --gray-600: #3b3e52;
    --gray-800: #1f2233;

    /* Elevation: neon-tinted glows in place of plain black shadows */
    --shadow:    0 1px 3px rgba(0, 0, 0, 0.5);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.6), 0 0 12px var(--brand-primary-glow);
    --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.7), 0 0 24px var(--brand-primary-glow);
    --shadow-xl: 0 24px 48px rgba(0, 0, 0, 0.75), 0 0 48px var(--brand-secondary-glow);

    /* Shape & motion */
    --radius:     0.625rem;
    --radius-lg:  1rem;
    --transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    --transition-slow: 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

body {
    background: var(--brand-bg);
    color: var(--gray-50);
    font-family: 'Lexend', system-ui, -apple-system, 'Segoe UI', sans-serif;
    font-weight: 400;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
}

/* Ambient gradient bloom behind every page — adds depth without an image */
body::before {
    content: '';
    position: fixed;
    inset: 0;
    background:
        radial-gradient(ellipse 80% 50% at 20% 0%, rgba(0, 240, 255, 0.08), transparent 60%),
        radial-gradient(ellipse 60% 40% at 80% 100%, rgba(255, 0, 230, 0.07), transparent 60%);
    pointer-events: none;
    z-index: 0;
}

main, .container, .ffss-hero, .ffss-gallery, footer, nav { position: relative; z-index: 1; }

a { color: var(--brand-primary); text-decoration: none; transition: color var(--transition); }
a:hover { color: var(--brand-primary-light); }
</style>

<link href="<?=$us_url_root?>assets/css/global.css" rel="stylesheet">
<link href="<?=$us_url_root?>assets/css/launcher.css" rel="stylesheet">

</head>
<body class="d-flex flex-column min-vh-100">
<?php require_once($abs_us_root.$us_url_root.'users/includes/template/header3_must_include.php'); ?>
