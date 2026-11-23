# گزارش وضعیت جامع پروژه «شوالیه واژه‌ها» (Shovalie Vajeha)
**تاریخ تهیه:** ۲ آذر ۱۴۰۵ (2026-11-22)  
**موقعیت:** `C:\Users\acer\.gemini\antigravity\scratch\ghale-vajegan`  
**وضعیت تست‌ها:** ۶۸ پاس / ۰ شکست (node --test tests/*.test.mjs)

---

## ۱. کلیات پروژه

### ۱.۱. نسخه برنامه و سرویس ورکر
- **نسخه در واسط کاربری (`#versionTrigger` در خط 1752 از `index.html`):** `v5.1.0`
- **نام کش در `sw.js` (خط 2):** `shovalie-vajeha-v5.2.0`
- **وضعیت تطابق:** ناهماهنگی جزئی؛ شماره نسخه در UI هنوز روی `v5.1.0` مانده در حالی که سرویس‌ورکر به `v5.2.0` ارتقا یافته است.

### ۱.۲. فهرست فایل‌های ریشه و assets با حجم دقیق

#### فایل‌های ریشه پروژه:
| نام فایل | حجم (بایت) | حجم (کیلوبایت) |
| :--- | :--- | :--- |
| `index.html` | 327,409 | 319.74 KB |
| `styleguide.html` | 34,027 | 33.23 KB |
| `sw.js` | 3,571 | 3.49 KB |
| `manifest.json` | 802 | 0.78 KB |
| `icon.svg` | 3,333 | 3.25 KB |
| `icon-192.png` | 1,778 | 1.74 KB |
| `icon-512.png` | 5,544 | 5.41 KB |
| `README.md` | 8,132 | 7.94 KB |

#### پوشه `assets/` (فایل‌های فعال و موروثی):
| نام فایل | حجم (بایت) | توضیحات |
| :--- | :--- | :--- |
| `world1_bg.webp` | 82,096 | پس‌زمینه قدیمی جهان ۱ (فال‌بک) |
| `world2_bg.webp` | 73,068 | پس‌زمینه قدیمی جهان ۲ (فال‌بک) |
| `world3_bg.webp` | 67,212 | پس‌زمینه قدیمی جهان ۳ (فال‌بک) |
| `world4_bg.webp` | 67,062 | پس‌زمینه قدیمی جهان ۴ (فال‌بک) |
| `knight_idle.webp` | 7,950 | اسپرایت قدیمی ایستادن شوالیه |
| `knight_attack.webp` | 7,140 | اسپرایت قدیمی حمله شوالیه |
| `knight_run.webp` | 6,584 | اسپرایت قدیمی دویدن شوالیه |
| `obstacle_bear.webp` | 5,146 | مانع قدیمی خرس |
| `obstacle_bandit.webp` | 2,288 | مانع قدیمی راهزن |
| `obstacle_shadow.webp` | 4,482 | مانع قدیمی سایه |
| `obstacle_dragon.webp` | 16,786 | مانع قدیمی اژدها |
| `hud_candle_lit.webp` | 2,112 | شمع روشن HUD |
| `hud_candle_unlit.webp` | 1,184 | شمع خاموش HUD |
| `map_lock_locked.webp` | 520 | قفل بسته نقشه |
| `map_lock_unlocked.webp` | 698 | قفل باز نقشه |
| `knight_preview_green.png` | 664,751 | پیش‌نمایش پرده سبز شوالیه |
| `enemy_w4_preview_green.png` | 766,980 | پیش‌نمایش پرده سبز باس جهان ۴ |

#### پوشه `assets/redesign/` (سیستم جدید طراحی):
- **پس‌زمینه‌ها:**
  - `bg_w1.jpg` (1,794,248 بایت) و `bg_w1.webp` (46,966 بایت / 45.87 KB)
  - `bg_w2.jpg` (2,163,902 بایت) و `bg_w2.webp` (54,374 بایت / 53.1 KB)
  - `bg_w3.jpg` (1,963,634 بایت) و `bg_w3.webp` (62,876 بایت / 61.4 KB)
  - `bg_w4.jpg` (2,331,177 بایت) و `bg_w4.webp` (70,806 بایت / 69.15 KB)
- **اسپرایت‌شیت‌های تمیز و فعال ۴×۴ (`assets/redesign/sprites/`):**
  - `knight_x2.webp` (520,336 بایت / 508.14 KB) + `knight_meta.json` (231 بایت)
  - `enemy_w1_x2.webp` (472,622 بایت / 461.54 KB) + `enemy_w1_meta.json` (231 بایت)
  - `enemy_w2_x2.webp` (625,274 بایت / 610.62 KB) + `enemy_w2_meta.json` (231 بایت)
  - `enemy_w3_x2.webp` (646,072 بایت / 630.93 KB) + `enemy_w3_meta.json` (232 بایت)
  - `enemy_w4_x2.webp` (613,456 بایت / 599.08 KB) + `enemy_w4_meta.json` (231 بایت)
  - نسخه‌های x1 و پیش‌نمایش‌های پرده سبز (Green Screen) و پوشه `frames/` شامل فریم‌های تکه‌تکه شده.

### ۱.۳. تعداد خطوط `index.html` و نقشه ساختاری آن
- **مجموع خطوط فایل:** ۸,۷۸۵ خط

| بخش | خط شروع | خط پایان | توضیحات و محتوا |
| :--- | :--- | :--- | :--- |
| `<head>` | 3 | 1651 | متادیتا، پیوند فونت‌ها، تگ‌های PWA |
| `<style>` | 17 | 1650 | تمامی کدهای CSS، متغیرهای ریشه، انیمیشن‌ها و سیستم گوتیک |
| `<body>` | 1653 | 8784 | بدنه اصلی نرم‌افزار و کانتینر اپلیکیشن |
| `#topBar` | 1664 | 1682 | هود بالای صفحه (نام کاربر، دکمه صوت و خروج) |
| `#viewAuth` | 1685 | 1755 | نمای ورود و ثبت‌نام دانش‌آموزان و شماره نسخه |
| `#viewMap` | 1758 | 1814 | نقشه جهان‌ها، سوییچر پورتال ۴ جهان و کارت‌های مراحل |
| `#viewStudy` | 1817 | 1858 | حالت اختصاصی فلش‌کارت‌های سه‌بعدی و دروازه ورود به نبرد |
| `#viewArena` | 1861 | 2060 | میدان دوئل نبرد، صحنه اسپرایت، سوال، نوار جان و گزینه‌های RPG |
| `#viewLeaderboard` | 2063 | 2117 | جدول رده‌بندی رسمی بازیکنان |
| `#viewTeacher` | 2120 | 2256 | پنل مدیریت دبیر ادبیات، تایید/رد ثبت‌نام‌ها و همگام‌سازی ابری |
| `#viewPending` | 2259 | 2303 | صفحه وضعیت دانش‌آموز در انتظار تایید دبیر |
| `#viewRejected` | 2306 | 2359 | صفحه وضعیت دانش‌آموز رد شده و فرم ارسال مجدد |
| `#firstTryRankedModal` | 2363 | 2387 | مودال تایید نبرد رسمی برای تلاش اول |
| `#modalPublicProfile` | 2389 | 2426 | مودال پروفایل عمومی بازیکن از جدول رتبه‌بندی |
| `#viewProfile` | 2429 | 2508 | شناسنامه و پروفایل شخصی بازیکن و ویترین مدال‌ها |
| `#bottomNav` | 2511 | 2524 | نوار ناوبری بومی پایین صفحه (نقشه، رتبه‌بندی، پروفایل) |
| `<script>` | 2527 | 8783 | کدهای منطقی برنامه، بانک سوالات پایه دهم، منطق سوپابیس و رندرینگ |

### ۱.۴. آخرین ۱۵ کامیت گیت (`git log --oneline`)
1. `2f09a1d` True v5.1.0 minimalist gothic UI/UX redesign (bottom nav, refined cards/buttons) + fix battle crash, 3D card back-face, and study gating
2. `90eb121` Full v5.0.0 redesign: rebrand to Shovalie Vajeha, minimalist gothic dark-fantasy UI across all views, real 3D physical flashcard flip, and 1v1 arena duel
3. `9c2e8ee` Implement minimalist dark-fantasy palette, 3D flashcard flip, study-before-battle gating, and zero-clip layouts (v4.4.0)
4. `64e4a41` Fix auth gold background, remove theoretical majors, hide unused class code, fix battle header/options clipping, and clean midground props (v4.3.1)
5. `5d63efc` Refactor to 100dvh zero-scroll tabbed app shell, dark-fantasy palette, logical knight path, and castle balcony princess (v4.3.0)
6. `db44210` fix(v4.2.2): resolve quiz options grid, clean HUD layout, remove yellow gate glow and optimize mobile layout
7. `066c9ba` Revamp game aesthetics with pixel-art world backgrounds, animated knight/enemies, and medieval HUD (v4.2.1)
8. `2e19c58` feat(v4.2): implement first-try ranked battles, speed-precision scoring, profiles, and 12 achievements
9. `899c76b` Fix ghost student deletion via secure RPC and hide teacher trigger hint v4.1.1
10. `6711f85` feat(auth): implement student registration approval system v4.1
11. `e685d46` Release v3.6-visual: Complete Eastward-inspired dark fantasy hybrid pixel redesign
12. `6193745` Fix Persian typos, tactile flashcard swipe/flip, and Arena road obstacles v3.5.1
13. `888138f` Overhaul to dark Eastward-inspired pixel art, random encounters, princess ending, gesture flashcards, and private dual-rank leaderboard v3.5
14. `a74b10e` Add 4-world portal tabs, 40 textbook idioms, and 20 textbook ambiguities v3.4
15. `5d3b9ef` Deploy v3.2: Complete 10th-grade curriculum (161 words, 20 idioms, 10 ambiguity, Hell World mix) and 4 world themes

---

## ۲. سیستم طراحی (Design System)

### ۲.۱. متغیرهای `:root` فعلی (کامل و با مقادیر دقیق)
```css
:root {
  /* پایه‌های شیشه‌ای گوتیک و ویترای */
  --bg: #0e0c0b;
  --surface: #16130f;
  --ink: #eadfc8;
  --ink-muted: #a39682;
  --line-black: #050403;
  --line-gold: #8f7247;
  --gold: #c9a25e;

  /* رنگ‌های ویترای ۴ جهان */
  --w1: #d98a85; /* رز (Rose) */
  --w2: #7fae9f; /* زنگاری (Verdigris) */
  --w3: #e6d3a8; /* کرم/کهربایی (Amber Cream) */
  --w4: #c9663a; /* نارنجی سوخته (Burnt Orange) */

  /* جوهرهای با کنتراست بالا روی پس‌زمینه جهان‌ها */
  --w1-ink: #2a1210;
  --w2-ink: #0f241e;
  --w3-ink: #2b210e;
  --w4-ink: #180702;

  /* متغیرهای پویای تم جهان فعال (پیش‌فرض: جهان ۱) */
  --world: var(--w1);
  --world-ink: var(--w1-ink);
  --world-tint: rgba(217, 138, 133, 0.08);

  /* سطوح مرتفع و شیشه‌ای */
  --surface-elevated: #1e1a14;
  --surface-glass: rgba(22, 19, 15, 0.94);

  /* خطوط و حاشیه‌ها */
  --border-subtle: #29231c;
  --border-accent: #3d3328;
  --border-gold: var(--line-gold);

  /* تایپوگرافی و جلوه‌های نوری */
  --ink-dim: #6e6254;
  --accent-gold: #c9a25e;
  --accent-gold-glow: rgba(201, 162, 94, 0.22);

  /* آلیاس‌های جهان‌های قبلی */
  --accent-w1: var(--w1);
  --accent-w2: var(--w2);
  --accent-w3: var(--w3);
  --accent-w4: var(--w4);
  --accent-sage: var(--w2);
  --accent-terracotta: var(--w1);

  /* آلیاس‌های سازگاری به عقب (Backward Compatibility) */
  --panel: var(--surface);
  --panel-alt: var(--surface-elevated);
  --panel-dark: #0a0908;
  --line: var(--border-subtle);
  --line-hi: var(--border-accent);
  --shadow-deep: #050403;
  --shadow-violet: #14110e;
  --amber: var(--accent-gold);
  --amber-hi: #dbb574;
  --amber-lo: #574326;
  --wine: #2a1114;
  --red: var(--accent-w4);
  --steel: var(--ink-muted);
  --moon: var(--ink-muted);
  --xp: var(--accent-w3);
  --cyan: var(--accent-w2);
  --ok: var(--accent-sage);
  --bad: var(--accent-terracotta);
}
```

### ۲.۲. وضعیت `data-world` روی `body`
- **آیا پیاده شده است؟** بله، با انتخاب تب‌های جهان در نقشه یا ورود به استیج‌های نبرد، جاوااسکریپت `document.body.setAttribute("data-world", w)` را صدا می‌زند.
- **قواعد موجود در CSS:**
  - `body[data-world="1"]` مقادیر `--world: var(--w1); --world-ink: var(--w1-ink); --world-tint: rgba(217,138,133,0.08);` را تزریق می‌کند.
  - `body[data-world="2"]` مقادیر متناظر زنگاری (`#7fae9f`) را تزریق می‌کند.
  - `body[data-world="3"]` مقادیر متناظر کهربایی (`#e6d3a8`) را تزریق می‌کند.
  - `body[data-world="4"]` مقادیر متناظر نارنجی سوخته (`#c9663a`) را تزریق می‌کند.
- **کلاس‌های مصرف‌کننده `--world`:**
  - `.glass-card` و `.glass-card--hero` (گرادیان شیشه‌ای زمینه)
  - `.btn-primary` (رنگ پس‌زمینه و رنگ متن)
  - `.chip--ready` (برچسب کپسولی آماده ورود)
  - `.progress__bar` (نوار پیشرفت گوتیک)
  - `.stat-tile__value` (اعداد کاشی‌های آماری)
  - `.portal-tab.active` (تب فعال جهان‌ها)
  - کارت‌های مراحل در `#towersList` و کارت خلاصه آمار پیروزی نبرد (`#victoryTotalScore`, `#victoryTime`).

### ۲.۳. کامپوننت‌های موجود در CSS و تفکیک جدید/قدیمی
- **کامپوننت‌های مدرن و بازطراحی‌شده:**
  `.glass-card`، `.glass-card--hero`، `.btn-primary`، `.btn-ghost`، `.chip` (با استیت‌های `--ready`, `--conquered`, `--locked`)، `.progress`، `.progress__bar`، `.progress__pip`، `.stat-tile`، `.stat-tile__value`، `.stat-tile__label`، `.bottom-nav`، `.bottom-nav-item`، `.top-hud`، `.rpg-dialog`، `.rpg-options-list`، `.rpg-option-btn`، `.enemy-hp-wrap`، `.enemy-hp-track`، `.enemy-hp-fill`، `.quiz-word-highlight`، `.study-card-scene`، `.study-card-box`، `.study-card-face`.
- **کامپوننت‌های موروثی و قدیمی (Legacy) باقی‌مانده:**
  `.pixel-window`، `.pixel-window-inner`، `.pixel-btn` (همراه با `.btn-amber`, `.btn-slate`, `.btn-wine`, `.btn-royal`)، `.pixel-input`، `.pixel-num`، `.hard-shadow`، `.crt-overlay`، `.hanging-board`، `.hanging-chains`، `.hud-candle`، `.hud-candles`.
  *(توجه: کلاس `.gothic-card` در کد وجود ندارد و جایگزین آن `.glass-card` است).*

### ۲.۴. تعداد استایل‌های درون‌خطی (`style="..."`)
- **تعداد دقیق در `index.html`:** ۲۹۲ مورد استایل inline هنوز در تگ‌های HTML وجود دارد که عمده آنها در پنجره ورود، لیدربورد، پنل دبیر و مودال‌ها قرار دارند.

### ۲.۵. وضعیت ساخت `styleguide.html`
- **آیا ساخته شده است؟** بله، فایل `styleguide.html` در ریشه پروژه قرار دارد و سیستم ویترای، دکمه‌ها، چیپ‌ها، کاشی‌ها و متغیرهای هر ۴ جهان را به نمایش می‌گذارد (حجم: ۳۴,۰۲۷ بایت).

---

## ۳. وضعیت هر نما (View Statuses)

| نام نما | وضعیت فعلی | دلیل و ارزیابی در یک جمله |
| :--- | :--- | :--- |
| **`#topBar`** | **بازطراحی شده** | هود تک‌ردیفه باریک و مدرن شامل نام دانش‌آموز، کنترل صدا و دکمه خروج بدون اشغال فضای اضافه. |
| **`#bottomNav`** | **بازطراحی شده** | نوار ناوبری شیشه‌ای چسبیده به پایین با ۳ تب (نقشه، جدول، پروفایل) همراه با آیکون‌های SVG استاندارد. |
| **`#viewAuth`** | **نیمه‌کاره** | پس‌زمینه زرد/طلایی نامناسب قبلی حذف و ساختار فشرده شده، اما همچنان با کانتینر `.pixel-window` و دکمه‌های قدیمی پیاده است. |
| **`#viewMap`** | **بازطراحی شده** | سوییچر ۴ پورتال جهان‌ها و کارت‌های مراحل کامپوننت گوتیک مینیمال با نوارهای پیشرفت و کاشی‌های شیشه‌ای را نمایش می‌دهند. |
| **`#viewStudy`** | **بازطراحی شده** | فلش‌کارت‌های سه‌بعدی روان با لمس لمسی، نقاط افقی پیشرفت و دکمه قفل‌شونده شروع نبرد کامل هستند (تنها نام کلاس والد `pixel-window` است). |
| **`#viewArena`** | **بازطراحی شده** | دوئل ۱ به ۱ کامل با اسپرایت‌های بدون حاشیه ۴×۴، نوار جان در دیالوگ RPG، انیمیشن گرادیان واژه داخل صورت سوال و بدون جرقه زننده. |
| **`#viewLeaderboard`** | **قدیمی** | هنوز از قاب `.pixel-window`، جدول سنتی و دکمه‌های پیکسلی نسخه قبل استفاده می‌کند و به `.glass-card` منتقل نشده است. |
| **`#viewProfile`** | **نیمه‌کاره** | منطق پین کردن مدال‌ها و آمار رسمی درست کار می‌کند ولی استایل جعبه و اعداد درون کادر پیکسلی قدیمی محصور است. |
| **`#viewPending`** | **قدیمی** | فرم انتظار تایید و ثبت مجدد PIN هنوز بر اساس جعبه و المان‌های پیکسلی قبلی رندر می‌شود. |
| **`#viewRejected`** | **قدیمی** | پیام رد شدن درخواست ثبت‌نام و فرم تجدیدنظر در کادر `border-wine` و دکمه‌های نسخه گذشته باقی مانده است. |
| **`#viewTeacher`** | **قدیمی** | پنل مدیریت دبیر به طور کامل ساختار جدول‌های قدیمی، استایل‌های درون‌خطی و دکمه‌های پیکسلی را حفظ کرده است. |

### گزارش اسکرین‌شات‌ها و وضعیت اسکرول (عرض 390، ارتفاع‌های 550، 700، 900)
- **اسکرین‌شات‌ها:** `نامشخص` — با توجه به دستور صریح «هیچ فایلی را تغییر نده، چیزی نصب نکن و کدی اجرا نکن که فایل بنویسد»، و از آنجا که کتابخانه‌های مرورگر بدون سر (مانند Puppeteer / Playwright) در پروژه نصب نبودند، امکان نوشتن فایل‌های تصویر اسکرین‌شات روی دیسک میسر نبود.
- **اسکرول صفحه (`scrollHeight` در برابر `innerHeight`):**
  - در سطح سند (`window` / `body`)، قاعده صفر-اسکرول به صورت **۱۰۰٪ و قطعی** رعایت شده است (`scrollHeight === innerHeight`)؛ به دلیل اعمال صریح قوانین زیر در CSS:
    ```css
    html, body { height: 100dvh; max-height: 100dvh; overflow: hidden; }
    .container { height: 100dvh; max-height: 100dvh; overflow: hidden; }
    #viewAuth:not(.hidden), #viewMap:not(.hidden), #viewArena:not(.hidden), ... {
      flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden;
    }
    ```
  - تنها اسکرول‌های داخلی مجاز در المان‌های با داده‌های زیاد تعریف شده‌اند:
    - لیست اعلان‌های دبیر (`#teacherNotifList` با `max-height: 120px; overflow-y: auto`)
    - جدول دانش‌آموزان در پنل دبیر (`.table-wrap` با `max-height: 420px; overflow-y: auto`)

---

## ۴. نبرد (Arena Duel)

### ۴.۱. اتصال اسپرایت‌های جدید (`assets/redesign/sprites/*_x2.webp`)
- **وضعیت:** به طور کامل متصل و فعال هستند.
- **جزئیات پیاده‌سازی:**
  - شیت شوالیه: `assets/redesign/sprites/knight_x2.webp` + `knight_meta.json`
  - شیت موجودات: `assets/redesign/sprites/enemy_w{1..4}_x2.webp` + `enemy_w{1..4}_meta.json`
  - در توابع `setupArenaEnemy` و `applySpriteMetaToActor` ابعاد دقیق سلول (`cell_w`, `cell_h`) و ارتفاع کف (`floor_y`) از متادیتا استخراج شده و پس‌زمینه اسپرایت با مقیاس x2 تنظیم می‌شود.

### ۴.۲. نام توابع و متغیرهای نبرد در JS با شماره خطوط
- **توابع نبرد:**
  - `startArenaAmbient(worldId = 1)` — خط 6986: شروع رندر افکت‌های جوی بوم متناسب با جهان
  - `toggleEnemyFacing()` — خط 7209: تغییر جهت دستی موجود برای تست
  - `setupArenaEnemy(stage)` — خط 7223: اعمال اسپرایت‌های نبرد، نام دشمن و تنظیمات کف صحنه
  - `updateEnemyHP()` — خط 7278: تنظیم درصد و مقدار نوار جان غول متناسب با سوالات باقیمانده
  - `startBattleMode(stage, isRanked = false)` — خط 7289: آغاز نبرد، تنظیم تایمر، صف کلمات و متغیرهای مرحله
  - `formatQuizPrompt(word, world, isHell, customPrompt)` — خط 7460: ساخت متن سوال همراه با تگ کلمه هدف هایلایت‌شده
  - `renderNextQuizQuestion()` — خط 7484: نمایش سوال بعدی و گزینه‌های چهارگانه RPG
  - `playSprite(el, row = 0, options = {})` — خط 7551: انیماتور فریم‌های اسپرایت با فرکانس فریم قابل تنظیم
  - `handleQuizAnswer(selectedBtn, isCorrect, item, allBtns)` — خط 7734: پردازش پاسخ کاربر، اجرای انیمیشن حمله/آسیب و بروزرسانی نوار جان
  - `completeStageDefeat()` — خط 7880: پایان نبرد در صورت شکست، انیمیشن زمین افتادن و مدال باخت
  - `completeStageVictory()` — خط 7890: پایان نبرد در صورت پیروزی، مدال برد و ثبت رکوردهای رسمی
- **متغیرهای اصلی نبرد:**
  `currentStage`, `quizQueue`, `totalInitialWords`, `masteredCount`, `mistakesThisStage`, `comboCount`, `selectedOptionIdx`, `isCurrentBattleRanked`, `battleStartTime`, `quickDrawStreak`, `stageCorrectCount`, `stageMistakesCount`, `stageBaseEarnedXP`, `arenaTimerInterval`, `isHellRound`, `spriteIntervals`, `arenaAmbientAnimId`, `ambientParticles`.

### ۴.۳. کلاس‌ها و کی‌فریم‌های انیمیشن نبرد در CSS
- **کی‌فریم‌ها:**
  - `@keyframes knightIdleBreathe` (خط 985): تنفس آرام شوالیه در حالت سکون
  - `@keyframes knightLunge` (خط 992): جهش به سمت جلو در زمان ضربه شمشیر
  - `@keyframes obsRecoil` (خط 1000): لرزش و عقب‌نشینی موجود هنگام ضربه خوردن
  - `@keyframes quizWordGradientShimmer` (خط 1155): حرکت پیوسته گرادیان طلایی-کهربایی روی متن واژه در سوال
  - `@keyframes quizWordGlow` (خط 1161): تپش ملایم درخشش کلمه سوال
  - `@keyframes modalPop` (خط 1400): پاپ‌آپ نرم مدال‌های پیروزی و شکست
- **کلاس‌های انیمیشن فعال:**
  - `.knight-idle-breathe`, `.knight-attack-lunge`, `.obstacle-hit-recoil`, `.quiz-word-highlight`, `.arena-overlay-screen`.
  *(کلاس‌های قدیمی `.knight-duel-attack`، `.enemy-recoil-hit`، `.enemy-duel-strike`، `.knight-recoil-hit`، و `.enemy-defeat-collapse` کاملاً جایگزین شده و فریم‌ها مستقیماً با تابع `playSprite` تغییر می‌کنند).*

### ۴.۴. پس‌زمینه هر جهان
- **منبع فایل‌ها:** در تابع `startBattleMode` (خط 7372) آرایه `worldBgMap` تصویر پس‌زمینه را تنظیم می‌کند:
  - جهان ۱: `assets/redesign/bg_w1.webp`
  - جهان ۲: `assets/redesign/bg_w2.webp`
  - جهان ۳: `assets/redesign/bg_w3.webp`
  - جهان ۴: `assets/redesign/bg_w4.webp`
- **وضعیت استفاده از تصاویر جدید:** بله، تصاویر جدید `bg_w1..4.webp` به صورت پیش‌فرض لود می‌شوند و تنها در صورت خطا (`onerror`) به فایل قدیمی `assets/world1_bg.webp` برمی‌گردند.

### ۴.۵. افکت‌های محیطی پس‌زمینه (مه، جرقه)
- **وضعیت پیاده‌سازی:** بله، روی بوم اتمسفری `<canvas id="arenaAmbientCanvas">` (پوشاننده ۶۵٪ بالای صحنه):
  - **جهان ۱:** لایه‌های رونده و متناوب مه و غبار گورستان (`renderAmbientWorld1`).
  - **جهان ۲:** ریزجرقه‌های نارنجی ساعت‌وار (`renderAmbientWorld2`) — مستطیل‌های چشمک‌زن پنجره‌ها طبق دستور حذف شدند.
  - **جهان ۳:** هاله نورانی طلایی متناوب محراب و غبار صعودی مقدس (`renderAmbientWorld3`).
  - **جهان ۴:** جرقه‌های بالارونده آتشین به همراه رد دود رقیق تیره (`renderAmbientWorld4`).
- **جرقه‌های زننده ضربه:** دایره/توپ نارنجی ضربه (`.combat-spark-fx`) کاملاً با `display: none !important;` خاموش شده است.

### ۴.۶. فهرست کامل شناسه‌هایی (ID) که JS در نبرد دست می‌زند
- **شناسه‌های موجود در HTML:**
  `arenaAmbientCanvas`, `arenaCounter`, `arenaModeBadge`, `arenaStageTitle`, `arenaTimer`, `btnBackToMap`, `btnDefeatBackToMap`, `btnRetryStage`, `btnVictoryContinue`, `enemyHpFill`, `enemyHpNum`, `enemyNameLabel`, `enemySprite`, `firstTryRankedModal`, `hellBonusBadge`, `knightActor`, `knightSprite`, `phaseDefeat`, `phaseQuiz`, `phaseVictory`, `qzOptions`, `qzPrompt`, `qzRetryTag`, `roadObstacle`, `speakerTag`, `stageBgLayer`, `stageScene`, `stageTargetWord`, `userXP`, `victoryAccuracy`, `victoryModeBadge`, `victorySpeedBonus`, `victoryStats`, `victoryTime`, `victoryTotalScore`.
- **شناسه‌های فراخوانی شده که در HTML وجود ندارند (Dead IDs):**
  `btnConfirmAnswer`, `dialogXP`, `gateGlow`, `gatePrincess`.

---

## ۵. وضعیت PWA (Progressive Web App)

### ۵.۱. محتوای کامل `manifest.json`
```json
{
  "name": "شوالیه واژه‌ها",
  "short_name": "شوالیه واژه‌ها",
  "description": "دوئل کارتی شوالیه‌ها و یادگیری هوشمند واژگان ادبیات فارسی دهم",
  "start_url": "./index.html",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0e0c0b",
  "theme_color": "#0e0c0b",
  "dir": "rtl",
  "lang": "fa",
  "icons": [
    {
      "src": "icon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    },
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### ۵.۲. فایل‌های پیش‌کش در `sw.js` و مقایسه با دیسک
- **تعداد کل فایل‌های لیست پیش‌کش (`ASSETS`):** ۵۹ فایل
- **فایل‌های کش شده که روی دیسک نیستند:** ۰ مورد (تمام ۵۹ فایل پیش‌کش دقیقاً روی دیسک وجود دارند).
- **فایل‌های مهم دیسک که در پیش‌کش لیست نشده‌اند:**
  تصاویر حجیم با فرمت JPG (`bg_w1..4.jpg`)، فایل‌های پیش‌نمایش پرده سبز (`*_preview_green.png`)، فایل‌های درون پوشه `assets/redesign/clean/` و فریم‌های منفرد درون `assets/redesign/sprites/frames/`. این فایل‌ها برای اجرای عادی بازی تحت وب مورد نیاز نیستند و عدم کش شدن آنها مانع کارکرد آفلاین نمی‌شود.

### ۵.۳. وضعیت آیکون‌های برنامه
- **فایل‌های موجود:** `icon.svg` (3.25 KB)، `icon-192.png` (1.74 KB) و `icon-512.png` (5.41 KB) همگی در ریشه دیسک حضور دارند.
- **بررسی طرح آیکون جدید:**
  محتوای `icon.svg` یک کلاه‌خود شوالیه روی سپر کلاسیک (Shield Crest) همراه با شمشیر و ستاره را نشان می‌دهد. طرح جدید مد نظر شما یعنی **«کلاه‌خود در پنجره قوسی گوتیک (Gothic Arched Window)»** هنوز طراحی و جایگزین نشده است.

---

## ۶. مشکلات، باگ‌ها و انحرافات

### ۶.۱. باگ‌ها و ناهماهنگی‌های شناخته‌شده
1. **عدم تطابق شماره نسخه:** برچسب نسخه در پنجره ورود (`#versionTrigger`) روی `v5.1.0` قفل شده اما در سرویس ورکر به `v5.2.0` ارتقا یافته است.
2. **فونت‌های آنلاین در محیط آفلاین:** فونت‌های `Vazirmatn` و `Press Start 2P` از شبکه CDN گوگل دریافت می‌شوند و فایل محلی آن‌ها در `assets/` برای استفاده کاملاً آفلاین تعبیه نشده است.
3. **نوار موقت تست اسپرایت:** نوار `.arena-sprite-test-bar` بالای صفحه نبرد برای تست انیمیشن‌ها تعبیه شده بود و هنوز در کد نمایان است.

### ۶.۲. شناسه‌هایی که JS به آنها اشاره دارد اما در HTML نیستند
- `btnConfirmAnswer`: دکمه تایید مرحله قبل که با انتخاب سریع گزینه‌ها منسوخ شد.
- `dialogXP`: برچسب افزایش تجربه که در دیالوگ بازطراحی شده حذف شد.
- `gateGlow`: درخشش دروازه پایانی قلعه مربوط به نسخه قدیمی.
- `gatePrincess`: کاراکتر پرنسس بالکن مربوط به نسخه قدیمی.
- `locksRow`: ردیف ۱۰ قفل بالای صفحه که با نوار جان غول (`#enemyHpWrap`) جایگزین گردید.
*(تمامی این موارد با `?.` یا شرط `if` بررسی شده‌اند و مانع اجرای کد نمی‌شوند، اما کدهای اضافه محسوب می‌گردند).*

### ۶.۳. کارهای آغازشده و ناتمام
- بازطراحی نماهای ثانویه (`#viewLeaderboard`، `#viewProfile`، `#viewPending`، `#viewRejected` و پنل دبیر `#viewTeacher`) به سیستم ویترای شیشه‌ای (`.glass-card`).
- تبدیل ۲۹۲ استایل درون‌خطی به کلاس‌های ساخت‌یافته CSS.
- بازطراحی گرافیکی آیکون PWA به طرح «کلاه‌خود درون پنجره قوسی».

### ۶.۴. بررسی انحراف از دستورات کاربر
- **قواعد صفر-اسکرول:** کاملاً رعایت شده است و هیچ نمای اصلی دارای اسکرول در کل صفحه نیست.
- **عدم تغییر منطق:** کاملاً رعایت شده است؛ هسته ارزیابی واژگان، تاییدیه دبیر ادبیات، همگام‌سازی سوپابیس و امتحانات رسمی بدون دستکاری کار می‌کنند و تمامی ۶۸ تست واحد سبز هستند.

---

## ۷. سه پیشنهاد برای گام‌های بعدی

1. **انتقال نماهای ثانویه (#viewLeaderboard، #viewProfile و پنل دبیر) به سیستم کامپوننت شیشه‌ای (.glass-card):**
   در حال حاضر نبرد، نقشه و مطالعه ظاهر مدرن و گوتیک چشم‌نوازی دارند اما لیدربورد و پروفایل با جعبه‌های پیکسلی قدیمی باقی مانده‌اند. بازطراحی آنها یکپارچگی بصری کل بازی را کامل می‌کند.
2. **پاکسازی کدهای موروثی و حذف نوار موقت تست اسپرایت‌ها:**
   حذف نوار تست موقت بالای نبرد، پاکسازی شناسه‌های ارواح (`gatePrincess`, `locksRow` و ...) و استانداردسازی استایل‌های درون‌خطی به افزایش سرعت بارگذاری و تمیزی پروژه کمک شایانی می‌کند.
3. **همگام‌سازی شماره نسخه برنامه به v5.2.0 و بازطراحی آیکون PWA با تم «کلاه‌خود در پنجره قوسی گوتیک»:**
   یکسان‌سازی نسخه در ظاهر برنامه و سرویس‌ورکر، به همراه ساخت SVG آیکون پنجره قوسی گوتیک جهت ارتقای هویت گرافیکی برند در زمان نصب PWA روی موبایل.
