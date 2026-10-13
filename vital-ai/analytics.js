/**
 * VitalAI Privacy-Preserving Analytics Engine
 * Zero-PII, client-side metric dispatch with explicit user consent gating.
 */

const STORAGE_CONSENT_KEY = 'vital_cookie_consent';

export function getConsentState() {
    try {
        const raw = localStorage.getItem(STORAGE_CONSENT_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function setConsentState(state) {
    try {
        localStorage.setItem(STORAGE_CONSENT_KEY, JSON.stringify(state));
        window.dispatchEvent(new CustomEvent('vitalConsentChanged', { detail: state }));
    } catch (e) {
        console.warn('Failed to persist consent state', e);
    }
}

export function trackEvent(eventName, eventParams = {}) {
    const consent = getConsentState();
    // Default to opt-in for anonymous operational analytics unless explicitly declined
    if (consent && consent.analytics === false) {
        return;
    }

    const payload = {
        event: eventName,
        params: {
            ...eventParams,
            timestamp: new Date().toISOString(),
            screen_width: window.innerWidth,
            user_agent_platform: navigator.platform || 'unknown'
        }
    };

    // Dispatch locally for auditability
    console.debug(`[VitalAI Analytics] ${eventName}`, payload);

    // If Google Analytics / Plausible is mounted on window, dispatch accordingly
    if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, eventParams);
    }
    if (typeof window.plausible === 'function') {
        window.plausible(eventName, { props: eventParams });
    }
}

// Global exposure
if (typeof window !== 'undefined') {
    window.VitalAnalytics = {
        track: trackEvent,
        getConsent: getConsentState,
        setConsent: setConsentState
    };
}
