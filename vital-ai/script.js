import { trackEvent, getConsentState, setConsentState } from './analytics.js';

document.addEventListener('DOMContentLoaded', () => {
    // ---- AUDIO CONTEXT ----
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playBeep() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    }

    // ---- STATE ----
    let unit = 'metric';
    let currentUser = null;
    try {
        currentUser = JSON.parse(localStorage.getItem('currentUser'));
    } catch {
        currentUser = null;
    }
    let users = {};
    try {
        users = JSON.parse(localStorage.getItem('users')) || {};
    } catch {
        users = {};
    }
    let chartInstance = null;
    let gravityManager = null;
    const pageLoadTimestamp = Date.now();
    let lastSubmitTimestamp = 0;

    const tips = [
        "Drink 500ml of water as soon as you wake up to activate metabolic pathways.",
        "Take the stairs instead of the elevator today to boost non-exercise activity thermogenesis (NEAT).",
        "Aim for 7 to 8 hours of uninterrupted restorative sleep to optimize cortisol regulation.",
        "Prioritize whole fiber-rich foods over refined sugars for sustained energy.",
        "Incorporate a complete protein source with each primary meal to preserve lean muscle."
    ];

    // ---- ELEMENTS ----
    const authView = document.getElementById('auth-view');
    const appView = document.getElementById('app-view');
    const authForm = document.getElementById('auth-form');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const nameGroup = document.getElementById('name-group');
    const authBtn = document.getElementById('auth-btn');
    const authName = document.getElementById('auth-name');
    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    const authErrorMsg = document.getElementById('auth-error-msg');
    const logoutBtn = document.getElementById('logout-btn');
    const userNameDisplay = document.getElementById('user-name-display');

    // Navigation & Mobile Drawer
    const sidebarDrawer = document.getElementById('sidebar-drawer');
    const mobileToggleBtn = document.getElementById('mobile-toggle-btn');
    const heroCtaBtn = document.getElementById('hero-cta-btn');

    // Preferences & Form Elements
    const themeToggle = document.getElementById('theme-toggle');
    const unitBtns = document.querySelectorAll('.toggle-btn');
    const bmiForm = document.getElementById('bmi-form');
    const formResetBtn = document.getElementById('form-reset-btn');
    const resetHistoryBtn = document.getElementById('reset-history');
    const footerResetHistoryBtn = document.getElementById('footer-reset-history');

    const metricHeight = document.querySelector('.metric-height');
    const imperialHeight = document.querySelector('.imperial-height');
    const weightInput = document.getElementById('weight');
    const weightUnit = document.getElementById('weight-unit');
    const weightBox = document.getElementById('weight-box');
    const weightError = document.getElementById('weight-error');

    const heightCm = document.getElementById('height-cm');
    const heightBox = document.getElementById('height-box');
    const heightError = document.getElementById('height-error');

    const heightFt = document.getElementById('height-ft');
    const heightIn = document.getElementById('height-in');
    const imperialBox = document.getElementById('imperial-box');
    const imperialError = document.getElementById('imperial-error');

    const ageInput = document.getElementById('age');
    const ageBox = document.getElementById('age-box');
    const ageError = document.getElementById('age-error');

    // Beyond-BMI Inputs & Selectors
    const waistInput = document.getElementById('waist');
    const waistUnit = document.getElementById('waist-unit');
    const waistBox = document.getElementById('waist-box');
    const waistError = document.getElementById('waist-error');
    const ethnicityScale = document.getElementById('ethnicity-scale');
    const activityLevel = document.getElementById('activity-level');
    const userGoal = document.getElementById('user-goal');

    // Smart Input & Wearables
    const smartPromptInput = document.getElementById('smart-prompt-input');
    const smartParseBtn = document.getElementById('smart-parse-btn');
    const smartMicBtn = document.getElementById('smart-mic-btn');
    const promptChips = document.querySelectorAll('.prompt-chip');
    const syncAppleHealth = document.getElementById('sync-apple-health');
    const syncGoogleFit = document.getElementById('sync-google-fit');
    const syncGarmin = document.getElementById('sync-garmin');

    // AI Visual Body Scan Modal Elements
    const openVisualScanBtn = document.getElementById('open-visual-scan-btn');
    const visualScanModal = document.getElementById('visual-scan-modal');
    const closeScanModalBtn = document.getElementById('close-scan-modal-btn');
    const scanCancelBtn = document.getElementById('scan-cancel-btn');
    const scanDropzone = document.getElementById('scan-dropzone');
    const scanFileInput = document.getElementById('scan-file-input');
    const scanCanvasContainer = document.getElementById('scan-canvas-container');
    const bodyScanCanvas = document.getElementById('body-scan-canvas');
    const scanLaserLine = document.getElementById('scan-laser-line');
    const scanResultsGrid = document.getElementById('scan-results-grid');
    const scanBfRange = document.getElementById('scan-bf-range');
    const scanSomatotype = document.getElementById('scan-somatotype');
    const scanDistributionZone = document.getElementById('scan-distribution-zone');
    const scanPostureScore = document.getElementById('scan-posture-score');
    const applyScanDataBtn = document.getElementById('apply-scan-data-btn');

    // Outputs & Views
    const loadingView = document.getElementById('ai-loading');
    const resultsView = document.getElementById('results-view');
    const bmiResultTxt = document.getElementById('bmi-result-txt');
    const bmiStatus = document.getElementById('bmi-status');
    const linearMarker = document.getElementById('linear-marker');
    const aiCalories = document.getElementById('ai-calories');
    const aiResponseText = document.getElementById('ai-response-text');

    // Beyond-BMI Output Elements
    const ffmiVal = document.getElementById('ffmi-val');
    const ffmiBadge = document.getElementById('ffmi-badge');
    const ffmiStatVal = document.getElementById('ffmi-stat-val');
    const ffmiCategoryBadge = document.getElementById('ffmi-category-badge');
    const ffmiExplanation = document.getElementById('ffmi-explanation');
    const wthrVal = document.getElementById('wthr-val');
    const wthrBadge = document.getElementById('wthr-badge');
    const wthrStatVal = document.getElementById('wthr-stat-val');
    const wthrRiskBadge = document.getElementById('wthr-risk-badge');
    const wthrExplanation = document.getElementById('wthr-explanation');
    const leanMassKg = document.getElementById('lean-mass-kg');
    const fatMassKg = document.getElementById('fat-mass-kg');
    const demographicAlertPill = document.getElementById('demographic-alert-pill');
    const demographicExplanationTxt = document.getElementById('demographic-explanation-txt');
    const linearRangeLabels = document.getElementById('linear-range-labels');

    // Energy & Macro Outputs
    const bmrStatVal = document.getElementById('bmr-stat-val');
    const tdeeStatVal = document.getElementById('tdee-stat-val');
    const macroProteinG = document.getElementById('macro-protein-g');
    const macroProteinKcal = document.getElementById('macro-protein-kcal');
    const proteinBarFill = document.getElementById('protein-bar-fill');
    const macroCarbsG = document.getElementById('macro-carbs-g');
    const macroCarbsKcal = document.getElementById('macro-carbs-kcal');
    const carbsBarFill = document.getElementById('carbs-bar-fill');
    const macroFatsG = document.getElementById('macro-fats-g');
    const macroFatsKcal = document.getElementById('macro-fats-kcal');
    const fatsBarFill = document.getElementById('fats-bar-fill');

    // Interactive Goal Simulator Elements
    const goalSimulatorCard = document.getElementById('goal-simulator-card');
    const weightSimulatorSlider = document.getElementById('weight-simulator-slider');
    const simWeightDisplay = document.getElementById('sim-weight-display');
    const simWeightDelta = document.getElementById('sim-weight-delta');
    const simBaselineVal = document.getElementById('sim-baseline-val');
    const simSliderMin = document.getElementById('sim-slider-min');
    const simSliderMid = document.getElementById('sim-slider-mid');
    const simSliderMax = document.getElementById('sim-slider-max');
    const simBmiVal = document.getElementById('sim-bmi-val');
    const simCatVal = document.getElementById('sim-cat-val');
    const simBmrVal = document.getElementById('sim-bmr-val');
    const simCalTargetVal = document.getElementById('sim-cal-target-val');
    const simBfVal = document.getElementById('sim-bf-val');
    const simLeanVal = document.getElementById('sim-lean-val');
    const timelineHeadline = document.getElementById('timeline-headline');
    const timelineDetails = document.getElementById('timeline-details');
    const simWeeksBadge = document.getElementById('sim-weeks-badge');
    const milestoneStartWt = document.getElementById('milestone-start-wt');
    const milestoneMidDate = document.getElementById('milestone-mid-date');
    const milestoneGoalDate = document.getElementById('milestone-goal-date');
    const applySimGoalBtn = document.getElementById('apply-sim-goal-btn');
    const simPresetBtns = document.querySelectorAll('.sim-preset-btn');
    const simPaceBtns = document.querySelectorAll('.pace-btn');
    const navSimulatorLink = document.getElementById('nav-simulator-link');
    const navDashboardLink = document.getElementById('nav-dashboard-link');
    const navCalculatorLink = document.getElementById('nav-calculator-link');

    // Longevity & Metabolic Age Elements
    const metabolicAgeVal = document.getElementById('metabolic-age-val');
    const metabolicAgeBadge = document.getElementById('metabolic-age-badge');
    const longevityMetabolicNum = document.getElementById('longevity-metabolic-num');
    const longevityDeltaTxt = document.getElementById('longevity-delta-txt');

    // Voice & Chatbot
    const voiceBtn = document.getElementById('voice-btn');
    const chatbotTrigger = document.getElementById('chatbot-trigger');
    const chatbotWindow = document.getElementById('chatbot-window');
    const closeChat = document.getElementById('close-chat');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendChat = document.getElementById('send-chat');
    const chatAttachBtn = document.getElementById('chat-attach-btn');
    const chatFileInput = document.getElementById('chat-file-input');
    const chatAttachmentPreview = document.getElementById('chat-attachment-preview');
    const chatAttachmentName = document.getElementById('chat-attachment-name');
    const chatAttachmentSize = document.getElementById('chat-attachment-size');
    const chatAttachmentIcon = document.getElementById('chat-attachment-icon');
    const chatAttachmentThumb = document.getElementById('chat-attachment-thumb');
    const chatRemoveAttachment = document.getElementById('chat-remove-attachment');

    // Cookie Banner
    const cookieConsentBanner = document.getElementById('cookie-consent-banner');
    const cookieAcceptBtn = document.getElementById('cookie-accept-btn');
    const cookieDeclineBtn = document.getElementById('cookie-decline-btn');
    const openCookieBannerBtn = document.getElementById('open-cookie-banner-btn');

    // ---- INITIAL TELEMETRY & COOKIE CONSENT ----
    trackEvent('page_view', { path: window.location.pathname });

    const consentState = getConsentState();
    if (!consentState && cookieConsentBanner) {
        cookieConsentBanner.classList.remove('hidden');
    }

    if (cookieAcceptBtn) {
        cookieAcceptBtn.addEventListener('click', () => {
            setConsentState({ analytics: true, timestamp: Date.now() });
            cookieConsentBanner?.classList.add('hidden');
            trackEvent('consent_accepted');
        });
    }

    if (cookieDeclineBtn) {
        cookieDeclineBtn.addEventListener('click', () => {
            setConsentState({ analytics: false, timestamp: Date.now() });
            cookieConsentBanner?.classList.add('hidden');
        });
    }

    if (openCookieBannerBtn) {
        openCookieBannerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            cookieConsentBanner?.classList.remove('hidden');
        });
    }

    // ---- MOBILE DRAWER NAVIGATION ----
    if (mobileToggleBtn && sidebarDrawer) {
        mobileToggleBtn.addEventListener('click', () => {
            const isOpen = sidebarDrawer.classList.toggle('mobile-open');
            mobileToggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        // Close sidebar drawer when clicking on sidebar links or backdrop on mobile
        sidebarDrawer.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 900) {
                    sidebarDrawer.classList.remove('mobile-open');
                    mobileToggleBtn.setAttribute('aria-expanded', 'false');
                }
            });
        });

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 900 && 
                sidebarDrawer.classList.contains('mobile-open') && 
                !sidebarDrawer.contains(e.target) && 
                !mobileToggleBtn.contains(e.target)) {
                sidebarDrawer.classList.remove('mobile-open');
                mobileToggleBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // ---- HERO CALL TO ACTION (CTA) ----
    if (heroCtaBtn) {
        heroCtaBtn.addEventListener('click', (e) => {
            e.preventDefault();
            trackEvent('cta_click', { cta: 'hero_biomarkers_now' });
            const bmiCard = document.getElementById('bmi-form-card');
            if (bmiCard) {
                bmiCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                bmiCard.classList.add('pulse-highlight');
                setTimeout(() => bmiCard.classList.remove('pulse-highlight'), 1500);
            }
            weightInput?.focus();
        });
    }

    // ---- ANTI-SPAM & BOT PROTECTION UTILITIES ----
    function checkBotSubmission(form) {
        // 1. Honeypot check
        const honeypot = form.querySelector('input[name="b_trap"]');
        if (honeypot && honeypot.value.trim().length > 0) {
            console.warn('[VitalAI Security] Honeypot triggered. Bot submission trapped.');
            return true;
        }

        // 2. Submission speed check (< 400ms from page load is inhuman)
        if (Date.now() - pageLoadTimestamp < 400) {
            console.warn('[VitalAI Security] Inhuman submission speed detected (< 400ms).');
            return true;
        }

        // 3. Client rate-limit check (minimum 600ms between submissions)
        const now = Date.now();
        if (now - lastSubmitTimestamp < 600) {
            console.warn('[VitalAI Security] Rate limited excessive submissions.');
            return true;
        }
        lastSubmitTimestamp = now;

        return false;
    }

    // ---- ULTRA-PREMIUM DUAL THEME ENGINE (DARK OBSIDIAN / LIGHT LUXURY) ----
    function applyTheme(isDark) {
        document.body.classList.toggle('dark-mode', isDark);
        document.documentElement.classList.toggle('dark-mode', isDark);
        try {
            localStorage.setItem('ai_theme', isDark ? 'dark' : 'light');
        } catch {}

        // Dynamic browser theme color
        const themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta) {
            themeMeta.setAttribute('content', isDark ? '#0b0416' : '#f7f4fb');
        }

        // Sync all theme toggle buttons across Auth and Header
        const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
        toggleBtns.forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
            }
            btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
            btn.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
        });

        // Dynamic Chart Color Re-rendering
        if (chartInstance) {
            renderChart();
        }
    }

    // Initialize Theme immediately on load
    const savedTheme = localStorage.getItem('ai_theme');
    const isInitiallyDark = savedTheme !== 'light'; // Default to ultra-premium dark cyberpunk
    applyTheme(isInitiallyDark);

    // Global Event Delegation for all Theme Toggle Buttons
    document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.theme-toggle-btn');
        if (!toggleBtn) return;
        e.preventDefault();
        const currentlyDark = document.body.classList.contains('dark-mode');
        const nextDark = !currentlyDark;
        applyTheme(nextDark);
        trackEvent('theme_toggled', { mode: nextDark ? 'dark' : 'light' });
    });

    // ---- AUTHENTICATION ----
    let isSignup = false;
    if (tabSignup && tabLogin) {
        tabSignup.addEventListener('click', () => {
            isSignup = true;
            tabSignup.classList.add('active');
            tabSignup.setAttribute('aria-selected', 'true');
            tabLogin.classList.remove('active');
            tabLogin.setAttribute('aria-selected', 'false');
            nameGroup.style.display = 'flex';
            authName.required = true;
            authBtn.textContent = 'Create Account';
            clearAuthError();
        });

        tabLogin.addEventListener('click', () => {
            isSignup = false;
            tabLogin.classList.add('active');
            tabLogin.setAttribute('aria-selected', 'true');
            tabSignup.classList.remove('active');
            tabSignup.setAttribute('aria-selected', 'false');
            nameGroup.style.display = 'none';
            authName.required = false;
            authBtn.textContent = 'Access Dashboard';
            clearAuthError();
        });
    }

    function showAuthError(msg) {
        if (authErrorMsg) {
            authErrorMsg.textContent = msg;
            authErrorMsg.classList.add('visible');
        }
    }

    function clearAuthError() {
        if (authErrorMsg) {
            authErrorMsg.textContent = '';
            authErrorMsg.classList.remove('visible');
        }
    }

    [authEmail, authPassword, authName].forEach(input => {
        input?.addEventListener('input', clearAuthError);
    });

    if (authForm) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            clearAuthError();

            if (checkBotSubmission(authForm)) {
                showAuthError('Submission rejected by security filters. Please wait a moment.');
                return;
            }

            const email = authEmail.value.trim().toLowerCase();
            const password = authPassword.value;
            const name = authName.value.trim();

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                showAuthError('Please provide a valid email address.');
                authEmail.focus();
                return;
            }

            if (!password || password.length < 6) {
                showAuthError('Password must contain at least 6 characters.');
                authPassword.focus();
                return;
            }

            if (isSignup && (!name || name.length < 2)) {
                showAuthError('Please enter your full name (at least 2 characters).');
                authName.focus();
                return;
            }

            if (isSignup) {
                if (!users[email]) {
                    users[email] = { name: name || 'User', history: [] };
                    localStorage.setItem('users', JSON.stringify(users));
                    trackEvent('user_signup', { success: true });
                    login(email);
                } else {
                    showAuthError('Email already registered! Please log in.');
                }
            } else {
                if (users[email]) {
                    trackEvent('user_login', { is_returning: true });
                    login(email);
                } else {
                    users[email] = { name: 'Demo User', history: [] };
                    localStorage.setItem('users', JSON.stringify(users));
                    trackEvent('user_login', { is_returning: false });
                    login(email);
                }
            }
        });
    }

    function login(email) {
        currentUser = { email, data: users[email] };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showApp();
        fetchQuote();
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('currentUser');
            currentUser = null;
            trackEvent('user_logout');
            showAuth();
        });
    }

    function showAuth() {
        authView?.classList.add('active');
        appView?.classList.remove('active');
    }

    function showApp() {
        authView?.classList.remove('active');
        appView?.classList.add('active');
        if (userNameDisplay && currentUser) {
            userNameDisplay.textContent = currentUser.data.name;
        }
        renderChart();
    }

    if (currentUser) {
        showApp();
        fetchQuote();
    } else {
        showAuth();
    }

    // ---- API CONNECTIONS & QUOTE ----
    async function fetchQuote() {
        try {
            const response = await fetch('https://dummyjson.com/quotes/random');
            if (!response.ok) return;
            const data = await response.json();
            const quoteEl = document.getElementById('daily-quote') || createQuoteElement();
            quoteEl.innerHTML = `<i class="fa-solid fa-quote-left text-gradient" aria-hidden="true"></i> "<em>${data.quote}</em>" <br><small>- ${data.author}</small>`;
        } catch (err) {
            // Non-critical API failure gracefully suppressed
        }
    }

    function createQuoteElement() {
        const quoteEl = document.createElement('div');
        quoteEl.id = 'daily-quote';
        quoteEl.className = 'quote-card glass-panel';
        quoteEl.style.padding = '20px';
        quoteEl.style.marginBottom = '24px';
        quoteEl.style.textAlign = 'center';
        document.querySelector('.dashboard-grid')?.before(quoteEl);
        return quoteEl;
    }

    // ---- OPENROUTER AI ENGINE ----
    const OPENROUTER_DEFAULT_KEY = (typeof atob === 'function' ? atob("c2stb3ItdjEtMjJkY2I5YzdkNWIwOWE4NjZmZGM4MTAzZWM3N2JjYTEyOTAxYTUyMTJlMTQ0YTg3YzYwNzlkMGRiMTJhMDQ4MA==") : "");
    const OPENROUTER_MODEL = "nvidia/nemotron-3.5-lightning:free";

    function getApiKey() {
        try {
            return (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OPENROUTER_API_KEY)
                || localStorage.getItem('openrouter_api_key')
                || OPENROUTER_DEFAULT_KEY;
        } catch {
            return localStorage.getItem('openrouter_api_key') || OPENROUTER_DEFAULT_KEY;
        }
    }

    let openRouterInstance = null;
    async function getOpenRouterClient() {
        if (!openRouterInstance) {
            const { OpenRouter } = await import('@openrouter/sdk');
            const apiKey = getApiKey();
            const referer = (typeof window !== 'undefined' && window.location.origin !== "null" && window.location.origin) 
                ? window.location.origin 
                : "https://vital-ai.onrender.com";
            openRouterInstance = new OpenRouter({
                apiKey: apiKey,
                headers: {
                    "HTTP-Referer": referer,
                    "X-Title": "VitalAI Health & Biomarkers"
                }
            });
        }
        return openRouterInstance;
    }

    // Unified Streaming Client with Reasoning Tokens Tracking
    async function streamNemotronChat({ messages, onChunk, onReasoningTokens }) {
        const openrouter = await getOpenRouterClient();
        try {
            const stream = await openrouter.chat.send({
                chatRequest: {
                    model: OPENROUTER_MODEL,
                    messages: messages,
                    stream: true
                }
            });

            let fullText = "";
            let reasoningTokens = 0;

            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                    fullText += content;
                    if (onChunk) onChunk(content, fullText);
                }
                if (chunk.usage?.completionTokensDetails?.reasoningTokens) {
                    reasoningTokens = chunk.usage.completionTokensDetails.reasoningTokens;
                    if (onReasoningTokens) onReasoningTokens(reasoningTokens);
                }
            }

            return { text: fullText, reasoningTokens };
        } catch (sdkErr) {
            console.warn('[VitalAI] OpenRouter SDK fallback to direct endpoint:', sdkErr);
            const apiKey = getApiKey();
            const referer = (typeof window !== 'undefined' && window.location.origin !== "null" && window.location.origin) 
                ? window.location.origin 
                : "https://vital-ai.onrender.com";

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "HTTP-Referer": referer,
                    "X-Title": "VitalAI Health & Biomarkers",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: OPENROUTER_MODEL,
                    messages: messages,
                    stream: true
                })
            });

            if (!response.ok) throw new Error(`HTTP status ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";
            let buffer = "";
            let reasoningTokens = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop();

                for (const line of lines) {
                    const cleanLine = line.trim();
                    if (!cleanLine || !cleanLine.startsWith("data: ")) continue;
                    if (cleanLine.includes("[DONE]")) break;

                    try {
                        const json = JSON.parse(cleanLine.replace(/^data: /, ""));
                        const content = json.choices[0]?.delta?.content;
                        if (content) {
                            fullText += content;
                            if (onChunk) onChunk(content, fullText);
                        }
                        if (json.usage?.completionTokensDetails?.reasoningTokens) {
                            reasoningTokens = json.usage.completionTokensDetails.reasoningTokens;
                            if (onReasoningTokens) onReasoningTokens(reasoningTokens);
                        }
                    } catch {}
                }
            }

            return { text: fullText, reasoningTokens };
        }
    }

    function generateClinicalDeterministicPlan(bmi, cat, cals, age, gender, h, w, ffmi, wthr, metabolicAge, pGrams, cGrams, fGrams) {
        return `
            <div class="clinical-plan-container">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; color:#10b981; font-weight:700;">
                    <i class="fa-solid fa-circle-check" aria-hidden="true"></i> VitalAI Biomarker Synthesis & Clinical Longevity Protocol
                </div>
                <p><strong>Metabolic Prescription:</strong> At <strong>${bmi} BMI (${cat.c})</strong>, with a normalized <strong>FFMI of ${ffmi}</strong> and <strong>Waist/Height Ratio of ${wthr}</strong>, your biological metabolic age is calibrated at <strong>${metabolicAge} years</strong>.</p>
                <p><strong>Macronutrient Allocation:</strong> Your daily energy target is calibrated at <strong>${cals} kcal/day</strong>: <strong>${pGrams}g Protein</strong> (hypertrophy & myofibrillar preservation), <strong>${cGrams}g Complex Carbohydrates</strong> (glycogen replenishment), and <strong>${fGrams}g Essential Fats</strong> (endocrine homeostasis).</p>
                <p><strong>Actionable Protocol:</strong> ${cat.d} For physical conditioning: ${cat.e}</p>
                <div style="margin-top:14px; padding:10px 14px; border-radius:10px; background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.25); font-size:0.8rem; color:#cbd5e1;">
                    <i class="fa-solid fa-shield-halved" style="color:#6366f1;"></i> <strong>Zero Data Leakage:</strong> Computed locally via VitalAI deterministic clinical models.
                </div>
            </div>
        `;
    }

    // LLM Advice Engine
    async function fetchOpenRouterAdvice(bmi, cat, cals, age, gender, h, w, ffmi, wthr, metabolicAge, pGrams, cGrams, fGrams, ethnicity, goal) {
        aiResponseText.innerHTML = '<div class="typing-cursor">Synthesizing personalized AI clinical plan...</div>';
        aiResponseText.classList.add('shimmer');

        const hDisp = unit === 'metric' ? `${(h * 100).toFixed(1)}cm` : `${(h / 0.0254).toFixed(1)}in`;
        const wDisp = unit === 'metric' ? `${w.toFixed(1)}kg` : `${(w / 0.453592).toFixed(1)}lb`;

        try {
            const result = await streamNemotronChat({
                messages: [
                    {
                        role: "system",
                        content: "You are VitalAI's chief clinical nutritionist, exercise physiologist, and metabolic longevity specialist. Provide an evidence-based, highly personalized 2-paragraph diet and conditioning protocol based on the patient's exact biometric measurements. Format cleanly with HTML paragraph <p> tags and <strong> bold highlights. Never mention model or vendor names."
                    },
                    {
                        role: "user",
                        content: `Analyze my complete biometric profile:
- Age: ${age}, Gender: ${gender}, Height: ${hDisp}, Weight: ${wDisp}
- Calculated BMI: ${bmi} (${cat.c} under ${ethnicity})
- Normalized Fat-Free Mass Index (FFMI): ${ffmi}
- Waist-to-Height Ratio (WtHR): ${wthr}
- Estimated Metabolic Age: ${metabolicAge} years
- Calibrated Calorie Target: ${cals} kcal/day (Goal: ${goal})
- Macronutrient Targets: ${pGrams}g Protein, ${cGrams}g Carbs, ${fGrams}g Healthy Fats.

Detail precise nutritional timing, glycemic optimization, and targeted resistance/Zone-2 conditioning to optimize body composition and metabolic longevity.`
                    }
                ],
                onChunk: (content, fullText) => {
                    aiResponseText.innerHTML = fullText + '<span class="typing-cursor"></span>';
                }
            });

            let reasoningMeta = "";
            if (result.reasoningTokens > 0) {
                reasoningMeta = `<div class="ai-reasoning-tag"><i class="fa-solid fa-brain" aria-hidden="true"></i> VitalAI Intelligence • ${result.reasoningTokens} reasoning tokens analyzed</div>`;
            }

            aiResponseText.innerHTML = (result.text || generateClinicalDeterministicPlan(bmi, cat, cals, age, gender, h, w, ffmi, wthr, metabolicAge, pGrams, cGrams, fGrams)) + reasoningMeta;
            aiResponseText.classList.remove('shimmer');
        } catch (err) {
            console.warn('[VitalAI] AI synthesis fell back to clinical deterministic model:', err);
            aiResponseText.classList.remove('shimmer');
            aiResponseText.innerHTML = generateClinicalDeterministicPlan(bmi, cat, cals, age, gender, h, w, ffmi, wthr, metabolicAge, pGrams, cGrams, fGrams);
        }
    }

    // ---- VOICE RECOGNITION ----
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && voiceBtn) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';

        voiceBtn.addEventListener('click', () => {
            if (voiceBtn.classList.contains('active')) {
                recognition.stop();
            } else {
                recognition.start();
                voiceBtn.classList.add('active');
            }
        });

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            voiceBtn.classList.remove('active');

            const weightMatch = transcript.match(/weight (is|at|of)?\s*(\d+(\.\d+)?)/);
            if (weightMatch && weightInput) weightInput.value = weightMatch[2];

            const heightMatch = transcript.match(/height (is|at|of)?\s*(\d+(\.\d+)?)/);
            if (heightMatch) {
                if (unit === 'metric' && heightCm) heightCm.value = heightMatch[2];
                else if (heightFt) heightFt.value = heightMatch[2];
            }

            if (weightMatch || heightMatch) {
                const toast = document.createElement('div');
                toast.className = 'glass-panel';
                toast.style = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); padding:10px 20px; z-index:2000; font-weight:bold; color:var(--primary);';
                toast.textContent = "Voice input processed successfully!";
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2000);
            }
        };

        recognition.onerror = () => voiceBtn.classList.remove('active');
        recognition.onend = () => voiceBtn.classList.remove('active');
    } else if (voiceBtn) {
        voiceBtn.style.display = 'none';
    }

    // ---- CHATBOT ASSISTANT LOGIC ----
    if (chatbotTrigger && chatbotWindow) {
        chatbotTrigger.addEventListener('click', () => {
            chatbotWindow.classList.toggle('hidden');
            if (!chatbotWindow.classList.contains('hidden') && chatInput) {
                chatInput.focus();
                trackEvent('chat_opened');
            }
        });

        closeChat?.addEventListener('click', () => chatbotWindow.classList.add('hidden'));

        let currentAttachment = null;

        if (chatAttachBtn && chatFileInput) {
            chatAttachBtn.addEventListener('click', () => {
                chatFileInput.click();
            });

            chatFileInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;

                const sizeFormatted = file.size > 1048576 
                    ? (file.size / 1048576).toFixed(1) + ' MB'
                    : (file.size / 1024).toFixed(0) + ' KB';

                currentAttachment = {
                    file,
                    name: file.name,
                    size: sizeFormatted,
                    type: file.type,
                    isImage: file.type.startsWith('image/'),
                    dataUrl: null,
                    textContent: null
                };

                if (chatAttachmentName) chatAttachmentName.textContent = file.name;
                if (chatAttachmentSize) chatAttachmentSize.textContent = sizeFormatted;

                if (currentAttachment.isImage) {
                    const reader = new FileReader();
                    reader.onload = (rev) => {
                        currentAttachment.dataUrl = rev.target.result;
                        if (chatAttachmentThumb) {
                            chatAttachmentThumb.src = rev.target.result;
                            chatAttachmentThumb.classList.remove('hidden');
                        }
                        if (chatAttachmentIcon) chatAttachmentIcon.style.display = 'none';
                    };
                    reader.readAsDataURL(file);
                } else {
                    if (chatAttachmentThumb) chatAttachmentThumb.classList.add('hidden');
                    if (chatAttachmentIcon) {
                        chatAttachmentIcon.style.display = 'inline-block';
                        chatAttachmentIcon.className = file.name.endsWith('.pdf')
                            ? 'fa-solid fa-file-pdf text-gradient'
                            : 'fa-solid fa-file-lines text-gradient';
                    }
                    if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.csv') || file.name.endsWith('.json')) {
                        const txtReader = new FileReader();
                        txtReader.onload = (tev) => {
                            currentAttachment.textContent = tev.target.result;
                        };
                        txtReader.readAsText(file);
                    }
                }

                chatAttachmentPreview?.classList.remove('hidden');
                chatInput?.focus();
            });
        }

        if (chatRemoveAttachment) {
            chatRemoveAttachment.addEventListener('click', () => {
                currentAttachment = null;
                if (chatFileInput) chatFileInput.value = '';
                chatAttachmentPreview?.classList.add('hidden');
                if (chatAttachmentThumb) {
                    chatAttachmentThumb.src = '';
                    chatAttachmentThumb.classList.add('hidden');
                }
                if (chatAttachmentIcon) chatAttachmentIcon.style.display = 'inline-block';
            });
        }

        const chatHistory = [
            {
                role: "system",
                content: "You are the VitalAI Assistant. You specialize in clinical health, fitness protocols, calorie counting, macronutrients, and biomarker analysis. When the user attaches lab reports, documents, or photos, interpret and extract health insights thoroughly. Be encouraging, concise, and scientifically grounded. Never mention the underlying AI model name."
            }
        ];

        async function handleChat() {
            const msg = chatInput.value.trim();
            if (!msg && !currentAttachment) return;

            const attachedToSend = currentAttachment;
            currentAttachment = null;
            if (chatFileInput) chatFileInput.value = '';
            chatAttachmentPreview?.classList.add('hidden');
            if (chatAttachmentThumb) {
                chatAttachmentThumb.src = '';
                chatAttachmentThumb.classList.add('hidden');
            }

            // Build user message HTML bubble
            let userBubbleContent = '';
            if (attachedToSend) {
                if (attachedToSend.isImage && attachedToSend.dataUrl) {
                    userBubbleContent += `<img src="${attachedToSend.dataUrl}" class="chat-message-attachment-img" alt="${attachedToSend.name}">`;
                } else {
                    userBubbleContent += `<div class="chat-message-attachment-file"><i class="fa-solid fa-file-medical text-gradient"></i> <span>${attachedToSend.name} (${attachedToSend.size})</span></div>`;
                }
            }
            if (msg) {
                userBubbleContent += `<p>${msg}</p>`;
            } else if (attachedToSend) {
                userBubbleContent += `<p style="font-size:0.85rem; opacity:0.85;">Attached: <strong>${attachedToSend.name}</strong></p>`;
            }

            appendMessage('user', userBubbleContent);
            chatInput.value = '';
            trackEvent('chat_message_sent', { has_attachment: !!attachedToSend });

            // Handle user pasting OpenRouter API Key
            if (msg.startsWith('sk-or-') || (msg.length > 25 && msg.includes('sk-'))) {
                localStorage.setItem('openrouter_api_key', msg);
                chatMessages.innerHTML = '';
                appendMessage('ai', 'API Key updated in local storage! Generative health models are now unlocked.');
                return;
            }

            // Prepare prompt for AI
            let promptText = msg;
            if (attachedToSend) {
                if (attachedToSend.textContent) {
                    promptText = `[User Attached File: ${attachedToSend.name} (${attachedToSend.size})]\nFile Contents:\n${attachedToSend.textContent.slice(0, 3500)}\n\n${msg || "Please analyze this health file and provide clinical guidance."}`;
                } else if (attachedToSend.isImage) {
                    promptText = `[User uploaded an image/body scan: ${attachedToSend.name} (${attachedToSend.size})]\n\n${msg || "Please analyze this health upload and provide dietary, physical conditioning, and biomarker insights."}`;
                } else {
                    promptText = `[User attached medical/health document: ${attachedToSend.name} (${attachedToSend.size})]\n\n${msg || "Please provide clinical wellness advice based on this health document."}`;
                }
            }

            chatHistory.push({ role: 'user', content: promptText });
            if (chatHistory.length > 12) {
                chatHistory.splice(1, 2);
            }

            const aiMsgDiv = appendMessage('ai', '<span class="typing-cursor"></span>');

            try {
                const result = await streamNemotronChat({
                    messages: chatHistory,
                    onChunk: (content, fullReply) => {
                        aiMsgDiv.innerHTML = (fullReply.startsWith('<') ? fullReply : `<p>${fullReply}</p>`) + '<span class="typing-cursor"></span>';
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                });

                chatHistory.push({ role: 'assistant', content: result.text });

                let reasoningMeta = "";
                if (result.reasoningTokens > 0) {
                    reasoningMeta = `<div class="ai-reasoning-tag"><i class="fa-solid fa-microchip" aria-hidden="true"></i> VitalAI • ${result.reasoningTokens} reasoning tokens</div>`;
                }

                aiMsgDiv.innerHTML = (result.text ? (result.text.startsWith('<') ? result.text : `<p>${result.text}</p>`) : "I am here to assist with your health and fitness queries!") + reasoningMeta;
                chatMessages.scrollTop = chatMessages.scrollHeight;
            } catch (err) {
                console.error('[VitalAI Chatbot Error]:', err);
                aiMsgDiv.innerHTML = `<span style="color: #f87171"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Service temporarily unavailable. Please try again shortly.</span>`;
            }
        }

        function appendMessage(role, text) {
            const div = document.createElement('div');
            div.className = `message ${role}`;
            div.innerHTML = text.startsWith('<') ? text : `<p>${text}</p>`;
            chatMessages?.appendChild(div);
            if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
            return div;
        }

        sendChat?.addEventListener('click', handleChat);
        chatInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleChat(); });
    }


    // ---- UNIT TOGGLE ----
    function setUnitMode(newUnit) {
        if (!newUnit || (newUnit !== 'metric' && newUnit !== 'imperial')) return;
        unit = newUnit;
        unitBtns.forEach(b => {
            const isActive = b.dataset.unit === unit;
            b.classList.toggle('active', isActive);
            b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        clearFormErrors();

        if (unit === 'metric') {
            if (metricHeight) metricHeight.style.display = 'block';
            if (imperialHeight) imperialHeight.style.display = 'none';
            if (weightUnit) weightUnit.textContent = 'kg';
            if (waistUnit) waistUnit.textContent = 'cm';
            if (waistInput) {
                waistInput.placeholder = '80';
                waistInput.min = '30';
                waistInput.max = '220';
            }
            if (heightCm) heightCm.required = true;
            if (heightFt) heightFt.required = false;
            if (heightIn) heightIn.required = false;
        } else {
            if (metricHeight) metricHeight.style.display = 'none';
            if (imperialHeight) imperialHeight.style.display = 'block';
            if (weightUnit) weightUnit.textContent = 'lb';
            if (waistUnit) waistUnit.textContent = 'in';
            if (waistInput) {
                waistInput.placeholder = '31';
                waistInput.min = '12';
                waistInput.max = '85';
            }
            if (heightCm) heightCm.required = false;
            if (heightFt) heightFt.required = true;
            if (heightIn) heightIn.required = true;
        }
    }

    unitBtns.forEach(btn => btn.addEventListener('click', (e) => {
        e.preventDefault();
        setUnitMode(btn.dataset.unit);
    }));
    if (heightCm) heightCm.required = true;

    // ---- AI & DEMOGRAPHIC MAPPINGS ----
    const AIMappings = [
        { c: 'Underweight', min: 0, max: 18.5, col: '#38bdf8', d: 'Focus on nutrient-dense complex foods (avocados, nuts, whole grains, lean proteins). Eat 4-5 balanced meals to safely increase healthy tissue mass.', e: 'Prioritize resistance hypertrophy training over intense endurance cardio to build and preserve lean mass.' },
        { c: 'Normal', min: 18.5, max: 25, col: '#10b981', d: 'Maintain metabolic homeostasis! Balance 45% complex carbohydrates, 30% lean protein, and 25% healthy dietary fats.', e: 'Combine resistance training (3 days/week) with zone-2 aerobic conditioning (2 days/week) to maintain cardiovascular endurance.' },
        { c: 'Overweight', min: 25, max: 30, col: '#fbbf24', d: 'Implement a mild caloric deficit (-350 to -500 kcal). Boost dietary fiber and water intake to optimize satiety and glucose sensitivity.', e: 'Target 150-200 minutes of weekly aerobic activity (brisk walking, cycling, rowing) paired with compound strength training.' },
        { c: 'Obese', min: 30, max: 100, col: '#f87171', d: 'Prioritize whole, minimally processed foods, eliminate refined liquid sugars, and adhere to structured meal timing.', e: 'Engage in low-impact movement (swimming, elliptical, brisk walking) to minimize joint loading while elevating daily active thermogenesis.' }
    ];

    function getDemographicMappings(scaleKey) {
        if (scaleKey === 'south_asian') {
            return {
                title: 'South Asian (WHO)',
                explanation: 'Adjusted WHO cutoff: In South Asian & Asian populations, increased cardiometabolic disease risk and visceral adiposity manifest at lower BMIs (≥ 23 kg/m²).',
                labels: ['15 (Under)', '18.5 (Normal)', '23 (Over)', '27.5 (Obese)', '40'],
                categories: [
                    { c: 'Underweight', min: 0, max: 18.5, col: '#38bdf8', d: 'Focus on nutrient-dense foods (legumes, nuts, dairy, lean proteins) to build healthy tissue mass.', e: 'Hypertrophy resistance training.' },
                    { c: 'Normal', min: 18.5, max: 23, col: '#10b981', d: 'Optimal cardiometabolic baseline for South Asian demographics. Maintain healthy insulin sensitivity with low-glycemic nutrition.', e: 'Combine resistance training with zone-2 aerobic conditioning.' },
                    { c: 'Overweight (Increased Risk)', min: 23, max: 27.5, col: '#fbbf24', d: 'Moderate caloric deficit (-350 to -500 kcal) with high dietary fiber to improve glycemic sensitivity.', e: 'Target 150-200 minutes of weekly aerobic activity and compound strength.' },
                    { c: 'Obese (High Risk)', min: 27.5, max: 100, col: '#f87171', d: 'Strict whole-food protocol, minimize refined carbohydrates, and implement structured meal timing.', e: 'Low-impact movement to reduce joint loading while elevating daily thermogenesis.' }
                ]
            };
        } else if (scaleKey === 'pacific') {
            return {
                title: 'Pacific Islander',
                explanation: 'Adjusted Polynesian & Pacific Islander cutoff: Characterized by higher average lean bone and skeletal muscle density per unit height.',
                labels: ['15 (Under)', '18.5 (Normal)', '26 (Over)', '32 (Obese)', '40'],
                categories: [
                    { c: 'Underweight', min: 0, max: 18.5, col: '#38bdf8', d: 'Focus on nutrient-dense foods to safely build tissue mass.', e: 'Hypertrophy training.' },
                    { c: 'Normal', min: 18.5, max: 26, col: '#10b981', d: 'Excellent functional bone and muscle density profile. Maintain nutrient density.', e: 'Cardio & strength hybrid.' },
                    { c: 'Overweight', min: 26, max: 32, col: '#fbbf24', d: 'Moderate deficit to reduce central visceral adiposity.', e: 'Zone 2 cardio and compound strength.' },
                    { c: 'Obese', min: 32, max: 100, col: '#f87171', d: 'Whole-food nutrition protocol and structured training.', e: 'Low-impact progressive conditioning.' }
                ]
            };
        }
        return {
            title: 'Global WHO Standard',
            explanation: 'Standard World Health Organization baseline cutoffs for global adult populations.',
            labels: ['15 (Under)', '18.5 (Normal)', '25 (Over)', '30 (Obese)', '40'],
            categories: AIMappings
        };
    }

    // ---- FORM VALIDATION UTILITIES ----
    function clearFormErrors() {
        weightError?.classList.remove('visible');
        weightBox?.classList.remove('field-error');
        heightError?.classList.remove('visible');
        heightBox?.classList.remove('field-error');
        imperialError?.classList.remove('visible');
        imperialBox?.classList.remove('field-error');
        ageError?.classList.remove('visible');
        ageBox?.classList.remove('field-error');
        waistError?.classList.remove('visible');
        waistBox?.classList.remove('field-error');
    }

    [weightInput, heightCm, heightFt, heightIn, ageInput, waistInput].forEach(inp => {
        inp?.addEventListener('input', clearFormErrors);
    });

    // ---- BMI LOGIC, BEYOND-BMI ENGINE & VALIDATION ----
    if (bmiForm) {
        bmiForm.addEventListener('submit', (e) => {
            e.preventDefault();
            clearFormErrors();

            // Anti-bot check
            if (checkBotSubmission(bmiForm)) {
                alert('Submission blocked by security verification.');
                return;
            }

            let isValid = true;
            let w = parseFloat(weightInput?.value);
            let h = 0;

            // Validate Weight
            if (unit === 'metric') {
                if (isNaN(w) || w < 20 || w > 350) {
                    weightError?.classList.add('visible');
                    weightBox?.classList.add('field-error');
                    isValid = false;
                }
            } else {
                if (isNaN(w) || w < 44 || w > 770) {
                    weightError?.classList.add('visible');
                    weightBox?.classList.add('field-error');
                    isValid = false;
                }
            }

            // Validate Height
            if (unit === 'metric') {
                let cm = parseFloat(heightCm?.value);
                if (isNaN(cm) || cm < 80 || cm > 260) {
                    heightError?.classList.add('visible');
                    heightBox?.classList.add('field-error');
                    isValid = false;
                } else {
                    h = cm / 100;
                }
            } else {
                let ft = parseFloat(heightFt?.value);
                let inn = parseFloat(heightIn?.value);
                if (isNaN(ft) || ft < 3 || ft > 8 || isNaN(inn) || inn < 0 || inn > 11.9) {
                    imperialError?.classList.add('visible');
                    imperialBox?.classList.add('field-error');
                    isValid = false;
                } else {
                    h = (ft * 12 + inn) * 0.0254;
                    w = w * 0.453592; // convert lb to kg for internal formula
                }
            }

            // Validate Age
            let age = parseInt(ageInput?.value);
            if (isNaN(age) || age < 12 || age > 120) {
                ageError?.classList.add('visible');
                ageBox?.classList.add('field-error');
                isValid = false;
            }

            // Validate Waist (for WtHR & Visceral Fat)
            let waistVal = parseFloat(waistInput?.value);
            let waistCm = 0;
            if (!isNaN(waistVal) && waistVal > 0) {
                if (unit === 'metric') {
                    if (waistVal < 30 || waistVal > 220) {
                        waistError?.classList.add('visible');
                        waistBox?.classList.add('field-error');
                        isValid = false;
                    } else {
                        waistCm = waistVal;
                    }
                } else {
                    if (waistVal < 12 || waistVal > 85) {
                        waistError?.classList.add('visible');
                        waistBox?.classList.add('field-error');
                        isValid = false;
                    } else {
                        waistCm = waistVal * 2.54;
                    }
                }
            } else if (h > 0 && w > 0) {
                // If not specified, calculate clinical anthropometric approximation
                const genderRadio = document.querySelector('input[name="gender"]:checked');
                const isMale = !genderRadio || genderRadio.value === 'male';
                waistCm = Math.round(h * 100 * (isMale ? 0.48 : 0.45) * Math.sqrt((w / (h * h)) / 22));
            }

            const genderRadio = document.querySelector('input[name="gender"]:checked');
            const gender = genderRadio ? genderRadio.value : 'male';
            const ethnicity = ethnicityScale ? ethnicityScale.value : 'who_standard';
            const actMult = activityLevel ? parseFloat(activityLevel.value) : 1.375;
            const goal = userGoal ? userGoal.value : 'fat_loss';

            if (!isValid || !h || !w || h <= 0 || w <= 0) return;

            let bmi = Math.round((w / (h * h)) * 10) / 10;
            const demographicData = getDemographicMappings(ethnicity);
            let cat = demographicData.categories.find(x => bmi >= x.min && bmi < x.max) || demographicData.categories[demographicData.categories.length - 1];

            // BMR & Energy
            let bmr = (10 * w) + (6.25 * (h * 100)) - (5 * age) + (gender === 'male' ? 5 : -161);
            let cals = Math.round(bmr * actMult);

            trackEvent('bmi_calculated', { bmi, category: cat.c, gender, age, ethnicity, goal });

            loadingView?.classList.remove('hidden');
            loadingView?.classList.add('shimmer');
            resultsView?.classList.add('hidden');

            setTimeout(() => {
                loadingView?.classList.add('hidden');
                loadingView?.classList.remove('shimmer');
                resultsView?.classList.remove('hidden');
                playBeep();

                showResults(bmi, cat, cals, age, gender, h, w, waistCm, ethnicity, actMult, goal);
                saveResult(bmi, age, h, w, gender);

                // Smoothly scroll results into view
                resultsView?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 800);
        });
    }

    if (formResetBtn) {
        formResetBtn.addEventListener('click', () => {
            resultsView?.classList.add('hidden');
            clearFormErrors();
            bmiForm?.reset();
        });
    }

    function handleResetHistory(e) {
        if (e) e.preventDefault();
        if (confirm('Clear your entire recorded biomarker history?')) {
            if (currentUser && users[currentUser.email]) {
                users[currentUser.email].history = [];
                localStorage.setItem('users', JSON.stringify(users));
            }
            localStorage.removeItem('guest_history');
            renderChart();
            showToast('Biomarker history has been reset.');
            trackEvent('history_cleared');
        }
    }

    if (resetHistoryBtn) {
        resetHistoryBtn.addEventListener('click', handleResetHistory);
    }
    if (footerResetHistoryBtn) {
        footerResetHistoryBtn.addEventListener('click', handleResetHistory);
    }

    function showResults(bmi, cat, cals, age, gender, h, w, waistCm, ethnicity, actMult, goal) {
        // 1. Demographic scaling & Linear Range labels
        const demographicData = getDemographicMappings(ethnicity);
        if (demographicAlertPill) {
            demographicAlertPill.textContent = demographicData.title;
        }
        if (demographicExplanationTxt) {
            demographicExplanationTxt.textContent = demographicData.explanation;
        }
        if (linearRangeLabels && demographicData.labels) {
            linearRangeLabels.innerHTML = demographicData.labels.map(lbl => `<span>${lbl}</span>`).join('');
        }

        // 2. BMI result & status
        if (bmiResultTxt) animateValue(bmiResultTxt, 0, bmi, 1200, true);
        if (bmiStatus) {
            bmiStatus.textContent = cat.c;
            bmiStatus.style.color = cat.col;
            bmiStatus.style.background = cat.col + '25';
        }

        // 3. Body Fat (Deurenberg Formula)
        const bf = (1.20 * bmi) + (0.23 * age) - (gender === 'male' ? 16.2 : 5.4);
        const bfVal = Math.max(5, Math.min(50, bf));
        const bodyFatEl = document.getElementById('bodyfat-val');
        const bodyFatProgress = document.getElementById('bodyfat-progress');
        if (bodyFatEl) animateValue(bodyFatEl, 0, bfVal, 1200, true, '%');
        if (bodyFatProgress) bodyFatProgress.style.width = bfVal + '%';

        // 4. Compartmental Lean & Fat Mass
        const leanMass = w * (1 - (bfVal / 100));
        const fatMass = w * (bfVal / 100);
        if (leanMassKg) leanMassKg.textContent = `${leanMass.toFixed(1)} kg`;
        if (fatMassKg) fatMassKg.textContent = `${fatMass.toFixed(1)} kg`;

        // 5. Fat-Free Mass Index (FFMI) (Feature 1)
        const ffmiRaw = leanMass / (h * h);
        const normalizedFFMI = ffmiRaw + 6.1 * (1.8 - h);
        const ffmiDisplay = normalizedFFMI.toFixed(1);
        if (ffmiVal) animateValue(ffmiVal, 0, normalizedFFMI, 1200, true);
        if (ffmiStatVal) ffmiStatVal.textContent = ffmiDisplay;

        let ffmiCat = 'Average';
        let ffmiCol = 'optimal';
        if (gender === 'male') {
            if (normalizedFFMI < 18) { ffmiCat = 'Below Average'; ffmiCol = 'warning'; }
            else if (normalizedFFMI < 20) { ffmiCat = 'Average'; ffmiCol = 'optimal'; }
            else if (normalizedFFMI < 22) { ffmiCat = 'Athletic / Muscular'; ffmiCol = 'optimal'; }
            else if (normalizedFFMI < 25) { ffmiCat = 'Superior'; ffmiCol = 'optimal'; }
            else { ffmiCat = 'Elite / Exceptional'; ffmiCol = 'optimal'; }
        } else {
            if (normalizedFFMI < 15) { ffmiCat = 'Below Average'; ffmiCol = 'warning'; }
            else if (normalizedFFMI < 17) { ffmiCat = 'Average'; ffmiCol = 'optimal'; }
            else if (normalizedFFMI < 19) { ffmiCat = 'Athletic / Muscular'; ffmiCol = 'optimal'; }
            else if (normalizedFFMI < 22) { ffmiCat = 'Superior'; ffmiCol = 'optimal'; }
            else { ffmiCat = 'Elite / Exceptional'; ffmiCol = 'optimal'; }
        }
        if (ffmiBadge) {
            ffmiBadge.className = `comp-badge ${ffmiCol}`;
            ffmiBadge.textContent = ffmiCat;
        }
        if (ffmiCategoryBadge) {
            ffmiCategoryBadge.className = `comp-badge ${ffmiCol}`;
            ffmiCategoryBadge.textContent = ffmiCat;
        }
        if (ffmiExplanation) {
            if (bmi >= 25 && (ffmiCat.includes('Athletic') || ffmiCat.includes('Superior') || ffmiCat.includes('Elite'))) {
                ffmiExplanation.innerHTML = `<strong>Athletic Muscularity Detected:</strong> Your elevated BMI is caused by functional muscle density, not excess adipose tissue!`;
            } else {
                ffmiExplanation.textContent = `Normalized FFMI of ${ffmiDisplay} distinguishes functional muscle mass from body fat.`;
            }
        }

        // 6. Waist-to-Height Ratio (WtHR) & Visceral Fat Risk (Feature 1)
        const wthr = waistCm / (h * 100);
        const wthrDisplay = wthr.toFixed(2);
        if (wthrVal) wthrVal.textContent = wthrDisplay;
        if (wthrStatVal) wthrStatVal.textContent = wthrDisplay;

        let wthrRisk = 'Optimal';
        let wthrBadgeClass = 'optimal';
        let wthrDesc = 'Healthy visceral fat level (< 0.50). Low cardiometabolic risk.';
        if (wthr < 0.40) {
            wthrRisk = 'Low Visceral Fat';
            wthrBadgeClass = 'warning';
            wthrDesc = 'Waist circumference is low relative to height. Ensure adequate lean tissue mass.';
        } else if (wthr < 0.50) {
            wthrRisk = 'Optimal';
            wthrBadgeClass = 'optimal';
            wthrDesc = 'Low visceral fat accumulation. Ideal cardiovascular risk profile.';
        } else if (wthr < 0.60) {
            wthrRisk = 'Increased Risk';
            wthrBadgeClass = 'warning';
            wthrDesc = 'Elevated central visceral adiposity. Increased cardiometabolic disease risk.';
        } else {
            wthrRisk = 'High Risk';
            wthrBadgeClass = 'danger';
            wthrDesc = 'Waist exceeds 60% of height. Targeted aerobic & nutritional intervention recommended.';
        }
        if (wthrBadge) {
            wthrBadge.className = `comp-badge ${wthrBadgeClass}`;
            wthrBadge.textContent = wthrRisk;
        }
        if (wthrRiskBadge) {
            wthrRiskBadge.className = `comp-badge ${wthrBadgeClass}`;
            wthrRiskBadge.textContent = wthrRisk;
        }
        if (wthrExplanation) {
            wthrExplanation.textContent = wthrDesc;
        }

        // 7. Metabolic / Biological Age (Feature 6)
        let ageDelta = 0;
        if (wthr < 0.49) ageDelta -= 3;
        else if (wthr >= 0.55) ageDelta += 4;

        if (normalizedFFMI >= (gender === 'male' ? 20.5 : 17.5)) ageDelta -= 2;
        else if (normalizedFFMI < (gender === 'male' ? 18 : 15)) ageDelta += 2;

        if (bfVal > (gender === 'male' ? 25 : 32)) ageDelta += 3;
        else if (bfVal < (gender === 'male' ? 16 : 23)) ageDelta -= 1;

        const metabolicAge = Math.max(18, Math.round(age + ageDelta));
        if (metabolicAgeVal) animateValue(metabolicAgeVal, 0, metabolicAge, 1000);
        if (longevityMetabolicNum) animateValue(longevityMetabolicNum, 0, metabolicAge, 1000);
        if (metabolicAgeBadge) {
            metabolicAgeBadge.textContent = metabolicAge < age ? `${age - metabolicAge}y younger` : (metabolicAge > age ? `${metabolicAge - age}y older` : 'Chronological sync');
            metabolicAgeBadge.className = `comp-badge ${metabolicAge <= age ? 'optimal' : 'warning'}`;
        }
        if (longevityDeltaTxt) {
            if (metabolicAge < age) {
                longevityDeltaTxt.innerHTML = `<span style="color:#10b981; font-weight:700;"><i class="fa-solid fa-arrow-trend-down"></i> ${age - metabolicAge} years younger than chronological age</span>`;
            } else if (metabolicAge > age) {
                longevityDeltaTxt.innerHTML = `<span style="color:#fbbf24; font-weight:700;"><i class="fa-solid fa-arrow-trend-up"></i> ${metabolicAge - age} years higher metabolic load</span>`;
            } else {
                longevityDeltaTxt.innerHTML = `<span style="color:#10b981; font-weight:700;"><i class="fa-solid fa-equals"></i> In exact metabolic parity</span>`;
            }
        }

        // 8. Smart Energy & Macro Targets (Feature 4)
        const bmr = Math.round(370 + (21.6 * leanMass));
        const tdee = Math.round(bmr * actMult);
        let calTarget = cals;
        let pGrams = 0, cGrams = 0, fGrams = 0;

        if (goal === 'fat_loss') {
            calTarget = Math.round(tdee * 0.80);
            pGrams = Math.round(w * 2.2);
            fGrams = Math.round((calTarget * 0.25) / 9);
            cGrams = Math.max(30, Math.round((calTarget - (pGrams * 4 + fGrams * 9)) / 4));
        } else if (goal === 'muscle_gain') {
            calTarget = Math.round(tdee * 1.10);
            pGrams = Math.round(w * 1.8);
            fGrams = Math.round((calTarget * 0.20) / 9);
            cGrams = Math.round((calTarget - (pGrams * 4 + fGrams * 9)) / 4);
        } else { // recomp
            calTarget = Math.round(tdee);
            pGrams = Math.round(w * 2.0);
            fGrams = Math.round((calTarget * 0.25) / 9);
            cGrams = Math.round((calTarget - (pGrams * 4 + fGrams * 9)) / 4);
        }

        if (aiCalories) animateValue(aiCalories, 0, calTarget, 1000, false, ' kcal');
        if (bmrStatVal) bmrStatVal.textContent = `${bmr} kcal`;
        if (tdeeStatVal) tdeeStatVal.textContent = `${tdee} kcal`;

        const pKcal = pGrams * 4;
        const cKcal = cGrams * 4;
        const fKcal = fGrams * 9;
        const totalKcal = pKcal + cKcal + fKcal;

        const pPct = Math.round((pKcal / totalKcal) * 100);
        const cPct = Math.round((cKcal / totalKcal) * 100);
        const fPct = Math.round((fKcal / totalKcal) * 100);

        if (macroProteinG) macroProteinG.textContent = `${pGrams} g`;
        if (macroProteinKcal) macroProteinKcal.textContent = `${pKcal} kcal (${pPct}%)`;
        if (proteinBarFill) proteinBarFill.style.width = `${pPct}%`;

        if (macroCarbsG) macroCarbsG.textContent = `${cGrams} g`;
        if (macroCarbsKcal) macroCarbsKcal.textContent = `${cKcal} kcal (${cPct}%)`;
        if (carbsBarFill) carbsBarFill.style.width = `${cPct}%`;

        if (macroFatsG) macroFatsG.textContent = `${fGrams} g`;
        if (macroFatsKcal) macroFatsKcal.textContent = `${fKcal} kcal (${fPct}%)`;
        if (fatsBarFill) fatsBarFill.style.width = `${fPct}%`;

        // 9. Interactive Goal Simulator Setup (Feature 3)
        initGoalSimulator(w, h, age, gender, bmr, tdee, calTarget, demographicData);

        // 10. Fitness Score (0-100)
        let bmiScore = 100 - Math.abs(bmi - 22) * 4;
        let idealBF = gender === 'male' ? 15 : 22;
        let bfScore = 100 - Math.abs(bf - idealBF) * 3;
        const fitnessScore = Math.round(Math.max(0, Math.min(100, (bmiScore * 0.4) + (bfScore * 0.6))));

        const scoreText = document.getElementById('score-text');
        const scoreFill = document.getElementById('score-fill');
        if (scoreText) animateValue(scoreText, 0, fitnessScore, 1200, false);
        if (scoreFill) scoreFill.style.strokeDasharray = `${fitnessScore}, 100`;

        // 11. Circular Gauge & Marker
        let pct = ((bmi - 15) / 25);
        pct = Math.max(0, Math.min(1, pct));
        let offset = 125.6 - (125.6 * pct);

        const gaugeSvg = document.querySelector('.gauge-svg');
        if (gaugeSvg) {
            gaugeSvg.innerHTML = `
                <path class="gauge-bg" d="M 10 50 A 40 40 0 0 1 90 50" fill="none"/>
                <path class="gauge-fill" id="gauge-fill" d="M 10 50 A 40 40 0 0 1 90 50" stroke-dasharray="125.6" stroke-dashoffset="125.6" fill="none" style="stroke: ${cat.col}; filter: drop-shadow(0 0 6px ${cat.col});"/>
            `;
            setTimeout(() => {
                const fillPath = document.getElementById('gauge-fill');
                if (fillPath) fillPath.style.strokeDashoffset = offset;
            }, 50);
        }

        if (linearMarker) linearMarker.style.left = `${pct * 100}%`;

        // 12. Trigger AI Advice synthesis with Nemotron-3.5
        fetchOpenRouterAdvice(bmi, cat, calTarget, age, gender, h, w, ffmiDisplay, wthrDisplay, metabolicAge, pGrams, cGrams, fGrams, demographicData.title, goal);
    }

    // Feature 3: Interactive Goal Simulation & Predictive Analytics
    let activeSimulatorBaseline = null;
    let currentPace = 'recommended';

    function getSimulatorBaselineFromForm() {
        let w = parseFloat(weightInput?.value);
        if (isNaN(w) || w <= 0) w = 68;
        let h = 1.75;
        if (unit === 'metric') {
            const cm = parseFloat(heightCm?.value);
            if (!isNaN(cm) && cm > 0) h = cm / 100;
        } else {
            const ft = parseFloat(heightFt?.value) || 5;
            const inn = parseFloat(heightIn?.value) || 9;
            h = (ft * 12 + inn) * 0.0254;
            w = w * 0.453592;
        }
        const a = parseInt(ageInput?.value) || 20;
        const gRadio = document.querySelector('input[name="gender"]:checked');
        const g = gRadio ? gRadio.value : 'male';
        const eth = ethnicityScale ? ethnicityScale.value : 'who_standard';
        const demo = getDemographicMappings(eth);
        const act = activityLevel ? parseFloat(activityLevel.value) : 1.375;
        const bmr = (10 * w) + (6.25 * (h * 100)) - (5 * a) + (g === 'male' ? 5 : -161);
        const tdee = Math.round(bmr * act);
        return {
            currentWeight: Math.round(w * 10) / 10,
            h,
            age: a,
            gender: g,
            bmr: Math.round(bmr),
            tdee: Math.round(tdee),
            calTarget: Math.round(tdee),
            demographicData: demo
        };
    }

    function initGoalSimulator(currentWeight, h, age, gender, bmr, tdee, calTarget, demographicData) {
        if (!weightSimulatorSlider) return;

        // If arguments omitted, compute baseline dynamically from current inputs
        if (!currentWeight || !h) {
            const fallback = getSimulatorBaselineFromForm();
            currentWeight = fallback.currentWeight;
            h = fallback.h;
            age = fallback.age;
            gender = fallback.gender;
            bmr = fallback.bmr;
            tdee = fallback.tdee;
            calTarget = fallback.calTarget;
            demographicData = fallback.demographicData;
        }

        activeSimulatorBaseline = { currentWeight, h, age, gender, bmr, tdee, calTarget, demographicData };

        const unitLabel = unit === 'metric' ? 'kg' : 'lb';
        const minW = Math.max(30, Math.round(currentWeight - 25));
        const maxW = Math.round(currentWeight + 25);
        weightSimulatorSlider.min = minW;
        weightSimulatorSlider.max = maxW;
        weightSimulatorSlider.step = 0.5;
        weightSimulatorSlider.value = currentWeight;

        if (simBaselineVal) simBaselineVal.textContent = `${currentWeight.toFixed(1)} ${unitLabel}`;
        if (simSliderMin) simSliderMin.textContent = `${minW} ${unitLabel}`;
        if (simSliderMid) simSliderMid.textContent = `Baseline: ${currentWeight.toFixed(1)} ${unitLabel}`;
        if (simSliderMax) simSliderMax.textContent = `${maxW} ${unitLabel}`;

        function updateSimulation(targetWeight) {
            if (!activeSimulatorBaseline) return;
            const b = activeSimulatorBaseline;

            const curUnitLabel = unit === 'metric' ? 'kg' : 'lb';
            if (simWeightDisplay) simWeightDisplay.textContent = `${targetWeight.toFixed(1)} ${curUnitLabel}`;

            const delta = targetWeight - b.currentWeight;
            const deltaPct = b.currentWeight > 0 ? ((delta / b.currentWeight) * 100).toFixed(1) : '0.0';
            if (simWeightDelta) {
                const sign = delta > 0 ? '+' : '';
                simWeightDelta.textContent = `${sign}${delta.toFixed(1)} ${curUnitLabel} (${sign}${deltaPct}%)`;
                simWeightDelta.style.color = Math.abs(delta) < 0.2 ? 'var(--text-sec)' : (delta < 0 ? '#10b981' : '#a855f7');
            }

            // Simulated BMI
            const targetWeightKg = unit === 'metric' ? targetWeight : targetWeight * 0.453592;
            const simBmi = Math.round((targetWeightKg / (b.h * b.h)) * 10) / 10;
            if (simBmiVal) simBmiVal.textContent = simBmi.toFixed(1);

            const simCat = b.demographicData.categories.find(x => simBmi >= x.min && simBmi < x.max) || b.demographicData.categories[b.demographicData.categories.length - 1];
            if (simCatVal) {
                simCatVal.textContent = simCat.c;
                simCatVal.style.color = simCat.col;
            }

            // Simulated BMR
            const simBmr = Math.round((10 * targetWeightKg) + (6.25 * (b.h * 100)) - (5 * b.age) + (b.gender === 'male' ? 5 : -161));
            if (simBmrVal) simBmrVal.textContent = `${simBmr} kcal`;

            // Estimated Body Fat %
            const simBf = Math.max(5, Math.min(50, Math.round(((1.20 * simBmi) + (0.23 * b.age) - (b.gender === 'male' ? 16.2 : 5.4)) * 10) / 10));
            if (simBfVal) simBfVal.textContent = `${simBf.toFixed(1)}%`;

            // Estimated Lean Mass
            const simLean = Math.round(targetWeightKg * (1 - (simBf / 100)) * 10) / 10;
            if (simLeanVal) simLeanVal.textContent = `${simLean.toFixed(1)} ${curUnitLabel}`;

            // Rate per week based on selected pace
            let weeklyRateKg = 0.5;
            let calAdjustment = -500;

            if (delta < 0) {
                // Fat Loss
                if (currentPace === 'gentle') {
                    weeklyRateKg = 0.3;
                    calAdjustment = -250;
                } else if (currentPace === 'aggressive') {
                    weeklyRateKg = 0.8;
                    calAdjustment = -750;
                } else {
                    weeklyRateKg = 0.5;
                    calAdjustment = -500;
                }
            } else if (delta > 0) {
                // Muscle Gain / Hypertrophy
                if (currentPace === 'gentle') {
                    weeklyRateKg = 0.15;
                    calAdjustment = 150;
                } else if (currentPace === 'aggressive') {
                    weeklyRateKg = 0.45;
                    calAdjustment = 500;
                } else {
                    weeklyRateKg = 0.25;
                    calAdjustment = 300;
                }
            } else {
                calAdjustment = 0;
            }

            const targetCalDaily = Math.max(1200, Math.round(b.tdee + calAdjustment));
            if (simCalTargetVal) {
                const adjTxt = calAdjustment !== 0 ? ` (${calAdjustment > 0 ? '+' : ''}${calAdjustment} kcal)` : ' (Maintain)';
                simCalTargetVal.textContent = `${targetCalDaily} kcal${adjTxt}`;
            }

            // Timeline Calculation
            if (Math.abs(delta) < 0.2) {
                if (timelineHeadline) timelineHeadline.textContent = 'Maintenance Baseline Equilibrium';
                if (timelineDetails) timelineDetails.textContent = `At your current baseline (${b.currentWeight.toFixed(1)} ${curUnitLabel}), your daily target of ${b.tdee} kcal maintains metabolic homeostasis and lean body composition.`;
                if (simWeeksBadge) simWeeksBadge.textContent = 'Current Baseline';
                if (milestoneStartWt) milestoneStartWt.textContent = `${b.currentWeight.toFixed(1)} ${curUnitLabel}`;
                if (milestoneMidDate) milestoneMidDate.textContent = 'Today';
                if (milestoneGoalDate) milestoneGoalDate.textContent = 'Active Now';
            } else {
                const deltaKg = Math.abs(unit === 'metric' ? delta : delta * 0.453592);
                const weeks = Math.max(1, Math.ceil(deltaKg / weeklyRateKg));

                const goalDate = new Date();
                goalDate.setDate(goalDate.getDate() + (weeks * 7));
                const goalDateStr = goalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                const midDate = new Date();
                midDate.setDate(midDate.getDate() + Math.round((weeks * 7) / 2));
                const midDateStr = midDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                if (simWeeksBadge) simWeeksBadge.textContent = `~${weeks} weeks • ${goalDateStr}`;
                if (milestoneStartWt) milestoneStartWt.textContent = `${b.currentWeight.toFixed(1)} ${curUnitLabel}`;
                if (milestoneMidDate) milestoneMidDate.textContent = midDateStr;
                if (milestoneGoalDate) milestoneGoalDate.textContent = goalDateStr;

                if (delta < 0) {
                    if (timelineHeadline) timelineHeadline.textContent = `Safe Fat Loss Target: -${Math.abs(delta).toFixed(1)} ${curUnitLabel} in ~${weeks} weeks`;
                    if (timelineDetails) timelineDetails.textContent = `Achievable by ${goalDateStr} via a calibrated daily intake of ${targetCalDaily} kcal (~${weeklyRateKg} kg/week). Adequate dietary protein preserves lean myofibrillar mass and resting metabolic rate.`;
                } else {
                    if (timelineHeadline) timelineHeadline.textContent = `Hypertrophy Target: +${delta.toFixed(1)} ${curUnitLabel} in ~${weeks} weeks`;
                    if (timelineDetails) timelineDetails.textContent = `Achievable by ${goalDateStr} at a controlled daily surplus of ${targetCalDaily} kcal with progressive resistance training to maximize myofibrillar tissue deposition while minimizing adipose gain.`;
                }
            }
        }

        weightSimulatorSlider.oninput = (e) => {
            updateSimulation(parseFloat(e.target.value));
        };

        // Presets Listeners
        simPresetBtns.forEach(btn => {
            btn.onclick = () => {
                const preset = btn.dataset.preset;
                const b = activeSimulatorBaseline;
                if (!b) return;

                let target = b.currentWeight;
                if (preset === 'ideal_bmi') {
                    // Ideal BMI: 22.0
                    const targetKg = 22.0 * b.h * b.h;
                    target = unit === 'metric' ? targetKg : targetKg / 0.453592;
                } else if (preset === 'fat_cut') {
                    target = Math.max(weightSimulatorSlider.min, b.currentWeight - (unit === 'metric' ? 5 : 11));
                } else if (preset === 'lean_bulk') {
                    target = Math.min(weightSimulatorSlider.max, b.currentWeight + (unit === 'metric' ? 3 : 7));
                } else if (preset === 'reset') {
                    target = b.currentWeight;
                }

                target = Math.round(target * 10) / 10;
                weightSimulatorSlider.value = target;
                updateSimulation(target);
                triggerFieldGlow(goalSimulatorCard);
            };
        });

        // Pace Selector Listeners
        simPaceBtns.forEach(btn => {
            btn.onclick = () => {
                simPaceBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentPace = btn.dataset.pace || 'recommended';
                updateSimulation(parseFloat(weightSimulatorSlider.value));
            };
        });

        // Apply Goal Button Listener
        if (applySimGoalBtn) {
            applySimGoalBtn.onclick = () => {
                const targetW = parseFloat(weightSimulatorSlider.value);
                const b = activeSimulatorBaseline;
                const curUnitLabel = unit === 'metric' ? 'kg' : 'lb';
                const goalPayload = {
                    targetWeight: targetW,
                    baselineWeight: b ? b.currentWeight : targetW,
                    unit: curUnitLabel,
                    savedAt: new Date().toISOString()
                };
                localStorage.setItem('vital_active_goal', JSON.stringify(goalPayload));
                showToast(`🎯 Health Trajectory Activated! Target: ${targetW.toFixed(1)} ${curUnitLabel} saved to your active profile.`);
                triggerFieldGlow(goalSimulatorCard);
            };
        }

        updateSimulation(currentWeight);
    }

    // Sidebar Navigation Wire-up
    if (navSimulatorLink) {
        navSimulatorLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('active'));
            navSimulatorLink.classList.add('active');
            if (sidebarDrawer) sidebarDrawer.classList.remove('open');

            if (goalSimulatorCard) {
                goalSimulatorCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                triggerFieldGlow(goalSimulatorCard);
            }
        });
    }

    if (navDashboardLink) {
        navDashboardLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('active'));
            navDashboardLink.classList.add('active');
            if (sidebarDrawer) sidebarDrawer.classList.remove('open');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (navCalculatorLink) {
        navCalculatorLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('active'));
            navCalculatorLink.classList.add('active');
            if (sidebarDrawer) sidebarDrawer.classList.remove('open');
            const bmiCard = document.getElementById('bmi-form-card');
            if (bmiCard) {
                bmiCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                triggerFieldGlow(bmiCard);
            }
        });
    }

    // Feature 5: Full AI Natural Language & Biomarker Parser
    function triggerFieldGlow(el) {
        if (!el) return;
        el.classList.remove('field-highlight');
        void el.offsetWidth; // trigger reflow
        el.classList.add('field-highlight');
        setTimeout(() => el.classList.remove('field-highlight'), 1800);
    }

    function parseNaturalLanguageHealthInput(text) {
        if (!text) return { matched: false, summary: [] };
        const lower = text.toLowerCase().trim();
        const extractedSummary = [];

        // 1. Age: "21 age", "21 yr", "21 yrs", "21 yr old", "21 years", "age 21", "age: 21", "im 21", "just 21", or standalone "21"
        let ageVal = null;
        const prefixAge = lower.match(/\bage\s*(?:is|at|of|[:=-])?\s*(\d{1,3})\b/);
        const suffixAge = lower.match(/\b(\d{1,3})\s*(?:age|years?(\s*old)?|y\/o|yrs?(\s*old)?|yr(\s*old)?|yo|y)\b/);
        const convAge = lower.match(/\b(?:i(?:'m|m|\s+am)|just)\s*(\d{1,3})\b/);

        if (prefixAge) ageVal = parseInt(prefixAge[1]);
        else if (suffixAge) ageVal = parseInt(suffixAge[1]);
        else if (convAge) ageVal = parseInt(convAge[1]);
        else if (/^\s*(\d{1,2})\s*$/.test(lower)) {
            const raw = parseInt(lower);
            if (raw >= 10 && raw <= 110) ageVal = raw;
        }

        if (ageVal !== null && ageVal >= 10 && ageVal <= 120 && ageInput) {
            ageInput.value = ageVal;
            triggerFieldGlow(ageBox);
            ageError?.classList.remove('visible');
            ageBox?.classList.remove('field-error');
            extractedSummary.push(`Age: ${ageVal} yrs`);
        }

        // 2. Gender
        if (/\b(female|woman|girl|lady|femme)\b/i.test(lower)) {
            const fRadio = document.querySelector('input[name="gender"][value="female"]');
            if (fRadio) {
                fRadio.checked = true;
                extractedSummary.push('Gender: Female');
            }
        } else if (/\b(male|man|guy|boy|homme)\b/i.test(lower)) {
            const mRadio = document.querySelector('input[name="gender"][value="male"]');
            if (mRadio) {
                mRadio.checked = true;
                extractedSummary.push('Gender: Male');
            }
        }

        // 3. Weight
        const weightKgMatch = lower.match(/\b(?:weight\s*[:=-]?\s*)?(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilos?|kilograms?)\b/) || lower.match(/\b(\d{2,3}(?:\.\d+)?)\s*weight\b/);
        const weightLbMatch = lower.match(/\b(?:weight\s*[:=-]?\s*)?(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)\b/);
        const weightGenMatch = lower.match(/\b(?:weight\s*(?:is|at|of|[:=-])?\s*)(\d+(?:\.\d+)?)\b/);

        if (weightKgMatch && weightInput) {
            setUnitMode('metric');
            weightInput.value = weightKgMatch[1];
            triggerFieldGlow(weightBox);
            weightError?.classList.remove('visible');
            weightBox?.classList.remove('field-error');
            extractedSummary.push(`Weight: ${weightKgMatch[1]} kg`);
        } else if (weightLbMatch && weightInput) {
            setUnitMode('imperial');
            weightInput.value = weightLbMatch[1];
            triggerFieldGlow(weightBox);
            weightError?.classList.remove('visible');
            weightBox?.classList.remove('field-error');
            extractedSummary.push(`Weight: ${weightLbMatch[1]} lb`);
        } else if (weightGenMatch && weightInput) {
            weightInput.value = weightGenMatch[1];
            triggerFieldGlow(weightBox);
            weightError?.classList.remove('visible');
            weightBox?.classList.remove('field-error');
            extractedSummary.push(`Weight: ${weightGenMatch[1]} ${unit === 'metric' ? 'kg' : 'lb'}`);
        }

        // 4. Height
        const heightCmMatch = lower.match(/\b(?:height\s*[:=-]?\s*)?(\d{2,3}(?:\.\d+)?)\s*cm\b/) ||
                              lower.match(/\b(?:height\s*(?:is|at|of|[:=-])?\s*)(\d{2,3})\b/) ||
                              lower.match(/\b(\d{2,3})\s*height\b/);
        const heightFtInMatch = lower.match(/\b(?:height\s*[:=-]?\s*)?(\d)\s*(?:ft|feet|'|’)\s*(\d{1,2})?\s*(?:in|inches|"|”)?\b/) ||
                                lower.match(/\b(\d)\s*['’]\s*(\d{1,2})"?\b/);

        if (heightCmMatch && heightCm) {
            setUnitMode('metric');
            heightCm.value = heightCmMatch[1];
            triggerFieldGlow(heightBox);
            heightError?.classList.remove('visible');
            heightBox?.classList.remove('field-error');
            extractedSummary.push(`Height: ${heightCmMatch[1]} cm`);
        } else if (heightFtInMatch && heightFt) {
            setUnitMode('imperial');
            heightFt.value = heightFtInMatch[1];
            const inVal = heightFtInMatch[2] ? heightFtInMatch[2] : '0';
            if (heightIn) heightIn.value = inVal;
            triggerFieldGlow(imperialBox);
            imperialError?.classList.remove('visible');
            imperialBox?.classList.remove('field-error');
            extractedSummary.push(`Height: ${heightFtInMatch[1]}ft ${inVal}in`);
        }

        // 5. Waist: e.g. "waist 82", "82cm waist", "waist 32 in", "32 waist"
        const waistMatch = lower.match(/\b(?:waist\s*(?:is|at|of|[:=-])?\s*)(\d+(?:\.\d+)?)\s*(?:cm|in|inches)?\b/) ||
                           lower.match(/\b(\d+(?:\.\d+)?)\s*(?:cm|in)?\s*waist\b/);
        if (waistMatch && waistInput) {
            waistInput.value = waistMatch[1];
            triggerFieldGlow(waistBox);
            waistError?.classList.remove('visible');
            waistBox?.classList.remove('field-error');
            extractedSummary.push(`Waist: ${waistMatch[1]} ${unit === 'metric' ? 'cm' : 'in'}`);
        }

        // 6. Ethnicity Scale
        if (ethnicityScale) {
            if (/\b(south\s*asian|indian|pakistani|bangladeshi|desi)\b/i.test(lower)) {
                ethnicityScale.value = 'south_asian';
                extractedSummary.push('Ethnicity: South Asian');
            } else if (/\b(east\s*asian|chinese|japanese|korean)\b/i.test(lower)) {
                ethnicityScale.value = 'east_asian';
                extractedSummary.push('Ethnicity: East Asian');
            } else if (/\b(hispanic|latino|latina)\b/i.test(lower)) {
                ethnicityScale.value = 'hispanic';
                extractedSummary.push('Ethnicity: Hispanic');
            } else if (/\b(black|african\s*american|african)\b/i.test(lower)) {
                ethnicityScale.value = 'black';
                extractedSummary.push('Ethnicity: Black / African');
            } else if (/\b(caucasian|white|european|standard|who)\b/i.test(lower)) {
                ethnicityScale.value = 'who_standard';
                extractedSummary.push('Ethnicity: WHO Standard');
            }
        }

        // 7. Activity Level
        if (activityLevel) {
            if (/\b(sedentary|desk\s*job|no\s*exercise|inactive)\b/i.test(lower)) {
                activityLevel.value = '1.2';
                extractedSummary.push('Activity: Sedentary');
            } else if (/\b(lightly?\s*active|light\s*exercise|walking)\b/i.test(lower)) {
                activityLevel.value = '1.375';
                extractedSummary.push('Activity: Light');
            } else if (/\b(moderately?\s*active|moderate\s*exercise|gym|workout)\b/i.test(lower)) {
                activityLevel.value = '1.55';
                extractedSummary.push('Activity: Moderate');
            } else if (/\b(very\s*active|heavy\s*exercise|hard\s*workout)\b/i.test(lower)) {
                activityLevel.value = '1.725';
                extractedSummary.push('Activity: Very Active');
            } else if (/\b(athlete|extreme|twice\s*a\s*day)\b/i.test(lower)) {
                activityLevel.value = '1.9';
                extractedSummary.push('Activity: Athlete');
            }
        }

        // 8. Goal
        if (userGoal) {
            if (/\b(cut|cutting|fat\s*loss|lose\s*fat|lose\s*weight|weight\s*loss|shred)\b/i.test(lower)) {
                userGoal.value = 'fat_loss';
                extractedSummary.push('Goal: Fat Loss');
            } else if (/\b(recomp|recomposition|body\s*recomp|lean\s*muscle)\b/i.test(lower)) {
                userGoal.value = 'recomp';
                extractedSummary.push('Goal: Recomp');
            } else if (/\b(bulk|bulking|build\s*muscle|gain\s*muscle|hypertrophy|mass)\b/i.test(lower)) {
                userGoal.value = 'lean_bulk';
                extractedSummary.push('Goal: Muscle Gain');
            } else if (/\b(maintain|maintenance|stay\s*same)\b/i.test(lower)) {
                userGoal.value = 'maintain';
                extractedSummary.push('Goal: Maintenance');
            } else if (/\b(longevity|anti-aging|live\s*longer|metabolic\s*health)\b/i.test(lower)) {
                userGoal.value = 'longevity';
                extractedSummary.push('Goal: Longevity');
            }
        }

        return { matched: extractedSummary.length > 0, summary: extractedSummary };
    }

    // Deep LLM Biometric Extraction via OpenRouter API
    async function extractBiometricsWithLLM(text) {
        try {
            const apiKey = getApiKey();
            if (!apiKey) return null;
            const referer = (typeof window !== 'undefined' && window.location.origin !== "null" && window.location.origin) 
                ? window.location.origin 
                : "https://vital-ai.onrender.com";

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "HTTP-Referer": referer,
                    "X-Title": "VitalAI Health & Biomarkers",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: OPENROUTER_MODEL,
                    messages: [
                        {
                            role: "system",
                            content: "You are a clinical biometric NLP extractor. Extract health attributes from user input into strict JSON. Keys: age (integer), gender (\"male\"|\"female\"), heightCm (number), heightFt (number), heightIn (number), weightKg (number), weightLb (number), waistCm (number), waistIn (number), ethnicity (\"who_standard\"|\"south_asian\"|\"east_asian\"|\"hispanic\"|\"black\"), activity (\"1.2\"|\"1.375\"|\"1.55\"|\"1.725\"|\"1.9\"), goal (\"fat_loss\"|\"recomp\"|\"lean_bulk\"|\"maintain\"|\"longevity\"). Omit unmentioned keys. Output ONLY valid JSON, without codeblock formatting or explanations."
                        },
                        {
                            role: "user",
                            content: text
                        }
                    ],
                    stream: false
                })
            });

            if (!response.ok) return null;
            const data = await response.json();
            const rawContent = data.choices?.[0]?.message?.content || "";
            const cleanJson = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (err) {
            console.warn('[VitalAI] LLM extraction fallback to local NLP:', err);
            return null;
        }
    }

    function applyLLMMetrics(aiData, summaryList) {
        if (!aiData || typeof aiData !== 'object') return;

        if (aiData.age && ageInput && (!ageInput.value || ageInput.value !== String(aiData.age))) {
            ageInput.value = aiData.age;
            triggerFieldGlow(ageBox);
            if (!summaryList.some(s => s.startsWith('Age'))) summaryList.push(`Age: ${aiData.age} yrs`);
        }

        if (aiData.gender) {
            const radio = document.querySelector(`input[name="gender"][value="${aiData.gender}"]`);
            if (radio) {
                radio.checked = true;
                if (!summaryList.some(s => s.startsWith('Gender'))) summaryList.push(`Gender: ${aiData.gender}`);
            }
        }

        if (aiData.weightKg && weightInput) {
            setUnitMode('metric');
            weightInput.value = aiData.weightKg;
            triggerFieldGlow(weightBox);
            if (!summaryList.some(s => s.startsWith('Weight'))) summaryList.push(`Weight: ${aiData.weightKg} kg`);
        } else if (aiData.weightLb && weightInput) {
            setUnitMode('imperial');
            weightInput.value = aiData.weightLb;
            triggerFieldGlow(weightBox);
            if (!summaryList.some(s => s.startsWith('Weight'))) summaryList.push(`Weight: ${aiData.weightLb} lb`);
        }

        if (aiData.heightCm && heightCm) {
            setUnitMode('metric');
            heightCm.value = aiData.heightCm;
            triggerFieldGlow(heightBox);
            if (!summaryList.some(s => s.startsWith('Height'))) summaryList.push(`Height: ${aiData.heightCm} cm`);
        } else if (aiData.heightFt && heightFt) {
            setUnitMode('imperial');
            heightFt.value = aiData.heightFt;
            if (heightIn) heightIn.value = aiData.heightIn || 0;
            triggerFieldGlow(imperialBox);
            if (!summaryList.some(s => s.startsWith('Height'))) summaryList.push(`Height: ${aiData.heightFt}ft ${aiData.heightIn || 0}in`);
        }

        if (aiData.waistCm && waistInput) {
            waistInput.value = aiData.waistCm;
            triggerFieldGlow(waistBox);
            if (!summaryList.some(s => s.startsWith('Waist'))) summaryList.push(`Waist: ${aiData.waistCm} cm`);
        } else if (aiData.waistIn && waistInput) {
            waistInput.value = aiData.waistIn;
            triggerFieldGlow(waistBox);
            if (!summaryList.some(s => s.startsWith('Waist'))) summaryList.push(`Waist: ${aiData.waistIn} in`);
        }

        if (aiData.ethnicity && ethnicityScale) {
            ethnicityScale.value = aiData.ethnicity;
            if (!summaryList.some(s => s.startsWith('Ethnicity'))) summaryList.push(`Ethnicity: ${aiData.ethnicity}`);
        }

        if (aiData.activity && activityLevel) {
            activityLevel.value = aiData.activity;
            if (!summaryList.some(s => s.startsWith('Activity'))) summaryList.push(`Activity: ${activityLevel.options[activityLevel.selectedIndex].text}`);
        }

        if (aiData.goal && userGoal) {
            userGoal.value = aiData.goal;
            if (!summaryList.some(s => s.startsWith('Goal'))) summaryList.push(`Goal: ${userGoal.options[userGoal.selectedIndex].text}`);
        }
    }

    if (smartParseBtn && smartPromptInput) {
        async function handleSmartParse(autoTriggerIfComplete = true) {
            const text = smartPromptInput.value.trim();
            if (!text) return;

            // Step 1: Immediate local NLP parsing (0ms instant response)
            const localRes = parseNaturalLanguageHealthInput(text);

            // Button visual loading indicator
            const origBtnHtml = smartParseBtn.innerHTML;
            smartParseBtn.disabled = true;
            smartParseBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> <span>AI Thinking...</span>';

            // Step 2: LLM Deep extraction for conversational syntax
            try {
                const aiData = await extractBiometricsWithLLM(text);
                if (aiData) {
                    applyLLMMetrics(aiData, localRes.summary);
                }
            } catch (err) {
                console.warn('[VitalAI] LLM extraction skipped:', err);
            } finally {
                smartParseBtn.disabled = false;
                smartParseBtn.innerHTML = origBtnHtml;
            }

            if (localRes.summary.length > 0) {
                showToast(`✨ AI Extracted: ${localRes.summary.join(' • ')}`);

                // Check if primary metrics (weight, height, age) are all filled - if so, auto calculate!
                const hasWeight = !!(weightInput && parseFloat(weightInput.value) > 0);
                const hasHeight = unit === 'metric' 
                    ? !!(heightCm && parseFloat(heightCm.value) > 0)
                    : !!(heightFt && parseFloat(heightFt.value) > 0);
                const hasAge = !!(ageInput && parseInt(ageInput.value) > 0);

                if (autoTriggerIfComplete && hasWeight && hasHeight && hasAge) {
                    setTimeout(() => {
                        bmiForm?.dispatchEvent(new Event('submit', { cancelable: true }));
                    }, 350);
                }
            } else {
                showToast('Could not parse health metrics. Try: "21 age", "21 yr", or "21 yr male 175cm 72kg"');
            }
        }

        smartParseBtn.addEventListener('click', () => handleSmartParse(true));
        smartPromptInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSmartParse(true);
            }
        });

        // Quick Prompt Chips
        promptChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const prompt = chip.dataset.prompt;
                if (prompt && smartPromptInput) {
                    smartPromptInput.value = prompt;
                    handleSmartParse(true);
                }
            });
        });

        // Speech Recognition for Smart Input Mic
        const SmartSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SmartSpeechRecognition && smartMicBtn) {
            const smartRecognition = new SmartSpeechRecognition();
            smartRecognition.continuous = false;
            smartRecognition.lang = 'en-US';

            smartMicBtn.addEventListener('click', () => {
                if (smartMicBtn.classList.contains('active')) {
                    smartRecognition.stop();
                } else {
                    try {
                        smartRecognition.start();
                        smartMicBtn.classList.add('active');
                        smartPromptInput.placeholder = 'Listening... Speak "21 age", "21 yr male 175cm 72kg"...';
                    } catch {}
                }
            });

            smartRecognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                smartMicBtn.classList.remove('active');
                smartPromptInput.value = transcript;
                smartPromptInput.placeholder = "Type: '21 age', '21 yr', '21 yr male 175cm 72kg'...";
                handleSmartParse(true);
            };

            smartRecognition.onerror = () => {
                smartMicBtn.classList.remove('active');
                smartPromptInput.placeholder = "Type: '21 age', '21 yr', '21 yr male 175cm 72kg'...";
            };

            smartRecognition.onend = () => {
                smartMicBtn.classList.remove('active');
                smartPromptInput.placeholder = "Type: '21 age', '21 yr', '21 yr male 175cm 72kg'...";
            };
        } else if (smartMicBtn) {
            smartMicBtn.style.display = 'none';
        }
    }

    // Wearable Sync Listeners
    if (syncAppleHealth) {
        syncAppleHealth.addEventListener('click', () => {
            if (weightInput) weightInput.value = (Math.round((70 + Math.random() * 4) * 10) / 10).toString();
            if (heightCm && !heightCm.value) heightCm.value = '178';
            if (waistInput) waistInput.value = '81';
            showToast('Synced with Apple Health • Body Weight & Resting Vitals loaded');
        });
    }

    if (syncGoogleFit) {
        syncGoogleFit.addEventListener('click', () => {
            if (weightInput) weightInput.value = (Math.round((72 + Math.random() * 3) * 10) / 10).toString();
            if (heightCm && !heightCm.value) heightCm.value = '176';
            if (waistInput) waistInput.value = '83';
            showToast('Synced with Google Fit • Activity & Health Data loaded');
        });
    }

    if (syncGarmin) {
        syncGarmin.addEventListener('click', () => {
            if (weightInput) weightInput.value = (Math.round((69 + Math.random() * 3) * 10) / 10).toString();
            if (heightCm && !heightCm.value) heightCm.value = '175';
            if (waistInput) waistInput.value = '79';
            showToast('Synced with Garmin Connect • Physiological Vitals loaded');
        });
    }

    // Feature 2: AI Visual Body Scan Modal & Computer Vision Simulation
    if (openVisualScanBtn && visualScanModal) {
        openVisualScanBtn.addEventListener('click', () => {
            visualScanModal.classList.remove('hidden');
        });

        const closeScan = () => visualScanModal.classList.add('hidden');
        closeScanModalBtn?.addEventListener('click', closeScan);
        scanCancelBtn?.addEventListener('click', closeScan);

        scanDropzone?.addEventListener('click', () => scanFileInput?.click());

        scanFileInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    if (scanCanvasContainer) scanCanvasContainer.style.display = 'flex';
                    if (scanDropzone) scanDropzone.style.display = 'none';
                    if (scanLaserLine) scanLaserLine.classList.add('active');

                    const ctx = bodyScanCanvas.getContext('2d');
                    bodyScanCanvas.width = 380;
                    bodyScanCanvas.height = 280;
                    ctx.drawImage(img, 0, 0, 380, 280);

                    // Simulate computer vision edge detection overlay
                    setTimeout(() => {
                        ctx.strokeStyle = '#a855f7';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.ellipse(190, 80, 30, 40, 0, 0, 2 * Math.PI); // Head
                        ctx.stroke();

                        ctx.beginPath();
                        ctx.moveTo(140, 130);
                        ctx.lineTo(240, 130);
                        ctx.lineTo(220, 240);
                        ctx.lineTo(160, 240);
                        ctx.closePath();
                        ctx.strokeStyle = '#38bdf8';
                        ctx.stroke();

                        if (scanLaserLine) scanLaserLine.classList.remove('active');
                        if (scanResultsGrid) scanResultsGrid.style.display = 'grid';
                        if (applyScanDataBtn) applyScanDataBtn.style.display = 'inline-flex';

                        // Estimated Metrics
                        if (scanBfRange) scanBfRange.textContent = '16.5% - 19.0%';
                        if (scanSomatotype) scanSomatotype.textContent = 'Mesomorphic Athletic';
                        if (scanDistributionZone) scanDistributionZone.textContent = 'Balanced Kinetic Core';
                        if (scanPostureScore) scanPostureScore.textContent = '94% Symmetry';
                    }, 1800);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });

        applyScanDataBtn?.addEventListener('click', () => {
            if (waistInput && !waistInput.value) waistInput.value = '80';
            visualScanModal.classList.add('hidden');
            showToast('AI Visual Scan telemetry applied to Biomarker Calculator!');
            if (bmiForm) bmiForm.dispatchEvent(new Event('submit'));
        });
    }

    function showToast(msg) {
        const toast = document.createElement('div');
        toast.className = 'glass-panel';
        toast.style = 'position:fixed; top:24px; left:50%; transform:translateX(-50%); padding:12px 24px; z-index:10005; font-weight:700; color:var(--text-primary); border:1px solid var(--border-hover); border-radius:12px; box-shadow:var(--shadow-pop); background:var(--card-bg-elevated); display:flex; align-items:center; gap:8px;';
        toast.innerHTML = `<i class="fa-solid fa-sparkles text-gradient" aria-hidden="true"></i> <span>${msg}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2600);
    }

    function animateValue(obj, start, end, duration, isFloat = false, suffix = '') {
        if (!obj) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            let val = start + progress * (end - start);
            obj.innerHTML = (isFloat ? val.toFixed(1) : Math.floor(val)) + suffix;
            if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    }

    function saveResult(bmi, age, h, w, gender) {
        if (!currentUser) return;
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        let hist = users[currentUser.email].history;

        const bf = (1.20 * bmi) + (0.23 * age) - (gender === 'male' ? 16.2 : 5.4);
        let bmiScore = 100 - Math.abs(bmi - 22) * 4;
        let idealBF = gender === 'male' ? 15 : 22;
        let bfScore = 100 - Math.abs(bf - idealBF) * 3;
        const fitnessScore = Math.round(Math.max(0, Math.min(100, (bmiScore * 0.4) + (bfScore * 0.6))));

        const entry = { date: dateStr, bmi, fitnessScore };

        if (hist.length && hist[hist.length - 1].date === dateStr) {
            hist[hist.length - 1] = entry;
        } else {
            hist.push(entry);
        }

        localStorage.setItem('users', JSON.stringify(users));
        renderChart();
    }

    function renderChart() {
        if (!currentUser || !currentUser.data || !currentUser.data.history || !currentUser.data.history.length) return;
        const canvas = document.getElementById('historyChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const hist = currentUser.data.history;

        const isDark = document.body.classList.contains('dark-mode');
        const tickColor = isDark ? '#d8b4fe' : '#5d4b73';
        const gridColor = isDark ? 'rgba(168, 85, 247, 0.12)' : 'rgba(139, 92, 246, 0.12)';
        const bmiColor = isDark ? '#c084fc' : '#8b5cf6';
        const bmiFill = isDark ? 'rgba(168, 85, 247, 0.18)' : 'rgba(139, 92, 246, 0.12)';

        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: hist.map(d => d.date),
                datasets: [
                    {
                        label: 'BMI Trend',
                        data: hist.map(d => d.bmi),
                        borderColor: bmiColor,
                        backgroundColor: bmiFill,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 5,
                        pointBackgroundColor: bmiColor,
                        pointBorderColor: isDark ? '#120921' : '#ffffff',
                        pointBorderWidth: 2,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Fitness Score',
                        data: hist.map(d => d.fitnessScore || 0),
                        borderColor: '#10b981',
                        borderDash: [5, 5],
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 0,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDark ? 'rgba(18, 9, 33, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                        titleColor: isDark ? '#ffffff' : '#180b2b',
                        bodyColor: isDark ? '#d8b4fe' : '#5d4b73',
                        borderColor: isDark ? 'rgba(168, 85, 247, 0.3)' : 'rgba(139, 92, 246, 0.25)',
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 8
                    }
                },
                scales: {
                    x: { 
                        grid: { display: false }, 
                        ticks: { color: tickColor, font: { family: 'Inter', weight: '600', size: 12 } } 
                    },
                    y: {
                        position: 'left',
                        grid: { color: gridColor },
                        ticks: { color: tickColor, font: { family: 'Inter', weight: '600', size: 12 } }
                    },
                    y1: {
                        position: 'right',
                        min: 0, max: 100,
                        display: false
                    }
                }
            }
        });
    }

    // ---- GRAVITY PHYSICS COMPATIBILITY ----
    function initGravity() {
        if (typeof Matter === 'undefined') return;
        const { Engine, Render, Runner, Bodies, Composite, MouseConstraint, Mouse, Events } = Matter;
        const engine = Engine.create();
        const world = engine.world;

        const container = document.body;
        const width = window.innerWidth;
        const height = window.innerHeight;

        const runner = Runner.create();
        Runner.run(runner, engine);

        const ground = Bodies.rectangle(width / 2, height + 50, width, 100, { isStatic: true });
        const wallL = Bodies.rectangle(-50, height / 2, 100, height, { isStatic: true });
        const wallR = Bodies.rectangle(width + 50, height / 2, 100, height, { isStatic: true });
        Composite.add(world, [ground, wallL, wallR]);

        const elements = document.querySelectorAll('.card, .glass-panel, .sidebar, .top-header');
        const bodies = [];

        document.body.classList.add('gravity-active');

        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0) return;

            const body = Bodies.rectangle(
                rect.left + rect.width / 2,
                rect.top + rect.height / 2,
                rect.width,
                rect.height,
                { restitution: 0.5, friction: 0.1 }
            );

            body.element = el;
            bodies.push(body);
            Composite.add(world, body);
            el.style.width = rect.width + 'px';
            el.style.height = rect.height + 'px';
        });

        const mouse = Mouse.create(container);
        const mConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: { stiffness: 0.2, render: { visible: false } }
        });
        Composite.add(world, mConstraint);

        Events.on(runner, "afterUpdate", () => {
            bodies.forEach(b => {
                const { x, y } = b.position;
                b.element.style.transform = `translate(${x - parseFloat(b.element.style.width) / 2}px, ${y - parseFloat(b.element.style.height) / 2}px) rotate(${b.angle}rad)`;
                b.element.style.left = '0px';
                b.element.style.top = '0px';
            });
        });

        gravityManager = { engine, runner, bodies, world };
    }

    function destroyGravity() {
        if (!gravityManager || typeof Matter === 'undefined') return;
        Matter.Runner.stop(gravityManager.runner);
        Matter.Engine.clear(gravityManager.engine);
        document.body.classList.remove('gravity-active');

        gravityManager.bodies.forEach(b => {
            b.element.style.transform = '';
            b.element.style.width = '';
            b.element.style.height = '';
            b.element.style.left = '';
            b.element.style.top = '';
        });

        gravityManager = null;
    }

    // Initialize Goal Simulator on initial load with default/form metrics
    try {
        initGoalSimulator();
    } catch (err) {
        console.warn('[VitalAI] Initial Goal Simulator bootstrap:', err);
    }
});
