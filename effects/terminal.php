<?php require_once '../users/init.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terminal &middot; FFSS</title>
    <link rel="icon" href="<?= $us_url_root ?>favicon.ico">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Lexend:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?= $us_url_root ?>assets/css/effect-hud.css">
    <link rel="stylesheet" href="<?= $us_url_root ?>assets/css/effect-terminal.css">
</head>
<body class="ffss-effect-body term-body">
    <div class="term-screen">
        <div id="term-output" class="term-output"></div>
        <div class="term-scanlines" aria-hidden="true"></div>
        <div class="term-vignette" aria-hidden="true"></div>
    </div>
    <!-- HUD is injected by fullscreen-helper.js -->
    <script src="<?= $us_url_root ?>assets/js/fullscreen-helper.js"></script>
    <script src="<?= $us_url_root ?>assets/js/effect-terminal.js"></script>
</body>
</html>
