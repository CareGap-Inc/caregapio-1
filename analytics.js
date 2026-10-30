/*
 * LabLink acquisition and conversion events.
 *
 * Events go to Google Analytics 4 when GA4_MEASUREMENT_ID is set and the
 * page is on a production host; otherwise they stay in window.dataLayer and
 * go nowhere.
 * Every event is built from an allow-list of fields and passed through
 * sanitize(), so names, emails, phone numbers, NPIs, IDs, tokens and raw
 * form input never reach analytics. Event definitions and verification
 * steps are in docs/lablink-funnel.md.
 *
 * Add ?analytics_debug=1 to any page to log events to the console for
 * the rest of the browser session.
 */
(function (global) {
    'use strict';

    var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

    // Google Analytics 4 measurement ID, e.g. 'G-ABC123DEF4'. Empty: GA4 is
    // not loaded. It loads only on these hosts, never on deploy previews or
    // local copies.
    var GA4_MEASUREMENT_ID = 'G-0EY398DPWB';
    var GA4_HOSTS = ['caregap.io', 'www.caregap.io'];

    // Allowed fields per event. Events marked "app" are emitted by the
    // LabLink app (lablink.caregap.io), not by this site; they are listed
    // here so both sides share one definition.
    var EVENTS = {
        lablink_landing_view: ['page_path', 'page_type', 'traffic_source', 'referrer_host'].concat(UTM_KEYS),
        lablink_cta_clicked: ['page_path', 'cta_id', 'cta_location', 'cta_destination'],
        lablink_contact_submitted: ['page_path', 'form_location', 'lead_source', 'traffic_source'].concat(UTM_KEYS),
        lablink_sandbox_signup_started: ['traffic_source'].concat(UTM_KEYS), // app
        lablink_sandbox_signup_completed: ['traffic_source'].concat(UTM_KEYS), // app
        lablink_first_sandbox_order_succeeded: [], // app, server side
        lablink_production_activation_started: [], // app
        lablink_production_activated: [] // app, server side
    };

    // The only values accepted for the optional "How did you hear about
    // CareGap?" field. Free text from that field is never sent.
    var LEAD_SOURCES = ['AI assistant', 'Search engine', 'Referral', 'Social', 'Other'];

    var AI_HOSTS = [
        'chatgpt.com', 'chat.openai.com', 'openai.com', 'perplexity.ai', 'claude.ai',
        'gemini.google.com', 'copilot.microsoft.com', 'you.com', 'phind.com',
        'chat.deepseek.com', 'meta.ai', 'chat.mistral.ai'
    ];
    var SEARCH_HOSTS = [
        'google.', 'bing.com', 'duckduckgo.com', 'search.yahoo.com', 'ecosia.org',
        'search.brave.com', 'yandex.', 'baidu.com'
    ];

    var FORBIDDEN_KEY = /(e-?mail|name|phone|npi|dob|birth|address|token|secret|password|api.?key|requisition|result|patient|ssn|insurance|icd|note)/i;
    var FORBIDDEN_VALUE = /@|\d{7,}|bearer\s|sk_|pk_/i;
    var MAX_VALUE_LENGTH = 100;

    function hostMatches(host, list) {
        host = String(host || '').toLowerCase().replace(/^www\./, '');
        return list.some(function (entry) {
            return entry.charAt(entry.length - 1) === '.'
                ? host.indexOf(entry) === 0 || host.indexOf('.' + entry) !== -1
                : host === entry || host.slice(-(entry.length + 1)) === '.' + entry;
        });
    }

    function classifySource(utmSource, referrerHost, siteHost) {
        if (utmSource) {
            return hostMatches(utmSource, AI_HOSTS) || /chatgpt|openai|perplexity|claude|gemini|copilot/i.test(utmSource)
                ? 'ai_assistant' : 'campaign';
        }
        if (!referrerHost) return 'direct';
        if (siteHost && referrerHost.replace(/^www\./, '') === siteHost.replace(/^www\./, '')) return 'internal';
        if (hostMatches(referrerHost, AI_HOSTS)) return 'ai_assistant';
        if (hostMatches(referrerHost, SEARCH_HOSTS)) return 'organic_search';
        return 'referral';
    }

    // Strips query strings and fragments from URLs so identifiers in them
    // are never forwarded.
    function stripUrl(value) {
        return String(value).split(/[?#]/)[0];
    }

    // The page URL GA4 records: path plus allow-listed UTMs only, so no other
    // query parameter (an email in a mistyped link, a token) is sent.
    function cleanPageLocation(href) {
        var url = new URL(href);
        var clean = new URL(url.origin + url.pathname);
        UTM_KEYS.forEach(function (key) {
            var value = url.searchParams.get(key);
            if (value && !FORBIDDEN_VALUE.test(value)) clean.searchParams.set(key, value.slice(0, MAX_VALUE_LENGTH));
        });
        return clean.toString();
    }

    function sanitize(eventName, props) {
        var allowed = EVENTS[eventName];
        if (!allowed) return null;
        var out = { event: eventName };
        allowed.forEach(function (key) {
            if (!props || props[key] === undefined || props[key] === null || props[key] === '') return;
            if (FORBIDDEN_KEY.test(key)) return;
            var value = String(props[key]).trim();
            if (key === 'cta_destination' || key === 'page_path') value = stripUrl(value);
            if (key === 'lead_source' && LEAD_SOURCES.indexOf(value) === -1) return;
            if (!value || FORBIDDEN_VALUE.test(value)) return;
            out[key] = value.slice(0, MAX_VALUE_LENGTH);
        });
        return out;
    }

    var api = {
        EVENTS: EVENTS,
        UTM_KEYS: UTM_KEYS,
        LEAD_SOURCES: LEAD_SOURCES,
        GA4_MEASUREMENT_ID: GA4_MEASUREMENT_ID,
        GA4_HOSTS: GA4_HOSTS,
        sanitize: sanitize,
        cleanPageLocation: cleanPageLocation,
        classifySource: classifySource
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
        return;
    }

    // ===== Browser wiring =====

    var ATTRIBUTION_KEY = 'lablink_attribution';
    var CONTACT_KEY = 'lablink_contact_pending';
    var DEBUG_KEY = 'lablink_analytics_debug';

    function storageGet(key) {
        try { return JSON.parse(global.sessionStorage.getItem(key)); } catch (e) { return null; }
    }
    function storageSet(key, value) {
        try { global.sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
    }
    function storageRemove(key) {
        try { global.sessionStorage.removeItem(key); } catch (e) { /* storage unavailable */ }
    }

    var params = new URLSearchParams(global.location.search);
    if (params.get('analytics_debug') === '1') storageSet(DEBUG_KEY, true);
    var debug = storageGet(DEBUG_KEY) === true;

    var ga4 = false;

    function track(eventName, props) {
        var payload = sanitize(eventName, props);
        if (!payload) return;
        global.dataLayer = global.dataLayer || [];
        if (ga4) {
            var params = {};
            Object.keys(payload).forEach(function (key) {
                if (key !== 'event') params[key] = payload[key];
            });
            global.gtag('event', eventName, params);
        } else {
            global.dataLayer.push(payload);
        }
        if (debug && global.console) global.console.info('[lablink analytics]', payload);
    }
    api.track = track;

    // Attribution for this session: allow-listed UTMs plus the referring
    // host. Updated when a visit arrives with new UTMs or from another site.
    var siteHost = global.location.hostname;
    var referrerHost = '';
    try { referrerHost = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) { /* bad referrer */ }

    if (/^G-[A-Z0-9]+$/.test(GA4_MEASUREMENT_ID) && GA4_HOSTS.indexOf(global.location.hostname) !== -1) {
        global.dataLayer = global.dataLayer || [];
        global.gtag = global.gtag || function () { global.dataLayer.push(arguments); };
        global.gtag('js', new Date());
        var config = {
            page_location: cleanPageLocation(global.location.href),
            page_referrer: referrerHost ? 'https://' + referrerHost + '/' : '',
            allow_google_signals: false,
            allow_ad_personalization_signals: false
        };
        // ?analytics_debug=1 also shows this browser in GA4 DebugView. GA4
        // treats any debug_mode value as on, so it is only set when wanted.
        if (debug) config.debug_mode = true;
        global.gtag('config', GA4_MEASUREMENT_ID, config);
        var tag = document.createElement('script');
        tag.async = true;
        tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_MEASUREMENT_ID;
        document.head.appendChild(tag);
        ga4 = true;
    }

    var incoming = {};
    UTM_KEYS.forEach(function (key) {
        var value = params.get(key);
        if (value) incoming[key] = value.slice(0, MAX_VALUE_LENGTH);
    });
    var source = classifySource(incoming.utm_source, referrerHost, siteHost);
    var attribution = storageGet(ATTRIBUTION_KEY);
    var newTouch = source !== 'direct' && source !== 'internal';
    if (!attribution || newTouch) {
        attribution = incoming;
        attribution.traffic_source = source;
        attribution.referrer_host = source === 'internal' ? '' : referrerHost;
        attribution.landing_page = global.location.pathname;
        storageSet(ATTRIBUTION_KEY, attribution);
    }
    api.attribution = attribution;

    function withAttribution(props) {
        var merged = {};
        UTM_KEYS.concat(['traffic_source', 'referrer_host']).forEach(function (key) {
            if (attribution[key]) merged[key] = attribution[key];
        });
        Object.keys(props).forEach(function (key) { merged[key] = props[key]; });
        return merged;
    }

    function onReady(fn) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
        else fn();
    }

    onReady(function () {
        var page = document.body.getAttribute('data-lablink-page');
        var path = global.location.pathname;

        if (page && page !== 'contact_thanks') {
            track('lablink_landing_view', withAttribution({ page_path: path, page_type: page }));
        }

        // Carry allow-listed UTMs into the LabLink app so signup can be
        // attributed. Only UTM keys are added; nothing else is forwarded.
        var utms = UTM_KEYS.filter(function (key) { return attribution[key]; });
        if (utms.length) {
            Array.prototype.forEach.call(document.querySelectorAll('a[href^="https://lablink.caregap.io"]'), function (link) {
                try {
                    var url = new URL(link.href);
                    utms.forEach(function (key) {
                        if (!url.searchParams.has(key)) url.searchParams.set(key, attribution[key]);
                    });
                    link.href = url.toString();
                } catch (e) { /* leave link as is */ }
            });
        }

        document.addEventListener('click', function (event) {
            var link = event.target.closest && event.target.closest('[data-cta]');
            if (!link) return;
            var section = link.closest('section, header, footer');
            track('lablink_cta_clicked', {
                page_path: path,
                cta_id: link.getAttribute('data-cta'),
                cta_location: link.getAttribute('data-cta-location') || (section && section.id) || '',
                cta_destination: link.getAttribute('href') || ''
            });
        });

        Array.prototype.forEach.call(document.querySelectorAll('form[data-lablink-contact]'), function (form) {
            Object.keys(attribution).forEach(function (key) {
                var input = form.querySelector('input[type="hidden"][name="' + key + '"]');
                if (input) input.value = attribution[key];
            });
            form.addEventListener('submit', function () {
                var select = form.querySelector('select[name="source"]');
                storageSet(CONTACT_KEY, {
                    form_location: form.getAttribute('data-lablink-contact'),
                    lead_source: select ? select.value : ''
                });
            });
        });

        // The contact form posts to /thanks; count the lead only once the
        // submission has gone through.
        if (page === 'contact_thanks') {
            var pending = storageGet(CONTACT_KEY);
            if (pending) {
                storageRemove(CONTACT_KEY);
                track('lablink_contact_submitted', withAttribution({
                    page_path: path,
                    form_location: pending.form_location,
                    lead_source: pending.lead_source
                }));
            }
        }
    });

    global.LabLinkAnalytics = api;
})(typeof window !== 'undefined' ? window : this);
