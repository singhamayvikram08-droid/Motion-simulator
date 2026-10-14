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

    // Outputs & Views
    const loadingView = document.getElementById('ai-loading');
    const resultsView = document.getElementById('results-view');
    const bmiResultTxt = document.getElementById('bmi-result-txt');
    const bmiStatus = document.getElementById('bmi-status');
    const linearMarker = document.getElementById('linear-marker');
    const aiCalories = document.getElementById('ai-calories');
    const aiResponseText = document.getElementById('ai-response-text');

    // Voice & Chatbot
    const voiceBtn = document.getElementById('voice-btn');
    const chatbotTrigger = document.getElementById('chatbot-trigger');
    const chatbotWindow = document.getElementById('chatbot-window');
    const closeChat = document.getElementById('close-chat');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendChat = document.getElementById('send-chat');

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
    function applyTheme(isDark, animate = false) {
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

        // Sync all theme toggle buttons across Auth, Header, and Sidebar
        const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
        toggleBtns.forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
            }
            const label = btn.querySelector('.theme-toggle-label');
            if (label) {
                label.textContent = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
            }
            btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
            btn.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
            if (animate) {
                btn.classList.remove('theme-toggle-pop');
                void btn.offsetWidth; // trigger reflow for smooth re-trigger
                btn.classList.add('theme-toggle-pop');
            }
        });

        // Dynamic Chart Color Re-rendering
        if (chartInstance) {
            renderChart();
        }
    }

    // Initialize Theme immediately on load
    const savedTheme = localStorage.getItem('ai_theme');
    const isInitiallyDark = savedTheme !== 'light'; // Default to ultra-premium dark cyberpunk
    applyTheme(isInitiallyDark, false);

    // Global Event Delegation for all Theme Toggle Buttons
    document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.theme-toggle-btn');
        if (!toggleBtn) return;
        e.preventDefault();
        const currentlyDark = document.body.classList.contains('dark-mode');
        const nextDark = !currentlyDark;
        applyTheme(nextDark, true);
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

    // ---- SECRETS & OFFLINE DETERMINISTIC CLINICAL ENGINE ----
    function getApiKey() {
        try {
            return (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OPENROUTER_API_KEY)
                || localStorage.getItem('openrouter_api_key')
                || '';
        } catch {
            return localStorage.getItem('openrouter_api_key') || '';
        }
    }

    function generateClinicalDeterministicPlan(bmi, cat, cals, age, gender, h, w) {
        const proteinGrams = Math.round(w * 1.8);
        const fatGrams = Math.round((cals * 0.25) / 9);
        const carbGrams = Math.round((cals - (proteinGrams * 4 + fatGrams * 9)) / 4);

        return `
            <div class="clinical-plan-container">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; color:#10b981; font-weight:700;">
                    <i class="fa-solid fa-circle-check" aria-hidden="true"></i> VitalAI Biomarker Synthesis & Clinical Protocol
                </div>
                <p><strong>Metabolic Prescription:</strong> At <strong>${bmi} BMI (${cat.c})</strong>, your target energy intake is calibrated at <strong>${cals} kcal/day</strong>. To maintain nitrogen balance and mitochondrial efficiency, optimize your daily macronutrient breakdown to approximately <strong>${proteinGrams}g Protein</strong>, <strong>${carbGrams}g Complex Carbohydrates</strong>, and <strong>${fatGrams}g Essential Fats</strong>.</p>
                <p><strong>Nutritional & Activity Focus:</strong> ${cat.d} For physical conditioning: ${cat.e}</p>
                <div style="margin-top:14px; padding:10px 14px; border-radius:10px; background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.25); font-size:0.8rem; color:#cbd5e1;">
                    <i class="fa-solid fa-shield-halved" style="color:#6366f1;"></i> <strong>Zero Data Leakage:</strong> Computed locally via VitalAI deterministic clinical models. To enable interactive generative conversational synthesis, open the Assistant and connect an OpenRouter API key.
                </div>
            </div>
        `;
    }

    // LLM Advice with Secrets Protection
    async function fetchOpenRouterAdvice(bmi, cat, cals, age, gender, h, w) {
        const apiKey = getApiKey();
        
        // If no API key is configured, fallback to our rich local clinical engine immediately
        if (!apiKey) {
            aiResponseText.innerHTML = generateClinicalDeterministicPlan(bmi, cat, cals, age, gender, h, w);
            return;
        }

        aiResponseText.innerHTML = '<div class="typing-cursor">Synthesizing personalized AI clinical plan...</div>';
        aiResponseText.classList.add('shimmer');

        const hDisp = unit === 'metric' ? `${(h * 100).toFixed(1)}cm` : `${(h / 0.0254).toFixed(1)}in`;
        const wDisp = unit === 'metric' ? `${w.toFixed(1)}kg` : `${(w / 0.453592).toFixed(1)}lb`;

        try {
            const referer = window.location.origin === "null" ? "http://localhost:3000" : window.location.origin;
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "HTTP-Referer": referer,
                    "X-Title": "VitalAI Health",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "openai/gpt-3.5-turbo",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a professional health and fitness clinical advisor. Provide personalized, concise, evidence-based recommendations."
                        },
                        {
                            "role": "user",
                            "content": `Analyze my biomarkers: Age ${age}, Gender ${gender}, Height ${hDisp}, Weight ${wDisp}. My BMI is ${bmi} (${cat.c}). Daily calorie target is ${cals} kcal. Provide a 2-paragraph specific diet and exercise plan for my status. Format with HTML <p> tags.`
                        }
                    ],
                    "stream": true
                })
            });

            if (!response.ok) {
                throw new Error(`API response status ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";
            let buffer = "";
            aiResponseText.innerHTML = "";

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
                            aiResponseText.innerHTML = fullText + '<span class="typing-cursor"></span>';
                        }
                    } catch { /* partial JSON chunk */ }
                }
            }

            aiResponseText.innerHTML = fullText;
            aiResponseText.classList.remove('shimmer');

        } catch (err) {
            // Secrets protection: never leak the key or auth headers in error state
            aiResponseText.classList.remove('shimmer');
            aiResponseText.innerHTML = generateClinicalDeterministicPlan(bmi, cat, cals, age, gender, h, w);
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

        if (!getApiKey() && chatMessages) {
            chatMessages.innerHTML = `
                <div class="message ai">
                    <p>Welcome! I'm your VitalAI assistant. Ask me anything about fitness, nutrition, or your calculated BMI. You can also paste an OpenRouter API key to activate generative cloud intelligence.</p>
                </div>
            `;
        }

        async function handleChat() {
            const msg = chatInput.value.trim();
            if (!msg) return;

            appendMessage('user', msg);
            chatInput.value = '';
            trackEvent('chat_message_sent');

            // Handle user pasting OpenRouter API Key
            if (msg.startsWith('sk-or-') || (msg.length > 25 && msg.includes('sk-'))) {
                localStorage.setItem('openrouter_api_key', msg);
                chatMessages.innerHTML = '';
                appendMessage('ai', 'API Key encrypted in local storage! Generative health models are now unlocked. How can I assist you?');
                return;
            }

            const apiKey = getApiKey();
            if (!apiKey) {
                // Helpful offline response
                const lower = msg.toLowerCase();
                let reply = "I can help explain your biomarkers! A normal BMI is 18.5 - 24.9. Maintaining lean muscle mass with resistance training and getting 7-8 hours of sleep significantly improves metabolic health.";
                if (lower.includes('bmi') || lower.includes('calculate')) {
                    reply = "BMI is calculated as weight in kilograms divided by height in meters squared (kg/m²). It provides a reliable baseline screening tool for body composition categories.";
                } else if (lower.includes('diet') || lower.includes('food') || lower.includes('eat')) {
                    reply = "A nutrient-dense diet prioritizes lean proteins, colorful fibrous vegetables, complex whole grains, and healthy monounsaturated fats while eliminating ultra-processed foods.";
                } else if (lower.includes('exercise') || lower.includes('workout')) {
                    reply = "The World Health Organization recommends at least 150-300 minutes of moderate-intensity aerobic exercise, combined with muscle-strengthening activities twice a week.";
                }
                appendMessage('ai', `<p>${reply}</p><p><small style="color:#94a3b8;">(To enable cloud-streamed LLM responses, paste your OpenRouter key starting with 'sk-or-').</small></p>`);
                return;
            }

            const aiMsgDiv = appendMessage('ai', '<span class="typing-cursor"></span>');

            try {
                const referer = window.location.origin === "null" ? "http://localhost:3000" : window.location.origin;
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "HTTP-Referer": referer,
                        "X-Title": "VitalAI Health",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "model": "openai/gpt-3.5-turbo",
                        "messages": [
                            { "role": "system", "content": "You are VitalAI assistant. You provide concise, evidence-based fitness and diet guidance. Keep responses friendly and medically conservative." },
                            { "role": "user", "content": msg }
                        ],
                        "stream": true
                    })
                });

                if (!response.ok) {
                    throw new Error(`Status ${response.status}`);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullReply = "";
                let buffer = "";
                aiMsgDiv.innerHTML = "";

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
                                fullReply += content;
                                aiMsgDiv.innerHTML = fullReply + '<span class="typing-cursor"></span>';
                                chatMessages.scrollTop = chatMessages.scrollHeight;
                            }
                        } catch { }
                    }
                }
                aiMsgDiv.innerHTML = fullReply;
            } catch (err) {
                aiMsgDiv.innerHTML = `<span style="color: #f87171"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Service temporarily unavailable. Please verify your OpenRouter key credits or try again shortly.</span>`;
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
    unitBtns.forEach(btn => btn.addEventListener('click', (e) => {
        e.preventDefault();
        unitBtns.forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        unit = btn.dataset.unit;
        clearFormErrors();

        if (unit === 'metric') {
            if (metricHeight) metricHeight.style.display = 'block';
            if (imperialHeight) imperialHeight.style.display = 'none';
            if (weightUnit) weightUnit.textContent = 'kg';
            if (heightCm) heightCm.required = true;
            if (heightFt) heightFt.required = false;
            if (heightIn) heightIn.required = false;
        } else {
            if (metricHeight) metricHeight.style.display = 'none';
            if (imperialHeight) imperialHeight.style.display = 'block';
            if (weightUnit) weightUnit.textContent = 'lb';
            if (heightCm) heightCm.required = false;
            if (heightFt) heightFt.required = true;
            if (heightIn) heightIn.required = true;
        }
    }));
    if (heightCm) heightCm.required = true;

    // ---- AI MAPPINGS ----
    const AIMappings = [
        { c: 'Underweight', min: 0, max: 18.5, col: '#38bdf8', d: 'Focus on nutrient-dense complex foods (avocados, nuts, whole grains, lean proteins). Eat 4-5 balanced meals to safely increase healthy tissue mass.', e: 'Prioritize resistance hypertrophy training over intense endurance cardio to build and preserve lean mass.' },
        { c: 'Normal', min: 18.5, max: 25, col: '#10b981', d: 'Maintain metabolic homeostasis! Balance 45% complex carbohydrates, 30% lean protein, and 25% healthy dietary fats.', e: 'Combine resistance training (3 days/week) with zone-2 aerobic conditioning (2 days/week) to maintain cardiovascular endurance.' },
        { c: 'Overweight', min: 25, max: 30, col: '#fbbf24', d: 'Implement a mild caloric deficit (-350 to -500 kcal). Boost dietary fiber and water intake to optimize satiety and glucose sensitivity.', e: 'Target 150-200 minutes of weekly aerobic activity (brisk walking, cycling, rowing) paired with compound strength training.' },
        { c: 'Obese', min: 30, max: 100, col: '#f87171', d: 'Prioritize whole, minimally processed foods, eliminate refined liquid sugars, and adhere to structured meal timing.', e: 'Engage in low-impact movement (swimming, elliptical, brisk walking) to minimize joint loading while elevating daily active thermogenesis.' }
    ];

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
    }

    [weightInput, heightCm, heightFt, heightIn, ageInput].forEach(inp => {
        inp?.addEventListener('input', clearFormErrors);
    });

    // ---- BMI LOGIC & VALIDATION ----
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

            const genderRadio = document.querySelector('input[name="gender"]:checked');
            const gender = genderRadio ? genderRadio.value : 'male';

            if (!isValid || !h || !w || h <= 0 || w <= 0) return;

            let bmi = Math.round((w / (h * h)) * 10) / 10;
            let bmr = (10 * w) + (6.25 * (h * 100)) - (5 * age);
            bmr += (gender === 'male' ? 5 : -161);
            let cals = Math.round(bmr * 1.375);
            let cat = AIMappings.find(x => bmi >= x.min && bmi < x.max) || AIMappings[3];

            trackEvent('bmi_calculated', { bmi, category: cat.c, gender, age });

            loadingView?.classList.remove('hidden');
            loadingView?.classList.add('shimmer');
            resultsView?.classList.add('hidden');

            setTimeout(() => {
                loadingView?.classList.add('hidden');
                loadingView?.classList.remove('shimmer');
                resultsView?.classList.remove('hidden');
                playBeep();

                showResults(bmi, cat, cals, age, gender, h, w);
                saveResult(bmi, age, h, w, gender);

                // Trigger AI Advice synthesis
                fetchOpenRouterAdvice(bmi, cat, cals, age, gender, h, w);

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

    if (resetHistoryBtn) {
        resetHistoryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentUser && confirm('Clear your entire recorded biomarker history?')) {
                users[currentUser.email].history = [];
                localStorage.setItem('users', JSON.stringify(users));
                renderChart();
                trackEvent('history_cleared');
            }
        });
    }

    function showResults(bmi, cat, cals, age, gender, h, w) {
        if (bmiResultTxt) animateValue(bmiResultTxt, 0, bmi, 1200, true);

        if (bmiStatus) {
            bmiStatus.textContent = cat.c;
            bmiStatus.style.color = cat.col;
            bmiStatus.style.background = cat.col + '25';
        }

        if (aiCalories) animateValue(aiCalories, 0, cals, 1000, false, ' kcal');

        // Body Fat Estimation (Deurenberg Formula)
        const bf = (1.20 * bmi) + (0.23 * age) - (gender === 'male' ? 16.2 : 5.4);
        const bfVal = Math.max(5, Math.min(50, bf));
        const bodyFatEl = document.getElementById('bodyfat-val');
        const bodyFatProgress = document.getElementById('bodyfat-progress');
        if (bodyFatEl) animateValue(bodyFatEl, 0, bfVal, 1200, true, '%');
        if (bodyFatProgress) bodyFatProgress.style.width = bfVal + '%';

        // Fitness Score Calculation (0-100)
        let bmiScore = 100 - Math.abs(bmi - 22) * 4;
        let idealBF = gender === 'male' ? 15 : 22;
        let bfScore = 100 - Math.abs(bf - idealBF) * 3;
        const fitnessScore = Math.round(Math.max(0, Math.min(100, (bmiScore * 0.4) + (bfScore * 0.6))));

        const scoreText = document.getElementById('score-text');
        const scoreFill = document.getElementById('score-fill');
        if (scoreText) animateValue(scoreText, 0, fitnessScore, 1200, false);
        if (scoreFill) scoreFill.style.strokeDasharray = `${fitnessScore}, 100`;

        const dailyTipEl = document.getElementById('daily-tip');
        if (dailyTipEl) {
            dailyTipEl.textContent = tips[Math.floor(Math.random() * tips.length)];
        }

        // Circular Gauge
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
});
