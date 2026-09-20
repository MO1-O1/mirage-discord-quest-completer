(async () => {
    "use strict";




    /* ── 1. Configuration & Constants ── */
    const CONFIG = Object.freeze({
        NAME: "MIRAGE",
        VERSION: "v5.7.1",
        REPO: "MO1-O1/mirage-discord-quest-completer",
        GITHUB_URL: "https://github.com/MO1-O1/mirage-discord-quest-completer",
        THEME: "#5865F2",
        SUCCESS: "#3BA55C",
        WARN: "#faa61a",
        ERR: "#f04747",
        MAX_LOGS: 60
    });




    const SYS = Object.freeze({
        MAX_TIME: 25 * 60 * 1000,
        HEARTBEAT_GRACE: 90 * 1000,
        MAX_TASK_FAILURES: 5,
        MAX_RETRIES: 3,
        IS_DESKTOP: typeof window.DiscordNative !== "undefined"
    });




    const CONST = Object.freeze({
        BLACKLIST_IDS: new Set(["1412491570820812933"]),
        CONSOLE_ONLY_KEYS: new Set(["PLAY_ON_XBOX", "PLAY_ON_PLAYSTATION"]),
        EVT: {
            HEARTBEAT: "QUESTS_SEND_HEARTBEAT_SUCCESS",
            HEARTBEAT_FAIL: "QUESTS_SEND_HEARTBEAT_FAILURE",
            GAME: "RUNNING_GAMES_CHANGE",
            RPC: "LOCAL_ACTIVITY_UPDATE"
        }
    });




    // Startup lock check to prevent duplicate instances
    if (window.mirageLock) {
        console.warn("[MIRAGE] Mirage is already running.");
        const existingUI = document.getElementById("mirage-ui");
        if (existingUI) existingUI.style.display = "flex";
        return;
    }
    window.mirageLock = true;




    // Clean any prior instance to prevent duplicates
    const oldUI = document.getElementById("mirage-ui"); if (oldUI) oldUI.remove();
    const oldStyle = document.getElementById("mirage-styles"); if (oldStyle) oldStyle.remove();
    const oldToasts = document.getElementById("mirage-toast-container"); if (oldToasts) oldToasts.remove();




    /* ── 2. Storage & Runtime State ── */
    const SafeStorage = {
        get(k, fallback = null) {
            try { return (typeof window !== "undefined" && window.localStorage?.getItem(k)) || fallback; }
            catch (_) { return fallback; }
        },
        set(k, v) {
            try { if (typeof window !== "undefined" && window.localStorage) window.localStorage.setItem(k, String(v)); }
            catch (_) {}
        },
        remove(k) {
            try {
                if (typeof window !== "undefined" && window.localStorage) {
                    window.localStorage.removeItem(k);
                }
            } catch (_) {}
        }
    };




    const RUNTIME = {
        running: true,
        isExecuting: false,
        abortController: new AbortController(),
        minimized: false,
        showingOptions: false,
        lang: SafeStorage.get("mirage_lang_v3", "en"),
        speed: Number(SafeStorage.get("mirage_speed", "1")) || 1,
        autoEnroll: SafeStorage.get("mirage_autoenroll", "true") === "true",
        autoClaim: SafeStorage.get("mirage_autoclaim", "true") === "true",
        playSound: SafeStorage.get("mirage_playsound", "true") === "true",
        showToasts: SafeStorage.get("mirage_toasts", "true") === "true",
        stealthMode: SafeStorage.get("mirage_stealth", "false") === "true",
        wakeLock: SafeStorage.get("mirage_wakelock", "true") === "true",
        randomDelay: SafeStorage.get("mirage_randomdelay", "false") === "true",
        statusFilter: "ALL",
        wakeLockSentinel: null,
        activeRewards: new Set(),
        activeTypes: new Set(),
        completedQuests: new Set(),
        failedQuests: new Set(),
        skippedQuests: new Set(),
        cachedQuests: []
    };




    /* ── 3. Central Cleanup Manager ── */
    const Cleanup = {
        _tasks: new Set(),
        add(fn) { this._tasks.add(fn); },
        delete(fn) { this._tasks.delete(fn); },
        listen(target, event, handler, options) {
            target.addEventListener(event, handler, options);
            const remove = () => target.removeEventListener(event, handler, options);
            this._tasks.add(remove);
            return remove;
        },
        disposeAll() {
            for (const fn of this._tasks) {
                try { fn(); } catch (_) {}
            }
            this._tasks.clear();
        }
    };
    /* ── 4. Internationalization (I18N) ── */
    const I18N = {
        en: {
            title: "MIRAGE",
            version: "v5.7.1",
            stop: "STOP",
            hide: "HIDE",
            show: "SHOW",
            refresh: "REFRESH",
            opts: "OPTIONS",
            waiting: "In Queue",
            running: "In Progress",
            completed: "COMPLETED",
            claimed: "CLAIMED",
            claimBtn: "CLAIM REWARD",
            claimAllBtn: "CLAIM ALL REWARDS",
            waitingBtn: "CLAIMING...",
            failedBtn: "ACTION REQUIRED",
            goToQuests: "OPEN QUESTS",
            startBtn: "START",
            deselectAll: "DESELECT ALL",
            selectAll: "SELECT ALL",
            noQuests: "No quests available",
            filterReward: "Filter By Reward",
            filterType: "Filter By Type",
            filterStatus: "Filter By Status",
            statusAll: "All Quests",
            statusReady: "Ready to Claim",
            statusUnfinished: "Unfinished",
            readyBadge: "READY TO CLAIM",
            optionsTitle: "Options & Settings",
            langLabel: "Interface Language",
            langDesc: "Choose your preferred display language.",
            speedLabel: "Speed Multiplier",
            speedDesc: "Adjust video quest completion speed.",
            speed1Desc: "100% Safe — Natural human pacing",
            speed15Desc: "Low Risk — 33% faster execution",
            speed2Desc: "Medium Risk — 50% faster execution",
            speed3Desc: "High Risk — Maximum speed (Not recommended)",
            autoEnroll: "Auto-Enroll Quests",
            autoEnrollDesc: "Automatically accept and join new quests when found.",
            autoClaim: "Auto-Claim Rewards",
            autoClaimDesc: "Automatically request reward claim once quest hits 100%.",
            showToasts: "Side Notifications (Toasts)",
            showToastsDesc: "Display popup notification cards on the side of the screen.",
            playSound: "Sound Notifications",
            playSoundDesc: "Play an audio chime when quests or cycles complete.",
            randomDelay: "Random Anti-Detection Delay",
            randomDelayDesc: "Add a 1–30 min idle pause between cycles to prevent detection.",
            testBtn: "TEST",
            stealthMode: "Stealth Mode (Hide Activity)",
            stealthModeDesc: "Hide playing status from friends while continuing quest heartbeats.",
            wakeLock: "Prevent System Sleep",
            wakeLockDesc: "Keep your screen and PC awake while tasks are running.",
            backToMenu: "RETURN TO MENU",
            noQuestsFound: "No active quests found. Click REFRESH or open Discord Quests.",
            questStarted: "Quest Started",
            questDoneToast: "Quest Completed!",
            questFailedToast: "Quest Aborted/Failed",
            questClaimedToast: "Reward Claimed!",
            tasksStoppedToast: "Tasks aborted. Returned to main menu.",
            refreshToast: "Quests Refreshed",
            featureEnabled: "Enabled",
            featureDisabled: "Disabled",
            cmdReady: "mirage@discord:~$ system ready. waiting for input...",
            totalOrbs: "Total Orbs",
            allTasksDone: "All selected quests finished successfully!",
            allTasksFailedMsg: "All selected tasks failed or require manual action.",
            partialTasksMsg: "Run finished. Some quests succeeded and some failed.",
            logRefreshing: "Refreshing quests from server...",
            logStopped: "Tasks aborted by user. Returning to main menu...",
            logCleaning: "Stopping Mirage & cleaning up resources...",
            activityManualNote: "Play in Discord to complete",
            launchActivityBtn: "LAUNCH ACTIVITY",
            banTitle: "Account Quest Block Detected",
            banSuspendedMsg: "Discord has suspended quest access on this account",
            banEnrollBlockedMsg: "Discord has blocked quest enrollment on this account",
            banForNow: "temporarily",
            banUntil: "until",
            consentTitle: "Authorize Application?",
            consentBody: "To complete this achievement quest, Mirage needs to authorize this app on your Discord account:",
            consentScopes: "Requested Scopes: identify, applications.commands, applications.entitlements",
            consentWarning: "A real OAuth code is sent to the game backend and revoked immediately after. Automation carries detection risk.",
            consentRemember: "Don't ask again for this app this session",
            consentCancel: "Cancel",
            consentAuthorize: "Authorize",
            consentExpiresIn: "Auto-declining in",
            stealthActiveLog: "[Stealth] Discord's 'Display current activity' is suppressed while quests run.",
            stealthRestoredLog: "[Stealth] Restored Discord's activity display setting."
        },
        ar: {
            title: "ميراج",
            version: "v5.7.1",
            stop: "إيقاف",
            hide: "تصغير",
            show: "توسيع",
            refresh: "تحديث",
            opts: "الإعدادات",
            waiting: "قيد الانتظار",
            running: "قيد التقدم",
            completed: "مكتملة",
            claimed: "تم الاستلام",
            claimBtn: "استلام المكافأة",
            claimAllBtn: "استلام جميع المكافآت",
            waitingBtn: "جاري الاستلام...",
            failedBtn: "إجراء يدوي مطلوب",
            goToQuests: "فتح صفحة المهام",
            startBtn: "بدء المهام",
            deselectAll: "إلغاء التحديد",
            selectAll: "تحديد الكل",
            noQuests: "لا توجد مهام متاحة",
            filterReward: "تصنيف حسب الجائزة",
            filterType: "تصنيف حسب نوع المهمة",
            filterStatus: "تصنيف حسب الحالة",
            statusAll: "جميع المهام",
            statusReady: "جاهزة للاستلام",
            statusUnfinished: "غير مكتملة",
            readyBadge: "جاهزة للاستلام",
            optionsTitle: "الخيارات والإعدادات",
            langLabel: "لغة الواجهة",
            langDesc: "تحديد لغة العرض المفضلة للبرنامج.",
            speedLabel: "مضاعف سرعة الفيديو",
            speedDesc: "التحكم في سرعة إنهاء مهام مقاطع الفيديو.",
            speed1Desc: "آمن 100% — سرعة طبيعية ومحاكاة بشرية",
            speed15Desc: "مخاطرة منخفضة — إنهاء أسرع بـ 33%",
            speed2Desc: "مخاطرة متوسطة — إنهاء أسرع بـ 50%",
            speed3Desc: "مخاطرة عالية — سرعة قصوى (غير موصى به)",
            autoEnroll: "التسجيل التلقائي في المهام",
            autoEnrollDesc: "قبول المهام الجديدة تلقائياً فور توفرها.",
            autoClaim: "المطالبة التلقائية بالمكافأة",
            autoClaimDesc: "المطالبة بالمكافآت فور اكتمال النسبة 100%.",
            showToasts: "التنبيهات الجانبية المنبثقة",
            showToastsDesc: "عرض بطاقات تنبيه خفيفة على جانب الشاشة.",
            playSound: "التنبيهات الصوتية",
            playSoundDesc: "تشغيل صوت نغمة عند اكتمال مهمة أو انتهاء الدورة.",
            randomDelay: "تأخير عشوائي للحماية",
            randomDelayDesc: "إضافة استراحة عشوائية (1–30 دقيقة) بين الدورات لتفادي الكشف.",
            testBtn: "تجربة الصوت",
            stealthMode: "وضع التخفي (إخفاء النشاط)",
            stealthModeDesc: "إخفاء اللعبة من حالتك أمام الأصدقاء مع استمرار احتساب النقاط.",
            wakeLock: "منع سكون الجهاز",
            wakeLockDesc: "إبقاء الشاشة والنظام قيد التشغيل حتى تنتهي المهام.",
            backToMenu: "العودة للقائمة الرئيسية",
            noQuestsFound: "لا توجد مهام نشطة حالياً. اضغط تحديث أو افتح صفحة المهام.",
            questStarted: "بدأت المهمة",
            questDoneToast: "اكتملت المهمة بنجاح!",
            questFailedToast: "تعذرت المهمة أو يلزم تدخل يدوي",
            questClaimedToast: "تم استلام المكافأة بنجاح!",
            tasksStoppedToast: "تم إيقاف العمليات والرجوع للقائمة.",
            refreshToast: "تم تحديث قائمة المهام",
            featureEnabled: "مفعّل",
            featureDisabled: "معطّل",
            cmdReady: "mirage@discord:~$ النظام جاهز وفي انتظار البدء...",
            totalOrbs: "مجموع الأوربس المكتسبة",
            allTasksDone: "اكتملت جميع المهام المحددة بنجاح!",
            allTasksFailedMsg: "تعذرت المهام المحددة أو تتطلب تشغيلاً يدوياً داخل اللعبة.",
            partialTasksMsg: "انتهت العمليات: نجحت بعض المهام وتعذرت أخرى.",
            logRefreshing: "جاري تحديث المهام من الخادم...",
            logStopped: "تم إيقاف المهام يدوياً. العودة للقائمة...",
            logCleaning: "جاري إيقاف ميراج وتنظيف الذاكرة المؤقتة...",
            activityManualNote: "العب داخل ديسكورد للإكمال",
            launchActivityBtn: "تشغيل اللعبة",
            banTitle: "تم رصد تقييد على الحساب من ديسكورد",
            banSuspendedMsg: "ديسكورد قام بتعليق الوصول للمهام على هذا الحساب",
            banEnrollBlockedMsg: "ديسكورد منع تسجيل المهام الجديدة على هذا الحساب",
            banForNow: "مؤقتاً",
            banUntil: "حتى",
            consentTitle: "هل تسمح بتفويض التطبيق؟",
            consentBody: "لإنجاز هذه المهمة آلياً، يحتاج ميراج لتفويض التطبيق على حسابك في ديسكورد:",
            consentScopes: "الصلاحيات المطلوبة: identify, applications.commands, applications.entitlements",
            consentWarning: "يتم إرسال كود تفويض حقيقي لسيرفر اللعبة ثم إلغاء التفويض فوراً. الأتمتة تحمل مخاطرة للكشف.",
            consentRemember: "عدم السؤال مجدداً لهذا التطبيق في هذه الجلسة",
            consentCancel: "إلغاء",
            consentAuthorize: "موافقة وتفويض",
            consentExpiresIn: "سيتم الرفض التلقائي بعد",
            stealthActiveLog: "[التخفي] تم إيقاف ميزة عرض النشاط في ديسكورد مؤقتاً أثناء عمل المهام.",
            stealthRestoredLog: "[التخفي] تمت استعادة إعدادات عرض النشاط في ديسكورد.",
            ghTooltip: "ضع نجمة على GitHub ⭐"
        }
    };




    const t = (k) => I18N[RUNTIME.lang]?.[k] || I18N.en[k] || k;




    /* ── 5. Helpers ── */
    const sleep = (ms, signal = RUNTIME.abortController.signal) => {
        return new Promise((resolve, reject) => {
            if (signal?.aborted) return reject(new Error("Aborted"));
            const timer = setTimeout(resolve, ms);
            const onAbort = () => { clearTimeout(timer); reject(new Error("Aborted")); };
            signal?.addEventListener("abort", onAbort, { once: true });
        });
    };




    const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));


    const taskKeys = (tasks) => (tasks instanceof Map ? [...tasks.keys()] : Object.keys(tasks ?? {}));
    const taskAt = (tasks, key) => (tasks instanceof Map ? tasks.get(key) : tasks?.[key]);


    const selectTaskConfig = (config) => {
        const current = config?.taskConfigV2;
        if (taskKeys(current?.tasks).length > 0) return current;
        const legacy = config?.taskConfig;
        if (taskKeys(legacy?.tasks).length > 0) return legacy;
        return current ?? legacy ?? null;
    };


    const sealedFor = (questId) => {
        try {
            return Mods.QuestStore?.getQuest?.(questId)?.trafficMetadataSealed ??
                   Mods.QuestStore?.quests?.get?.(questId)?.trafficMetadataSealed ??
                   null;
        } catch (_) { return null; }
    };


    const futureDate = (raw) => {
        try {
            if (!raw) return null;
            const when = raw instanceof Date ? raw : new Date(raw);
            return Number.isNaN(when.getTime()) || when.getTime() <= Date.now() ? null : when;
        } catch (_) { return null; }
    };


    const enrollmentBlockedUntil = () => futureDate(Mods.QuestStore?.questEnrollmentBlockedUntil);


    const questAccessSuspendedUntil = () => {
        const store = Mods.QuestStore;
        if (!store) return null;
        const explicit = futureDate(store.questAccessSuspendedUntil);
        if (explicit) return explicit;
        return store.isQuestAccessSuspended === true ? new Date(0) : null;
    };


    function describeHeartbeatError(payload) {
        const e = payload?.error ?? payload;
        const parts = [];
        const status = e?.status ?? e?.httpStatus;
        if (status) parts.push(`HTTP ${status}`);
        const code = e?.body?.code ?? e?.code;
        if (code != null && code !== status) parts.push(`code ${code}`);
        const message = e?.body?.message ?? e?.message;
        if (message) parts.push(String(message));
        if (!parts.length) {
            try { parts.push(JSON.stringify(e).slice(0, 160)); } catch { parts.push(String(e)); }
        }
        return parts.join(', ') || 'no detail';
    }


    function buildStreamKey() {
        try {
            const ownerId = Mods.UserStore?.getCurrentUser?.()?.id;
            if (!ownerId) return null;


            const dm = Mods.ChanStore?.getSortedPrivateChannels()?.[0]?.id;
            if (dm) return `call:${dm}:${ownerId}`;


            for (const g of Object.values(Mods.GuildChanStore?.getAllGuilds() ?? {})) {
                const vc = g?.VOCAL?.[0]?.channel;
                const guildId = vc?.guild_id ?? g?.id;
                if (vc?.id && guildId) return `guild:${guildId}:${vc.id}:${ownerId}`;
            }
            return null;
        } catch (e) {
            Logger.log(`[Task] Stream key lookup error: ${e.message}`, 'debug');
            return null;
        }
    }




    const notExpired = (q) => {
        const raw = q.config?.expiresAt || q.userStatus?.expiresAt;
        if (!raw) return true;
        const e = new Date(raw).getTime();
        return Number.isNaN(e) || e > Date.now();
    };




    function isQuestCompleted(q, typeData) {
        if (q?.userStatus?.completedAt) return true;
        if (!typeData?.keyName) return false;
        const cur = normalizeProgress(q.userStatus, typeData.keyName);
        return cur >= typeData.target;
    }




    function normalizeProgress(source, key) {
        const p = source?.progress;
        const entry = p instanceof Map ? p.get(key) : p?.[key];
        const val = Number(entry?.value ?? source?.streamProgressSeconds ?? 0);
        return Number.isFinite(val) && val >= 0 ? val : 0;
    }




    function detectTaskType(cfg, defaultAppId = null) {
        const tasks = cfg?.tasks ?? {};
        const keys = tasks instanceof Map ? [...tasks.keys()] : Object.keys(tasks);
        if (!keys.length) return null;

        const getTask = (k) => tasks instanceof Map ? tasks.get(k) : tasks?.[k];

        // 1. WATCH_VIDEO and known WATCH_VIDEO_* variants -> VIDEO
        const videoKey = keys.find(k => k === "WATCH_VIDEO") ||
                         keys.find(k => k.startsWith("WATCH_VIDEO_"));
        if (videoKey) {
            const entry = getTask(videoKey);
            return {
                type: "VIDEO",
                keyName: videoKey,
                target: entry?.target ?? 900,
                appId: entry?.applications?.[0]?.id ?? defaultAppId
            };
        }

        // 2. PLAY_ACTIVITY -> VOICE (Exact known key matched before generic PLAY)
        const playActKey = keys.find(k => k === "PLAY_ACTIVITY" || k.startsWith("PLAY_ACTIVITY_"));
        if (playActKey) {
            const entry = getTask(playActKey);
            return {
                type: "VOICE",
                keyName: playActKey,
                target: entry?.target ?? 900,
                appId: entry?.applications?.[0]?.id ?? defaultAppId
            };
        }

        // 3. PLAY_ON_DESKTOP and supported PLAY* desktop variants -> GAME (strictly excluding console)
        const playDesktopKey = keys.find(k => k === "PLAY_ON_DESKTOP") ||
                               keys.find(k => (k.startsWith("PLAY_ON_DESKTOP_") || k.startsWith("PLAY_DESKTOP")) && !CONST.CONSOLE_ONLY_KEYS.has(k));
        if (playDesktopKey) {
            const entry = getTask(playDesktopKey);
            return {
                type: "GAME",
                keyName: playDesktopKey,
                target: entry?.target ?? 900,
                appId: entry?.applications?.[0]?.id ?? defaultAppId
            };
        }

        // 4. STREAM_ON_DESKTOP and supported STREAM* desktop variants -> STREAM
        const streamKey = keys.find(k => k === "STREAM_ON_DESKTOP") ||
                          keys.find(k => k.startsWith("STREAM_ON_DESKTOP_") || k.startsWith("STREAM_DESKTOP"));
        if (streamKey) {
            const entry = getTask(streamKey);
            return {
                type: "STREAM",
                keyName: streamKey,
                target: entry?.target ?? 900,
                appId: entry?.applications?.[0]?.id ?? defaultAppId
            };
        }

        // 5. ACHIEVEMENT_IN_ACTIVITY -> ACHIEVEMENT
        const achieveActKey = keys.find(k => k === "ACHIEVEMENT_IN_ACTIVITY" || k.startsWith("ACHIEVEMENT_IN_ACTIVITY_"));
        if (achieveActKey) {
            const entry = getTask(achieveActKey);
            return {
                type: "ACHIEVEMENT",
                keyName: achieveActKey,
                target: entry?.target ?? 1,
                appId: entry?.applications?.[0]?.id ?? defaultAppId
            };
        }

        // ── Explicitly Rejected / Unsupported Task Families ──

        // 6. ACHIEVEMENT_IN_GAME -> unsupported / not automatable
        const achieveGameKey = keys.find(k => k === "ACHIEVEMENT_IN_GAME" || k.startsWith("ACHIEVEMENT_IN_GAME"));
        if (achieveGameKey) {
            return {
                type: null,
                unsupported: true,
                reason: "In-game achievement quests require the physical game and are not automatable",
                keyName: achieveGameKey
            };
        }

        // 7. PLAY_ON_XBOX / PLAY_ON_PLAYSTATION -> unsupported / console-only
        const consoleKey = keys.find(k => CONST.CONSOLE_ONLY_KEYS.has(k) || k === "PLAY_ON_XBOX" || k === "PLAY_ON_PLAYSTATION" || k.includes("XBOX") || k.includes("PLAYSTATION"));
        if (consoleKey) {
            return {
                type: null,
                unsupported: true,
                reason: `Console-only quest (${consoleKey}) is not supported on Desktop/Web`,
                keyName: consoleKey
            };
        }

        // 8. Other unknown task keys -> unsupported (NEVER default to GAME!)
        return {
            type: null,
            unsupported: true,
            reason: `Unknown or unsupported task type: ${keys[0]}`,
            keyName: keys[0]
        };
    }
    /* ── OAuth Consent Gate ── */
    const Consent = {
        _granted: new Set(),
        TIMEOUT: 60000,
        ask(appId, appName) {
            if (this._granted.has(appId)) return Promise.resolve(true);
            return new Promise((resolve) => {
                const ov = document.createElement('div');
                ov.id = 'mirage-consent';
                if (RUNTIME.lang === "ar") ov.classList.add("rtl");
                ov.innerHTML = `
                    <div class="consent-card">
                        <div class="consent-head">${t("consentTitle")}</div>
                        <div class="consent-body">
                            <div>${t("consentBody")}</div>
                            <div class="consent-app-name">${esc(appName ? `${appName} (${appId})` : `App ${appId}`)}</div>
                            <div class="consent-scopes">${t("consentScopes")}</div>
                            <div class="consent-warning">${t("consentWarning")}</div>
                            <label class="consent-remember-label">
                                <input type="checkbox" id="consent-remember" class="native-cb">
                                <span>${t("consentRemember")}</span>
                            </label>
                            <div class="consent-timer" id="consent-countdown-txt">${t("consentExpiresIn")} 60s</div>
                        </div>
                        <div class="consent-foot">
                            <button id="consent-cancel-btn" class="quest-pick-btn deselect">${t("consentCancel")}</button>
                            <button id="consent-auth-btn" class="quest-pick-btn start">${t("consentAuthorize")}</button>
                        </div>
                    </div>`;
                document.body.appendChild(ov);


                let done = false;
                let remaining = 60;
                const cdElem = ov.querySelector('#consent-countdown-txt');
                const interval = setInterval(() => {
                    remaining--;
                    if (cdElem) cdElem.textContent = `${t("consentExpiresIn")} ${remaining}s`;
                    if (remaining <= 0) finish(false);
                }, 1000);


                const finish = (accepted) => {
                    if (done) return;
                    done = true;
                    clearInterval(interval);
                    document.removeEventListener('keydown', onKey);
                    if (accepted && ov.querySelector('#consent-remember')?.checked) {
                        this._granted.add(appId);
                    }
                    ov.remove();
                    resolve(accepted);
                };


                const onKey = (e) => { if (e.key === 'Escape') finish(false); };
                document.addEventListener('keydown', onKey);
                ov.querySelector('#consent-auth-btn')?.addEventListener('click', () => finish(true));
                ov.querySelector('#consent-cancel-btn')?.addEventListener('click', () => finish(false));
                ov.addEventListener('mousedown', (e) => { if (e.target === ov) finish(false); });
            });
        }
    };


    /* ── 6. Toast Notifications (Notifier) ── */
    const Notifier = {
        init() {
            if (!document.getElementById("mirage-toast-container")) {
                const c = document.createElement("div");
                c.id = "mirage-toast-container";
                document.body.appendChild(c);
            }
        },




        show(title, message = "", type = "info") {
            if (!RUNTIME.showToasts) return;
            const container = document.getElementById("mirage-toast-container");
            if (!container) return;




            const toast = document.createElement("div");
            toast.className = `mirage-toast toast-${type} ${RUNTIME.lang === "ar" ? "rtl" : ""}`;
            toast.innerHTML = `
                <div class="toast-icon">${type === "success" ? ICONS.CHECK : type === "err" ? ICONS.STOP : ICONS.BOLT}</div>
                <div class="toast-content">
                    <div class="toast-title">${esc(title)}</div>
                    ${message ? `<div class="toast-name">${esc(message)}</div>` : ""}
                </div>
            `;
            container.appendChild(toast);




            setTimeout(() => {
                toast.classList.add("fade-out");
                setTimeout(() => toast.remove(), 400);
            }, 3500);
        }
    };




    /* ── 7. Traffic Queue & Error Handling ── */
    const ErrorHandler = {
        RETRYABLE: new Set([429, 500, 502, 503, 504, 408]),
        CLIENT_ERRORS: new Set([400, 403, 404, 409, 410]),
        classify(err) {
            const status = err?.status ?? err?.statusCode ?? 0;
            return {
                status,
                isRetryable: this.RETRYABLE.has(status),
                isClientError: this.CLIENT_ERRORS.has(status),
                message: err?.message ?? err?.body?.message ?? `HTTP ${status}`
            };
        }
    };




    const Traffic = {
        queue: [],
        processing: false,




        async enqueue(url, body) {
            if (!RUNTIME.running) return Promise.reject(new Error("Stopped"));
            return new Promise((resolve, reject) => {
                this.queue.push({ url, body, resolve, reject, attempts: 0 });
                this.process();
            });
        },




        async process() {
            if (this.processing || this.queue.length === 0) return;
            this.processing = true;




            while (this.queue.length > 0) {
                if (!RUNTIME.running) {
                    this.queue.forEach((r) => r.reject(new Error("Shutdown")));
                    this.queue = [];
                    this.processing = false;
                    return;
                }




                const req = this.queue.shift();
                try {
                    const res = await Mods.API.post({ url: req.url, body: req.body });
                    req.resolve(res);
                } catch (e) {
                    const err = ErrorHandler.classify(e);




                    if (err.isRetryable && req.attempts < SYS.MAX_RETRIES) {
                        req.attempts++;
                        const retryAfter = Number(e.body?.retry_after ?? Math.pow(2, req.attempts));
                        const delay = retryAfter * 1000 + rnd(200, 800);




                        Logger.log(`[RateLimit] Retry ${req.attempts}/${SYS.MAX_RETRIES} in ${(delay / 1000).toFixed(1)}s (HTTP ${err.status})`, "warn");




                        if (e.body?.global === true) {
                            this.queue.unshift(req);
                            await sleep(delay).catch(() => {});
                        } else {
                            setTimeout(() => {
                                if (RUNTIME.running) { this.queue.push(req); this.process(); }
                                else req.reject(new Error("Shutdown"));
                            }, delay);
                        }
                    } else {
                        req.reject(e);
                    }
                }
                await sleep(rnd(1200, 1800)).catch(() => {});
            }
            this.processing = false;
        }
    };




    /* ── 8. TaskStore ── */
    const TaskStore = {
        _tasks: new Map(),
        listeners: new Set(),




        subscribe(fn) { this.listeners.add(fn); },
        get(id) { return this._tasks.get(id); },
        getAll() { return [...this._tasks.values()]; },
        has(id) { return this._tasks.has(id); },




        update(id, patch) {
            const old = this._tasks.get(id) || {};
            const isDone = patch.status === "COMPLETED" || patch.status === "CLAIMED";
            const isPending = patch.status === "PENDING" || patch.status === "QUEUE";
            const isFailed = patch.status === "FAILED";




            const next = { ...old, ...patch, done: isDone, pending: isPending, failed: isFailed };
            this._tasks.set(id, next);
            this.notify(id, next, old);
        },




        remove(id) {
            if (this._tasks.has(id)) {
                this.update(id, { removing: true });
                setTimeout(() => {
                    this._tasks.delete(id);
                    this.notify(id, null, null);
                }, 400);
            }
        },




        notify(id, next, old) {
            for (const fn of this.listeners) {
                try { fn(id, next, old); } catch (_) {}
            }
        },




        clear() { this._tasks.clear(); }
    };




    /* ── Reward calculation ── */
    const orbReward = (config) => {
        const rewards = config?.rewardsConfig?.rewards;

        if (!Array.isArray(rewards)) {
            return null;
        }

        const amount = (value) => (
            typeof value === "number" &&
            Number.isFinite(value) &&
            value > 0
                ? value
                : 0
        );

        let orbs = 0;
        let premium = 0;

        for (const reward of rewards) {
            const base = amount(reward?.orbQuantity);

            if (!base) {
                continue;
            }

            orbs += base;

            premium +=
                amount(reward?.premiumOrbQuantity) ||
                base;
        }

        return orbs > 0
            ? { orbs, premium }
            : null;
    };




    /* ── 8B. Smart Quest Priority ── */
    const QuestPriority = {
        calculateScore(q, typeData = null) {
            if (!q) return 0;
            const cfg = selectTaskConfig(q.config);
            const resolvedType = typeData || (cfg?.tasks ? detectTaskType(cfg, q.config?.application?.id) : null);


            // Priority 1: Already completed but waiting to be claimed (highest priority: immediate claim)
            const isCompleted = resolvedType ? isQuestCompleted(q, resolvedType) : (q.userStatus?.completedAt != null && !q.userStatus?.claimedAt);
            if (isCompleted) {
                return 1000000;
            }


            let score = 0;


            // Priority 2: Expire sooner (higher urgency)
            const expStr = q.config?.expiresAt;
            if (expStr) {
                const expTime = new Date(expStr).getTime();
                const msLeft = expTime - Date.now();
                if (msLeft > 0) {
                    const hoursLeft = Math.max(0.1, msLeft / 3600000);
                    score += Math.min(25000, 10000 / hoursLeft);
                }
            }


            // Priority 3: Higher rewards
            // Reward data can contain multiple entries.
            // Never assume rewards[0] is the Orb reward or the most important reward.
            const rewards = q.config?.rewardsConfig?.rewards;
            const orbInfo = orbReward(q.config);
            const orbQty = orbInfo?.orbs ?? 0;

            const rewardTypes = Array.isArray(rewards)
                ? rewards
                    .map((reward) => Number(reward?.type) || 0)
                    .filter((type) => type > 0)
                : [];

            const rewardTypeBonus = rewardTypes.reduce((best, type) => {
                if (type === 3) return Math.max(best, 600);
                if (type === 4) return Math.max(best, 400);
                if (type === 1) return Math.max(best, 250);
                return Math.max(best, 50);
            }, 0);

            score += orbQty * 15;
            score += rewardTypeBonus;


            // Priority 4: Less execution time required (faster to complete)
            const target = Number(resolvedType?.target) || 0;
            const cur = resolvedType?.keyName ? normalizeProgress(q.userStatus, resolvedType.keyName) : 0;
            const remainingSec = Math.max(1, target - cur);
            score += Math.max(0, 3000 / (remainingSec / 60));


            return score;
        },


        sort(quests) {
            if (!Array.isArray(quests)) return [];
            return [...quests].sort((a, b) => this.calculateScore(b) - this.calculateScore(a));
        }
    };




    /* ── 8C. Resume After Interruption (RecoveryManager) ── */
    const RecoveryManager = {
        STORAGE_KEY: "mirage_recovery_state",


        getAll() {
            try {
                const raw = SafeStorage.get(this.STORAGE_KEY);
                return raw ? JSON.parse(raw) : {};
            } catch (_) {
                return {};
            }
        },


        saveAll(state) {
            try {
                SafeStorage.set(this.STORAGE_KEY, JSON.stringify(state));
            } catch (_) {}
        },


        get(questId) {
            const all = this.getAll();
            return all[questId] || null;
        },


        trackStart(q, tInfo, progress = 0) {
            if (!q?.id) return;
            const all = this.getAll();
            const now = Date.now();
            all[q.id] = {
                questId: q.id,
                name: tInfo?.name || "Quest",
                type: tInfo?.type || "UNKNOWN",
                keyName: tInfo?.keyName || "",
                appId: tInfo?.appId || null,
                target: tInfo?.target || 900,
                progress: Number(progress) || 0,
                lastProgressUpdate: now,
                startedAt: all[q.id]?.startedAt || now,
                updatedAt: now,
                status: "RUNNING"
            };
            this.saveAll(all);
        },


        updateProgress(questId, progress, status = "RUNNING") {
            if (!questId) return;
            const all = this.getAll();
            if (!all[questId]) return;
            const now = Date.now();
            all[questId].progress = Number(progress) || all[questId].progress;
            all[questId].lastProgressUpdate = now;
            all[questId].updatedAt = now;
            all[questId].status = status;
            this.saveAll(all);
        },


        clear(questId) {
            if (!questId) return;
            const all = this.getAll();
            if (all[questId]) {
                delete all[questId];
                this.saveAll(all);
            }
        },


        clearAll() {
            SafeStorage.remove(this.STORAGE_KEY);
        },


        cleanupStale(availableQuests = []) {
            const all = this.getAll();
            const availMap = new Map(availableQuests.map((q) => [q.id, q]));
            let changed = false;


            for (const [id, rec] of Object.entries(all)) {
                const q = availMap.get(id);
                if (!q || q.userStatus?.claimedAt || !notExpired(q) || CONST.BLACKLIST_IDS.has(id)) {
                    delete all[id];
                    changed = true;
                    continue;
                }
                const cfg = selectTaskConfig(q.config);
                const typeData = cfg?.tasks ? detectTaskType(cfg, q.config?.application?.id) : null;
                if (isQuestCompleted(q, typeData) || (rec.target && rec.progress >= rec.target)) {
                    rec.status = "COMPLETED";
                    changed = true;
                }
            }


            if (changed) {
                this.saveAll(all);
            }
        },


        getRecoverableQuests(availableQuests = []) {
            this.cleanupStale(availableQuests);
            const all = this.getAll();
            const availMap = new Map(availableQuests.map((q) => [q.id, q]));
            const recoverable = [];


            for (const [id, rec] of Object.entries(all)) {
                const q = availMap.get(id);
                if (!q) continue;


                const cfg = selectTaskConfig(q.config);
                const typeData = cfg?.tasks ? detectTaskType(cfg, q.config?.application?.id) : null;


                if (isQuestCompleted(q, typeData) || (rec.target && rec.progress >= rec.target)) {
                    continue;
                }


                if (rec.status === "RUNNING" || rec.status === "INTERRUPTED" || rec.status === "PAUSED") {
                    recoverable.push({ quest: q, record: rec });
                }
            }
            return recoverable;
        }
    };




    /* ── 8D. Pre-flight Quest Validation ── */
    const QuestValidator = {
        validate(q) {
            // 1. Quest detected
            if (!q || !q.id || !q.config) {
                return {
                    valid: false,
                    questName: q?.id || "Unknown Quest",
                    reason: "Invalid or missing quest payload",
                    status: "SKIPPED"
                };
            }


            const questName = q.config?.messages?.questName || q.id;


            // 2. Identify task type
            const cfg = selectTaskConfig(q.config);
            if (!cfg?.tasks) {
                return {
                    valid: false,
                    questName,
                    reason: "Missing task configuration in quest schema",
                    status: "SKIPPED"
                };
            }


            const typeData = detectTaskType(cfg, q.config?.application?.id);
            if (!typeData || !typeData.type) {
                return {
                    valid: false,
                    questName,
                    reason: "Unsupported or unrecognized quest task type",
                    status: "SKIPPED"
                };
            }

            // Normalize and validate the task target before any
            // completion check or execution begins.
            const normalizedTarget = Number(typeData.target);

            if (!Number.isFinite(normalizedTarget) || normalizedTarget <= 0) {
                return {
                    valid: false,
                    questName,
                    type: typeData.type,
                    reason: `Invalid task target (${String(typeData.target)})`,
                    status: "SKIPPED"
                };
            }

            // Ensure downstream handlers receive a numeric target.
            typeData.target = normalizedTarget;


            // 3. Verify the quest is still active / not expired
            if (!notExpired(q)) {
                return {
                    valid: false,
                    questName,
                    type: typeData.type,
                    reason: "Quest has expired",
                    status: "EXPIRED"
                };
            }


            if (CONST.BLACKLIST_IDS.has(q.id)) {
                return {
                    valid: false,
                    questName,
                    type: typeData.type,
                    reason: "Quest ID is blacklisted",
                    status: "SKIPPED"
                };
            }


            // 4. Check whether it is already completed
            const isCompleted = isQuestCompleted(q, typeData);
            const rw = q.config?.rewardsConfig?.rewards?.[0];
            const rewardText = rw?.messages?.name || "";
            const tInfo = {
                id: q.id,
                appId: typeData.appId,
                name: questName,
                target: typeData.target,
                type: typeData.type,
                keyName: typeData.keyName,
                rewardText
            };


            if (isCompleted) {
                return {
                    valid: true,
                    isCompleted: true,
                    questName,
                    typeData,
                    tInfo
                };
            }


            // 5. Verify the required handler is available
            const handler = Tasks[typeData.type];
            if (typeof handler !== "function") {
                return {
                    valid: false,
                    questName,
                    type: typeData.type,
                    reason: `No execution handler implemented for type "${typeData.type}"`,
                    status: "SKIPPED"
                };
            }


            // 6. Verify the required execution path is supported
            if ((typeData.type === "GAME" || typeData.type === "STREAM") && !SYS.IS_DESKTOP) {
                return {
                    valid: false,
                    questName,
                    type: typeData.type,
                    reason: `"${typeData.type}" quests require Discord Desktop client`,
                    status: "SKIPPED"
                };
            }


            if (typeData.type === "GAME" && !typeData.appId) {
                return {
                    valid: false,
                    questName,
                    type: typeData.type,
                    reason: "Game quest is missing application ID",
                    status: "SKIPPED"
                };
            }


            // 7. Execute only when validation succeeds
            return {
                valid: true,
                isCompleted: false,
                questName,
                typeData,
                tInfo
            };
        }
    };




    /* ── 9. Sound Engine ── */
    const Sound = {
        _ctx: null,
        play(type = "done") {
            if (!RUNTIME.playSound && type !== "force") return;
            try {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (!Ctx) return;
                if (!this._ctx || this._ctx.state === "closed") this._ctx = new Ctx();
                const ctx = this._ctx;
                if (ctx.state === "suspended") ctx.resume();




                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.type = "sine";
                const t0 = ctx.currentTime;




                if (type === "tick") {
                    o.frequency.value = 880;
                    g.gain.setValueAtTime(0.45, t0);
                    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
                    o.start(t0); o.stop(t0 + 0.2);
                    return;
                }




                o.frequency.setValueAtTime(523.25, t0);
                o.frequency.setValueAtTime(659.25, t0 + 0.12);
                o.frequency.setValueAtTime(783.99, t0 + 0.24);
                g.gain.setValueAtTime(0.45, t0);
                g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
                o.start(t0); o.stop(t0 + 0.6);
            } catch (_) {}
        }
    };




    /* ── 10. UI & Icons ── */
    const ICONS = Object.freeze({
        STAR: `<svg width="12" height="12" viewBox="0 0 24 24" fill="#faa61a"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`,
        GITHUB: `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>`,
        HEART: `<svg width="12" height="12" viewBox="0 0 24 24" fill="#f04747"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,

        OPT: `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M10.56 1.1c-.46.05-.7.53-.64.98.18 1.16-.19 2.2-.98 2.53-.8.33-1.79-.15-2.49-1.1-.27-.36-.78-.52-1.14-.24-.77.59-1.45 1.27-2.04 2.04-.28.36-.12.87.24 1.14.96.7 1.43 1.7 1.1 2.49-.33.8-1.37 1.16-2.53.98-.45-.07-.93.18-.99.64a11.1 11.1 0 0 0 0 2.88c.06.46.54.7.99.64 1.16-.18 2.2.19 2.53.98.33.8-.14 1.79-1.1 2.49-.36.27-.52.78-.24 1.14.59.77 1.27 1.45 2.04 2.04.36.28.87.12 1.14-.24.7-.95 1.7-1.43 2.49-1.1.8.33 1.16 1.37.98 2.53-.07.45.18.93.64.99a11.1 11.1 0 0 0 2.88 0c.46-.06.7-.54.64-.99-.18-1.16.19-2.2.98-2.53.8-.33 1.79.14 2.49 1.1.27.36.78.52 1.14.24.77-.59 1.45-1.27 2.04-2.04.28-.36.12-.87-.24-1.14-.96-.7-1.43-1.7-1.1-2.49.33-.8 1.37-1.16 2.53-.98.45.07.93-.18.99-.64a11.1 11.1 0 0 0 0-2.88c-.06-.46-.54-.7-.99-.64-1.16.18-2.2-.19-2.53-.98-.33-.8.14-1.79 1.1-2.49.36-.27.52-.78.24-1.14a11.07 11.07 0 0 0-2.04-2.04c-.36-.28-.87-.12-1.14.24-.7.96-1.7 1.43-2.49 1.1-.8-.33-1.16-1.37-.98-2.53.07-.45-.18-.93-.64-.99a11.1 11.1 0 0 0 2.88 0ZM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"/></svg>`,
        REFRESH: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`,
        BOLT: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.29-.62L14.5 3h1l-1 7h3.5c.58 0 .57.32.29.62L11 21z"/></svg>`,
        VIDEO: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>`,
        GAME: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`,
        STREAM: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>`,
        ACTIVITY: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/></svg>`,
        CHECK: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
        CLOCK: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`,
        STOP: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"/></svg>`
    });
    const Logger = {
        root: null,
        tickerId: null,
        _lastPickerRender: null,
        _lastRewardTypes: new Map(),
        _lastQuestTypes: new Set(),
        _lastCounts: { ready: 0, unfinished: 0, total: 0 },




        init() {
            const oldStyle = document.getElementById("mirage-styles"); if (oldStyle) oldStyle.remove();
            const oldUI = document.getElementById("mirage-ui"); if (oldUI) oldUI.remove();




            const style = document.createElement("style");
            style.id = "mirage-styles";
            style.innerHTML = `
                @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes fadeOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.95); margin: 0; padding: 0; height: 0; border: none; } }
                @keyframes slideToast { from { transform: translateX(50px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }




                #mirage-ui {
                    position: fixed; top: 32px; right: 20px; width: 440px; height: 560px; max-height: 85vh;
                    background: var(--background-base-low, #18191c); color: var(--text-default, #dcddde);
                    border: 1px solid var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 8px;
                    box-shadow: 0 16px 40px rgba(0,0,0,0.6); z-index: 1000001;
                    font-family: var(--font-primary, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
                    overflow: hidden; animation: slideIn 0.3s ease;
                    display: flex; flex-direction: column; box-sizing: border-box; user-select: none;
                }
                #mirage-ui.rtl { direction: rtl; }
                #mirage-ui.minimized { height: 46px !important; min-height: 46px !important; max-height: 46px !important; }
                #mirage-ui.minimized #mirage-body, #mirage-ui.minimized #mirage-logs, #mirage-ui.minimized #mirage-update-banner { display: none !important; }




                #mirage-head {
                    padding: 9px 14px; background: var(--background-mod-muted, rgba(0,0,0,0.25));
                    flex: 0 0 auto; display: flex; justify-content: space-between; align-items: center;
                    border-bottom: 1px solid var(--border-subtle, rgba(255,255,255,0.08));
                    cursor: grab; gap: 12px;
                }
                #mirage-head.dragging { cursor: grabbing; background: var(--control-secondary-background-default, rgba(255,255,255,0.05)); }
                #mirage-title {
                    font-weight: 800; font-size: 14px; color: var(--text-strong, #fff);
                    display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
                }
                #mirage-title svg { color: var(--text-brand, #5865f2); flex-shrink: 0; }
                .mirage-ver {
                    font-size: 10px; opacity: 0.75; font-weight: 700; padding: 2px 5px;
                    background: rgba(255,255,255,0.08); border-radius: 4px;
                }

                #mirage-controls {
                    display: inline-flex; gap: 5px; align-items: center; flex-shrink: 0;
                }
                .ctrl-btn {
                    cursor: pointer; transition: 0.2s; display: inline-flex; align-items: center;
                    gap: 4px; padding: 3px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;
                    user-select: none; line-height: 1.2; text-decoration: none;
                }
                .ctrl-hide, .ctrl-opts, .ctrl-refresh {
                    color: var(--text-muted, #949ba4);
                }
                .ctrl-hide:hover, .ctrl-opts:hover, .ctrl-refresh:hover {
                    color: #fff; background: rgba(255,255,255,0.08);
                }
                .ctrl-refresh.spinning svg { animation: spin 0.6s linear infinite; }
                .ctrl-stop {
                    padding: 3px 8px; border-radius: 4px; background: rgba(218,55,60,0.12);
                    border: 1px solid #da373c; color: #da373c; font-weight: 700;
                }
                .ctrl-stop:hover { background: #da373c; color: #fff; }

                .ctrl-gh {
                    font-size: 11px; font-weight: 700; color: #faa61a; text-decoration: none;
                    padding: 3px 8px; border-radius: 4px; background: rgba(250, 166, 26, 0.12);
                    border: 1px solid rgba(250, 166, 26, 0.4); white-space: nowrap;
                    position: relative; display: inline-flex; align-items: center; gap: 5px;
                    line-height: 1.2; transition: all 0.2s ease;
                    text-shadow: 0 0 5px rgba(250, 166, 26, 0.45);
                }
                .ctrl-gh:hover {
                    color: #ffffff; background: rgba(250, 166, 26, 0.25); border-color: #faa61a;
                    box-shadow: 0 0 10px rgba(250, 166, 26, 0.55);
                    text-shadow: 0 0 8px #faa61a, 0 0 12px rgba(255, 255, 255, 0.85);
                }
                .ctrl-gh .gh-tooltip {
                    position: absolute; top: calc(100% + 7px); right: 0;
                    background: #111214; color: #ffffff; padding: 5px 9px; border-radius: 4px;
                    font-size: 10px; font-weight: 600; white-space: nowrap;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6);
                    opacity: 0; visibility: hidden; pointer-events: none;
                    transition: opacity 0.2s ease, transform 0.2s ease;
                    transform: translateY(-2px); z-index: 1000010;
                    display: flex; align-items: center; gap: 5px;
                }
                .ctrl-gh .gh-tooltip::before {
                    content: ''; position: absolute; bottom: 100%; right: 12px;
                    border: 4px solid transparent; border-bottom-color: #111214;
                }
                #mirage-ui.rtl .ctrl-gh .gh-tooltip { right: auto; left: 0; }
                #mirage-ui.rtl .ctrl-gh .gh-tooltip::before { right: auto; left: 12px; }
                .ctrl-gh:hover .gh-tooltip { opacity: 1; visibility: visible; transform: translateY(0); }

#mirage-body { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; padding: 12px; overflow: hidden; }
                #mirage-options-panel { flex: 1 1 auto; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 4px; }
                #mirage-content { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }




                #mirage-logs {
                    flex: 0 0 105px; height: 105px; min-height: 105px; max-height: 105px;
                    padding: 8px 12px; background: #0c0d10;
                    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                    font-size: 11px; overflow-y: auto;
                    border-top: 1px solid rgba(255,255,255,0.08); scroll-behavior: smooth;
                    box-shadow: inset 0 2px 6px rgba(0,0,0,0.5);
                    direction: ltr !important; text-align: left !important;
                }
                .log-item { margin-bottom: 4px; display: flex; gap: 6px; line-height: 1.35; align-items: baseline; direction: ltr !important; }
                .log-prompt { color: #3ba55c; font-weight: 700; opacity: 0.8; }
                .log-ts { opacity: 0.45; font-size: 10px; color: #8a8e9b; }
                .log-text { word-break: break-word; }
                .c-info { color: #5865f2; } .c-success { color: #3ba55c; } .c-err { color: #f04747; } .c-warn { color: #faa61a; } .c-debug { color: #949ba4; }
                .log-empty { color: #4e5058; font-style: italic; display: flex; gap: 6px; align-items: center; }




                .task-card {
                    --state-color: #5865f2; --icon-bg-opacity: 15%; --icon-color: var(--state-color);
                    display: flex; gap: 12px; padding: 10px 12px; margin-bottom: 8px; align-items: center;
                    background: rgba(255,255,255,0.04); border-radius: 4px; border: 1px solid rgba(255,255,255,0.08);
                    border-left: 4px solid var(--state-color); box-shadow: 0 1px 3px rgba(0,0,0,0.2); transition: 0.3s; flex-shrink: 0;
                }
                #mirage-ui.rtl .task-card { border-left: 1px solid rgba(255,255,255,0.08); border-right: 4px solid var(--state-color); }
                .task-card.done { --state-color: #3ba55c; --icon-bg-opacity: 100%; --icon-color: #fff; }
                .task-card.failed { --state-color: #f04747; }
                .task-card.pending { --state-color: #faa61a; }
                .task-card.removing { animation: fadeOut 0.4s forwards; }




                .task-icon { position: relative; width: 40px; height: 40px; border-radius: 50%; flex: 0 0 auto; background-color: color-mix(in srgb, var(--state-color) var(--icon-bg-opacity), transparent); display: flex; align-items: center; justify-content: center; }
                .task-card.running .task-icon::before { content: ''; position: absolute; inset: 0; border-radius: 50%; z-index: 1; background: conic-gradient(#5865f2 0% var(--p, 0%), rgba(255,255,255,0.1) var(--p, 0%) 100%); -webkit-mask-image: radial-gradient(circle at center, transparent 16px, black 17px); mask-image: radial-gradient(circle at center, transparent 16px, black 17px); }




                .task-icon-inner { z-index: 2; color: var(--icon-color); display: flex; }
                .task-icon-overlay { position: absolute; inset: 0; z-index: 3; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #fff; opacity: 0; transition: opacity 0.2s; pointer-events: none; }
                .task-card.running:hover .task-icon-overlay { opacity: 1; }




                .task-info { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; justify-content: center; }
                .task-status { font-size: 10px; font-weight: 800; color: var(--state-color); text-transform: uppercase; letter-spacing: 0.5px; }
                .task-name { font-size: 13px; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
                .task-name-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 1 1 auto; }
                .task-meta { font-size: 11px; font-weight: 700; color: #8a8e9b; display: flex; justify-content: space-between; }
                .task-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 6px; margin-left: 4px; }




                .claim-btn, .goto-btn { padding: 6px 10px; border: none; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer; transition: 0.2s; text-transform: uppercase; white-space: nowrap; font-family: inherit; color: #fff; }
                .claim-btn { background: #3ba55c; }
                .claim-btn:hover:not(:disabled) { background: #2d8248; }
                .claim-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .claim-btn.failed { background: #4f545c; color: #dcddde; }
                .goto-btn { background: #5865f2; }
                .goto-btn:hover:not(:disabled) { background: #4752c4; }




                .picker-section-title { font-size: 11px; font-weight: 700; color: #8a8e9b; margin-top: 4px; margin-bottom: 6px; text-transform: uppercase; }
                .reward-filters { display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
                .reward-filter, .type-filter, .status-filter { background-color: transparent; border: 2px solid; padding: 4px 10px; border-radius: 24px; font-size: 10px; font-weight: 600; cursor: pointer; transition: 0.2s; font-family: inherit; }
                .status-filter { border-color: rgba(255,255,255,0.2); color: #dcddde; }
                .status-filter.active { background: #5865f2; border-color: #5865f2; color: #fff; }
                .status-filter.ready.active { background: #3ba55c; border-color: #3ba55c; }
                
                .type-filter {
                    border-color: #5865f2;
                    color: #fff;
                    background-color: rgba(88, 101, 242, 0.15);
                }
                .type-filter:hover:not(.off) {
                    background-color: rgba(88, 101, 242, 0.35);
                }
                .reward-filter.off, .type-filter.off {
                    background: transparent !important;
                    color: #8a8e9b !important;
                    border-color: rgba(255,255,255,0.15) !important;
                    opacity: 0.45;
                }




                .quest-badge-ready { background: rgba(59, 165, 92, 0.2); color: #3ba55c; border: 1px solid #3ba55c; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; flex-shrink: 0; white-space: nowrap; }
                .quest-badge-manual { background: rgba(240, 71, 71, 0.2); color: #f04747; border: 1px solid #f04747; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; flex-shrink: 0; white-space: nowrap; }
                .manual-cb-blocked { width: 20px; height: 20px; margin: 0; flex-shrink: 0; border: 1px solid rgba(240, 71, 71, 0.5); border-radius: 4px; background: rgba(240, 71, 71, 0.12); display: flex; align-items: center; justify-content: center; cursor: not-allowed; }




                #mirage-picker-form { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
                .picker-quest-list { display: flex; flex-direction: column; gap: 8px; flex: 1 1 auto; min-height: 0; overflow-y: auto; padding-right: 4px; }
                .quest-pick { display: flex; gap: 12px; padding: 10px; background: rgba(255,255,255,0.04); border-radius: 4px; border: 1px solid rgba(255,255,255,0.08); border-left-width: 4px; cursor: pointer; transition: 0.2s; align-items: center; flex-shrink: 0; }
                #mirage-ui.rtl .quest-pick { border-left-width: 1px; border-right-width: 4px; }
                .quest-pick:hover { filter: brightness(1.15); }
                .quest-pick.hidden { display: none !important; }




                .native-cb { appearance: none; width: 20px; height: 20px; margin: 0; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; background: transparent; cursor: pointer; display: grid; place-content: center; }
                .native-cb::before { content: ''; width: 12px; height: 12px; opacity: 0; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E"); background-size: contain; background-repeat: no-repeat; }
                .native-cb:checked { background: #5865f2; border-color: #5865f2; }
                .native-cb:checked::before { opacity: 1; }




                .picker-options { display: flex; flex-direction: column; gap: 8px; }
                .orion-option {
                    display: flex; justify-content: space-between; align-items: center;
                    background: rgba(255,255,255,0.04); padding: 10px 12px; border-radius: 6px;
                    border: 1px solid rgba(255,255,255,0.08); gap: 12px;
                }
                .option-text-group { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
                .orion-option-label { font-size: 13px; font-weight: 600; color: #fff; }
                .orion-option-desc { font-size: 11px; font-weight: 400; color: #8a8e9b; line-height: 1.35; }




                .segmented-bar {
                    position: relative; display: flex; background: rgba(0, 0, 0, 0.4); padding: 3px;
                    border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08); gap: 0; overflow: hidden;
                }
                .segmented-slider {
                    position: absolute; top: 3px; bottom: 3px; left: 3px;
                    width: calc((100% - 6px) / 4);
                    background: #5865f2; border-radius: 6px;
                    box-shadow: 0 2px 8px rgba(88, 101, 242, 0.45);
                    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
                    pointer-events: none; z-index: 1;
                }
                #mirage-ui.rtl .segmented-slider { left: auto; right: 3px; }
                .segmented-item {
                    position: relative; z-index: 2; flex: 1; text-align: center; padding: 6px 0;
                    font-size: 11px; font-weight: 700; color: #8a8e9b; border-radius: 6px; cursor: pointer;
                    transition: color 0.2s ease; user-select: none; border: none; background: transparent; font-family: inherit;
                }
                .segmented-item:hover { color: #fff; }
                .segmented-item.active { color: #fff; font-weight: 800; }
                .speed-val-badge { font-size: 11px; font-weight: 800; color: #5865f2; background: rgba(88,101,242,0.15); padding: 2px 8px; border-radius: 12px; }




                .speed-desc-box { font-size: 11px; font-weight: 600; margin-top: 2px; }
                .speed-desc-1 { color: #3ba55c; } .speed-desc-15 { color: #faa61a; } .speed-desc-2 { color: #e67e22; } .speed-desc-3 { color: #f04747; }




                .native-toggle { appearance: none; width: 40px; height: 20px; margin: 0; flex-shrink: 0; background: rgba(255,255,255,0.1); border-radius: 12px; cursor: pointer; position: relative; transition: 0.2s; border: 1px solid rgba(255,255,255,0.15); }
                .native-toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; background: white; border-radius: 50%; transition: 0.2s; }
                .native-toggle:checked { background: #5865f2; }
                .native-toggle:checked::after { transform: translateX(20px); }




                .speed-btn { border: 1px solid rgba(255,255,255,0.15); background: transparent; color: #8a8e9b; border-radius: 4px; padding: 4px 10px; font-size: 11px; font-weight: 700; cursor: pointer; transition: 0.2s; }
                .speed-btn.active { background: #5865f2; color: #fff; border-color: #5865f2; }




                .test-sound-btn { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; cursor: pointer; transition: 0.2s; }
                .test-sound-btn:hover { background: #5865f2; border-color: #5865f2; }




                .picker-actions { flex: 0 0 auto; display: flex; flex-direction: column; gap: 8px; padding-top: 10px; margin-top: auto; }
                .picker-btn-row { display: flex; gap: 10px; }
                .quest-pick-btn { flex: 1; padding: 10px; border: 1px solid; border-radius: 4px; font-size: 13px; font-weight: 700; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; font-family: inherit; color: #fff; }
                .quest-pick-btn.start { background-color: #3ba55c; border-color: #3ba55c; }
                .quest-pick-btn.start:hover:not(:disabled) { background: #2d8248; }
                .quest-pick-btn.deselect { background-color: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); color: #dcddde; }
                .quest-pick-btn.deselect:hover:not(:disabled) { background: rgba(255,255,255,0.08); }
                .quest-pick-btn:disabled { opacity: 0.5; cursor: not-allowed; }




                #mirage-toast-container { position: fixed; top: 20px; right: 20px; z-index: 1000002; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
                .mirage-toast {
                    pointer-events: auto; width: 300px; background: rgba(24, 25, 28, 0.95); backdrop-filter: blur(8px);
                    border: 1px solid #5865f2; border-left: 5px solid #5865f2; border-radius: 6px; padding: 10px 14px;
                    color: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.6); animation: slideToast 0.3s ease; display: flex; gap: 10px; align-items: center;
                    transition: 0.3s opacity, 0.3s transform; font-family: var(--font-primary, sans-serif);
                }
                .mirage-toast.toast-success { border-color: #3ba55c; border-left-color: #3ba55c; }
                .mirage-toast.toast-warn { border-color: #faa61a; border-left-color: #faa61a; }
                .mirage-toast.toast-err { border-color: #f04747; border-left-color: #f04747; }
                .mirage-toast.rtl { border-left: 1px solid; border-right: 5px solid; direction: rtl; }
                .mirage-toast.toast-success.rtl { border-right-color: #3ba55c; }
                .mirage-toast.toast-warn.rtl { border-right-color: #faa61a; }
                .mirage-toast.toast-err.rtl { border-right-color: #f04747; }
                .mirage-toast.fade-out { opacity: 0; transform: translateY(-15px); }
                .toast-icon { flex-shrink: 0; display: flex; }
                .toast-content { flex: 1; min-width: 0; }
                .toast-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #fff; }
                .toast-name { font-size: 12px; font-weight: 600; color: #dcddde; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }




                #mirage-ui ::-webkit-scrollbar { width: 4px; height: 4px; }
                #mirage-ui ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }


                /* Consent Modal */
                #mirage-consent { position: fixed; inset: 0; z-index: 1000005; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); font-family: var(--font-primary, sans-serif); }
                #mirage-consent.rtl { direction: rtl; }
                .consent-card { width: 430px; max-width: 92vw; background: #18191c; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); overflow: hidden; color: #dcddde; }
                .consent-head { padding: 14px 16px; background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.08); font-weight: 700; color: #fff; font-size: 14px; }
                .consent-body { padding: 16px; font-size: 13px; line-height: 1.45; display: flex; flex-direction: column; gap: 8px; }
                .consent-app-name { font-weight: 700; color: #5865f2; }
                .consent-scopes { font-size: 11px; color: #8a8e9b; }
                .consent-warning { font-size: 11px; color: #faa61a; background: rgba(250,166,26,0.1); border-left: 3px solid #faa61a; padding: 6px 10px; border-radius: 4px; }
                #mirage-consent.rtl .consent-warning { border-left: none; border-right: 3px solid #faa61a; }
                .consent-remember-label { display: flex; gap: 8px; align-items: center; font-size: 12px; color: #8a8e9b; cursor: pointer; margin-top: 4px; }
                .consent-timer { font-size: 11px; color: #8a8e9b; font-style: italic; }
                .consent-foot { display: flex; gap: 10px; padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.15); }
            `;
            document.head.appendChild(style);




            this.root = document.createElement("div");
            this.root.id = "mirage-ui";
            if (RUNTIME.lang === "ar") this.root.classList.add("rtl");




            this.root.innerHTML = `
                <div id="mirage-head">
                    <span id="mirage-title">${ICONS.BOLT} <span id="mirage-title-name">${t("title")}</span>
                        <span class="mirage-ver">${t("version")}</span>
                    </span>
                    <div id="mirage-controls">
                        <a href="${CONFIG.GITHUB_URL}" target="_blank" rel="noopener noreferrer" class="ctrl-btn ctrl-gh" id="mirage-gh" title="${t("ghTooltip")}">${ICONS.STAR} <span>GitHub</span><span class="gh-tooltip">${ICONS.STAR} <span>${t("ghTooltip")}</span></span></a>
                        <span class="ctrl-btn ctrl-stop" id="mirage-stop" title="Stop Script">${ICONS.STOP} ${t("stop")}</span>
                        <span class="ctrl-btn ctrl-refresh" id="mirage-refresh" title="${t("refresh")}">${ICONS.REFRESH} ${t("refresh")}</span>
                        <span class="ctrl-btn ctrl-hide" id="mirage-close" title="Minimize / Expand">${t("hide")}</span>
                        <span class="ctrl-btn ctrl-opts" id="mirage-opts" title="${t("opts")}">${ICONS.OPT}</span>
                    </div>
                </div>
                <div id="mirage-update-banner" style="display:none; padding:8px 14px; background:linear-gradient(90deg, rgba(88,101,242,0.22), rgba(88,101,242,0.12)); border-bottom:1px solid rgba(88,101,242,0.4); font-size:11px; font-weight:600; align-items:center; justify-content:space-between; flex-shrink:0;"></div>
                <div id="mirage-body">
                    <div id="mirage-options-panel" style="display:none;"></div>
                    <div id="mirage-content"><div style="text-align:center; padding:30px; color:#8a8e9b; font-size:12px;">Initializing System...</div></div>
                </div>
                <div id="mirage-logs">
                    <div class="log-empty"><span class="log-prompt">&gt;</span> <span id="mirage-log-ready">${t("cmdReady")}</span></div>
                </div>
            `;
            document.body.appendChild(this.root);




            Notifier.init();
            this.renderOptionsPanel();
            this.bindEvents();
            TaskStore.subscribe(() => this.render());
            this.startTicker();
            this.checkUpdates();
        },

        async checkUpdates() {
            if (!CONFIG.REPO) return;
            try {
                const res = await fetch(`https://api.github.com/repos/${CONFIG.REPO}/releases/latest`, {
                    headers: { "Accept": "application/vnd.github.v3+json" }
                });
                if (!res.ok) return;
                const data = await res.json();
                const latestTag = data.tag_name || data.name;
                if (!latestTag) return;

                const cleanLatest = latestTag.replace(/^v/, "").trim();
                const cleanCurrent = CONFIG.VERSION.replace(/^v/, "").trim();

                if (cleanLatest !== cleanCurrent) {
                    const banner = document.getElementById("mirage-update-banner");
                    if (banner) {
                        const isAr = RUNTIME.lang === "ar";
                        const updateMsg = isAr ? `يتوفر تحديث جديد للمشروع (${latestTag})` : `New update available (${latestTag})`;
                        const viewMsg = isAr ? "تحميل التحديث" : "Download Update";
                        const releaseLink = data.html_url || `https://github.com/${CONFIG.REPO}/releases`;
                        banner.innerHTML = `<span style="display:inline-flex; align-items:center; gap:6px;">🚀 <b>${updateMsg}</b></span> <a href="${releaseLink}" target="_blank" rel="noopener noreferrer" style="color:#fff; background:#5865f2; padding:3px 9px; border-radius:4px; font-weight:700; text-decoration:none; font-size:11px; transition:0.2s;">${viewMsg}</a>`;
                        banner.style.display = "flex";
                        this.log(isAr ? `[تحديث] يتوفر إصدار جديد (${latestTag}). تفضل بزيارة Releases للتحميل.` : `[Update] New version (${latestTag}) available. Check Releases page to update.`, "warn");
                    }
                }
            } catch (_) {}
        },
        renderOptionsPanel(rewardTypes = this._lastRewardTypes, questTypes = this._lastQuestTypes, counts = this._lastCounts) {
            this._lastRewardTypes = rewardTypes;
            this._lastQuestTypes = questTypes;
            this._lastCounts = counts;




            const panel = document.getElementById("mirage-options-panel");
            if (!panel) return;




            const getSpeedDescClass = () => RUNTIME.speed === 1 ? "speed-desc-1" : RUNTIME.speed === 1.5 ? "speed-desc-15" : RUNTIME.speed === 2 ? "speed-desc-2" : "speed-desc-3";
            const getSpeedDescText = () => RUNTIME.speed === 1 ? t("speed1Desc") : RUNTIME.speed === 1.5 ? t("speed15Desc") : RUNTIME.speed === 2 ? t("speed2Desc") : t("speed3Desc");




            panel.innerHTML = `
                <div class="picker-section-title">${t("filterStatus")}</div>
                <div class="reward-filters">
                    <button type="button" class="status-filter ${RUNTIME.statusFilter === "ALL" ? "active" : ""}" data-status="ALL">${t("statusAll")} (${counts.total || 0})</button>
                    <button type="button" class="status-filter ready ${RUNTIME.statusFilter === "READY" ? "active" : ""}" data-status="READY" style="color:#3ba55c; border-color:#3ba55c;">${t("statusReady")} (${counts.ready || 0})</button>
                    <button type="button" class="status-filter ${RUNTIME.statusFilter === "UNFINISHED" ? "active" : ""}" data-status="UNFINISHED">${t("statusUnfinished")} (${counts.unfinished || 0})</button>
                </div>




                ${rewardTypes.size > 1 ? `
                    <div class="picker-section-title">${t("filterReward")}</div>
                    <div class="reward-filters">
                        ${[...rewardTypes.values()].map((rt) => `<button type="button" class="reward-filter ${RUNTIME.activeRewards.has(String(rt.type)) ? "" : "off"}" data-rt="${rt.type}" style="color:${rt.color}; border-color:${rt.color};">${rt.label} (${rt.count})</button>`).join("")}
                    </div>
                ` : ""}
                ${questTypes.size > 1 ? `
                    <div class="picker-section-title">${t("filterType")}</div>
                    <div class="reward-filters">
                        ${[...questTypes].map((tp) => `<button type="button" class="type-filter ${RUNTIME.activeTypes.has(tp) ? "" : "off"}" data-qt="${tp}">${tp}</button>`).join("")}
                    </div>
                ` : ""}




                <div class="picker-section-title">${t("optionsTitle")}</div>
                <div class="picker-options">
                    <div class="orion-option">
                        <div class="option-text-group">
                            <span class="orion-option-label">${t("langLabel")}</span>
                            <span class="orion-option-desc">${t("langDesc")}</span>
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button type="button" class="speed-btn ${RUNTIME.lang === "en" ? "active" : ""}" id="opt-lang-en">English</button>
                            <button type="button" class="speed-btn ${RUNTIME.lang === "ar" ? "active" : ""}" id="opt-lang-ar">عربي</button>
                        </div>
                    </div>




                    <div class="orion-option" style="flex-direction:column; align-items:stretch; gap:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div class="option-text-group">
                                <span class="orion-option-label">${t("speedLabel")}</span>
                                <span class="orion-option-desc">${t("speedDesc")}</span>
                            </div>
                            <span class="speed-val-badge" id="speed-val-txt">${RUNTIME.speed}x</span>
                        </div>
                        <div class="segmented-bar" id="speed-segmented-bar">
                            <div class="segmented-slider" id="speed-slider"></div>
                            <button type="button" class="segmented-item ${RUNTIME.speed === 1 ? "active" : ""}" data-spd="1" data-idx="0">1x</button>
                            <button type="button" class="segmented-item ${RUNTIME.speed === 1.5 ? "active" : ""}" data-spd="1.5" data-idx="1">1.5x</button>
                            <button type="button" class="segmented-item ${RUNTIME.speed === 2 ? "active" : ""}" data-spd="2" data-idx="2">2x</button>
                            <button type="button" class="segmented-item ${RUNTIME.speed === 3 ? "active" : ""}" data-spd="3" data-idx="3">3x</button>
                        </div>
                        <div class="speed-desc-box ${getSpeedDescClass()}" id="speed-desc-txt">${getSpeedDescText()}</div>
                    </div>




                    <div class="orion-option">
                        <div class="option-text-group">
                            <span class="orion-option-label">${t("autoEnroll")}</span>
                            <span class="orion-option-desc">${t("autoEnrollDesc")}</span>
                        </div>
                        <input type="checkbox" id="opt-autoenroll" class="native-toggle" ${RUNTIME.autoEnroll ? "checked" : ""}>
                    </div>




                    <div class="orion-option">
                        <div class="option-text-group">
                            <span class="orion-option-label">${t("autoClaim")}</span>
                            <span class="orion-option-desc">${t("autoClaimDesc")}</span>
                        </div>
                        <input type="checkbox" id="opt-autoclaim" class="native-toggle" ${RUNTIME.autoClaim ? "checked" : ""}>
                    </div>




                    <div class="orion-option">
                        <div class="option-text-group">
                            <span class="orion-option-label">${t("showToasts")}</span>
                            <span class="orion-option-desc">${t("showToastsDesc")}</span>
                        </div>
                        <input type="checkbox" id="opt-toasts" class="native-toggle" ${RUNTIME.showToasts ? "checked" : ""}>
                    </div>




                    <div class="orion-option">
                        <div class="option-text-group">
                            <span class="orion-option-label">${t("playSound")}</span>
                            <span class="orion-option-desc">${t("playSoundDesc")}</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <button type="button" class="test-sound-btn" id="btn-test-sound">${t("testBtn")}</button>
                            <input type="checkbox" id="opt-sound" class="native-toggle" ${RUNTIME.playSound ? "checked" : ""}>
                        </div>
                    </div>




                    <div class="orion-option">
                        <div class="option-text-group">
                            <span class="orion-option-label">${t("randomDelay")}</span>
                            <span class="orion-option-desc">${t("randomDelayDesc")}</span>
                        </div>
                        <input type="checkbox" id="opt-randomdelay" class="native-toggle" ${RUNTIME.randomDelay ? "checked" : ""}>
                    </div>




                    <div class="orion-option">
                        <div class="option-text-group">
                            <span class="orion-option-label">${t("stealthMode")}</span>
                            <span class="orion-option-desc">${t("stealthModeDesc")}</span>
                        </div>
                        <input type="checkbox" id="opt-stealth" class="native-toggle" ${RUNTIME.stealthMode ? "checked" : ""}>
                    </div>




                    <div class="orion-option">
                        <div class="option-text-group">
                            <span class="orion-option-label">${t("wakeLock")}</span>
                            <span class="orion-option-desc">${t("wakeLockDesc")}</span>
                        </div>
                        <input type="checkbox" id="opt-wakelock" class="native-toggle" ${RUNTIME.wakeLock ? "checked" : ""}>
                    </div>
                </div>
            `;




            const updateSliderPos = (spd) => {
                const slider = document.getElementById("speed-slider");
                if (!slider) return;
                const idxMap = { 1: 0, 1.5: 1, 2: 2, 3: 3 };
                const idx = idxMap[spd] ?? 0;
                const isRtl = RUNTIME.lang === "ar";
                const offset = idx * 100;
                slider.style.transform = isRtl ? `translateX(-${offset}%)` : `translateX(${offset}%)`;
            };




            updateSliderPos(RUNTIME.speed);




            panel.querySelectorAll(".status-filter").forEach((btn) => {
                btn.onclick = () => {
                    RUNTIME.statusFilter = btn.getAttribute("data-status");
                    panel.querySelectorAll(".status-filter").forEach((b) => b.classList.remove("active"));
                    btn.classList.add("active");
                    this.applyFilters();
                };
            });




            panel.querySelectorAll(".reward-filter").forEach((btn) => {
                btn.onclick = () => {
                    const rt = btn.getAttribute("data-rt");
                    btn.classList.toggle("off");
                    if (btn.classList.contains("off")) RUNTIME.activeRewards.delete(rt);
                    else RUNTIME.activeRewards.add(rt);
                    this.applyFilters();
                };
            });




            panel.querySelectorAll(".type-filter").forEach((btn) => {
                btn.onclick = () => {
                    const qt = btn.getAttribute("data-qt");
                    btn.classList.toggle("off");
                    if (btn.classList.contains("off")) RUNTIME.activeTypes.delete(qt);
                    else RUNTIME.activeTypes.add(qt);
                    this.applyFilters();
                };
            });




            panel.querySelectorAll(".segmented-item[data-spd]").forEach((b) => {
                b.onclick = () => {
                    RUNTIME.speed = Number(b.getAttribute("data-spd"));
                    SafeStorage.set("mirage_speed", RUNTIME.speed);
                    panel.querySelectorAll(".segmented-item[data-spd]").forEach((x) => x.classList.remove("active"));
                    b.classList.add("active");
                    updateSliderPos(RUNTIME.speed);




                    const valBadge = document.getElementById("speed-val-txt");
                    if (valBadge) valBadge.textContent = `${RUNTIME.speed}x`;
                    const descEl = document.getElementById("speed-desc-txt");
                    if (descEl) {
                        descEl.className = `speed-desc-box ${getSpeedDescClass()}`;
                        descEl.textContent = getSpeedDescText();
                    }
                    Notifier.show(t("speedLabel"), `${RUNTIME.speed}x`, "info");
                };
            });




            const testSoundBtn = document.getElementById("btn-test-sound");
            if (testSoundBtn) testSoundBtn.onclick = () => Sound.play("force");




            const optLangEn = document.getElementById("opt-lang-en");
            if (optLangEn) {
                optLangEn.onclick = () => {
                    RUNTIME.lang = "en"; SafeStorage.set("mirage_lang_v3", "en");
                    Notifier.show(t("langLabel"), "English", "info");
                    this.updateLanguage();
                };
            }




            const optLangAr = document.getElementById("opt-lang-ar");
            if (optLangAr) {
                optLangAr.onclick = () => {
                    RUNTIME.lang = "ar"; SafeStorage.set("mirage_lang_v3", "ar");
                    Notifier.show(t("langLabel"), "العربية", "info");
                    this.updateLanguage();
                };
            }




            document.getElementById("opt-autoenroll").onchange = (e) => {
                RUNTIME.autoEnroll = e.target.checked; SafeStorage.set("mirage_autoenroll", RUNTIME.autoEnroll);
                Notifier.show(t("autoEnroll"), RUNTIME.autoEnroll ? t("featureEnabled") : t("featureDisabled"), "info");
            };
            document.getElementById("opt-autoclaim").onchange = (e) => {
                RUNTIME.autoClaim = e.target.checked; SafeStorage.set("mirage_autoclaim", RUNTIME.autoClaim);
                Notifier.show(t("autoClaim"), RUNTIME.autoClaim ? t("featureEnabled") : t("featureDisabled"), "info");
            };
            document.getElementById("opt-toasts").onchange = (e) => {
                RUNTIME.showToasts = e.target.checked; SafeStorage.set("mirage_toasts", RUNTIME.showToasts);
            };
            document.getElementById("opt-sound").onchange = (e) => {
                RUNTIME.playSound = e.target.checked; SafeStorage.set("mirage_playsound", RUNTIME.playSound);
                Notifier.show(t("playSound"), RUNTIME.playSound ? t("featureEnabled") : t("featureDisabled"), "info");
                if (RUNTIME.playSound) Sound.play("done");
            };
            document.getElementById("opt-randomdelay").onchange = (e) => {
                RUNTIME.randomDelay = e.target.checked; SafeStorage.set("mirage_randomdelay", RUNTIME.randomDelay);
                Notifier.show(t("randomDelay"), RUNTIME.randomDelay ? t("featureEnabled") : t("featureDisabled"), "info");
            };
            document.getElementById("opt-stealth").onchange = (e) => {
                RUNTIME.stealthMode = e.target.checked; SafeStorage.set("mirage_stealth", RUNTIME.stealthMode);
                Notifier.show(t("stealthMode"), RUNTIME.stealthMode ? t("featureEnabled") : t("featureDisabled"), "info");
            };
            document.getElementById("opt-wakelock").onchange = (e) => {
                RUNTIME.wakeLock = e.target.checked; SafeStorage.set("mirage_wakelock", RUNTIME.wakeLock);
                Notifier.show(t("wakeLock"), RUNTIME.wakeLock ? t("featureEnabled") : t("featureDisabled"), "info");
            };
        },




        applyFilters() {
            const form = document.getElementById("mirage-picker-form");
            if (!form) return;
            form.querySelectorAll(".quest-pick").forEach((el) => {
                const rt = el.getAttribute("data-rt");
                const qt = el.getAttribute("data-qt");
                const isReady = el.getAttribute("data-ready") === "true";




                let matchesStatus = true;
                if (RUNTIME.statusFilter === "READY") matchesStatus = isReady;
                else if (RUNTIME.statusFilter === "UNFINISHED") matchesStatus = !isReady;




                const matchesReward = RUNTIME.activeRewards.has(rt);
                const matchesType = RUNTIME.activeTypes.has(qt);




                el.classList.toggle("hidden", !(matchesReward && matchesType && matchesStatus));
            });
            const cbs = Array.from(form.querySelectorAll('.quest-pick:not(.hidden) input[type="checkbox"]'));
            const totalChecked = cbs.filter((cb) => cb.checked).length;




            const startBtnText = document.getElementById("start-btn-text");
            if (startBtnText) startBtnText.textContent = `${t("startBtn")} (${totalChecked})`;
            const startBtn = document.getElementById("start-btn");
            if (startBtn) startBtn.disabled = totalChecked === 0;
            const selectAllBtn = document.getElementById("select-all-btn");
            if (selectAllBtn) selectAllBtn.textContent = cbs.length > 0 && cbs.every((cb) => cb.checked) ? t("deselectAll") : t("selectAll");
        },




        updateLanguage() {
            this.root.classList.toggle("rtl", RUNTIME.lang === "ar");
            const titleNameEl = document.getElementById("mirage-title-name");
            if (titleNameEl) titleNameEl.textContent = t("title");
            const stopBtn = document.getElementById("mirage-stop");
            if (stopBtn) stopBtn.innerHTML = `${ICONS.STOP} ${t("stop")}`;
            const refBtn = document.getElementById("mirage-refresh");
            if (refBtn) refBtn.innerHTML = `${ICONS.REFRESH} ${t("refresh")}`;
            const closeBtn = document.getElementById("mirage-close");
            if (closeBtn) closeBtn.textContent = RUNTIME.minimized ? t("show") : t("hide");
            const readyPrompt = document.getElementById("mirage-log-ready");
            if (readyPrompt) readyPrompt.textContent = t("cmdReady");
            const ghBtn = document.getElementById("mirage-gh");
            if (ghBtn) {
                ghBtn.title = t("ghTooltip");
                const ttSpan = ghBtn.querySelector(".gh-tooltip span");
                if (ttSpan) ttSpan.textContent = t("ghTooltip");
            }




            this.renderOptionsPanel();
            if (document.getElementById("mirage-picker-form")) {
                if (typeof this._lastPickerRender === "function") {
                    this._lastPickerRender();
                } else {
                    this.refreshPickerStrings();
                }
            } else {
                this.render();
            }
        },




        refreshPickerStrings() {
            const selectAllBtn = document.getElementById("select-all-btn");
            const form = document.getElementById("mirage-picker-form");
            if (!form) return;
            const cbs = Array.from(form.querySelectorAll('.quest-pick:not(.hidden) input[type="checkbox"]'));
            if (selectAllBtn) selectAllBtn.textContent = cbs.length > 0 && cbs.every((cb) => cb.checked) ? t("deselectAll") : t("selectAll");
            const startBtnText = document.getElementById("start-btn-text");
            const totalChecked = cbs.filter((cb) => cb.checked).length;
            if (startBtnText) startBtnText.textContent = `${t("startBtn")} (${totalChecked})`;
            form.querySelectorAll(".quest-badge-ready").forEach(b => b.textContent = t("readyBadge"));
        },




        toggleOptions() {
            const panel = document.getElementById("mirage-options-panel");
            const content = document.getElementById("mirage-content");
            const logs = document.getElementById("mirage-logs");
            if (!panel || !content) return;




            RUNTIME.showingOptions = !RUNTIME.showingOptions;
            panel.style.display = RUNTIME.showingOptions ? "flex" : "none";
            content.style.display = RUNTIME.showingOptions ? "none" : "flex";
            if (logs) logs.style.display = RUNTIME.showingOptions ? "none" : "block";
        },




        bindEvents() {
            const head = document.getElementById("mirage-head");




            Cleanup.listen(head, "mousedown", (e) => {
                if (e.target.closest(".ctrl-btn")) return;
                head.classList.add("dragging");
                const startX = e.clientX, startY = e.clientY;
                const rect = this.root.getBoundingClientRect();
                const initialLeft = rect.left, initialTop = rect.top;




                this.root.style.left = `${initialLeft}px`;
                this.root.style.top = `${initialTop}px`;
                this.root.style.right = "auto";
                e.preventDefault();




                const onMouseMove = (ev) => {
                    this.root.style.left = `${Math.max(0, Math.min(initialLeft + (ev.clientX - startX), window.innerWidth - this.root.offsetWidth))}px`;
                    this.root.style.top = `${Math.max(0, Math.min(initialTop + (ev.clientY - startY), window.innerHeight - 50))}px`;
                };
                const onMouseUp = () => {
                    head.classList.remove("dragging");
                    document.removeEventListener("mousemove", onMouseMove);
                    document.removeEventListener("mouseup", onMouseUp);
                };
                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);
            });




            document.getElementById("mirage-close").onclick = () => {
                RUNTIME.minimized = !RUNTIME.minimized;
                this.root.classList.toggle("minimized", RUNTIME.minimized);
                document.getElementById("mirage-close").textContent = RUNTIME.minimized ? t("show") : t("hide");
            };




            document.getElementById("mirage-stop").onclick = () => {
                if (RUNTIME.isExecuting) {
                    RUNTIME.isExecuting = false;
                    RUNTIME.abortController.abort();
                    RUNTIME.abortController = new AbortController();
                    Patcher.clean();
                    TaskStore.clear();
                    Logger.log(t("logStopped"), "warn");
                    Notifier.show(t("stop"), t("tasksStoppedToast"), "warn");
                } else {
                    this.shutdown();
                }
            };




            document.getElementById("mirage-opts").onclick = () => this.toggleOptions();




            document.getElementById("mirage-refresh").onclick = () => {
                const refBtn = document.getElementById("mirage-refresh");
                refBtn.classList.add("spinning");
                Logger.log(t("logRefreshing"), "info");




                const quests = getAvailableQuests();
                Notifier.show(t("refreshToast"), `${quests.length} ${t("noQuests").toLowerCase()}`, "info");




                setTimeout(() => refBtn.classList.remove("spinning"), 500);




                if (!RUNTIME.isExecuting) {
                    showQuestPickerScreen();
                }
            };




            Cleanup.listen(document, "keydown", (e) => {
                if (e.shiftKey && (e.key === "M" || e.key === "m" || e.key === "ة")) this.toggle();
            });




            document.getElementById("mirage-body").addEventListener("click", async (e) => {
                if (e.target.id === "mirage-back-menu-btn") {
                    TaskStore.clear();
                    showQuestPickerScreen();
                    return;
                }




                if (e.target.id === "mirage-claim-all-btn") {
                    const claimBtns = document.querySelectorAll(".claim-btn:not(:disabled)");
                    for (const b of claimBtns) {
                        b.click();
                        if (!RUNTIME.running) break;
                        await sleep(rnd(2000, 4500)).catch(() => {});
                    }
                    return;
                }




                if (e.target.classList.contains("goto-btn")) {
                    if (Mods.Router?.transitionTo) Mods.Router.transitionTo("/quest-home");
                    return;
                }




                if (e.target.classList.contains("claim-btn")) {
                    const btn = e.target;
                    if (btn.disabled) return;
                    const questId = btn.getAttribute("data-id");
                    const task = TaskStore.get(questId);
                    if (!task) return;




                    btn.innerText = t("waitingBtn");
                    btn.disabled = true;
                    TaskStore.update(questId, { claimState: "WAITING" });




                    try {
                        const claimRes = await Tasks.claimReward(questId);
                        if (claimRes?.body?.claimed_at) {
                            btn.innerText = t("claimed");
                            Sound.play("tick");
                            Logger.log(`[Claim] Reward for "${task.name}" claimed successfully!`, "success");
                            Notifier.show(t("questClaimedToast"), task.name, "success");
                            RUNTIME.completedQuests.add(questId);
                            RecoveryManager.clear(questId);
                            TaskStore.update(questId, { status: "CLAIMED", claimable: false, claimState: null });
                            TaskStore.remove(questId);

                            setTimeout(() => {
                                if (!RUNTIME.isExecuting && TaskStore.getAll().length === 0) {
                                    showQuestPickerScreen();
                                }
                            }, 1200);
                        } else {
                            Logger.log(`[Claim] Reward claim for "${task.name}" not confirmed by Discord. Open Discord's Quests page to claim.`, "warn");
                            Notifier.show(t("failedBtn"), "Open Discord Quests to claim", "warn");
                            TaskStore.update(questId, { claimState: "FAILED" });
                        }
                    } catch (err) {
                        const msg = err?.body?.message || err?.message || "Verification needed";
                        Logger.log(`[Claim] Verification / Captcha required for "${task.name}": ${msg}`, "warn");
                        Notifier.show(t("failedBtn"), "Open Discord Quests to claim", "warn");
                        TaskStore.update(questId, { claimState: "FAILED" });
                    }
                }
            });
        },




        toggle() { this.root.style.display = this.root.style.display === "none" ? "flex" : "none"; },




        shutdown() {
            if (!RUNTIME.running) return;
            RUNTIME.running = false;
            RUNTIME.isExecuting = false;
            RUNTIME.abortController.abort();
            this.log(t("logCleaning"), "warn");




            if (this.tickerId) clearInterval(this.tickerId);




            Traffic.queue.forEach((req) => req.reject(new Error("Shutdown")));
            Traffic.queue = [];




            Cleanup.disposeAll();
            Patcher.clean();

            SafeStorage.remove("mirage_quest_history");




            setTimeout(() => {
                const styles = document.getElementById("mirage-styles");
                if (styles) styles.remove();
                if (this.root?.parentElement) this.root.remove();
                const toastContainer = document.getElementById("mirage-toast-container");
                if (toastContainer) toastContainer.remove();
                window.mirageLock = false;
            }, 500);
        },




        startTicker() {
            if (this.tickerId) clearInterval(this.tickerId);
            this.tickerId = setInterval(() => {
                if (!RUNTIME.running || !RUNTIME.isExecuting) return;
                for (const task of TaskStore.getAll()) {
                    if (task.status !== "RUNNING" || task.type === "ACHIEVEMENT") continue;
                    let cur;
                    if (task.type === "GAME" || task.type === "STREAM") {
                        if (task.serverAt == null) continue;
                        cur = Math.min(task.serverCur + (Date.now() - task.serverAt) / 1000, task.max);
                    } else {
                        cur = Math.min(task.cur + (1 * RUNTIME.speed), task.max);
                    }
                    TaskStore.update(task.id, { cur });
                }
            }, 1000);
        },




        log(msg, type = "info") {
            const colors = { info: "#5865F2", success: "#3BA55C", warn: "#faa61a", err: "#f04747", debug: "#999" };
            console.log(`%c[MIRAGE] %c${msg}`, `color: ${CONFIG.THEME}; font-weight: bold;`, `color: ${colors[type] || colors.info}`);




            try {
                const box = document.getElementById("mirage-logs");
                if (box && type !== "debug") {
                    const emptyPlaceholder = box.querySelector(".log-empty");
                    if (emptyPlaceholder) emptyPlaceholder.remove();




                    const el = document.createElement("div");
                    el.className = `log-item c-${type}`;
                    el.innerHTML = `<span class="log-prompt">&gt;</span> <span class="log-ts">${new Date().toLocaleTimeString().split(" ")[0]}</span> <span class="log-text">${esc(msg)}</span>`;
                    box.appendChild(el);
                    box.scrollTop = box.scrollHeight;
                    while (box.children.length > CONFIG.MAX_LOGS) box.firstChild.remove();
                }
            } catch (_) {}
        },




        render() {
            if (document.getElementById("mirage-picker-form")) return;
            const content = document.getElementById("mirage-content");
            if (!content) return;




            const allTasks = TaskStore.getAll();
            if (!allTasks.length) {
                return (content.innerHTML = `<div style="text-align:center; padding:30px; color:#8a8e9b; font-size:13px;">${t("noQuestsFound")}</div>`);
            }




            const sorted = [...allTasks].sort((a, b) => {
                if (a.done !== b.done) return a.done ? 1 : -1;
                if (a.failed !== b.failed) return a.failed ? 1 : -1;
                if (a.pending !== b.pending) return a.pending ? 1 : -1;
                return (b.cur / (b.max || 1)) - (a.cur / (a.max || 1));
            });




            const hasClaimable = sorted.some((x) => x.claimable);




            content.innerHTML = `
                <div style="flex:1 1 auto; min-height:0; overflow-y:auto; padding-right:4px;">
                    ${sorted.map((tsk) => {
                        const pct = tsk.pending || tsk.failed ? 0 : Math.min(100, (tsk.cur / tsk.max) * 100).toFixed(1);
                        const icon = tsk.done ? ICONS.CHECK : tsk.failed ? ICONS.STOP : tsk.pending ? ICONS.CLOCK : tsk.type === "VIDEO" ? ICONS.VIDEO : tsk.type === "ACHIEVEMENT" ? ICONS.ACTIVITY : tsk.type?.includes("GAME") ? ICONS.GAME : tsk.type?.includes("STREAM") ? ICONS.STREAM : ICONS.BOLT;




                        let statusText = tsk.status === "CLAIMED" ? t("claimed") : tsk.done ? t("completed") : tsk.status;
                        let progressLabel = tsk.pending ? t("waiting") : tsk.failed ? "Aborted" : "Progress";




                        let actionBtn = "";
                        if (tsk.claimable) {
                            if (tsk.claimState === "WAITING") actionBtn = `<button class="claim-btn" disabled>${t("waitingBtn")}</button>`;
                            else if (tsk.claimState === "FAILED") actionBtn = `<button class="goto-btn">${t("goToQuests")}</button>`;
                            else actionBtn = `<button class="claim-btn" data-id="${tsk.id}">${t("claimBtn")}</button>`;
                        } else if (tsk.actionRequired === "ENROLL" || (tsk.type === "ACHIEVEMENT" && tsk.status === "RUNNING") || tsk.actionRequired === "MANUAL") {
                            statusText = t("failedBtn");
                            actionBtn = `<button class="goto-btn">${t("goToQuests")}</button>`;
                        }




                        const stateClass = tsk.done ? "done" : tsk.failed ? "failed" : tsk.pending ? "pending" : "running";
                        const removingClass = tsk.removing ? "removing" : "";




                        return `
                        <div id="mirage-task-${tsk.id}" class="task-card ${stateClass} ${removingClass}">
                            <div class="task-icon" style="--p: ${pct}%">
                                <div class="task-icon-inner">${icon}</div>
                                ${stateClass === "running" ? `<div class="task-icon-overlay">${Math.floor(pct)}%</div>` : ""}
                            </div>
                            <div class="task-info">
                                <div class="task-status">${statusText}</div>
                                <div class="task-name" title="${esc(tsk.name)}">${esc(tsk.name)}</div>
                                ${!tsk.done ? `
                                <div class="task-meta">
                                    <span>${progressLabel}</span>
                                    ${actionBtn ? "" : `<span class="progress-text">${Math.min(Math.floor(tsk.cur), tsk.max)} / ${tsk.max}s</span>`}
                                </div>` : ""}
                            </div>
                            ${actionBtn ? `<div class="task-actions">${actionBtn}</div>` : ""}
                        </div>`;
                    }).join("")}
                </div>
                ${hasClaimable || !RUNTIME.isExecuting ? `
                <div style="display:flex; gap:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.08); flex-shrink:0;">
                    ${hasClaimable ? `<button type="button" id="mirage-claim-all-btn" class="claim-btn" style="flex:1; padding:8px;">${t("claimAllBtn")}</button>` : ""}
                    ${!RUNTIME.isExecuting ? `<button type="button" id="mirage-back-menu-btn" class="quest-pick-btn deselect" style="flex:1; padding:8px; font-size:11px;">${t("backToMenu")}</button>` : ""}
                </div>` : ""}
            `;
        },




        showQuestPicker(quests) {
            RUNTIME.cachedQuests = quests;
            return new Promise((resolve) => {
                const content = document.getElementById("mirage-content");
                const closePicker = (selected) => {
                    if (content) content.innerHTML = "";
                    resolve(selected);
                };




                if (!content) return closePicker(new Set());




                const items = [];
                const rewardTypes = new Map();
                const questTypes = new Set();
                let readyCount = 0;
                let unfinishedCount = 0;




                const REWARD_META = { 1: { label: "IN-GAME", color: "#e67e22" }, 3: { label: "AVATAR DECORATION", color: "#a358f2" }, 4: { label: "ORBS", color: "#faa61a" } };




                quests.forEach((q) => {
                    const cfg = q.config?.taskConfigV2 ?? q.config?.taskConfig;
                    if (!cfg?.tasks) return;
                    const typeData = detectTaskType(cfg, q.config?.application?.id);
                    if (!typeData || !typeData.type) return;




                    if (!SYS.IS_DESKTOP && (typeData.type === "GAME" || typeData.type === "STREAM")) return;




                    const rw = q.config?.rewardsConfig?.rewards?.[0];
                    const rewardType = rw?.type ?? 0;
                    const rewardText = rw?.messages?.name ?? "Reward";
                    const orbQty = rw?.orbQuantity || 0;
                    const meta = REWARD_META[rewardType] ?? { label: "OTHER", color: "#949ba4" };




                    const isReady = isQuestCompleted(q, typeData);
                    if (isReady) readyCount++;
                    else unfinishedCount++;




                    questTypes.add(typeData.type);
                    if (!rewardTypes.has(rewardType)) {
                        rewardTypes.set(rewardType, { label: meta.label, count: 0, type: rewardType, color: meta.color });
                    }
                    rewardTypes.get(rewardType).count++;




                    items.push({
                        id: q.id,
                        name: q.config?.messages?.questName ?? "Unknown Quest",
                        type: typeData.type,
                        rewardType,
                        rewardText,
                        color: meta.color,
                        orbQty,
                        isReady
                    });
                });




                if (!items.length) {
                    content.innerHTML = `<div style="text-align:center; padding:30px; color:#8a8e9b; font-size:13px;">${t("noQuestsFound")}</div>`;
                    return closePicker(new Set());
                }




                if (RUNTIME.activeRewards.size === 0) {
                    RUNTIME.activeRewards = new Set([...rewardTypes.keys()].map(String));
                }
                if (RUNTIME.activeTypes.size === 0) {
                    RUNTIME.activeTypes = new Set([...questTypes]);
                }
                this.renderOptionsPanel(rewardTypes, questTypes, { ready: readyCount, unfinished: unfinishedCount, total: items.length });




                const renderPickerContent = () => {
                    Logger._lastPickerRender = renderPickerContent;
                    const buildCard = (q) => {
                        const orbText = RUNTIME.lang === "ar" ? "أورب" : "Orbs";
                        const rewardLabel = (q.rewardType === 4 && q.orbQty > 0)
                            ? `<span style="color:#faa61a; font-weight:800;">+${q.orbQty} ${orbText}</span>`
                            : `<span style="color:${q.color}; font-weight:700;">${esc(q.rewardText)}</span>`;


                        const hasOrion = typeof window !== "undefined" && Boolean(window.VencordNative?.pluginHelpers?.OrionQuests || window.VencordNative?.pluginHelpers?.MirageQuests);
                        const isManualAchievement = (q.type === "ACHIEVEMENT") && !hasOrion;
                        const orionBadgeText = RUNTIME.lang === "ar" ? "تخطي تلقائي (Vencord)" : "ORION BYPASS ACTIVE";
                        const manualBadge = (q.type === "ACHIEVEMENT")
                            ? (hasOrion
                                ? `<span class="quest-badge-manual" style="background:rgba(59,165,92,0.15); color:#3ba55c; border:1px solid rgba(59,165,92,0.4);" title="${orionBadgeText}">${orionBadgeText}</span>`
                                : `<span class="quest-badge-manual" title="${t("activityManualNote")}">${t("failedBtn")}</span>`)
                            : "";


                        const typeMap = RUNTIME.lang === "ar" ? { ACHIEVEMENT: "إنجاز (نشاط)", GAME: "لعبة كمبيوتر", VIDEO: "مقطع فيديو", VOICE: "نشاط صوتي", STREAM: "بث مباشر" } : {};
                        const displayType = typeMap[q.type] || q.type;


                        const cbControl = isManualAchievement
                            ? `<div class="manual-cb-blocked" title="${t("activityManualNote")}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f04747" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>`
                            : `<input type="checkbox" name="quests" value="${q.id}" class="native-cb" checked>`;


                        return `
                        <label class="quest-pick" data-rt="${q.rewardType}" data-qt="${q.type}" data-ready="${q.isReady}" style="border-left-color: ${q.color}; border-right-color: ${q.color}; ${isManualAchievement ? "opacity: 0.8; cursor: not-allowed;" : "cursor: pointer;"}">
                            ${cbControl}
                            <div class="task-info">
                                <div class="task-name" title="${esc(q.name)}">
                                    <span class="task-name-text">${esc(q.name)}</span>
                                    ${q.isReady ? `<span class="quest-badge-ready">${t("readyBadge")}</span>` : ""}
                                    ${manualBadge}
                                </div>
                                <div class="task-meta" style="justify-content: flex-start; gap: 8px;">
                                    <span style="text-transform: uppercase; color: #8a8e9b;">${esc(displayType)}</span>
                                    ${rewardLabel}
                                    ${isManualAchievement ? `<span style="color:#f04747; font-size:10px;">(${t("activityManualNote")})</span>` : ""}
                                </div>
                            </div>
                        </label>`;
                    };


                    content.innerHTML = `
                        <form id="mirage-picker-form">
                            <div id="mirage-quest-list" class="picker-quest-list">${items.map(buildCard).join("")}</div>
                            <div class="picker-actions">
                                <div class="picker-btn-row">
                                    <button type="button" class="quest-pick-btn deselect" id="select-all-btn">${t("deselectAll")}</button>
                                    <button type="submit" class="quest-pick-btn start" id="start-btn">${ICONS.BOLT} <span id="start-btn-text">${t("startBtn")} (${items.filter(x => x.type !== "ACHIEVEMENT" || (typeof window !== "undefined" && Boolean(window.VencordNative?.pluginHelpers?.OrionQuests || window.VencordNative?.pluginHelpers?.MirageQuests))).length})</span></button>
                                </div>
                            </div>
                        </form>
                    `;


                    const form = document.getElementById("mirage-picker-form");
                    const selectAllBtn = document.getElementById("select-all-btn");
                    const startBtn = document.getElementById("start-btn");


                    const syncUI = () => {
                        const cbs = Array.from(form.querySelectorAll('.quest-pick:not(.hidden) input[type="checkbox"]:not(:disabled)'));
                        const totalChecked = cbs.filter((cb) => cb.checked).length;
                        const startBtnText = document.getElementById("start-btn-text");
                        if (startBtnText) startBtnText.textContent = `${t("startBtn")} (${totalChecked})`;
                        startBtn.disabled = totalChecked === 0;
                        selectAllBtn.textContent = cbs.length > 0 && cbs.every((cb) => cb.checked) ? t("deselectAll") : t("selectAll");
                    };


                    form.addEventListener("change", (e) => { if (e.target.name === "quests") syncUI(); });


                    form.addEventListener("click", (e) => {
                        if (e.target.id === "select-all-btn") {
                            const cbs = Array.from(form.querySelectorAll('.quest-pick:not(.hidden) input[type="checkbox"]:not(:disabled)'));
                            const shouldCheck = !cbs.every((cb) => cb.checked);
                            cbs.forEach((cb) => (cb.checked = shouldCheck));
                            syncUI();
                        }
                    });


                    form.addEventListener("submit", (e) => {
                        e.preventDefault();
                        const selected = Array.from(form.querySelectorAll('.quest-pick:not(.hidden) input[type="checkbox"]'));
                        closePicker(new Set(selected.filter((cb) => cb.checked).map((cb) => cb.value)));
                    });


                    this.applyFilters();
                };


                renderPickerContent();
            });
        }
    };
    /* ── 11. Discord Modules Extractor ── */
    let Mods = {};


    function findShowCurrentGameSetting(moduleCache) {
        if (!moduleCache) return undefined;
        let actions, delay, BoolValue;
        for (const m of Object.values(moduleCache)) {
            try {
                const exp = m?.exports;
                if (!exp || typeof exp !== 'object') continue;
                for (const key of Object.keys(exp)) {
                    const p = exp[key];
                    if (!p) continue;
                    if (!BoolValue && typeof p.create === 'function' && String(p.typeName ?? '').includes('Bool')) BoolValue = p;
                    if (!actions && typeof p.updateAsync === 'function' && (p.ProtoClass?.typeName?.endsWith('.PreloadedUserSettings') || p.type === 1)) {
                        actions = p;
                        delay = exp.UserSettingsDelay?.INFREQUENT_USER_ACTION ?? 0;
                    }
                }
                if (actions && BoolValue) break;
            } catch (_) {}
        }
        if (!actions) return undefined;
        return {
            getSetting: () => actions.getCurrentValue?.()?.status?.showCurrentGame?.value,
            updateSetting: value => actions.updateAsync('status', settings => {
                if (settings.showCurrentGame && typeof settings.showCurrentGame.value === 'boolean') {
                    settings.showCurrentGame.value = value;
                } else if (BoolValue) {
                    settings.showCurrentGame = BoolValue.create({ value });
                } else {
                    throw new Error('BoolValue proto type not found');
                }
            }, delay)
        };
    }
    function loadModules() {
        try {
            if (typeof window.Vencord !== "undefined" && window.Vencord.Webpack) {
                const W = window.Vencord.Webpack;
                let routerModule;
                try {
                    const m = W.findByCode("transitionTo -");
                    if (m) {
                        for (const prop of [m, m.default, ...Object.values(m)]) {
                            if (typeof prop === "function" && prop.toString().includes("transitionTo -")) {
                                routerModule = { transitionTo: prop };
                                break;
                            }
                        }
                    }
                } catch (_) {}




                Mods = {
                    QuestStore: W.findStore("QuestStore") || W.findStore("QuestsStore"),
                    RunStore: W.findStore("RunningGameStore"),
                    StreamStore: W.findStore("ApplicationStreamingStore"),
                    ChanStore: W.findStore("ChannelStore"),
                    GuildChanStore: W.findStore("GuildChannelStore"),
                    UserStore: W.findStore("UserStore"),
                    Dispatcher: W.Common?.FluxDispatcher || W.findByProps("dispatch", "subscribe"),
                    API: W.Common?.RestAPI || W.findByProps("get", "post", "del"),
                    Router: routerModule,
                    ShowCurrentGame: findShowCurrentGameSetting(W.cache || W.wreq?.c)
                };
                Patcher.init(Mods.RunStore);
                return !!(Mods.QuestStore && Mods.RunStore && Mods.Dispatcher && Mods.API);
            } else if (typeof webpackChunkdiscord_app !== "undefined") {
                let req;
                webpackChunkdiscord_app.push([[Symbol()], {}, (r) => {
                    const cur = Object.keys(req?.c || {}).length;
                    const incoming = Object.keys(r?.c || {}).length;
                    if (!req || incoming > cur) req = r;
                }]);
                webpackChunkdiscord_app.pop();




                if (!req?.c) return false;
                const modules = Object.values(req.c);




                const findStore = (name) => modules.find((m) => m?.exports?.__proto__?.constructor?.displayName === name || m?.exports?.default?.__proto__?.constructor?.displayName === name)?.exports;
                const findDispatcher = () => modules.find((m) => m?.exports?.dispatch && m?.exports?.subscribe)?.exports;
                const findAPI = () => modules.find((m) => m?.exports?.get && m?.exports?.post && !m?.exports?._dispatcher)?.exports;




                let routerModule;
                for (const m of modules) {
                    try {
                        const exp = m?.exports;
                        if (!exp) continue;
                        for (const prop of [exp, exp.default, ...Object.values(exp)]) {
                            if (typeof prop === "function" && prop.toString().includes("transitionTo -")) {
                                routerModule = { transitionTo: prop };
                                break;
                            }
                        }
                    } catch (_) {}
                }




                Mods = {
                    QuestStore: findStore("QuestStore") || findStore("QuestsStore"),
                    RunStore: findStore("RunningGameStore"),
                    StreamStore: findStore("ApplicationStreamingStore"),
                    ChanStore: findStore("ChannelStore"),
                    GuildChanStore: findStore("GuildChannelStore"),
                    UserStore: findStore("UserStore"),
                    Dispatcher: findDispatcher(),
                    API: findAPI(),
                    Router: routerModule,
                    ShowCurrentGame: findShowCurrentGameSetting(req.c)
                };
                Patcher.init(Mods.RunStore);
                return !!(Mods.QuestStore && Mods.RunStore && Mods.Dispatcher && Mods.API);
            }
            return false;
        } catch (e) {
            Logger.log(`[System] Module loading error: ${e?.message ?? e}`, "err");
            return false;
        }
    }




    /* ── 12. Game & Activity Patcher ── */
    const Patcher = {
        games: [],
        real: {},
        active: false,
        savedShowCurrentGame: null,
        _unhide: null,
        PATCHED: ["getRunningGames", "getGameForPID", "getVisibleGame", "getVisibleRunningGames", "getCandidateGames", "getRunningDiscordApplicationIds"],




        init(Store) {
            if (!Store) return;
            this.real = {};
            for (const name of this.PATCHED) {
                if (typeof Store[name] === "function") this.real[name] = Store[name];
            }
            const absent = this.PATCHED.filter((n) => !this.real[n]);
            if (absent.length) Logger.log(`[Patcher] Store lacks ${absent.join(", ")} — not patching those.`, "debug");
        },


        syncPresenceSuppression() {
            const setting = Mods.ShowCurrentGame;
            const shouldSuppress = RUNTIME.stealthMode && this.games.length > 0;


            if (!setting) {
                if (shouldSuppress) Logger.log('[Patcher] status.showCurrentGame not found, cannot hide activity.', 'warn');
                return;
            }


            if (shouldSuppress && this.savedShowCurrentGame === null) {
                try {
                    this.savedShowCurrentGame = setting.getSetting() !== false;
                    if (this.savedShowCurrentGame) {
                        Promise.resolve(setting.updateSetting(false)).catch(e =>
                            Logger.log(`[Patcher] Could not turn showCurrentGame off: ${e.message}`, 'warn'));
                        this._unhide = () => { try { setting.updateSetting(true); } catch (_) {} };
                        window.addEventListener('pagehide', this._unhide);
                        Logger.log(t('stealthActiveLog'), 'info');
                    }
                } catch (e) {
                    this.savedShowCurrentGame = null;
                    Logger.log(`[Patcher] showCurrentGame read failed: ${e.message}`, 'warn');
                }
            } else if (!shouldSuppress && this.savedShowCurrentGame !== null) {
                const restore = this.savedShowCurrentGame;
                this.savedShowCurrentGame = null;
                if (this._unhide) { window.removeEventListener('pagehide', this._unhide); this._unhide = null; }
                if (restore) {
                    try {
                        Promise.resolve(setting.updateSetting(true)).catch(e =>
                            Logger.log(`[Patcher] Failed to restore showCurrentGame: ${e.message}`, 'err'));
                        Logger.log(t('stealthRestoredLog'), 'info');
                    } catch (e) {
                        Logger.log(`[Patcher] Failed to restore showCurrentGame: ${e.message}`, 'err');
                    }
                }
            }
        },




        toggle(on) {
            const S = Mods.RunStore;
            if (!S) return;
            const real = this.real;




            if (on && !this.active) {
                if (real.getRunningGames) S.getRunningGames = () => [...real.getRunningGames.call(S), ...this.games];
                if (real.getGameForPID) S.getGameForPID = (pid) => this.games.find((g) => g.pid === pid) || real.getGameForPID.call(S, pid);
                
                if (real.getVisibleGame) {
                    S.getVisibleGame = () => RUNTIME.stealthMode ? (real.getVisibleGame.call(S) || null) : (this.games[0] ?? real.getVisibleGame.call(S));
                }
                if (real.getVisibleRunningGames) {
                    S.getVisibleRunningGames = () => RUNTIME.stealthMode ? real.getVisibleRunningGames.call(S) : [...real.getVisibleRunningGames.call(S), ...this.games];
                }
                if (real.getCandidateGames) S.getCandidateGames = () => [...real.getCandidateGames.call(S), ...this.games];
                if (real.getRunningDiscordApplicationIds) {
                    S.getRunningDiscordApplicationIds = () => {
                        const ids = real.getRunningDiscordApplicationIds.call(S);
                        const ours = this.games.map((g) => String(g.id));
                        return ids instanceof Set ? new Set([...ids, ...ours]) : [...(ids ?? []), ...ours];
                    };
                }
                this.active = true;
            } else if (!on && this.active) {
                for (const [name, fn] of Object.entries(real)) S[name] = fn;
                this.active = false;
            }
        },




        add(g) {
            if (this.games.some((x) => x.pid === g.pid)) return;
            this.games.push(g);
            this.toggle(true);
            this.syncPresenceSuppression();
            Mods.Dispatcher?.dispatch({ type: CONST.EVT.GAME, added: [g], removed: [], games: Mods.RunStore.getRunningGames() });
            
            try {
                Mods.Dispatcher?.dispatch({
                    type: CONST.EVT.RPC, socketId: null, pid: g.pid,
                    activity: {
                        application_id: g.id,
                        name: g.name,
                        type: 0,
                        details: null,
                        state: null,
                        timestamps: { start: g.start },
                        icon: g.icon,
                        assets: null
                    }
                });
            } catch (_) {}
        },




        remove(g) {
            const before = this.games.length;
            this.games = this.games.filter((x) => x.pid !== g.pid);
            if (this.games.length === before) return;




            Mods.Dispatcher?.dispatch({ type: CONST.EVT.GAME, added: [], removed: [g], games: Mods.RunStore.getRunningGames() });
            this.syncPresenceSuppression();
            
            try { Mods.Dispatcher?.dispatch({ type: CONST.EVT.RPC, socketId: null, pid: g.pid, activity: null }); } catch (_) {}




            if (!this.games.length) {
                this.toggle(false);
                this.syncPresenceSuppression();
            } else {
                try {
                    const first = this.games[0];
                    Mods.Dispatcher?.dispatch({
                        type: CONST.EVT.RPC, socketId: null, pid: first.pid,
                        activity: { application_id: first.id, name: first.name, type: 0, timestamps: { start: first.start }, icon: first.icon }
                    });
                } catch (_) {}
            }
        },




        clean() {
            for (const g of this.games) {
                try { Mods.Dispatcher?.dispatch({ type: CONST.EVT.RPC, socketId: null, pid: g.pid, activity: null }); } catch (_) {}
            }
            this.games = [];
            this.toggle(false);
            this.syncPresenceSuppression();
        }
    };




    /* ── 13. Tasks Handlers & Claim Logic ── */
    const Tasks = {
        retryFailedMap: new Map(),
        outcomes: new Map(),
        _streamReal: undefined,
        _streamSpoofs: 0,
        _relayUrl: 'http://127.0.0.1:43210',
        _relayProbe: null,
        _relayProbeAt: 0,
        RELAY_PROBE_TTL: 60000,


        sanitize(name) {
            return String(name ?? "").replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, " ");
        },


        async fetchGameData(appId, appName) {
            try {
                const res = await Mods.API.get({ url: `/applications/public?application_ids=${appId}` });
                const appData = res?.body?.[0];
                const exeEntry = appData?.executables?.find((x) => x.os === "win32");
                const rawExe = exeEntry ? exeEntry.name.replace(">", "") : `${this.sanitize(appName)}.exe`;
                const cleanName = this.sanitize(appData?.name || appName);


                const templates = [
                    (c, e) => ({ cmd: `C:\\Program Files (x86)\\Steam\\steamapps\\common\\${c}\\${e}`, exe: `c:/program files (x86)/steam/steamapps/common/${c.toLowerCase()}/${e}` }),
                    (c, e) => ({ cmd: `C:\\Program Files\\Epic Games\\${c}\\${e}`, exe: `c:/program files/epic games/${c.toLowerCase()}/${e}` }),
                    (c, e) => ({ cmd: `C:\\Program Files\\${c}\\${e}`, exe: `c:/program files/${c.toLowerCase()}/${e}` }),
                    (c, e) => ({ cmd: `D:\\Games\\${c}\\${e}`, exe: `d:/games/${c.toLowerCase()}/${e}` })
                ];
                const numId = Number(String(appId).slice(-4)) || 0;
                const pathObj = templates[numId % templates.length](cleanName, rawExe);


                return {
                    name: appData?.name || appName,
                    icon: appData?.icon,
                    exeName: rawExe,
                    cmdLine: pathObj.cmd,
                    exePath: pathObj.exe,
                    id: appId
                };
            } catch (e) {
                const cleanName = this.sanitize(appName);
                const safeExe = `${cleanName.replace(/\s+/g, "")}.exe`;
                return {
                    name: appName,
                    exeName: safeExe,
                    cmdLine: `C:\\Program Files\\${cleanName}\\${safeExe}`,
                    exePath: `c:/program files/${cleanName.toLowerCase()}/${safeExe}`,
                    id: appId
                };
            }
        },


        async claimReward(questId) {
            const sealed = sealedFor(questId);
            const payload = {
                platform: 0,
                location: 11,
                is_targeted: false,
                metadata_sealed: null,
                traffic_metadata_sealed: sealed
            };
            try {
                return await Mods.API.post({
                    url: `/quests/${questId}/claim-reward`,
                    body: payload
                });
            } catch (err) {
                if (err?.status === 404 || err?.status === 400) {
                    Logger.log(`[Claim] Fallback to /claim for ${questId} (HTTP ${err.status})`, "debug");
                    return await Mods.API.post({
                        url: `/quests/${questId}/claim`,
                        body: { platform: 0 }
                    });
                }
                throw err;
            }
        },


        failTask(q, tInfo, reason) {
            TaskStore.update(q.id, { name: tInfo.name, type: tInfo.type, cur: 0, max: tInfo.target, status: "FAILED" });
            Logger.log(`[${tInfo.name}] Failed: ${reason}`, "err");
            Notifier.show(t("questFailedToast"), `${tInfo.name}: ${reason}`, "err");
            RUNTIME.failedQuests.add(q.id);
            Tasks.outcomes.set(q.id, 'failed');
            RecoveryManager.clear(q.id);
            TaskStore.remove(q.id);
        },


        logProgress(tInfo, cur) {
            const pct = Math.min(100, (cur / (tInfo.target || 1)) * 100).toFixed(0);
            const rem = Math.max(0, Math.ceil(tInfo.target - cur));
            const remMin = (rem / 60).toFixed(1);
            Logger.log(`[${tInfo.name}] ${pct}% (${Math.floor(cur)}/${tInfo.target}s) | Rem: ${rem}s (~${remMin}m)`, "info");
        },


        async _probeRelay() {
            if (this._relayProbe && Date.now() - this._relayProbeAt < this.RELAY_PROBE_TTL) return this._relayProbe;
            this._relayProbeAt = Date.now();
            return (this._relayProbe = (async () => {
                try {
                    const r = await Promise.race([
                        fetch(`${this._relayUrl}/health`, { method: 'GET', redirect: 'error' }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('probe timeout')), 800))
                    ]);
                    if (!RUNTIME.running) return false;
                    return r.ok;
                } catch (_) {
                    return false;
                }
            })());
        },


        async _bypassPost(url, headers, jsonBody) {
            const relayAvailable = await this._probeRelay();
            if (!RUNTIME.running) throw new Error('Shutdown');
            if (relayAvailable) {
                let r;
                try {
                    r = await fetch(`${this._relayUrl}/proxy`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, headers, body: jsonBody }),
                        redirect: 'error'
                    });
                    if (!RUNTIME.running) throw new Error('Shutdown');
                } catch (e) {
                    if (!RUNTIME.running) throw e;
                    this._relayProbe = null;
                }
                if (r) {
                    if (!r.ok) {
                        const body = await r.text();
                        if (!RUNTIME.running) throw new Error('Shutdown');
                        throw { status: r.status, body };
                    }
                    const result = await r.json();
                    if (!RUNTIME.running) throw new Error('Shutdown');
                    if (!result.ok) throw { status: result.status, body: result.body };
                    return result;
                }
            }


            try {
                const helper = window.VencordNative?.pluginHelpers?.OrionQuests || window.VencordNative?.pluginHelpers?.MirageQuests;
                if (helper) {
                    const u = new URL(url);
                    const appId = u.hostname.split('.')[0];
                    const questId = headers['X-Discord-Quest-ID'];
                    const referrer = headers['Referer'];
                    if (u.pathname.endsWith('/acf/authorize')) {
                        const { code } = JSON.parse(jsonBody);
                        const res = await helper.discordsaysAuthorize({ appId, questId, authCode: code, referrer });
                        if (!RUNTIME.running) throw new Error('Shutdown');
                        if (!res.ok) throw { status: res.status, body: res.body };
                        return { ok: true, status: res.status, body: res.body };
                    }
                    if (u.pathname.endsWith('/acf/quest/progress')) {
                        const { progress } = JSON.parse(jsonBody);
                        const token = headers['X-Auth-Token'];
                        const res = await helper.discordsaysProgress({ appId, questId, token, target: progress, referrer });
                        if (!RUNTIME.running) throw new Error('Shutdown');
                        if (!res.ok) throw { status: res.status, body: res.body };
                        return { ok: true, status: res.status, body: res.body };
                    }
                }
            } catch (e) {
                if (!RUNTIME.running) throw e;
                if (e?.status) throw e;
            }


            /*
             * DiscordNative transport
             *
             * Prefer a native HTTP implementation when Discord exposes one.
             * Only callable HTTP-like methods are attempted.
             */
            const discordNative = window.DiscordNative;

            if (discordNative) {
                const candidates = [
                    {
                        owner: discordNative.http,
                        fn: discordNative.http?.makeRequest
                    },
                    {
                        owner: discordNative.app,
                        fn: discordNative.app?.makeRequest
                    }
                ];

                for (const candidate of candidates) {
                    if (!RUNTIME.running) {
                        throw new Error("Shutdown");
                    }

                    if (typeof candidate.fn !== "function") {
                        continue;
                    }

                    try {
                        const response = await candidate.fn.call(
                            candidate.owner,
                            {
                                method: "POST",
                                url,
                                headers,
                                body: jsonBody
                            }
                        );

                        if (!RUNTIME.running) {
                            throw new Error("Shutdown");
                        }

                        const status =
                            response?.status ??
                            response?.statusCode;

                        if (!status) {
                            continue;
                        }

                        let body = "";

                        if (typeof response?.body === "string") {
                            body = response.body;
                        } else if (
                            typeof response?.responseText === "string"
                        ) {
                            body = response.responseText;
                        } else if (response?.body != null) {
                            try {
                                body = JSON.stringify(response.body);
                            } catch (_) {
                                body = String(response.body);
                            }
                        }

                        return {
                            ok: status >= 200 && status < 300,
                            status,
                            body
                        };
                    } catch (e) {
                        if (!RUNTIME.running) {
                            throw e;
                        }

                        // HTTP-shaped errors are real responses.
                        // Preserve them rather than silently hiding them.
                        if (e?.status) {
                            throw e;
                        }

                        // Otherwise try the next available transport.
                    }
                }
            }


            if (!RUNTIME.running) throw new Error('Shutdown');
            const res = await fetch(url, { method: 'POST', headers, body: jsonBody, redirect: 'error' });
            if (!RUNTIME.running) throw new Error('Shutdown');
            const body = await res.text();
            if (!RUNTIME.running) throw new Error('Shutdown');
            if (!res.ok) throw { status: res.status, body };
            return { ok: true, status: res.status, body };
        },


        async bypassAchievement(q, tInfo) {
            const appId = tInfo.appId || q.config?.application?.id;
            if (!appId || !/^\d+$/.test(String(appId))) {
                return { ok: false, reason: "Invalid or missing application ID" };
            }


            let preGrantIds;
            try {
                const before = await Mods.API.get({ url: '/oauth2/tokens' });
                if (!RUNTIME.running) return { ok: false };
                preGrantIds = new Set((before?.body || []).filter(tk => tk.application?.id === appId).map(tk => tk.id));
            } catch (e) {
                if (!RUNTIME.running) return { ok: false };
                return { ok: false, reason: "Could not snapshot existing OAuth tokens" };
            }


            try {
                let appName = null;
                try {
                    const a = await Mods.API.get({ url: `/applications/public?application_ids=${appId}` });
                    if (!RUNTIME.running) return { ok: false };
                    appName = a?.body?.[0]?.name ?? null;
                } catch (_) {
                    if (!RUNTIME.running) return { ok: false };
                }


                const consented = await Consent.ask(appId, appName);
                if (!RUNTIME.running || !consented) {
                    Logger.log(`[Achievement] Consent declined for "${tInfo.name}".`, 'warn');
                    return { ok: false, reason: "User declined OAuth authorization" };
                }


                Logger.log(`[Achievement] Authorizing Activity app for "${tInfo.name}"...`, 'info');


                const authRes = await Mods.API.post({
                    url: '/oauth2/authorize',
                    query: {
                        response_type: 'code',
                        client_id: appId,
                        scope: 'identify applications.commands applications.entitlements'
                    },
                    body: {
                        permissions: '0',
                        authorize: true,
                        integration_type: 1,
                        location_context: { guild_id: '10000', channel_id: '10000', channel_type: 10000 }
                    }
                });
                if (!RUNTIME.running) return { ok: false };
                const location = authRes?.body?.location;
                if (!location) throw new Error('No location in /oauth2/authorize');
                const authCode = new URL(location).searchParams.get('code');
                if (!authCode) throw new Error('No auth code received');


                const ticketRes = await Mods.API.post({ url: `/applications/${appId}/proxy-tickets`, body: {} });
                if (!RUNTIME.running) return { ok: false };
                const proxyTicket = ticketRes?.body?.ticket;
                if (!proxyTicket) throw new Error('No proxy ticket received');


                const referrer = `https://${appId}.discordsays.com/?instance_id=mirage-instance&platform=desktop&discord_proxy_ticket=${encodeURIComponent(proxyTicket)}`;


                const dsAuthRes = await Tasks._bypassPost(
                    `https://${appId}.discordsays.com/.proxy/acf/authorize`,
                    { 'Content-Type': 'application/json', 'X-Auth-Token': '', 'X-Discord-Quest-ID': q.id, 'Referer': referrer },
                    JSON.stringify({ code: authCode })
                );
                if (!RUNTIME.running) return { ok: false };
                let dsToken;
                try { dsToken = JSON.parse(dsAuthRes.body)?.token; }
                catch { throw new Error('discordsays returned invalid response'); }
                if (!dsToken) throw new Error('No discordsays token');


                await Tasks._bypassPost(
                    `https://${appId}.discordsays.com/.proxy/acf/quest/progress`,
                    { 'Content-Type': 'application/json', 'X-Auth-Token': dsToken, 'X-Discord-Quest-ID': q.id, 'Referer': referrer },
                    JSON.stringify({ progress: tInfo.target })
                );
                if (!RUNTIME.running) return { ok: false };


                Logger.log(`[Achievement] "${tInfo.name}" completed via discordsays!`, 'success');
                return { ok: true };
            } catch (e) {
                if (!RUNTIME.running) return { ok: false };
                if (e instanceof TypeError && /failed to fetch|networkerror/i.test(e.message)) {
                    Logger.log(`[Achievement] Desktop CSP blocked discordsays connection.`, 'warn');
                    return { ok: false, reason: "Desktop CSP blocked request" };
                }
                const code = e?.body?.code;
                if (code === 50165) {
                    return { ok: false, reason: "Activity is age-gated or delisted" };
                }
                return { ok: false, reason: e?.message || "Bypass failed" };
            } finally {
                if (preGrantIds) {
                    try {
                        const after = await Mods.API.get({ url: '/oauth2/tokens' });
                        const ours = (after?.body || []).filter(tk => tk.application?.id === appId && !preGrantIds.has(tk.id));
                        for (const g of ours) await Mods.API.del({ url: `/oauth2/tokens/${g.id}` });
                    } catch (_) {}
                }
            }
        },


        async VIDEO(q, tInfo, s) {
            const savedRec = RecoveryManager.get(q.id);
            let cur = Math.max(normalizeProgress(s, tInfo.keyName), savedRec?.progress || 0);
            if (savedRec?.progress > 0 && cur === savedRec.progress) {
                Logger.log(`[Resume] Video: "${tInfo.name}" resuming from saved progress: ${Math.round(cur)}s / ${tInfo.target}s`, "info");
            }
            RecoveryManager.trackStart(q, tInfo, cur);
            TaskStore.update(q.id, { id: q.id, name: tInfo.name, type: "VIDEO", cur, max: tInfo.target, status: "RUNNING", rewardText: tInfo.rewardText });
            Logger.log(`[Task Started] Video: "${tInfo.name}" (${tInfo.target}s)`, "info");
            Notifier.show(t("questStarted"), tInfo.name, "info");


            const startTime = Date.now();
            let failCount = 0;
            let lastLog = 0;
            let lastTickTime = Date.now();


            // Natural initial wait before first tick
            const initialWaitMs = rnd(4000, 7000);
            await sleep(initialWaitMs).catch(() => {});
            if (!RUNTIME.running || !RUNTIME.isExecuting) return;


            while (cur < tInfo.target && RUNTIME.running && RUNTIME.isExecuting) {
                const delayMs = rnd(7000, 9500);
                await sleep(delayMs).catch(() => {});
                if (!RUNTIME.running || !RUNTIME.isExecuting) break;


                const actualElapsedSec = (Date.now() - lastTickTime) / 1000;
                lastTickTime = Date.now();


                const speed = Number(RUNTIME.speed) || 1;
                const advance = (actualElapsedSec * speed) + (Math.random() * 0.02 - 0.01);
                cur = Math.min(tInfo.target, cur + advance);


                const payloadTs = Number(Math.min(tInfo.target, cur).toFixed(6));


                try {
                    const res = await Traffic.enqueue(`/quests/${q.id}/video-progress`, { timestamp: payloadTs });
                    if (!RUNTIME.running || !RUNTIME.isExecuting) break;


                    const serverVal = res?.body?.progress?.[tInfo.keyName]?.value ?? res?.body?.progress?.WATCH_VIDEO?.value;
                    if (typeof serverVal === "number" && serverVal > cur) {
                        cur = Math.min(tInfo.target, serverVal);
                    }
                    if (res?.body?.completed_at) break;
                    failCount = 0;
                } catch (e) {
                    if (!RUNTIME.running || !RUNTIME.isExecuting) break;
                    failCount++;
                    const err = ErrorHandler.classify(e);
                    if (err.isClientError) {
                        Logger.log(`[Video] Quest unavailable (HTTP ${err.status}). Skipping.`, "warn");
                        return this.failTask(q, tInfo, `Client Error ${err.status}`);
                    }
                    if (failCount >= SYS.MAX_TASK_FAILURES) {
                        return this.failTask(q, tInfo, "Too many network failures");
                    }
                }


                RecoveryManager.updateProgress(q.id, cur);
                TaskStore.update(q.id, { id: q.id, name: tInfo.name, type: "VIDEO", cur, max: tInfo.target, status: "RUNNING" });


                if (Date.now() - lastLog > 12000) {
                    this.logProgress(tInfo, cur);
                    lastLog = Date.now();
                }


                if (Date.now() - startTime > SYS.MAX_TIME) {
                    return this.failTask(q, tInfo, "Timeout exceeded (25m)");
                }
            }
            if (RUNTIME.running && RUNTIME.isExecuting) await Tasks.finish(q, tInfo);
        },


        async GAME(q, tInfo, s) {
            if (!SYS.IS_DESKTOP) {
                Logger.log(`[Skipped] ${tInfo.name}: Requires Desktop app`, "warn");
                Notifier.show(t("failedBtn"), `${tInfo.name}: Requires Desktop`, "warn");
                return;
            }
            if (!tInfo.appId) {
                Logger.log(`[Quest] "${tInfo.name}" has no appId. Can't spoof. Skipping.`, "warn");
                return this.failTask(q, tInfo, "Missing application ID");
            }


            const gameData = await this.fetchGameData(tInfo.appId, tInfo.name);
            if (!RUNTIME.running || !RUNTIME.isExecuting) return;


            const pid = rnd(12000, 45000);
            const game = {
                id: gameData.id,
                name: gameData.name,
                icon: gameData.icon,
                pid,
                pidPath: [pid],
                processName: gameData.name,
                start: Date.now(),
                exeName: gameData.exeName,
                exePath: gameData.exePath,
                cmdLine: gameData.cmdLine,
                executables: [{ os: "win32", name: gameData.exeName, is_launcher: false }],
                windowHandle: 0,
                fullscreenType: 0,
                overlay: true,
                sandboxed: false,
                hidden: false,
                isLauncher: false
            };


            return new Promise((resolve) => {
                Patcher.add(game);
                const savedRec = RecoveryManager.get(q.id);
                let cur = Math.max(normalizeProgress(s, tInfo.keyName), savedRec?.progress || 0);
                if (savedRec?.progress > 0 && cur === savedRec.progress) {
                    Logger.log(`[Resume] Game: "${tInfo.name}" resuming from saved progress: ${Math.round(cur)}s / ${tInfo.target}s`, "info");
                }
                RecoveryManager.trackStart(q, tInfo, cur);
                TaskStore.update(q.id, { id: q.id, name: tInfo.name, type: "GAME", cur, max: tInfo.target, status: "RUNNING", serverCur: cur, serverAt: Date.now(), rewardText: tInfo.rewardText });
                Logger.log(`[Task Started] Game: "${tInfo.name}" (${tInfo.target}s)`, "info");
                Notifier.show(t("questStarted"), tInfo.name, "info");


                let beats = 0;
                let failedBeats = 0;
                let consecutiveFailures = 0;
                let lastFailure = null;
                let watchdogTimer = null;
                let safetyTimer = null;


                const cleanupFn = () => {
                    clearTimeout(watchdogTimer);
                    clearTimeout(safetyTimer);
                    Patcher.remove(game);
                    try { Mods.Dispatcher?.unsubscribe(CONST.EVT.HEARTBEAT, checker); } catch (_) {}
                    try { Mods.Dispatcher?.unsubscribe(CONST.EVT.HEARTBEAT_FAIL, onFail); } catch (_) {}
                    Cleanup.delete(cleanupFn);
                };


                const abortHandler = () => {
                    cleanupFn();
                    resolve();
                };
                RUNTIME.abortController.signal.addEventListener("abort", abortHandler, { once: true });


                safetyTimer = setTimeout(() => {
                    if (RUNTIME.running && RUNTIME.isExecuting) Tasks.failTask(q, tInfo, "Timeout exceeded (25m)");
                    cleanupFn();
                    resolve();
                }, SYS.MAX_TIME);


                const armWatchdog = () => {
                    clearTimeout(watchdogTimer);
                    watchdogTimer = setTimeout(() => {
                        if (!RUNTIME.running || !RUNTIME.isExecuting) return;
                        const failMsg = failedBeats > 0 ? ` (${failedBeats} failed beats, last: ${lastFailure})` : '';
                        Logger.log(`[Watchdog] No heartbeat from Discord for "${tInfo.name}"${failMsg}.`, "err");
                        cleanupFn();
                        Tasks.failTask(q, tInfo, failedBeats > 0 ? `Heartbeat failed (${lastFailure})` : "Heartbeat Timeout");
                        resolve();
                    }, SYS.HEARTBEAT_GRACE);
                };
                armWatchdog();


                const checker = async (d) => {
                    if (!RUNTIME.running || !RUNTIME.isExecuting) { cleanupFn(); resolve(); return; }
                    if (d?.questId === q.id) {
                        beats++;
                        consecutiveFailures = 0;
                        armWatchdog();
                        cur = normalizeProgress(d.userStatus, tInfo.keyName);
                        RecoveryManager.updateProgress(q.id, cur);
                        TaskStore.update(q.id, { id: q.id, name: tInfo.name, type: "GAME", cur: Math.min(tInfo.target, cur), max: tInfo.target, status: "RUNNING", serverCur: cur, serverAt: Date.now() });
                        Tasks.logProgress(tInfo, cur);
                        if (cur >= tInfo.target) {
                            cleanupFn();
                            await Tasks.finish(q, tInfo);
                            resolve();
                        }
                    }
                };


                const onFail = (d) => {
                    if (!RUNTIME.running || !RUNTIME.isExecuting) { cleanupFn(); resolve(); return; }
                    if (d?.questId === q.id) {
                        failedBeats++;
                        consecutiveFailures++;
                        lastFailure = describeHeartbeatError(d);


                        if (consecutiveFailures >= SYS.MAX_TASK_FAILURES) {
                            Logger.log(`[Task] Heartbeat for "${tInfo.name}" failed ${consecutiveFailures} times in a row: ${lastFailure}. Aborting.`, "err");
                            cleanupFn();
                            Tasks.failTask(q, tInfo, `Discord error (${lastFailure})`);
                            resolve();
                            return;
                        }


                        Logger.log(`[Task] Heartbeat failure for "${tInfo.name}" (${consecutiveFailures}/${SYS.MAX_TASK_FAILURES}): ${lastFailure}`, "warn");
                        if (beats > 0) armWatchdog();
                    }
                };


                Mods.Dispatcher?.subscribe(CONST.EVT.HEARTBEAT, checker);
                Mods.Dispatcher?.subscribe(CONST.EVT.HEARTBEAT_FAIL, onFail);
                Cleanup.add(cleanupFn);
            });
        },


        async STREAM(q, tInfo, s) {
            if (!SYS.IS_DESKTOP) {
                Logger.log(`[Skipped] ${tInfo.name}: Requires Desktop app`, "warn");
                Notifier.show(t("failedBtn"), `${tInfo.name}: Requires Desktop`, "warn");
                return;
            }
            if (!tInfo.appId) {
                Logger.log(`[Quest] "${tInfo.name}" has no appId. Can't spoof. Skipping.`, "warn");
                return this.failTask(q, tInfo, "Missing application ID");
            }


            const gameData = await this.fetchGameData(tInfo.appId, tInfo.name);
            if (!RUNTIME.running || !RUNTIME.isExecuting) return;


            const pid = rnd(12000, 45000);
            return new Promise((resolve) => {
                if (Mods.StreamStore) {
                    if (Tasks._streamSpoofs === 0) Tasks._streamReal = Mods.StreamStore.getStreamerActiveStreamMetadata;
                    Tasks._streamSpoofs++;
                    Mods.StreamStore.getStreamerActiveStreamMetadata = () => ({ id: gameData.id, pid, sourceName: gameData.name });
                }


                const savedRec = RecoveryManager.get(q.id);
                let cur = Math.max(normalizeProgress(s, tInfo.keyName), savedRec?.progress || 0);
                if (savedRec?.progress > 0 && cur === savedRec.progress) {
                    Logger.log(`[Resume] Stream: "${tInfo.name}" resuming from saved progress: ${Math.round(cur)}s / ${tInfo.target}s`, "info");
                }
                RecoveryManager.trackStart(q, tInfo, cur);
                TaskStore.update(q.id, { id: q.id, name: tInfo.name, type: "STREAM", cur, max: tInfo.target, status: "RUNNING", serverCur: cur, serverAt: Date.now(), rewardText: tInfo.rewardText });
                Logger.log(`[Task Started] Stream: "${tInfo.name}" (${tInfo.target}s)`, "info");
                Notifier.show(t("questStarted"), tInfo.name, "info");


                let beats = 0;
                let failedBeats = 0;
                let consecutiveFailures = 0;
                let lastFailure = null;
                let watchdogTimer = null;
                let safetyTimer = null;


                const cleanupFn = () => {
                    clearTimeout(watchdogTimer);
                    clearTimeout(safetyTimer);
                    if (Mods.StreamStore && Tasks._streamSpoofs > 0 && --Tasks._streamSpoofs === 0) {
                        Mods.StreamStore.getStreamerActiveStreamMetadata = Tasks._streamReal;
                    }
                    try { Mods.Dispatcher?.unsubscribe(CONST.EVT.HEARTBEAT, checker); } catch (_) {}
                    try { Mods.Dispatcher?.unsubscribe(CONST.EVT.HEARTBEAT_FAIL, onFail); } catch (_) {}
                    Cleanup.delete(cleanupFn);
                };


                const abortHandler = () => {
                    cleanupFn();
                    resolve();
                };
                RUNTIME.abortController.signal.addEventListener("abort", abortHandler, { once: true });


                safetyTimer = setTimeout(() => {
                    if (RUNTIME.running && RUNTIME.isExecuting) Tasks.failTask(q, tInfo, "Timeout exceeded (25m)");
                    cleanupFn();
                    resolve();
                }, SYS.MAX_TIME);


                const armWatchdog = () => {
                    clearTimeout(watchdogTimer);
                    watchdogTimer = setTimeout(() => {
                        if (!RUNTIME.running || !RUNTIME.isExecuting) return;
                        const failMsg = failedBeats > 0 ? ` (${failedBeats} failed beats, last: ${lastFailure})` : '';
                        Logger.log(`[Watchdog] No stream heartbeat from Discord for "${tInfo.name}"${failMsg}.`, "err");
                        cleanupFn();
                        Tasks.failTask(q, tInfo, failedBeats > 0 ? `Stream heartbeat failed (${lastFailure})` : "Heartbeat Timeout");
                        resolve();
                    }, SYS.HEARTBEAT_GRACE);
                };
                armWatchdog();


                const checker = async (d) => {
                    if (!RUNTIME.running || !RUNTIME.isExecuting) { cleanupFn(); resolve(); return; }
                    if (d?.questId === q.id) {
                        beats++;
                        consecutiveFailures = 0;
                        armWatchdog();
                        cur = normalizeProgress(d.userStatus, tInfo.keyName);
                        RecoveryManager.updateProgress(q.id, cur);
                        TaskStore.update(q.id, { id: q.id, name: tInfo.name, type: "STREAM", cur: Math.min(tInfo.target, cur), max: tInfo.target, status: "RUNNING", serverCur: cur, serverAt: Date.now() });
                        Tasks.logProgress(tInfo, cur);
                        if (cur >= tInfo.target) {
                            cleanupFn();
                            await Tasks.finish(q, tInfo);
                            resolve();
                        }
                    }
                };


                const onFail = (d) => {
                    if (!RUNTIME.running || !RUNTIME.isExecuting) { cleanupFn(); resolve(); return; }
                    if (d?.questId === q.id) {
                        failedBeats++;
                        consecutiveFailures++;
                        lastFailure = describeHeartbeatError(d);


                        if (consecutiveFailures >= SYS.MAX_TASK_FAILURES) {
                            Logger.log(`[Task] Stream heartbeat for "${tInfo.name}" failed ${consecutiveFailures} times: ${lastFailure}. Aborting.`, "err");
                            cleanupFn();
                            Tasks.failTask(q, tInfo, `Stream error (${lastFailure})`);
                            resolve();
                            return;
                        }
                        Logger.log(`[Task] Stream heartbeat failure for "${tInfo.name}" (${consecutiveFailures}/${SYS.MAX_TASK_FAILURES}): ${lastFailure}`, "warn");
                        if (beats > 0) armWatchdog();
                    }
                };


                Mods.Dispatcher?.subscribe(CONST.EVT.HEARTBEAT, checker);
                Mods.Dispatcher?.subscribe(CONST.EVT.HEARTBEAT_FAIL, onFail);
                Cleanup.add(cleanupFn);
            });
        },


        async VOICE(q, tInfo, s) {
            const streamKey = buildStreamKey();
            if (!streamKey) {
                return this.failTask(q, tInfo, "No voice channel found");
            }


            const beat = { stream_key: streamKey, application_id: String(tInfo.appId || ''), terminal: false };
            const savedRec = RecoveryManager.get(q.id);
            let cur = Math.max(normalizeProgress(s, tInfo.keyName), savedRec?.progress || 0);
            if (savedRec?.progress > 0 && cur === savedRec.progress) {
                Logger.log(`[Resume] Voice: "${tInfo.name}" resuming from saved progress: ${Math.round(cur)}s / ${tInfo.target}s`, "info");
            }
            RecoveryManager.trackStart(q, tInfo, cur);
            TaskStore.update(q.id, { id: q.id, name: tInfo.name, type: "VOICE", cur, max: tInfo.target, status: "RUNNING", rewardText: tInfo.rewardText });
            Logger.log(`[Task Started] Voice: "${tInfo.name}" (${tInfo.target}s)`, "info");
            Notifier.show(t("questStarted"), tInfo.name, "info");


            const startTime = Date.now();
            let failCount = 0;
            let stalledBeats = 0;


            while (cur < tInfo.target && RUNTIME.running && RUNTIME.isExecuting) {
                await sleep(rnd(18000, 22000)).catch(() => {});
                if (!RUNTIME.running || !RUNTIME.isExecuting) break;


                try {
                    const res = await Traffic.enqueue(`/quests/${q.id}/heartbeat`, beat);
                    if (!RUNTIME.running || !RUNTIME.isExecuting) break;


                    const reported = res?.body?.progress?.[tInfo.keyName]?.value ?? res?.body?.progress?.PLAY_ACTIVITY?.value;
                    if (typeof reported === 'number') {
                        cur = reported;
                        stalledBeats = 0;
                    } else {
                        stalledBeats++;
                        if (stalledBeats >= SYS.MAX_TASK_FAILURES) {
                            return this.failTask(q, tInfo, "Discord credited no progress");
                        }
                    }


                    failCount = 0;
                    RecoveryManager.updateProgress(q.id, cur);
                    TaskStore.update(q.id, { id: q.id, name: tInfo.name, type: "VOICE", cur, max: tInfo.target, status: "RUNNING" });
                    this.logProgress(tInfo, cur);


                    if (cur >= tInfo.target) {
                        try { await Traffic.enqueue(`/quests/${q.id}/heartbeat`, { ...beat, terminal: true }); }
                        catch (_) {}
                        break;
                    }
                } catch (e) {
                    if (!RUNTIME.running || !RUNTIME.isExecuting) break;
                    failCount++;
                    const err = ErrorHandler.classify(e);
                    if (err.isClientError) return this.failTask(q, tInfo, `Client Error ${err.status}`);
                    if (failCount >= SYS.MAX_TASK_FAILURES) return this.failTask(q, tInfo, "Too many network failures");
                }


                if (Date.now() - startTime > SYS.MAX_TIME) {
                    return this.failTask(q, tInfo, "Timeout exceeded (25m)");
                }
            }
            if (RUNTIME.running && RUNTIME.isExecuting && cur >= tInfo.target) await Tasks.finish(q, tInfo);
        },


        async ACHIEVEMENT(q, tInfo) {
            Logger.log(`[Achievement] "${tInfo.name}" is an Activity game on Discord servers.`, "info");

            try {
                const bypassRes = await Tasks.bypassAchievement(q, tInfo);
                if (bypassRes?.ok) {
                    return await Tasks.finish(q, tInfo);
                }
            } catch (err) {
                Logger.log(`[Achievement] Automated bypass attempt failed: ${err?.message || err}`, "debug");
            }

            Logger.log(`[Tip] Open Discord Quests page and click "Play" on ${tInfo.name} to play it directly.`, "info");
            Notifier.show(t("failedBtn"), `${tInfo.name}: Open in Discord`, "warn");
            TaskStore.update(q.id, { id: q.id, name: tInfo.name, type: "ACHIEVEMENT", cur: 0, max: tInfo.target, status: "FAILED", actionRequired: "MANUAL" });
            RUNTIME.failedQuests.add(q.id);
            Tasks.outcomes.set(q.id, 'failed');
        },


        async finish(q, tInfo) {
            RUNTIME.completedQuests.add(q.id);
            Tasks.outcomes.set(q.id, 'completed');
            RecoveryManager.clear(q.id);
            TaskStore.update(q.id, { id: q.id, name: tInfo.name, type: tInfo.type, cur: tInfo.target, max: tInfo.target, status: "COMPLETED", claimable: true });
            Logger.log(`[Task Completed] "${tInfo.name}" finished 100%!`, "success");
            Sound.play("tick");
            Notifier.show(t("questDoneToast"), `${tInfo.name} (${tInfo.rewardText || "Reward"})`, "success");


            try {
                if (typeof Notification !== "undefined") {
                    if (Notification.permission === "default") {
                        try { await Notification.requestPermission(); } catch (_) {}
                    }
                    if (Notification.permission === "granted") {
                        new Notification(`Mirage: ${t("questDoneToast")}`, {
                            body: `${tInfo.name} (${tInfo.rewardText || "Reward"})`,
                            icon: "https://cdn.discordapp.com/emojis/1120042457007792168.webp"
                        });
                    }
                }
            } catch (_) {}


            if (RUNTIME.autoClaim) {
                try {
                    Logger.log(`[AutoClaim] Staggering claim request for "${tInfo.name}"...`, "info");
                    await sleep(rnd(5000, 14000)).catch(() => {});
                    if (!RUNTIME.running) return;


                    const claimRes = await this.claimReward(q.id);
                    if (claimRes?.body?.claimed_at) {
                        Logger.log(`[AutoClaim] Reward claimed successfully for "${tInfo.name}"!`, "success");
                        Notifier.show(t("questClaimedToast"), tInfo.name, "success");
                        RecoveryManager.clear(q.id);
                        TaskStore.update(q.id, { id: q.id, name: tInfo.name, type: tInfo.type, cur: tInfo.target, max: tInfo.target, status: "CLAIMED", claimable: false });
                        TaskStore.remove(q.id);
                        return;
                    } else {
                        Logger.log(`[AutoClaim] Claim response for "${tInfo.name}" not confirmed by Discord. Open Discord's Quests page to claim.`, "warn");
                    }
                } catch (err) {
                    const msg = err?.body?.message || err?.message || "Verification / Captcha required";
                    Logger.log(`[AutoClaim] Auto-claim challenged for "${tInfo.name}": ${msg}. You can claim it manually from the button.`, "warn");
                }
            }


            TaskStore.update(q.id, { id: q.id, name: tInfo.name, type: tInfo.type, cur: tInfo.target, max: tInfo.target, status: "COMPLETED", claimable: true });
        }
    };


    /* ── 14. Scan & Execution Flow ── */
    function getAvailableQuests() {
        const q = Mods.QuestStore?.quests ?? Mods.QuestStore?.getQuests?.();
        const list = q instanceof Map ? [...q.values()] : Object.values(q || {});
        const filtered = list.filter(
            (x) => !x.userStatus?.claimedAt &&
                   !RUNTIME.completedQuests.has(x.id) &&
                   !RUNTIME.failedQuests.has(x.id) &&
                   !RUNTIME.skippedQuests.has(x.id) &&
                   notExpired(x) &&
                   !CONST.BLACKLIST_IDS.has(x.id)
        );
        return QuestPriority.sort(filtered);
    }


    async function showQuestPickerScreen() {
        let quests = getAvailableQuests();
        if (!quests.length) {
            Logger.log("[System] Waiting for Discord quest list to populate...", "info");
            for (let waited = 0; waited < 15000 && !getAvailableQuests().length && RUNTIME.running; waited += 250) {
                await sleep(250).catch(() => {});
            }
            quests = getAvailableQuests();
        }


        // Detect and log recoverable unfinished quests after interruption
        RecoveryManager.cleanupStale(quests);
        const recoverable = RecoveryManager.getRecoverableQuests(quests);
        if (recoverable.length > 0) {
            Logger.log(`[Resume] Detected ${recoverable.length} recoverable quest(s) from previous session.`, "info");
        }


        if (!quests.length) {
            Logger.log("[System] No uncompleted quests found in QuestStore.", "info");
            const content = document.getElementById("mirage-content");
            if (content) content.innerHTML = `<div style="text-align:center; padding:30px; color:#8a8e9b; font-size:13px;">${t("noQuestsFound")}</div>`;
            return;
        }


        const selectedQuests = await Logger.showQuestPicker(quests);
        if (!RUNTIME.running || !selectedQuests || selectedQuests.size === 0) {
            return;
        }


        startExecution(selectedQuests);
    }


    async function startExecution(selectedQuests) {
        RUNTIME.isExecuting = true;
        Tasks.outcomes.clear();
        RUNTIME.failedQuests.clear();
        RUNTIME.skippedQuests.clear();


        if (RUNTIME.wakeLock && "wakeLock" in navigator) {
            try { RUNTIME.wakeLockSentinel = await navigator.wakeLock.request("screen"); } catch (_) {}
        }


        while (RUNTIME.running && RUNTIME.isExecuting) {
            const suspendedUntil = questAccessSuspendedUntil();
            if (suspendedUntil) {
                const when = suspendedUntil.getTime() === 0 ? t("banForNow") : `${t("banUntil")} ${suspendedUntil.toLocaleString()}`;
                Logger.log(`[System] ${t("banSuspendedMsg")} (${when})`, "err");
                Notifier.show(t("banTitle"), `${t("banSuspendedMsg")} (${when})`, "err");
                break;
            }


            const blockedUntil = enrollmentBlockedUntil();
            if (blockedUntil) {
                Logger.log(`[System] ${t("banEnrollBlockedMsg")} (${blockedUntil.toLocaleString()})`, "err");
                Notifier.show(t("banTitle"), `${t("banEnrollBlockedMsg")}`, "err");
                break;
            }


            const quests = QuestPriority.sort(getAvailableQuests().filter((q) => selectedQuests.has(q.id)));
            if (!quests.length) {
                break;
            }


            const claimableTasks = [];
            const videoTasks = [];
            const gameTasks = [];


            for (const q of quests) {
                // Pre-flight Quest Validation sequence
                const validation = QuestValidator.validate(q);
                if (!validation.valid) {
                    Logger.log(`[Pre-Flight Skip] "${validation.questName}": ${validation.reason}`, "warn");
                    RUNTIME.skippedQuests.add(q.id);
                    Tasks.outcomes.set(q.id, "blocked");
                    RecoveryManager.clear(q.id);
                    continue;
                }


                const tInfo = validation.tInfo;
                const typeData = validation.typeData;


                // Priority: completed-but-unclaimed quests recognized as claimable tasks immediately
                if (validation.isCompleted) {
                    claimableTasks.push(async () => {
                        await Tasks.finish(q, tInfo);
                    });
                    continue;
                }


                // Hard prerequisite: verify enrollment before task execution
                if (!q.userStatus?.enrolledAt) {
                    if (RUNTIME.autoEnroll) {
                        try {
                            const enrollRes = await Traffic.enqueue(`/quests/${q.id}/enroll`, {
                                location: 11,
                                is_targeted: false,
                                metadata_sealed: null,
                                traffic_metadata_sealed: sealedFor(q.id)
                            });
                            const enrolledAt = enrollRes?.body?.enrolled_at || new Date().toISOString();
                            q.userStatus = { ...(q.userStatus || {}), enrolledAt };
                            Logger.log(`[Enroll] Successfully enrolled in "${tInfo.name}".`, "info");
                            await sleep(rnd(800, 1500)).catch(() => {});
                        } catch (err) {
                            const classified = ErrorHandler.classify(err);
                            Logger.log(`[Enroll Failed] "${tInfo.name}": ${classified.message}`, "err");
                            Tasks.failTask(q, tInfo, `Enrollment failed (${classified.message})`);
                            continue;
                        }
                    } else {
                        Logger.log(`[Skipped] "${tInfo.name}": Quest is not enrolled (auto-enroll disabled).`, "warn");
                        RUNTIME.failedQuests.add(q.id);
                        RecoveryManager.clear(q.id);
                        continue;
                    }
                }


                const runner = async () => {
                    if (typeData.type === "VIDEO") return await Tasks.VIDEO(q, tInfo, q.userStatus);
                    if (typeData.type === "VOICE") return await Tasks.VOICE(q, tInfo, q.userStatus);
                    if (typeData.type === "STREAM") return await Tasks.STREAM(q, tInfo, q.userStatus);
                    if (typeData.type === "ACHIEVEMENT") return await Tasks.ACHIEVEMENT(q, tInfo);
                    return await Tasks.GAME(q, tInfo, q.userStatus);
                };


                if (typeData.type === "VIDEO") videoTasks.push(runner);
                else gameTasks.push(runner);
            }


            // Immediately execute and finish claimable tasks first!
            if (claimableTasks.length) {
                await Promise.all(claimableTasks.map((fn) => fn()));
            }


            const promises = [];
            if (gameTasks.length) {
                promises.push((async () => {
                    for (const g of gameTasks) {
                        if (!RUNTIME.running || !RUNTIME.isExecuting) break;
                        await g();
                    }
                })());
            }
            if (videoTasks.length) {
                promises.push((async () => {
                    for (let i = 0; i < videoTasks.length; i += 2) {
                        if (!RUNTIME.running || !RUNTIME.isExecuting) break;
                        const pair = videoTasks.slice(i, i + 2);
                        await Promise.all(pair.map((v) => v()));
                    }
                })());
            }


            await Promise.all(promises);


            if (RUNTIME.randomDelay) {
                const delayMs = rnd(60000, 1800000);
                Logger.log(`[Cycle] Anti-detection delay: ${Math.round(delayMs / 60000)}m before rescan...`, "info");
                await sleep(delayMs).catch(() => {});
            } else {
                await sleep(2500).catch(() => {});
            }
        }


        RUNTIME.isExecuting = false;


        let finished = 0;
        let skipped = 0;
        let failed = 0;

        for (const outcome of Tasks.outcomes.values()) {
            if (outcome === "completed") {
                finished++;
            } else if (outcome === "blocked") {
                skipped++;
            } else {
                failed++;
            }
        }

        if (finished > 0 && skipped === 0 && failed === 0) {
            Logger.log(t("allTasksDone"), "success");
            Sound.play("done");
        } else if (finished === 0 && skipped > 0 && failed === 0) {
            Logger.log(
                `[System] No runnable quests remained. ${skipped} quest(s) were skipped during validation.`,
                "warn"
            );
        } else if (finished === 0 && failed > 0 && skipped === 0) {
            Logger.log(t("allTasksFailedMsg"), "err");
        } else {
            Logger.log(
                `[System] Run finished: ${finished} completed, ${skipped} skipped, ${failed} failed.`,
                "warn"
            );
            if (finished > 0) {
                Sound.play("done");
            }
        }


        const hasUnclaimed = TaskStore.getAll().some((t) => t.claimable && !t.removing);
        if (hasUnclaimed) {
            Logger.log("[System] Quests finished! Claim your rewards above, click 'CLAIM ALL', or click 'RETURN TO MENU'.", "info");
        } else {
            await sleep(2000).catch(() => {});
            if (!RUNTIME.isExecuting && RUNTIME.running) {
                TaskStore.clear();
                showQuestPickerScreen();
            }
        }


        if (RUNTIME.wakeLockSentinel) {
            try { await RUNTIME.wakeLockSentinel.release(); } catch (_) {}
        }
    }


    /* ── 15. Initial Entry Point ── */
    async function main() {
        Logger.init();
        if (!loadModules()) {
            Logger.log("[System] Failed to load Discord modules. Please reload tab.", "err");
            window.mirageLock = false;
            return;
        }
        await showQuestPickerScreen();
    }




    main().catch((e) => {
        console.error("[Mirage Fatal]", e);
        Logger.log(`[Fatal Error] ${e?.message || e}`, "err");
        window.mirageLock = false;
    });
})();
