<div align="center">

# ⚡ MIRAGE — Discord Quest Completer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-v5.7.1-5865F2.svg)](https://github.com/)
[![Platform](https://img.shields.io/badge/Platform-Discord%20Desktop%20%7C%20Web-green.svg)](https://discord.com)
[![Vencord](https://img.shields.io/badge/Vencord-Supported-5865f2.svg)](https://vencord.dev)
[![Language](https://img.shields.io/badge/Language-English%20%7C%20العربية-faa61a.svg)](#arabic)

**A lightweight, automated quest completer for Discord with Smart Quest Priority, Interruption Recovery, and Vencord Activity Bypass.**

[English](#english) • [العربية](#arabic)

---

</div>

<a name="english"></a>
## 🇬🇧 English Documentation

### 🌟 Features

* **Smart Quest Priority:** Automatically prioritizes quests based on urgency (expiring soonest), highest rewards (Orbs, Avatar decorations), and shortest completion time.
* **Instant Claiming:** Completed-but-unclaimed quests are prioritized and claimed immediately before long tasks begin.
* **Resume After Interruption:** Automatically tracks progress and safely resumes unfinished quests if the tab or client refreshes or disconnects.
* **Pre-flight Validation:** Verifies task schema, platform compatibility, and expiration before running to eliminate false triggers or broken tasks.
* **All Task Types Supported:**
  * 🎬 **Video Quests (`WATCH_VIDEO`)** — Automated progress pacing with natural human delays.
  * 🎮 **Desktop Games (`PLAY_ON_DESKTOP`)** — Background game process emulation without launching heavy games.
  * 🎙️ **Voice Activities (`PLAY_ACTIVITY`)** — Voice channel activity emulation.
  * 🏆 **Activity Achievements (`ACHIEVEMENT_IN_ACTIVITY`)** — Full bypass support via Vencord (`OrionQuests` / `MirageQuests`).
* **Bilingual UI:** Clean floating dashboard with seamless 1-click English and Arabic toggling.
* **Anti-Detection Options:** Stealth mode (hide activity from friends), randomized delay gaps, and wake lock prevention.

---

### 🚀 Quick Start (One-Liner)

1. Open Discord (Desktop app or Web browser).
2. Press `Ctrl` + `Shift` + `I` (or `Cmd` + `Option` + `I` on Mac) to open DevTools, then select the **Console** tab.
3. Paste the following snippet and press **Enter**:

```javascript
fetch("https://raw.githubusercontent.com/YOUR_USERNAME/mirage-discord-quest-completer/main/mirage.js").then(r=>r.text()).then(eval);
```

*(Or simply copy the contents of `mirage.js` and paste it directly into the Console).*

4. The MIRAGE dashboard will open. Select your desired quests and click **START**.

---

### ⚙️ Vencord Support (For Achievement Quests)

If you have Vencord installed with the helper module (`OrionQuests` or `MirageQuests`), MIRAGE automatically detects it, unlocks the Achievement checkbox, and bypasses the activity quest on `discordsays.com` without needing to open the game!

---

### ⚠️ Disclaimer

This project is for educational purposes only. Automated interaction with Discord APIs may violate Discord's Terms of Service. Use at your own discretion.

---

<a name="arabic"></a>
## 🇸🇦 الشرح باللغة العربية

### 🌟 مميزات الأداة

* **نظام الأولوية الذكي (Smart Priority):** يرتب المهام تلقائياً حسب قرب موعد الانتهاء، وقيمة الجوائز (أورب وزينة الأفاتار)، والوقت الأقل للإنجاز.
* **مطالبة فورية:** المهام المكتملة مسبقاً يتم المطالبة بجوائزها فوراً قبل بدء المهام الطويلة.
* **الاستئناف بعد الانقطاع:** يحفظ التقدم تلقائياً؛ إذا تم تحديث الصفحة أو أُغلق ديسكورد، يكمل السكربت من آخر نقطة تقدم بدلاً من البدء من الصفر.
* **فحص مسبق ودقيق:** يتحقق من صلاحية المهمة وتوفر المعالج البرمجي المناسب قبل بدء التشغيل لتفادي الأخطاء.
* **دعم جميع أنواع مهام ديسكورد:**
  * 🎬 **مهام الفيديو (`WATCH_VIDEO`)**
  * 🎮 **ألعاب الكمبيوتر (`PLAY_ON_DESKTOP`)** بدون الحاجة لتثبيت أو فتح اللعبة.
  * 🎙️ **الأنشطة الصوتية (`PLAY_ACTIVITY`)**
  * 🏆 **إنجازات الأنشطة (`ACHIEVEMENT_IN_ACTIVITY`)** عبر دعم Vencord المدمج.
* **واجهة عربية بالكامل:** لوحة تحكم عائمة تدعم اللغة العربية والإنجليزية مع الوضع الليلي المتناسق مع ديسكورد.
* **حماية وتخفي:** وضع التخفي لإخفاء النشاط عن الأصدقاء، فواصل زمنية عشوائية لتجنب الرصد، ومنع وضع السكون للشاشة.

---

### 🚀 طريقة التشغيل السريعة

1. افتح تطبيق ديسكورد على الكمبيوتر (أو عبر المتصفح).
2. اضغط من لوحة المفاتيح على `Ctrl` + `Shift` + `I` لفتح أدوات المطورين، واختر تبويب **Console**.
3. الصق السطر التالي واضغط **Enter**:

```javascript
fetch("https://raw.githubusercontent.com/YOUR_USERNAME/mirage-discord-quest-completer/main/mirage.js").then(r=>r.text()).then(eval);
```

*(أو انسخ كود ملف `mirage.js` بالكامل والصقه في الكونسول مباشرة).*

4. ستفتح لك لوحة تحكم MIRAGE العائمة، حدد المهام المطلوبة ثم اضغط **START**.

---

### 📄 الترخيص (License)

هذا المشروع مرخص تحت رخصة **[MIT License](LICENSE)** المفتوحة والمجانية بالكامل.
