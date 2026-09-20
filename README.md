<div align="center">

# <img width="1280" height="640" alt="social_preview" src="https://github.com/user-attachments/assets/d6f755f7-33a3-4115-9509-32ff46f2d6e8" />

[![Stars](https://img.shields.io/github/stars/MO1-O1/mirage-discord-quest-completer?style=for-the-badge&logo=github&color=faa61a&logoColor=white)](https://github.com/MO1-O1/mirage-discord-quest-completer/stargazers)
[![Version](https://img.shields.io/github/v/release/MO1-O1/mirage-discord-quest-completer?style=for-the-badge&logo=tag&color=5865F2&logoColor=white)](https://github.com/MO1-O1/mirage-discord-quest-completer/releases)
[![License](https://img.shields.io/github/license/MO1-O1/mirage-discord-quest-completer?style=for-the-badge&color=2b2d31&logo=open-source-initiative&logoColor=white)](LICENSE)
[![Discord](https://img.shields.io/badge/PLATFORM-DISCORD-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com)

</div>

---

## ⚡ What is MIRAGE?

**MIRAGE** is a lightweight, background tool that automatically completes Discord Quests and claims your rewards (Orbs, Avatar Decorations, In-Game items) in minutes.

* **No game downloads:** Completes PC game quests without installing or opening the game.
* **No waiting around:** Completes 15-minute video, voice, and streaming tasks automatically.
* **Instant rewards:** Automatically enrolls in quests and redeems finished rewards with zero manual effort.

---

## 🚀 Quick Start (Instant Run)

1. Open Discord (Desktop app or Web browser).
2. Press **`Ctrl` + `Shift` + `I`** (or **`Cmd` + `Option` + `I`** on macOS) to open Developer Tools, then click the **Console** tab.
3. Paste the following line and press **Enter**:

```javascript
fetch(`https://raw.githubusercontent.com/MO1-O1/mirage-discord-quest-completer/main/mirage.js?t=${Date.now()}`).then(r=>r.text()).then(eval);
```

> **That's it!** The MIRAGE dashboard will appear on your screen. Select your quests and click **START**.
---

<br/>

<details open>
<summary><b>🛠️ Advanced Information & Technical Details (Click to Expand / Collapse)</b></summary>

<br/>

### 📋 Supported Quest Matrix

| Quest Type | Internal Discord Key | Status | How It Works |
| :--- | :--- | :---: | :--- |
| **Video Playback** | `WATCH_VIDEO` | `STABLE` | Simulates natural human watch progress with randomized intervals |
| **Desktop Games** | `PLAY_ON_DESKTOP` | `STABLE` | Injects running process metadata into Discord's internal store |
| **Voice Activity** | `PLAY_ACTIVITY` | `STABLE` | Sends authenticated voice channel WebRTC heartbeats |
| **Activity Achievements** | `ACHIEVEMENT_IN_ACTIVITY` | `BYPASS` | Bypasses renderer CSP via Vencord Electron native IPC |
| **In-Game Achievements** | `ACHIEVEMENT_IN_GAME` | `SKIPPED` | Safely skipped (requires physical retail game client) |
| **Console Exclusives** | `PLAY_ON_XBOX`, `PLAY_ON_PLAYSTATION` | `SKIPPED` | Safely skipped (requires linked console hardware) |

---

### ⚙️ Engine Features

* **Smart Quest Priority:** Evaluates expiration urgency, reward yield, and completion time to automatically finish the most valuable and quickest quests first.
* **Instant Claiming:** Quests that are already finished but unclaimed are detected and claimed immediately before long tasks begin.
* **Resume After Interruption:** Automatically tracks progress; if Discord restarts, the page refreshes, or your internet drops, tasks resume from the exact last saved progress.
* **Pre-Flight Validation:** Inspects task schemas and platform capabilities before running to prevent errors or broken requests.
* **History & Telemetry:** Built-in tracking of completed, claimed, failed, and skipped tasks with session metrics.

---

### 🎛️ Settings & Customization

| Setting | Default | Description |
| :--- | :---: | :--- |
| **Auto-Enroll** | `Enabled` | Automatically joins available quests upon detection |
| **Auto-Claim** | `Enabled` | Redeems rewards immediately upon reaching 100% |
| **Speed Multiplier** | `1x` | Adjusts video progression speed (1x, 1.5x, 2x, 3x) |
| **Stealth Mode** | `Disabled` | Hides your playing status from friends while running tasks |
| **Anti-Detection Delay** | `Disabled` | Adds random 1–30 minute pauses between scan cycles |
| **Prevent System Sleep** | `Enabled` | Keeps your PC awake while tasks are running |

---

### 🧩 Vencord Bypass (For Activity Achievements)

For automated completion of `ACHIEVEMENT_IN_ACTIVITY` quests:
* Requires Discord Desktop with **Vencord** installed.
* MIRAGE automatically detects the companion helper (`OrionQuests` or `MirageQuests`) and bypasses the `discordsays.com` domain block.
* If the companion helper is not installed, the quest is marked with a manual note to launch it in Discord for a few seconds.

---

### ⚠️ Disclaimer

This tool is created for educational and research purposes. Automating Discord quests may violate Discord's Terms of Service. Use at your own discretion.

---

### 📄 License

Distributed under the terms of the [MIT License](LICENSE).

</details>

