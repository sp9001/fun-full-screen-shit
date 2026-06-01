/* ==========================================================================
   FFSS Effect: Terminal
   Scene-driven fake terminal — types commands, spews output, loops scenes.
   Pure DOM. No frameworks.
   ========================================================================== */
(function () {
    'use strict';

    const out = document.getElementById('term-output');
    if (!out) {
        console.error('FFSS Terminal: no #term-output on page');
        return;
    }

    FFSS.initFullscreenHUD({ effectName: 'Terminal' });

    // No-op RAF loop just to feed the HUD's FPS counter — the terminal itself
    // is paced by setTimeout, so without this the FPS readout would stay blank.
    FFSS.createRAFLoop(function () {}).start();

    // ---- Buffer management ---------------------------------------------
    // Cap DOM at MAX_LINES so old content doesn't grow without bound.
    const MAX_LINES = 500;
    let cursorEl = null;

    function ensureCursor() {
        if (cursorEl && cursorEl.isConnected) return cursorEl;
        cursorEl = document.createElement('span');
        cursorEl.className = 'term-cursor';
        return cursorEl;
    }

    function newLine() {
        const ln = document.createElement('div');
        ln.className = 'line';
        out.appendChild(ln);
        prune();
        scroll();
        return ln;
    }

    function prune() {
        // Remove from the top once we exceed cap. Cheap because we only ever add
        // a few per tick, so this loop runs maybe 0-2 iterations.
        while (out.childNodes.length > MAX_LINES) {
            out.removeChild(out.firstChild);
        }
    }

    function scroll() {
        // Auto-scroll to bottom by translating the content up. Using scrollTop
        // works because the container has overflow:hidden — but we instead
        // rely on the fact that we trim from the top, so the bottom is always
        // visible if the total height fits. To be safe, use a transform.
        // Simpler: just clear off-screen lines once they overflow viewport.
        const screenH = window.innerHeight - 80;
        let total = out.scrollHeight;
        while (total > screenH * 1.4 && out.firstChild) {
            const h = out.firstChild.offsetHeight || 18;
            out.removeChild(out.firstChild);
            total -= h;
        }
    }

    function append(text, cls) {
        const ln = newLine();
        if (cls) ln.className = 'line ' + cls;
        ln.textContent = text;
        return ln;
    }

    // Append to the *last* line in progress (used while typing a command).
    function appendInline(parent, text, cls) {
        const span = document.createElement('span');
        if (cls) span.className = cls;
        span.textContent = text;
        parent.appendChild(span);
        scroll();
        return span;
    }

    function clearScreen() {
        while (out.firstChild) out.removeChild(out.firstChild);
        cursorEl = null;
    }

    // ---- Async helpers --------------------------------------------------
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const rand = (min, max) => Math.random() * (max - min) + min;
    const irand = (min, max) => Math.floor(rand(min, max + 1));
    const pick = (arr) => arr[irand(0, arr.length - 1)];

    // ---- Prompt state ---------------------------------------------------
    let user = 'pete';
    let host = 'workstation';
    let cwd  = '~';

    function promptStr() {
        return user + '@' + host + ':' + cwd + '$ ';
    }

    function writePromptLine() {
        const ln = newLine();
        ln.appendChild(makeSpan(promptStr(), 'term-cyan'));
        ln.appendChild(ensureCursor());
        return ln;
    }

    function makeSpan(text, cls) {
        const s = document.createElement('span');
        if (cls) s.className = cls;
        s.textContent = text;
        return s;
    }

    // Type a command into the current prompt line, char-by-char.
    async function typeCmd(cmd) {
        const ln = writePromptLine();
        // Strip the cursor while typing — it moves with the char insert position.
        const cur = ensureCursor();
        if (cur.parentNode) cur.parentNode.removeChild(cur);

        const cmdSpan = makeSpan('', 'term-white');
        ln.appendChild(cmdSpan);
        ln.appendChild(cur);

        for (let i = 0; i < cmd.length; i++) {
            cmdSpan.textContent += cmd[i];
            scroll();
            // Slight pauses around spaces and punctuation — feels human.
            const ch = cmd[i];
            let delay = rand(40, 80);
            if (ch === ' ') delay += rand(0, 60);
            if (ch === '.' || ch === '/') delay += rand(0, 40);
            // Occasional micro-pause (thinking)
            if (Math.random() < 0.04) delay += rand(120, 320);
            await sleep(delay);
        }
        await sleep(rand(180, 420));
        // Detach cursor so it doesn't blink mid-output.
        if (cur.parentNode) cur.parentNode.removeChild(cur);
    }

    // Print a single output line with optional class, with a small inter-line delay.
    async function out_line(text, cls, delayMs) {
        append(text, cls);
        await sleep(delayMs == null ? rand(8, 30) : delayMs);
    }

    // Print a block of lines fast (multi-line output). Items: [text, cls?].
    async function out_block(lines, perLineMs) {
        for (const item of lines) {
            if (Array.isArray(item)) {
                append(item[0], item[1]);
            } else {
                append(item);
            }
            await sleep(perLineMs == null ? rand(5, 18) : perLineMs);
        }
    }

    // ---- Fake-data helpers ---------------------------------------------
    const ipv4 = () => irand(10, 240) + '.' + irand(0, 255) + '.' + irand(0, 255) + '.' + irand(1, 254);
    const hex  = (n) => {
        let s = '';
        for (let i = 0; i < n; i++) s += '0123456789abcdef'[irand(0, 15)];
        return s;
    };
    const sha  = () => hex(7);
    const time2 = (n) => String(n).padStart(2, '0');
    const now  = () => {
        const d = new Date();
        return time2(d.getHours()) + ':' + time2(d.getMinutes()) + ':' + time2(d.getSeconds());
    };
    const isoDate = () => {
        const d = new Date();
        return d.getFullYear() + '-' + time2(d.getMonth() + 1) + '-' + time2(d.getDate());
    };
    const bytes = (n) => {
        if (n > 1e9) return (n / 1e9).toFixed(2) + 'GB';
        if (n > 1e6) return (n / 1e6).toFixed(1) + 'MB';
        if (n > 1e3) return (n / 1e3).toFixed(1) + 'KB';
        return n + 'B';
    };

    // ---- Scenes ---------------------------------------------------------

    async function sceneSSH() {
        await typeCmd('ssh deploy@prod-app-01.us-east-2.internal');
        await sleep(rand(400, 700));
        await out_line("deploy@prod-app-01.us-east-2.internal's password: ", 'term-dim');
        await sleep(rand(800, 1400));
        const banners = [
            ['', null],
            ['Welcome to Ubuntu 24.04.1 LTS (GNU/Linux 6.8.0-45-generic x86_64)', 'term-white'],
            ['', null],
            [' * Documentation:  https://help.ubuntu.com', 'term-dim'],
            [' * Management:     https://landscape.canonical.com', 'term-dim'],
            [' * Support:        https://ubuntu.com/pro', 'term-dim'],
            ['', null],
            ['  System load:  0.42                Processes:             247', 'term-dim'],
            ['  Usage of /:   38.4% of 78.62GB    Users logged in:       2', 'term-dim'],
            ['  Memory usage: 47%                 IPv4 address for eth0: 10.42.18.7', 'term-dim'],
            ['  Swap usage:   0%', 'term-dim'],
            ['', null],
            ['Last login: ' + isoDate() + ' ' + now() + ' from ' + ipv4(), 'term-dim'],
        ];
        await out_block(banners, 12);
        host = 'prod-app-01';
        cwd = '~';

        await sleep(500);
        await typeCmd('cd /var/www/api');
        cwd = '/var/www/api';
        await sleep(rand(200, 500));

        await typeCmd('ls -lah');
        await out_block([
            ['total 184K', null],
            ['drwxr-xr-x 12 deploy deploy 4.0K Apr 28 14:03 .', 'term-dim'],
            ['drwxr-xr-x  6 root   root   4.0K Mar 03 09:11 ..', 'term-dim'],
            ['-rw-r--r--  1 deploy deploy  234 Apr 28 14:01 .env', null],
            ['drwxr-xr-x  8 deploy deploy 4.0K Apr 28 14:02 .git', null],
            ['-rw-r--r--  1 deploy deploy  189 Mar 14 11:42 .gitignore', null],
            ['-rw-r--r--  1 deploy deploy  12K Apr 28 14:01 README.md', null],
            ['drwxr-xr-x 24 deploy deploy 4.0K Apr 28 14:03 node_modules', null],
            ['-rw-r--r--  1 deploy deploy 1.4K Apr 28 14:01 package.json', null],
            ['drwxr-xr-x  6 deploy deploy 4.0K Apr 28 14:01 src', null],
            ['drwxr-xr-x  3 deploy deploy 4.0K Apr 28 14:01 tests', null],
        ], 10);

        await sleep(rand(300, 600));
        await typeCmd('uptime');
        await out_line(' ' + now() + ' up 14 days,  3:42,  2 users,  load average: 0.42, 0.51, 0.48', 'term-white');
        await sleep(rand(500, 900));
    }

    async function sceneNpmInstall() {
        await typeCmd('npm install');
        await sleep(rand(400, 700));
        await out_line('npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported', 'term-yellow');
        await sleep(rand(80, 200));
        await out_line('npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported', 'term-yellow');
        await sleep(rand(80, 200));

        const pkgs = [
            'express', 'lodash', 'react', 'react-dom', 'webpack', 'babel-loader', '@babel/core',
            'eslint', 'prettier', 'typescript', 'ts-node', 'jest', '@types/node', 'axios',
            'redux', 'react-redux', 'next', 'tailwindcss', 'postcss', 'autoprefixer',
            'commander', 'chalk', 'inquirer', 'fs-extra', 'glob', 'mocha', 'chai',
            'supertest', 'nodemon', 'pm2', 'dotenv', 'helmet', 'cors', 'morgan',
            'cookie-parser', 'jsonwebtoken', 'bcryptjs', 'passport', 'passport-local',
            'mongoose', 'pg', 'mysql2', 'sequelize', 'knex', 'redis', 'ioredis'
        ];
        for (let i = 0; i < 30; i++) {
            const pkg = pick(pkgs);
            const ver = irand(0, 25) + '.' + irand(0, 99) + '.' + irand(0, 12);
            await out_line('added ' + pkg + '@' + ver, 'term-dim');
            await sleep(rand(15, 45));
        }
        await sleep(rand(200, 400));
        const totalPkgs = irand(800, 1900);
        const sec = (rand(8, 28)).toFixed(0);
        await out_line('', null, 0);
        await out_line('added ' + totalPkgs + ' packages, and audited ' + (totalPkgs + 1) + ' packages in ' + sec + 's', 'term-white');
        await out_line('', null, 0);
        await out_line(irand(80, 320) + ' packages are looking for funding', null);
        await out_line('  run `npm fund` for details', 'term-dim');
        await sleep(rand(80, 200));
        await out_line(irand(0, 6) + ' moderate severity vulnerabilities', 'term-yellow');
        await out_line('Run `npm audit fix` to fix them, or `npm audit` for details', 'term-dim');
        await sleep(rand(500, 900));
    }

    async function sceneGit() {
        await typeCmd('git status');
        await out_block([
            ['On branch main', null],
            ["Your branch is up to date with 'origin/main'.", null],
            ['', null],
            ['Changes not staged for commit:', null],
            ['  (use "git add <file>..." to update what will be committed)', 'term-dim'],
            ['  (use "git restore <file>..." to discard changes in working directory)', 'term-dim'],
            ['\tmodified:   src/api/users.ts', 'term-red'],
            ['\tmodified:   src/api/orders.ts', 'term-red'],
            ['\tmodified:   src/db/schema.sql', 'term-red'],
            ['', null],
            ['Untracked files:', null],
            ['  (use "git add <file>..." to include in what will be committed)', 'term-dim'],
            ['\tsrc/api/webhooks.ts', 'term-red'],
            ['', null],
            ['no changes added to commit (use "git add" and/or "git commit -a")', null],
        ], 12);
        await sleep(rand(400, 800));

        await typeCmd('git log --oneline -10');
        const msgs = [
            'fix: handle null user_id in webhook handler',
            'feat: add rate limiting middleware',
            'refactor: extract auth logic into service',
            'chore: bump dependencies',
            'docs: update README install steps',
            'fix: timezone bug in order timestamps',
            'test: cover new payment flow',
            'feat: support OAuth via google',
            'perf: cache user permissions for 5min',
            'fix: race condition in queue worker',
        ];
        for (const m of msgs) {
            await out_line(sha() + ' ' + m, 'term-yellow');
            await sleep(rand(8, 25));
        }
        await sleep(rand(300, 600));

        await typeCmd('git pull');
        await out_line('remote: Enumerating objects: 47, done.', 'term-dim');
        await out_line('remote: Counting objects: 100% (47/47), done.', 'term-dim');
        await out_line('remote: Compressing objects: 100% (24/24), done.', 'term-dim');
        await out_line('remote: Total 28 (delta 18), reused 22 (delta 14), pack-reused 0', 'term-dim');
        await out_line('Unpacking objects: 100% (28/28), 4.32 KiB | 1.08 MiB/s, done.', null);
        await out_line('From github.com:legitfigures/api', null);
        await out_line('   ' + sha() + '..' + sha() + '  main       -> origin/main', 'term-yellow');
        await out_line('Updating ' + sha() + '..' + sha(), null);
        await out_line('Fast-forward', 'term-green');
        await out_line(' src/api/webhooks.ts | 24 ++++++++++++++++++++++--', 'term-dim');
        await out_line(' src/db/schema.sql   |  6 ++++++', 'term-dim');
        await out_line(' 2 files changed, 28 insertions(+), 2 deletions(-)', 'term-dim');
        await sleep(rand(500, 900));
    }

    async function sceneNmap() {
        await typeCmd('nmap -sV -T4 192.168.1.0/24');
        await out_line('', null, 0);
        await out_line('Starting Nmap 7.94 ( https://nmap.org ) at ' + isoDate() + ' ' + now(), null);
        await sleep(rand(300, 600));

        const hosts = irand(8, 16);
        for (let i = 0; i < hosts; i++) {
            const ip = '192.168.1.' + irand(2, 254);
            await out_line('Nmap scan report for ' + ip, 'term-cyan');
            await out_line('Host is up (0.000' + irand(2, 89) + 's latency).', null);
            await out_line('Not shown: ' + irand(990, 998) + ' closed tcp ports (reset)', 'term-dim');
            await out_line('PORT     STATE SERVICE     VERSION', 'term-white');
            const portsPool = [
                ['22/tcp', 'open', 'ssh', 'OpenSSH 9.6 Ubuntu'],
                ['80/tcp', 'open', 'http', 'nginx 1.24.0'],
                ['443/tcp', 'open', 'ssl/http', 'nginx 1.24.0'],
                ['3306/tcp', 'open', 'mysql', 'MySQL 8.0.36'],
                ['5432/tcp', 'open', 'postgresql', 'PostgreSQL 15.4'],
                ['6379/tcp', 'open', 'redis', 'Redis 7.2.4'],
                ['27017/tcp', 'open', 'mongodb', 'MongoDB 7.0'],
                ['8080/tcp', 'open', 'http-proxy', 'Caddy 2.7.6'],
            ];
            const numPorts = irand(1, 4);
            for (let p = 0; p < numPorts; p++) {
                const row = pick(portsPool);
                await out_line(
                    row[0].padEnd(9) + row[1].padEnd(6) + row[2].padEnd(12) + row[3],
                    'term-green'
                );
                await sleep(rand(8, 25));
            }
            await out_line('MAC Address: ' + Array.from({length:6}, () => hex(2).toUpperCase()).join(':') + ' (Unknown)', 'term-dim');
            await out_line('', null, 0);
            await sleep(rand(20, 80));
        }
        await out_line('Nmap done: 256 IP addresses (' + hosts + ' hosts up) scanned in ' + rand(8, 24).toFixed(2) + ' seconds', 'term-white');
        await sleep(rand(500, 900));
    }

    async function sceneTailLogs() {
        await typeCmd('tail -f /var/log/nginx/access.log');
        await sleep(rand(200, 400));
        const methods = ['GET', 'GET', 'GET', 'POST', 'PUT', 'DELETE', 'GET'];
        const paths = [
            '/api/v1/users', '/api/v1/users/4821', '/api/v1/orders', '/api/v1/orders/recent',
            '/api/v1/auth/login', '/api/v1/auth/refresh', '/static/main.js', '/static/styles.css',
            '/favicon.ico', '/health', '/metrics', '/api/v1/webhooks/stripe',
            '/api/v1/products?cat=42&sort=price', '/api/v1/cart', '/api/v1/checkout',
            '/admin/users', '/admin/dashboard', '/uploads/image_' + irand(1, 9999) + '.jpg'
        ];
        const statuses = [200, 200, 200, 200, 200, 201, 204, 301, 304, 400, 401, 404, 500];
        const agents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'curl/8.4.0',
            'GoogleBot/2.1',
        ];
        const total = irand(60, 110);
        for (let i = 0; i < total; i++) {
            const ip = ipv4();
            const m = pick(methods);
            const p = pick(paths);
            const st = pick(statuses);
            const sz = irand(120, 84000);
            const ua = pick(agents);
            const cls = st >= 500 ? 'term-red' : (st >= 400 ? 'term-yellow' : null);
            await out_line(
                ip + ' - - [' + isoDate() + 'T' + now() + '+00:00] "' + m + ' ' + p + ' HTTP/1.1" ' + st + ' ' + sz + ' "-" "' + ua + '"',
                cls
            );
            await sleep(rand(40, 220));
        }
        await sleep(rand(300, 600));
    }

    async function sceneCompile() {
        await typeCmd('make -j8');
        await out_line('mkdir -p build', 'term-dim');
        await sleep(80);
        const files = [
            'src/core/engine.cpp', 'src/core/logger.cpp', 'src/core/config.cpp',
            'src/net/socket.cpp', 'src/net/http.cpp', 'src/net/tls.cpp',
            'src/db/connection.cpp', 'src/db/pool.cpp', 'src/db/query.cpp',
            'src/api/router.cpp', 'src/api/middleware.cpp', 'src/api/handlers.cpp',
            'src/util/string.cpp', 'src/util/file.cpp', 'src/util/time.cpp',
            'src/main.cpp', 'src/cli/parser.cpp', 'src/cli/commands.cpp',
            'src/cache/lru.cpp', 'src/cache/redis_client.cpp', 'src/queue/worker.cpp',
        ];
        const total = files.length;
        for (let i = 0; i < total; i++) {
            const pct = Math.floor(((i + 1) / total) * 100);
            await out_line('[' + String(pct).padStart(3) + '%] Building CXX object CMakeFiles/app.dir/' + files[i] + '.o', 'term-cyan');
            await sleep(rand(40, 140));
            if (Math.random() < 0.15) {
                await out_line(files[i] + ': In function \'process()\':', 'term-dim');
                await out_line(files[i] + ':' + irand(20, 400) + ':' + irand(4, 80) + ': warning: unused variable \'tmp\' [-Wunused-variable]', 'term-yellow');
                await sleep(rand(30, 80));
            }
        }
        await out_line('[100%] Linking CXX executable build/app', 'term-green');
        await sleep(rand(200, 500));
        await out_line('[100%] Built target app', 'term-white');
        await sleep(rand(400, 700));
    }

    async function sceneScp() {
        await typeCmd('rsync -avzP backups/ deploy@archive.example.com:/srv/backups/');
        await out_line('sending incremental file list', 'term-dim');
        const files = [
            ['db_2026-04-28.sql.gz', 248_392_412],
            ['app_2026-04-28.tar.gz', 1_843_204_812],
            ['logs_2026-04-28.tar.gz', 92_418_204],
            ['media_2026-04-28.tar.gz', 4_201_822_493],
            ['configs_2026-04-28.tar.gz', 2_018_492],
        ];
        for (const [name, size] of files) {
            await out_line(name, null);
            const steps = irand(6, 14);
            for (let i = 1; i <= steps; i++) {
                const pct = Math.min(100, Math.floor((i / steps) * 100) + irand(-4, 0));
                const sent = Math.floor(size * (pct / 100));
                const speed = irand(8, 96);
                const eta = Math.max(0, Math.floor((size - sent) / (speed * 1024 * 1024)));
                const bar = '#'.repeat(Math.floor(pct / 2.5)).padEnd(40, ' ');
                // Overwrite previous line by adding then removing — simpler to just append.
                await out_line(
                    '  [' + bar + '] ' + String(pct).padStart(3) + '%  ' + bytes(sent).padStart(8) + '  ' + speed + 'MB/s  eta ' + eta + 's',
                    pct === 100 ? 'term-green' : 'term-cyan'
                );
                await sleep(rand(60, 180));
            }
        }
        await sleep(rand(300, 500));
        await out_line('', null, 0);
        await out_line('sent 6.59GB  received 1.84KB  91.42MB/s', 'term-white');
        await out_line('total size is 6.59GB  speedup is 1.00', null);
        await sleep(rand(500, 900));
    }

    async function sceneHtop() {
        await typeCmd('htop');
        await sleep(rand(200, 400));
        await out_block([
            ['  CPU[||||||||||||||||                       42.7%]   Tasks: 247, 412 thr; 2 running', 'term-cyan'],
            ['  Mem[|||||||||||||||||||||||      9.42G/16.0G]   Load average: 0.42 0.51 0.48', 'term-cyan'],
            ['  Swp[                                  0K/2.00G]   Uptime: 14 days, 03:42:18', 'term-cyan'],
            ['', null],
            ['    PID USER       PRI  NI  VIRT   RES   SHR S CPU% MEM%   TIME+  Command', 'term-white'],
        ], 10);
        const procs = [
            ['1842', 'postgres', '20', '0', '4.21G', '892M', '12M', 'S', '12.4', '5.4', 'postgres: writer'],
            ['1843', 'postgres', '20', '0', '4.21G', '784M', '12M', 'S', '8.2', '4.8', 'postgres: walwriter'],
            ['2104', 'redis',    '20', '0', '892M',  '412M', '4M',  'S', '4.1', '2.5', 'redis-server *:6379'],
            ['2418', 'deploy',   '20', '0', '1.42G', '298M', '8M',  'R', '24.7', '1.8', 'node /var/www/api/dist/server.js'],
            ['2419', 'deploy',   '20', '0', '1.21G', '212M', '8M',  'S', '6.4', '1.3', 'node /var/www/api/dist/worker.js'],
            ['982',  'root',     '20', '0', '124M',  '24M',  '12M', 'S', '0.4', '0.1', 'nginx: master process'],
            ['983',  'www-data', '20', '0', '142M',  '18M',  '8M',  'S', '1.2', '0.1', 'nginx: worker process'],
            ['984',  'www-data', '20', '0', '142M',  '18M',  '8M',  'S', '1.4', '0.1', 'nginx: worker process'],
            ['1102', 'root',     '20', '0', '212M',  '42M',  '12M', 'S', '0.2', '0.3', '/usr/bin/dockerd'],
            ['3201', 'deploy',   '20', '0', '892M',  '184M', '8M',  'S', '2.8', '1.1', 'node /opt/n8n/bin/n8n'],
            ['4218', 'root',     '20', '0', '24M',   '4M',   '2M',  'S', '0.0', '0.0', '/usr/sbin/cron -f'],
            ['4219', 'root',     '20', '0', '32M',   '8M',   '4M',  'S', '0.1', '0.0', 'sshd: deploy [priv]'],
        ];
        for (const p of procs) {
            const line = p[0].padStart(7) + ' ' + p[1].padEnd(10) + p[2].padStart(3) + p[3].padStart(4) + ' '
                + p[4].padStart(6) + ' ' + p[5].padStart(5) + ' ' + p[6].padStart(4) + ' ' + p[7] + ' '
                + p[8].padStart(4) + ' ' + p[9].padStart(4) + ' ' + irand(0, 99) + ':' + time2(irand(0,59)) + '.' + time2(irand(0,99)) + ' ' + p[10];
            const cpu = parseFloat(p[8]);
            const cls = cpu > 20 ? 'term-yellow' : (cpu > 10 ? 'term-cyan' : null);
            await out_line(line, cls);
            await sleep(rand(8, 22));
        }
        await sleep(rand(800, 1400));
        await out_line('', null, 0);
        await out_line('F1Help  F2Setup  F3Search F4Filter F5Tree  F6SortBy F7Nice- F8Nice+ F9Kill  F10Quit', 'term-cyan');
        await sleep(rand(800, 1400));
    }

    async function sceneHexdump() {
        await typeCmd('xxd /usr/bin/ls | head -40');
        for (let row = 0; row < 32; row++) {
            const offset = (row * 16).toString(16).padStart(8, '0') + ':';
            let hexPart = '';
            let asciiPart = '';
            for (let g = 0; g < 8; g++) {
                hexPart += hex(2) + hex(2) + ' ';
            }
            for (let c = 0; c < 16; c++) {
                const r = irand(0, 255);
                asciiPart += (r >= 32 && r < 127) ? String.fromCharCode(r) : '.';
            }
            await out_line(offset + ' ' + hexPart + ' ' + asciiPart, 'term-dim');
            await sleep(rand(8, 22));
        }
        await sleep(rand(400, 800));
    }

    async function sceneDocker() {
        await typeCmd('docker ps');
        await out_line('CONTAINER ID   IMAGE                          COMMAND                  CREATED         STATUS         PORTS                                       NAMES', 'term-white');
        const containers = [
            ['8a4b2e9c1d22', 'nginx:1.25-alpine',          '"/docker-entrypoint.…"', '3 weeks ago',  'Up 14 days',  '0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp', 'web-proxy'],
            ['7f1e92c4abcd', 'postgres:15.4',              '"docker-entrypoint.s…"', '3 weeks ago',  'Up 14 days',  '0.0.0.0:5432->5432/tcp',                   'postgres'],
            ['9c2d4e8b1234', 'redis:7.2-alpine',           '"docker-entrypoint.s…"', '3 weeks ago',  'Up 14 days',  '0.0.0.0:6379->6379/tcp',                   'redis'],
            ['a4e5f9b2c1d3', 'app:latest',                 '"node dist/server.js"',  '2 hours ago',  'Up 2 hours',  '0.0.0.0:3000->3000/tcp',                   'app-1'],
            ['b5e6c8a1d4e2', 'app:latest',                 '"node dist/server.js"',  '2 hours ago',  'Up 2 hours',  '0.0.0.0:3001->3000/tcp',                   'app-2'],
            ['c6f7d9b2e5f3', 'n8nio/n8n:latest',           '"tini -- /docker-en…"',  '1 month ago',  'Up 14 days',  '0.0.0.0:5678->5678/tcp',                   'n8n'],
        ];
        for (const c of containers) {
            await out_line(
                c[0] + '   ' + c[1].padEnd(30) + ' ' + c[2].padEnd(24) + ' ' + c[3].padEnd(15) + ' ' + c[4].padEnd(14) + ' ' + c[5].padEnd(43) + ' ' + c[6],
                'term-cyan'
            );
            await sleep(rand(15, 40));
        }
        await sleep(rand(400, 700));

        await typeCmd('kubectl get pods -A');
        await out_line('NAMESPACE     NAME                                  READY   STATUS    RESTARTS   AGE', 'term-white');
        const pods = [
            ['kube-system', 'coredns-787d4945fb-2nxlk',           '1/1', 'Running', '0',  '14d'],
            ['kube-system', 'coredns-787d4945fb-5pmhd',           '1/1', 'Running', '0',  '14d'],
            ['kube-system', 'kube-apiserver-master-01',           '1/1', 'Running', '2',  '14d'],
            ['kube-system', 'kube-controller-manager-master-01',  '1/1', 'Running', '4',  '14d'],
            ['kube-system', 'kube-proxy-7xqvz',                   '1/1', 'Running', '0',  '14d'],
            ['kube-system', 'kube-scheduler-master-01',           '1/1', 'Running', '3',  '14d'],
            ['default',     'api-deployment-6d8f4c9b8d-2lmkn',    '1/1', 'Running', '0',  '2h'],
            ['default',     'api-deployment-6d8f4c9b8d-4xqrt',    '1/1', 'Running', '0',  '2h'],
            ['default',     'api-deployment-6d8f4c9b8d-9p2vw',    '0/1', 'CrashLoopBackOff', '12', '2h'],
            ['default',     'worker-deployment-58c7f4b9d8-2lmkn', '1/1', 'Running', '0',  '14d'],
            ['default',     'worker-deployment-58c7f4b9d8-4xqrt', '1/1', 'Running', '0',  '14d'],
            ['ingress',     'nginx-ingress-controller-2lmkn',     '1/1', 'Running', '0',  '14d'],
        ];
        for (const p of pods) {
            const cls = p[3].includes('Crash') ? 'term-red' : (p[3] === 'Running' ? 'term-green' : 'term-yellow');
            await out_line(
                p[0].padEnd(13) + p[1].padEnd(38) + p[2].padEnd(8) + p[3].padEnd(10) + p[4].padEnd(11) + p[5],
                cls
            );
            await sleep(rand(15, 40));
        }
        await sleep(rand(500, 900));
    }

    async function sceneTransition() {
        // Don't wipe the screen — let content keep scrolling. The viewport-overflow
        // pruner in newLine() handles the DOM size. Just a brief pause + spacer.
        await sleep(rand(400, 800));
        await out_line('', null);
    }

    // ---- Scene loop ------------------------------------------------------
    const scenes = [
        sceneSSH, sceneNpmInstall, sceneGit, sceneNmap, sceneTailLogs,
        sceneCompile, sceneScp, sceneHtop, sceneHexdump, sceneDocker,
    ];

    async function run() {
        // Boot banner
        await out_block([
            ['Last login: ' + isoDate() + ' ' + now() + ' on ttys001', 'term-dim'],
            ['', null],
        ], 80);

        let i = 0;
        // Forever loop. Browsers will gladly throttle this when tab is hidden,
        // and the FFSS RAFLoop visibility hooks aren't applicable here since
        // we use setTimeout-based pacing — but setTimeout itself throttles in
        // background tabs, which is fine for this aesthetic effect.
        while (true) {
            try {
                await scenes[i % scenes.length]();
                await sleep(rand(600, 1200));
                await sceneTransition();
            } catch (err) {
                console.error('Terminal scene error:', err);
                await sleep(2000);
            }
            i++;
            // Occasionally rotate the host to mix it up
            if (i % 4 === 0) {
                host = pick(['prod-app-01', 'dev-box', 'workstation', 'jumpbox', 'ci-runner-02']);
                user = pick(['pete', 'deploy', 'admin', 'root', 'devops']);
            }
        }
    }

    run();
}());
