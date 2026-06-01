# Project Context for Claude

## About the Developer
- **Name:** Peter Tarrant
- **Company:** Legit Figures (automation consultancy) / Indigenous Horizons Supplyworks (ihsworks.ca)
- **Location:** Brantford, Ontario, Canada
- **Experience:** 25+ years; full-stack web, PHP, automation, CRM integration

---

## Development Philosophy
- Prefer **targeted, incremental changes** over complete rewrites
- Discuss the implementation approach **before** writing code — don't dive in without a plan
- Favour **working within existing frameworks** rather than introducing new dependencies
- Keep solutions practical and maintainable; avoid over-engineering
- When multiple approaches exist, briefly outline the tradeoffs so I can choose

---

## Agent Orchestration

When working on new pages, features, or UI designs, use a two-agent approach and keep the roles cleanly separated:

### 🎨 UI Designer Agent
Responsible for everything the user sees:
- Page layout, component structure, and visual hierarchy
- HTML markup and CSS (global + page-specific files)
- Responsive/mobile-first behaviour
- Unsplash stock photography for any hero images, backgrounds, or placeholder visuals
- Typography, colour, spacing, and interaction states
- Does **not** write PHP logic, DB queries, or backend processing

**Do not use UserSpice's template/theme system for new UI work.** Build from scratch using custom HTML, CSS, and JS files. UserSpice's `securePage()` and PHP logic still apply, but the visual layer is fully custom — no template inheritance, no UserSpice layout wrappers, no theme variables. Link your own stylesheet and script files directly in the page `<head>`.

**Initial UI Redesign Scope**
When performing an initial redesign, the UI Designer agent is responsible for the following areas:

- **Site-wide navigation** — replace the default UserSpice nav with a custom layout appropriate to the project (logo, primary nav links, account dropdown)
- **Homepage** — a proper landing page or dashboard with a hero section (Unsplash imagery), key summary stats or highlights, and quick-action buttons
- **Core app pages** — refine layouts, improve visual hierarchy, and polish any filters, tables, or card views
- **Detail/form pages** — cleaner form layouts, better visual separation of sections (e.g. details, actions, activity)
- **Global look and feel** — colour palette, typography (Lexend), spacing, consistent component styling across all pages
- **Mobile/responsive** — ensure everything works well on phone screens
- **UserSpice core page overrides** — the following files must be copied from `users/` into `usersc/` and re-themed to match the new design. Never edit the originals in `users/` directly:
  - `users/login.php` → `usersc/login.php`
  - `users/account.php` → `usersc/account.php`
  - `users/user_settings.php` → `usersc/user_settings.php`
  - `users/join.php` → `usersc/join.php`
  - `users/forgot_password.php` → `usersc/forgot_password.php`

  Each override file keeps all existing PHP logic and UserSpice function calls intact — only the HTML structure and styling is replaced to match the new custom theme. Link the project's global CSS and JS in the `<head>` of each file, remove any UserSpice template wrapper calls, and rebuild the markup from scratch around the existing form logic.

**Unsplash image usage:**
Always source stock photography from Unsplash using direct embed URLs in this format:
```
https://images.unsplash.com/photo-{PHOTO_ID}?auto=format&fit=crop&w={WIDTH}&q=80
```
- Pick semantically appropriate photos for the context (office, nature, people, tech, etc.)
- Use realistic `w=` values based on the layout slot (e.g. `w=1200` for heroes, `w=600` for cards)
- Add `alt` text that describes the image content, not just "stock photo"
- Do not use Lorem Picsum, placeholder.com, or other generic placeholder services

### ⚙️ Back-End Engineer Agent
Responsible for everything behind the scenes:
- PHP logic, form processing, and data flow
- All database interactions via the UserSpice `DB` class
- UserSpice security patterns (`securePage`, `Input`, `Token`, `Validate`)
- API integrations (Method CRM, Brevo, N8N webhooks, etc.)
- Server-side validation, logging, and error handling
- Does **not** make layout or styling decisions

### Orchestration Rules
- **Always design first, then implement.** The UI Designer defines structure and markup; the Back-End Engineer wires in the logic.
- When both touch the same file (e.g. a PHP page with embedded HTML), the Designer owns the HTML/CSS blocks and the Engineer owns the PHP blocks — keep them visually separated with comments.
- If a design decision has backend implications (e.g. a filter UI that needs a DB query), flag it explicitly before writing either side.
- Present a brief plan identifying which agent handles which parts before writing any code.

---

## Default Tech Stack

### Backend
- **Language:** PHP (procedural or light OOP)
- **Framework:** UserSpice 5.8 (custom authentication/user management layer)
- **Database:** MySQL / MariaDB — use UserSpice's `DB` class (wraps PDO); never write raw PDO directly
- **Environment config:** `.env` via `phpdotenv` — never hardcode credentials
- **Logging:** Use a structured `logger()` function, not raw `error_log()`

### Frontend
- **HTML/CSS/JS** — vanilla preferred; jQuery acceptable where already in use
- Avoid introducing React/Vue unless explicitly requested
- **CSS:** Mobile-first, responsive; consolidate into `global.css` + page-specific files
- **Fonts:** Lexend (preferred), system-safe fallbacks
- No Bootstrap unless the project already uses it

### Server / Infrastructure
- **Server OS:** Ubuntu 24.04 LTS
- **Stack:** LAMP (Apache, MySQL, PHP)
- **Control panel:** Webmin / Virtualmin
- **Domain / DNS:** EasyDNS
- **Hosting:** RackNerd VPS or reseller cPanel accounts
- **Reverse proxy / SSL:** Caddy (for Docker services) or Let's Encrypt via Certbot

### Automation & Integrations
- **N8N** — workflow automation (self-hosted Docker)
- **Method CRM** — primary CRM; custom PHP integration via Guzzle (`MethodAPI` class)
- **Brevo** — email/marketing automation
- **QuickBooks Online** — accounting integration
- **IFTTT Pro+** — lightweight trigger automation

---

## File & Folder Conventions
- Config/credentials: `.env` in project root, never committed to git
- Webhooks: `/api/webhook/` directory
- Template/view files: keep logic out of templates; pass data in, render out
- CSS: `assets/css/global.css` for shared styles, `assets/css/[page].css` for page-specific
- JS: `assets/js/` — one file per concern, no monolithic scripts

---

## Code Style Preferences
- **PHP:** 4-space indent; single quotes for strings unless interpolation needed
- **HTML:** Semantic tags; no inline styles (use classes)
- **SQL:** Uppercase keywords; always use prepared statements; alias columns clearly
- **JS:** `const`/`let` only (no `var`); descriptive variable names
- Comment *why*, not *what* — assume the reader can read code
- No commented-out dead code in final output

---

## Database Conventions

### Schema
- Table names: `snake_case`, plural (e.g., `ihs_articles`)
- Primary key: `id` (auto-increment)
- Timestamps: `created_at`, `updated_at` (DATETIME)
- Soft deletes where appropriate: `deleted_at` nullable
- Always index foreign keys and columns used in WHERE clauses

### Database Patch File
All schema changes must be written to a single file: **`db/patch.php`**

This is a **PHP file** that runs schema changes through UserSpice's `DB` class. It must be **atomic and idempotent** — safe to run repeatedly on any environment without errors or duplicate data.

**File structure:**
```php
<?php
// db/patch.php — Run this file to apply all schema changes
// Safe to run multiple times — all statements are idempotent

require_once '../users/init.php';
$db = DB::getInstance();

// -----------------------------------------------------------
// v1.0: initial schema
// -----------------------------------------------------------

$db->query("
    CREATE TABLE IF NOT EXISTS `my_table` (
        `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
        `name`       VARCHAR(255) NOT NULL,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$db->query("ALTER TABLE `my_table`
    ADD COLUMN IF NOT EXISTS `status` TINYINT(1) NOT NULL DEFAULT 1");

$db->query("ALTER TABLE `my_table`
    ADD INDEX IF NOT EXISTS `idx_status` (`status`)");

// Idempotent seed insert
$db->query("
    INSERT INTO `my_table` (`name`)
    SELECT 'Default Record'
    WHERE NOT EXISTS (
        SELECT 1 FROM `my_table` WHERE `name` = 'Default Record'
    )
");

// -----------------------------------------------------------
// v1.1: example of adding a column to an existing table
// -----------------------------------------------------------

$db->query("ALTER TABLE `my_table`
    ADD COLUMN IF NOT EXISTS `notes` TEXT NULL");

echo 'Patch complete.';
```

**Rules:**
- Never use `ALTER TABLE ... ADD COLUMN` without `IF NOT EXISTS`
- Never use `CREATE TABLE` without `IF NOT EXISTS`
- Group related changes with a version comment header (e.g., `// v1.2: add user preferences table`)
- Always append to the bottom — never rewrite or reorder existing statements
- The patch file is the canonical migration record; keep it in version control
- Run it via browser or CLI: `php db/patch.php`
- Restrict access in production — add an admin permission check at the top if accessible via browser:
```php
if (!isset($user) || !$user->isLoggedIn() || !isAdmin()) { die('Access denied.'); }
```

### UserSpice DB Class — Required Patterns
All database work must use UserSpice's `DB` class. Do **not** write raw PDO.

**Getting the instance:**
```php
$db = DB::getInstance();          // standard — already available on most US pages
$db = DB::getInstance();          // inside functions, always call this
```

**Queries with placeholders (use `?` for values):**
```php
$db->query("SELECT * FROM users WHERE username = ? AND logins > ?", [$name, $logins]);
$results = $db->results();        // array of objects
$row     = $db->first();          // first row as object
$count   = $db->count();          // rows affected
```

**Shortcut selects:**
```php
$db->findAll('users');                              // SELECT * FROM users
$db->findById(5, 'users');                          // WHERE id = 5
$db->get('users', ['username', '=', 'admin']);      // custom condition
$name = $db->cell('users.username', 1);             // single value by id
$name = $db->cell('users.username', ['lname','=','Smith']);
```

**Insert / Update / Delete:**
```php
$db->insert('pages', ['name' => 'index.php', 'private' => 0]);
$db->update('users', 1, ['fname' => 'Adam']);       // update by id
$db->update('pages', ['name','LIKE','index%'], ['private' => 1]); // update by condition
$db->deleteById('permissions', 3);
$db->delete('permissions', ['name', '=', 'SuperAdmin']);
$last = $db->lastId();
```

**Condition array operators:** `=`, `<`, `>`, `<=`, `>=`, `<>`, `!=`, `LIKE`, `NOT LIKE`,
`IS NULL`, `IS NOT NULL`, `BETWEEN`, `NOT BETWEEN`, `IN`, `NOT IN`

**Compound conditions:**
```php
$db->get('users', ['and', ['logins', '>', 2], ['permissions', '=', 1]]);
```

**Multiple databases:**
```php
$db2 = DB::getDB(['otherDBname']);                  // same server, different DB
$db2 = DB::getDB(['host','dbname','user','pass']);  // full credentials inline
```

**Error checking:**
```php
if ($db->error()) { echo $db->errorString(); }
```

---

## UserSpice Patterns & APIs

### Page Security
Every custom page must call `securePage` at the top — this is non-negotiable:
```php
if (!securePage($_SERVER['PHP_SELF'])) { die(); }
```
This handles authentication checks and permission enforcement in one call.

### Current User Object
The `$user` object is available on all UserSpice pages:
```php
$user->isLoggedIn()                 // bool
$user->data()->username             // any column from the users table
$user->data()->id
$user->data()->email
$user->notLoggedInRedirect()        // redirect if not logged in
```

### Input Handling — Always Use the Input Class
Never access `$_POST` or `$_GET` directly. Use UserSpice's `Input` class:
```php
Input::exists()           // check if POST data exists
Input::exists('get')      // check if GET data exists
Input::get('username')    // get + sanitize a POST field
Input::sanitize($value)   // sanitize non-form data before DB storage
```

### CSRF Token Protection
All forms must include a CSRF token. Generate on page load, verify on submit:
```php
// In the form (generates hidden input automatically):
tokenHere();

// On form submit:
if (Token::check(Input::get('token'))) {
    // process form
}
```

### Validation (Validate Class)
```php
$validate = new Validate();
$validation = $validate->check($_POST, [
    'username' => ['required' => true, 'min' => 2, 'max' => 20],
    'email'    => ['required' => true],
]);
if ($validation->passed()) {
    // safe to proceed
} else {
    // $validation->errors() returns array of messages
}
```

### Session & Cookie Helpers
```php
Session::exists('key')
Session::get('key')
Session::put('key', 'value')
Session::delete('key')
Session::flash('key', 'value')   // single-use session value

Cookie::exists('name')
Cookie::get('name')
Cookie::put('name', 'value', 604800)  // name, value, expiry seconds
Cookie::delete('name')
```

### Hashing & Tokens
```php
Hash::make('string')          // SHA-256 hash
Hash::make('string', 'salt')  // salted SHA-256
Hash::unique()                // unique time-based hash (for tokens/keys)
```

### Logging
Use `logger()` — not `error_log()`. Writes to the UserSpice `logs` table:
```php
logger($user->data()->id, 'action_type', 'Description of what happened');
logger(0, 'guest_action', 'Someone did something', $optionalMetadata);
```

### Messaging
Use UserSpice's built-in message helpers (they use sessions automatically):
```php
usSuccess('Record saved successfully.');
usError('Something went wrong.');
usMessage('General message to display.');
```

### Permission Checks
```php
isAdmin()                          // user has permission level 2
hasPerm($groupId)                  // user group has a permission
checkPermission($permissionId)     // current user has permission
userHasPermission($userId, $permId)
```

### The `usersc` Folder — Customization Without Modifying Core
Never edit files in `users/` directly. Use the `usersc/` override system:
- **Custom functions** available site-wide → `usersc/includes/custom_functions.php`
- **Head tags / global CSS/JS** → `usersc/includes/head_tags.php`
- **Footer code** → `usersc/includes/footer.php`
- **Analytics** → `usersc/includes/analytics.php`
- **On login hook** → `usersc/scripts/custom_login_script.php`
- **On user creation** → `usersc/scripts/during_user_creation.php`
- **Override a core page** → copy `users/somefile.php` → `usersc/somefile.php`
- **Templates** → copy `usersc/templates/customizer/` to `usersc/templates/[project-slug]/` and customize from there — never edit `customizer` directly
- **Plugins** → `usersc/plugins/`
- **Widgets** → `usersc/widgets/`

When customizing templates or plugins, always copy the original to a new folder in `usersc/` — never edit the originals (updates will overwrite them).

### Custom Template Structure
When building a custom template, start by copying the default UserSpice `customizer` template:
```
cp -r usersc/templates/customizer/ usersc/templates/[project-slug]/
```
Then customize from there. Never edit `customizer` directly — it serves as the clean base for all new templates. The folder structure is:

```
usersc/templates/[project-slug]/
  header.php          -- <head> section: CSS variables, design system, all inline styles
  navigation.php      -- Top bar (if any) + main navbar
  container_open.php  -- Opens the main content wrapper: <div class="container py-4">
  container_close.php -- Closes it: </div>
  footer.php          -- Site footer + closes <body>
  info.xml            -- Template metadata
  assets/
    v2template.php    -- Marks this as a v2 template (required by UserSpice)
    template_name.php -- Template name override
```

**`info.xml` template metadata:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<template>
  <name>[Project Template Name]</name>
  <author>Custom</author>
  <version>1.0</version>
  <tested>6.0.6</tested>
  <features>
    <ultramenu>true</ultramenu>
    <dropdown_nav>true</dropdown_nav>
    <file_nav>true</file_nav>
    <bootstrap5>true</bootstrap5>
  </features>
</template>
```

**How a page loads using the template:**
```php
<?php
$template_override = '[project-slug]';
require_once 'users/init.php';
require_once $abs_us_root . $us_url_root . 'users/includes/template/prep.php';
?>

<!-- Page content goes here — already inside Bootstrap container -->

<?php require_once $abs_us_root . $us_url_root . 'users/includes/html_footer.php'; ?>
```

`prep.php` loads `header.php` → `navigation.php` → `container_open.php` in order.
`html_footer.php` triggers `footer.php` (which calls `container_close.php` internally).

**Breaking out of the container for full-width sections (e.g. heroes):**
```php
<?php require_once ... 'prep.php'; ?>
</div><!-- close the template container -->

<section class="hero-section">
  <!-- Full-width content -->
</section>

<div class="container py-4"><!-- reopen for remaining content -->
```

### Design System Conventions
All CSS lives in `header.php` as an inline `<style>` block — no separate stylesheet to manage. Use CSS custom properties on `:root` for the entire design system so rebranding only requires changing a handful of variables:

```css
:root {
  /* Brand colours */
  --brand-primary:       #[hex];
  --brand-primary-light: #[hex];
  --brand-primary-dark:  #[hex];
  --brand-primary-glow:  rgba([r],[g],[b], 0.15);
  --brand-secondary:     #[hex];
  --brand-bg:            #[hex];

  /* Neutrals */
  --gray-50:  #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-400: #9ca3af;
  --gray-600: #4b5563;
  --gray-800: #1f2937;

  /* Elevation */
  --shadow:    0 1px 3px rgba(0,0,0,0.10);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.10);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.10);
  --shadow-xl: 0 20px 25px rgba(0,0,0,0.10);

  /* Shape & Motion */
  --radius:     0.625rem;
  --transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Prefix all custom CSS classes** with a short project-specific prefix (e.g. `proj-`) to avoid collisions with Bootstrap utilities or UserSpice core styles.

### Navigation Conventions
The navigation file to modify is `usersc/templates/[project-slug]/navigation.php` — this is copied from the `customizer` template base and is where all navbar customization happens.

Build the navbar as a **hardcoded Bootstrap 5 navbar** with PHP auth conditionals — do not use UserSpice's database-driven menu system, as it limits markup control:

```php
<?php if (isset($user) && $user->isLoggedIn()) { ?>
    <!-- Logged-in nav items: account link, admin dropdown (if admin), logout -->
    <?php if (hasPerm([2])) { ?>
        <!-- Admin dropdown: links to admin.php?view=users, etc. -->
    <?php } ?>
<?php } else { ?>
    <!-- Logged-out nav items: Login link, Sign Up button -->
<?php } ?>
```

Always use `$us_url_root` for all hrefs so links work regardless of subdirectory install:
```php
<a href="<?= $us_url_root ?>users/login.php">Login</a>
<a href="<?= $us_url_root ?>">Home</a>
```

### Registering New Pages in the Database
Every new page must be registered in the UserSpice `pages` table:
```sql
INSERT INTO pages (page, title, private, re_auth, core)
VALUES ('my-page.php', 'My Page Title', 0, 0, 0);
```
- `private = 0` → public (no login required)
- `private = 1` → login required
- `re_auth = 1` → forces password re-entry
- `core = 0` → custom page (not a UserSpice core page)

Add this to `db/patch.php` using the `WHERE NOT EXISTS` pattern so it's idempotent.

---

## Security Defaults
- Every page starts with `if (!securePage($_SERVER['PHP_SELF'])) { die(); }`
- All form input goes through `Input::get()` / `Input::sanitize()` — never raw `$_POST`/`$_GET`
- All forms include `tokenHere()` and verify with `Token::check()`
- UserSpice `DB` class handles parameterization — never concatenate user input into queries
- File uploads: validate MIME type, restrict extensions, store outside webroot
- No sensitive data in URLs or client-side JS
- `.env` excluded via `.gitignore`

---

## What to Avoid
- Rewriting working code unless there's a clear reason
- Switching frameworks mid-project without discussion
- Adding npm/composer dependencies without flagging them
- Generating large blocks of boilerplate without explanation
- Assuming the goal — ask if the intent isn't clear

---

## Project-Specific Notes
<!-- Replace or extend this section per project -->
- **Project name:** [PROJECT NAME]
- **Domain:** [DOMAIN]
- **Purpose:** [BRIEF DESCRIPTION]
- **Live URL:** [URL]
- **DB name:** [DB_NAME]
- **Key tables:** [LIST]
- **Special integrations:** [e.g., Method CRM, N8N webhook, etc.]
- **Notes:** [Anything else Claude should know about this specific project]
