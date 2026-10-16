// ==UserScript==
// @name         OneTrack Automation & Helper - Actual_Test
// @namespace    http://tampermonkey.net/
// @version      1.4.1
// @description  Automates workflows, UI enhancements, hotkeys, and persistent settings.
// @author       jekosol
// @match        *://*/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';
    // --- SELF-SUSTAINING GM STORAGE FALLBACK ---
    if (typeof GM_getValue === 'undefined') {
        window.GM_getValue = (key, def) => {
            let val = localStorage.getItem(key);
            return val !== null ? val : def;
        };
    }
    if (typeof GM_setValue === 'undefined') {
        window.GM_setValue = (key, val) => {
            localStorage.setItem(key, val);
        };
    }
    const CURRENT_VERSION = '1.4.1';
    // --- ENVIRONMENT AUTO-DETECTION ---
    const isTestEnv = typeof GM_info !== 'undefined' && GM_info && GM_info.script && GM_info.script.name.includes('Test');
    const CONFIG = {
        hotkey: isTestEnv ? 'KeyP' : 'KeyQ',
        envName: isTestEnv ? 'TEST' : 'LIVE',
        storagePrefix: isTestEnv ? 'onetrack_test_' : 'onetrack_live_',
        debugMode: isTestEnv
    };
    const RELEASE_NOTES = [
        "Added customizable Toggles: Dark/Light Mode, Compact UI, Import/Export backup.",
        "Added user-configurable hotkeys via settings menu.",
        "Added dedicated Global Common Phrases editor accessible from any device screen.",
        "Added PDF text extractor for MOOG Invoices",
        "Added Feedback (option file attachment) Feature within Advanced Settings tab"
    ];

    // 1. Inject clean theme styles (Backdrop made fully transparent / non-dimming)
    const existingStyle = document.getElementById('onetrack-theme-styles');
    if (existingStyle) existingStyle.remove();

    const themeStyles = document.createElement('style');
    themeStyles.id = 'onetrack-theme-styles';
    themeStyles.innerHTML = `
        /* Light Mode Defaults */
        #preset-notes-modal, .onetrack-ui-panel {
            background-color: transparent;
            color: #333333;
        }

        /* 1. Make backdrop completely transparent / non-dimming and allow clicking through */
        #preset-notes-modal {
            background: transparent !important;
            pointer-events: none !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 999999 !important;
        }

        /* 2. The actual modal box and panels remain fully clickable */
        #preset-notes-modal > .onetrack-modal,
        .onetrack-ui-panel {
            pointer-events: auto !important;
        }

        /* 3. Style the actual modal card container nicely in dark mode */
        #preset-notes-modal[data-theme="dark"] .onetrack-modal,
        #preset-notes-modal[data-theme="dark"] > div:not([style*="position:fixed"]) {
            background-color: #1e1e1e !important;
            color: #e0e0e0 !important;
            border: 1px solid #333333 !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
        }

        /* 4. Fix contrast for labels and text inside Advanced Settings and modals */
        #preset-notes-modal[data-theme="dark"] label,
        #preset-notes-modal[data-theme="dark"] span,
        #preset-notes-modal[data-theme="dark"] div {
            color: #e0e0e0;
        }

        /* 5. Force Company and Warranty Banners to keep their vibrant inline background colors */
        #preset-notes-modal[data-theme="dark"] div[style*="background:"] {
            color: #ffffff !important;
            text-shadow: 0 1px 2px rgba(0,0,0,0.4);
        }

        /* Dark Mode Text Inputs & Selects */
        #preset-notes-modal[data-theme="dark"] input:not([type="checkbox"]):not([type="radio"]),
        #preset-notes-modal[data-theme="dark"] textarea,
        #preset-notes-modal[data-theme="dark"] select {
            background: #2a2a2a !important;
            color: #ffffff !important;
            border: 1px solid #555555 !important;
        }
        .onetrack-ui-panel {
            position: fixed;
            z-index: 999999;
        }
        .onetrack-wrap-mode textarea.onetrack-phrase-input {
            white-space: pre-wrap !important;
            word-break: break-word !important;
            height: auto !important;
            min-height: 32px;
            resize: ical;
        }
    `;
    document.head.appendChild(themeStyles);

    function applyTheme(themeChoice) {
        localStorage.setItem('onetrack_theme', themeChoice);
        const activeTheme = (themeChoice === 'auto') 
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : themeChoice;

        const modals = document.querySelectorAll('#preset-notes-modal, .onetrack-ui-panel');
        modals.forEach(modal => {
            if (activeTheme === 'dark') {
                modal.setAttribute('data-theme', 'dark');
            } else {
                modal.removeAttribute('data-theme');
            }
        });
    }

    const savedTheme = localStorage.getItem('onetrack_theme') || 'auto';
    applyTheme(savedTheme);

    function applyCompactMode(isCompact) {
        localStorage.setItem('onetrack_compact', isCompact);
        const modal = document.getElementById('preset-notes-modal');
        if (modal) {
            modal.classList.toggle('onetrack-compact-mode', isCompact);
        }
    }

    let currentTheme = localStorage.getItem('onetrack_theme') || 'auto';
    let customHotkey = localStorage.getItem(CONFIG.storagePrefix + 'custom_hotkey') || CONFIG.hotkey;
    let compactMode = localStorage.getItem('onetrack_compact') === 'true';
    let keepOpenMode = localStorage.getItem('onetrack_keep_open') === 'true';
    let wrapMode = localStorage.getItem('onetrack_wrap_mode') === 'true';

    applyTheme(currentTheme);

    let themeStyleTag = document.getElementById('onetrack-theme-variables');
    if (!themeStyleTag) {
        themeStyleTag = document.createElement('style');
        themeStyleTag.id = 'onetrack-theme-variables';
        document.head.appendChild(themeStyleTag);
    }

    themeStyleTag.innerHTML = `
        :root {
            --bg-main: #ffffff;
            --bg-input: #ffffff;
            --bg-card: #f9f9f9;
            --text-color: #222222;
            --border-color: #cccccc;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --bg-main: #181818;
                --bg-input: #1e1e1e;
                --bg-card: #2d2d2d;
                --text-color: #e0e0e0;
                --border-color: #444444;
            }
        }
        [data-theme="light"] {
            --bg-main: #ffffff !important;
            --bg-input: #ffffff !important;
            --bg-card: #f9f9f9 !important;
            --text-color: #222222 !important;
            --border-color: #cccccc !important;
        }
        [data-theme="dark"] {
            --bg-main: #181818 !important;
            --bg-input: #1e1e1e !important;
            --bg-card: #2d2d2d !important;
            --text-color: #e0e0e0 !important;
            --border-color: #444444 !important;
        }
        .onetrack-compact-mode { padding: 10px !important; }
        .onetrack-compact-mode button { padding: 5px 8px !important; font-size: 11px !important; }
    `;

    function makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const dragMouseDown = (e) => {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        };
        const closeDragElement = () => {
            document.onmouseup = null;
            document.onmousemove = null;
            GM_setValue('modal_pos_x', element.style.left);
            GM_setValue('modal_pos_y', element.style.top);
        };
        const elementDrag = (e) => {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
            element.style.position = 'fixed';
            let currentScale = getUIScale();
            element.style.transform = currentScale !== 1.0 ? `scale(${currentScale})` : 'none';
        };
        const targetHandle = handle || element;
        targetHandle.onmousedown = dragMouseDown;
    }

    function exportSettings() {
        let settings = {
            theme: localStorage.getItem('onetrack_theme'),
            hotkey: localStorage.getItem('onetrack_hotkey'),
            compact: localStorage.getItem('onetrack_compact'),
            keepOpen: localStorage.getItem('onetrack_keep_open'),
            version: CURRENT_VERSION
        };
        let blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = 'onetrack_settings_backup.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Settings exported successfully!');
    }

    function importSettings(event) {
        let file = event.target.files[0];
        if (!file) return;
        let reader = new FileReader();
        reader.onload = function(e) {
            try {
                let settings = JSON.parse(e.target.result);
                if (settings.theme) localStorage.setItem('onetrack_theme', settings.theme);
                if (settings.hotkey) localStorage.setItem('onetrack_hotkey', settings.hotkey);
                if (settings.compact !== undefined) localStorage.setItem('onetrack_compact', settings.compact);
                if (settings.keepOpen !== undefined) localStorage.setItem('onetrack_keep_open', settings.keepOpen);
                showToast('Settings imported successfully! Reloading...');
                setTimeout(() => location.reload(), 1000);
            } catch (err) {
                showToast('Invalid configuration file.');
            }
        };
        reader.readAsText(file);
    }

    function checkWhatsNew(force = false) {
        let lastSeenVersion = localStorage.getItem('preset_notes_last_version');
        if (!force && lastSeenVersion === CURRENT_VERSION) return;

        let ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:transparent;z-index:1000000;display:flex;align-items:center;justify-content:center;font-family:sans-serif;pointer-events:none;';

        let box = document.createElement('div');
        box.className = 'onetrack-modal';
        box.style.cssText = 'background:#fff;padding:24px;border-radius:8px;box-shadow:0 6px 16px rgba(0,0,0,0.2);width:420px;max-width:90vw;display:flex;flex-direction:column;color:#333;pointer-events:auto;';

        let title = document.createElement('h3');
        title.innerText = `🎉 What's New in Preset Notes (v${CURRENT_VERSION})`;
        title.style.cssText = 'margin-top:0;margin-bottom:12px;font-size:16px;color:#222;text-align:center;';
        box.appendChild(title);

        let list = document.createElement('ul');
        list.style.cssText = 'margin:0 0 20px 0;padding-left:20px;font-size:13px;line-height:1.6;color:#444;';
        RELEASE_NOTES.forEach(note => {
            let li = document.createElement('li');
            li.innerText = note;
            list.appendChild(li);
        });
        box.appendChild(list);

        let btn = document.createElement('button');
        btn.innerText = force ? 'Close' : 'Got it, let’s work!';
        btn.className = 'onetrack-btn';
        btn.style.cssText = 'width:100%;padding:10px;background:#28a745;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;font-weight:bold;';
        btn.onclick = () => {
            localStorage.setItem('preset_notes_last_version', CURRENT_VERSION);
            ov.remove();
            if (force) showAdvancedSettingsModal();
        };
        box.appendChild(btn);
        ov.appendChild(box);
        document.body.appendChild(ov);
    }

    const DEFAULT_CLIENT_MAPPING = {
        "CORAM": ["Shana Brown", "Amy Kwong"],
        "CVS": ["Andrew Tajc"],
        "OPTUM": ["Janey Mechler", "Heather LeClair"],
        "AmeriMed": ["David Rolph"],
        "NELC": ["Alexsis Gauthier", "Sheryl Guyer", "Lauren Lynch"],
        "OPTION CARE": ["Brian Fitzpatrick"],
        "Amerita": ["David Rolph"],
        "Other": []
    };

    function getClientMapping() {
        let s = localStorage.getItem('my_preset_client_mapping');
        if (s) {
            try {
                let p = JSON.parse(s);
                if (p && Object.keys(p).length > 0) return p;
            } catch (e) {}
        }
        return DEFAULT_CLIENT_MAPPING;
    }

    function getGlobalPhrases() {
        let s = localStorage.getItem('global_common_phrases');
        if (s) {
            try {
                let arr = JSON.parse(s);
                if (Array.isArray(arr)) return arr;
            } catch(e) {}
        }
        return [
            "Repair Estimate under pre-approved limit."
        ];
    }

    function getUIScale() {
        let scale = parseFloat(localStorage.getItem('preset_ui_scale'));
        return !isNaN(scale) && scale >= 0.7 && scale <= 1.4 ? scale : 1.0;
    }

    function setUIScale(scale) {
        let clamped = Math.max(0.7, Math.min(1.4, scale));
        localStorage.setItem('preset_ui_scale', clamped.toFixed(2));
    }

    function applyUIScale(box) {
        let scale = getUIScale();
        if (scale !== 1.0) {
            box.style.transform = `scale(${scale})`;
            box.style.transformOrigin = 'center center';
        }
    }

    function getDeviceType() {
        let t = document.body ? document.body.innerText : '',
            m = t.match(/Model\s+([^\r\n]+)/i);
        return m && m[1] ? m[1].trim() : "Unknown Device";
    }

    function getSerialNumber() {
        try {
            let walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while (node = walker.nextNode()) {
                if (node.nodeValue && node.nodeValue.trim() === "Serial Number") {
                    let parent = node.parentElement;
                    if (parent) {
                        let nextSib = parent.nextElementSibling;
                        if (nextSib && nextSib.innerText.trim()) return nextSib.innerText.trim();
                        else if (parent.parentElement) {
                            let cells = parent.parentElement.children;
                            for (let i = 0; i < cells.length; i++) {
                                if (cells[i] === parent && cells[i+1] && cells[i+1].innerText.trim()) {
                                    return cells[i+1].innerText.trim();
                                }
                            }
                        }
                    }
                }
            }
            let t = document.body ? document.body.innerText : '';
            let m = t.match(/Serial\s*Number\D*([^\r\n\s]+)/i);
            return m && m[1] ? m[1].trim() : "N/A";
        } catch (e) {
            return "N/A";
        }
    }

    function getCurrentCompany() {
        let t = document.body ? document.body.innerText : '',
            o = t.match(/Owner\s+([^\r\n]+)/i),
            ot = o ? o[1] : t,
            map = getClientMapping();
        if (/new\s*england\s*life\s*care|\bnelc\b/i.test(ot)) {
            return "NELC";
        }
        for (let c of Object.keys(map)) {
            if (c === "NELC") continue;
            if (new RegExp('\\b' + c + '\\b', 'i').test(ot)) return c;
        }
        return "Other";
    }

    function showToast(message) {
        let existingToast = document.getElementById('preset-toast-test');
        if (existingToast) existingToast.remove();

        let toast = document.createElement('div');
        toast.id = 'preset-toast-test';
        toast.innerText = message;
        toast.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#28a745; color:#fff; padding:10px 16px; border-radius:6px; z-index:999999; font-size:12px; font-weight:bold; box-shadow:0 4px 10px rgba(0,0,0,0.2); transition:opacity 0.3s ease; pointer-events:none;';
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    function processTextSelection(text) {
        let appendMode = localStorage.getItem('preset_notes_append_mode') === 'true';
        let targetInput = null;
        let modalDialogs = document.querySelectorAll('.ant-modal, [role="dialog"], div[style*="z-index"]');
        for (let dialog of modalDialogs) {
            let ta = dialog.querySelector('textarea, input[type="text"]');
            if (ta && ta.offsetParent !== null) {
                targetInput = ta;
                break;
            }
        }
        if (!targetInput) {
            let activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
                targetInput = activeEl;
            }
        }
        if (targetInput) {
            targetInput.focus();
            let existing = targetInput.value || '';
            if (appendMode && existing.trim().length > 0) {
                targetInput.value = existing.trim() + ' ' + text;
            } else {
                targetInput.value = text;
            }
            targetInput.dispatchEvent(new Event('input', { bubbles: true }));
            targetInput.dispatchEvent(new Event('change', { bubbles: true }));
            targetInput.dispatchEvent(new Event('blur', { bubbles: true }));
            showToast("✓ Applied to field & copied!");
        } else {
            showToast("✓ Copied to clipboard only!");
        }
        let tempInput = document.createElement('textarea');
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        try {
            document.execCommand('copy');
        } catch (err) {}
        tempInput.remove();

        if (typeof keepOpenMode !== 'undefined' && !keepOpenMode) {
            let modal = document.getElementById('preset-notes-modal');
            if (modal) modal.remove();
        }
    }

    function getSavedModalPosition() {
        let modal = document.getElementById('preset-notes-modal');
        if (modal && modal.style.left && modal.style.top && modal.style.left !== '') {
            return { left: modal.style.left, top: modal.style.top };
        }
        return {
            left: GM_getValue('modal_pos_x', null),
            top: GM_getValue('modal_pos_y', null)
        };
    }

    function applySavedPosition(box) {
        let pos = getSavedModalPosition();
        if (pos.left !== null && pos.top !== null) {
            box.style.left = pos.left;
            box.style.top = pos.top;
            box.style.position = 'fixed';
            box.style.transform = 'none';
        }
    }

    function applySavedScale(box) {
        let scale = getUIScale();
        if (scale !== 1.0) {
            box.style.transform = `scale(${scale})`;
            box.style.transformOrigin = 'center center';
        }
    }

    function calculateInfinityFlatRateFindings() {
        let pageText = document.body.innerText;
        let match = pageText.match(/Serial Number\D*([4569]\d{8})/i) || pageText.match(/\b([4569]\d{8})\b/);
        if (!match) {
            alert("Could not detect a valid 9-digit Infinity serial number on this page.");
            return null;
        }
        let sn = match[1];
        let yr = parseInt("20" + sn.substring(1, 3), 10);
        let dayOfYear = parseInt(sn.substring(3, 6), 10);
        let buildDate = new Date(yr, 0, dayOfYear);
        let today = new Date();
        let ageMonths = (today.getFullYear() - buildDate.getFullYear()) * 12 + (today.getMonth() - buildDate.getMonth());
        let tempDate = new Date(buildDate);
        tempDate.setMonth(tempDate.getMonth() + ageMonths);
        if (tempDate > today) ageMonths--;
        ageMonths = Math.max(0, ageMonths);
        let cost = ageMonths <= 24 ? 40.00 : ageMonths <= 48 ? 225.00 : ageMonths <= 72 ? 275.00 : 325.00;
        return `Device S/N: ${sn} requires an OEM level repair. Age of device is ${ageMonths} months. Cost of flat rate repair including handling is $${cost.toFixed(2)}. Pumps requiring PCB replacement will incur an additional charge which MOOG will notify and provide an estimate for. McKesson Biomed will provide an updated estimate for repair if required.`;
    }

    function getPhrasesForDevice(dt) {
        let s = localStorage.getItem('device_preset_notes'), m = {};
        if (s) { try { m = JSON.parse(s); } catch (e) {} }
        let dp = m[dt] && m[dt].length > 0 ? m[dt] : (dt.includes('Solis VIP PharmGuard Pump') ? [
            "Initial inspection completed. Unit powers on successfully. ({DATE})",
            "Keypad and display functioning normally. ({DATE})",
            "Error log checked; no critical faults found. ({DATE})"
        ] : []);

        let ts = localStorage.getItem('te_custom_mapping'), tp = [];
        if (ts) {
            try {
                let tm = JSON.parse(ts);
                if (tm[dt]) {
                    let d = tm[dt], rl = [];
                    if (typeof d === 'object' && d !== null) {
                        rl = Array.isArray(d.repair) ? d.repair : (typeof d.repair === 'string' ? [d.repair] : []);
                    } else if (Array.isArray(d)) { rl = d; } else if (typeof d === 'string') { rl = [d]; }
                    rl.forEach(r => { if (r) tp.push(`Test equipment used for repair: ${r}`); });
                }
            } catch (e) {}
        }
        let gp = getGlobalPhrases();
        return Array.from(new Set([...gp, ...tp, ...dp]));
    }

    function getAllHistory() {
        let s = localStorage.getItem('preset_all_history');
        return s ? JSON.parse(s) : [];
    }

    function addHistoryItem(text) {
        let hist = getAllHistory();
        hist = [text, ...hist.filter(x => x !== text)].slice(0, 20);
        localStorage.setItem('preset_all_history', JSON.stringify(hist));
    }

    function showMainModal(passedTheme) {
        let dt = getDeviceType(),
            ph = getPhrasesForDevice(dt),
            hist = getAllHistory(),
            cc = getCurrentCompany(),
            iam = localStorage.getItem('preset_notes_append_mode') === 'true',
            hrm = localStorage.getItem('preset_hide_recent') === 'true',
            serialNum = getSerialNumber();

        let activeTheme = passedTheme || document.getElementById('preset-notes-modal')?.getAttribute('data-theme') || localStorage.getItem('onetrack_theme') || 'light';
        let isDark = activeTheme === 'dark';

        let ex = document.getElementById('preset-notes-modal');
        if (ex) ex.remove();

        let ov = document.createElement('div');
        ov.id = 'preset-notes-modal';
        ov.setAttribute('data-theme', activeTheme);
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:transparent;z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;pointer-events:none;';

        let box = document.createElement('div');
        box.className = 'onetrack-modal' + (compactMode ? ' onetrack-compact-mode' : '');
        let boxBg = isDark ? '#1e1e1e' : '#fff';
        let boxColor = isDark ? '#e0e0e0' : '#333';
        box.style.cssText = `background:${boxBg};color:${boxColor};padding:20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);width:500px;max-height:80vh;display:flex;flex-direction:column;position:relative;pointer-events:auto;`;
        applyUIScale(box);
        applySavedPosition(box);
        applySavedScale(box);

        let header = document.createElement('div');
        header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-top: 0; margin-bottom: 8px; cursor: move;';
        let h = document.createElement('h3');
        h.innerText = `${dt} — S/N: ${serialNum}`;
        h.style.cssText = `margin: 0; font-size: 14px; color: ${isDark ? '#ffffff' : '#222'};`;
        header.appendChild(h);
        makeDraggable(box, header);
        box.appendChild(header);

        let hsRow = document.createElement('div');
        hsRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px;';

        let companyColors = {
            "CORAM": "#2e7d32", "CVS": "#0277bd", "OPTUM": "#6a1b9a",
            "AmeriMed": "#c62828", "NELC": "#ef6c00", "OPTION CARE": "#00838f",
            "Amerita": "#4527a0", "Other": "#780034"
        };
        let badgeColor = companyColors[cc] || "#780034";
        let sh = document.createElement('div');
        sh.innerText = `Company: ${cc}`;
        sh.style.cssText = `font-size:11px;color:#fff;background:${badgeColor};text-align:center;font-weight:bold;padding:6px 8px;border-radius:4px;flex:1;`;
        hsRow.appendChild(sh);

        let warrantyText = "";
        try {
            let walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while (node = walker.nextNode()) {
                if (node.nodeValue && node.nodeValue.trim() === "Warranty Status") {
                    let parent = node.parentElement;
                    if (parent) {
                        let nextSib = parent.nextElementSibling;
                        if (nextSib) warrantyText = nextSib.innerText.trim();
                        else if (parent.parentElement) {
                            let cells = parent.parentElement.children;
                            for (let i = 0; i < cells.length; i++) {
                                if (cells[i] === parent && cells[i+1]) {
                                    warrantyText = cells[i+1].innerText.trim();
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) {}

        let isOOW = /out\s*of\s*warranty/i.test(warrantyText) || /oow/i.test(warrantyText) || /not\s*warranted/i.test(warrantyText);
        if (warrantyText) {
            let wBadge = document.createElement('div');
            wBadge.innerText = warrantyText;
            wBadge.style.cssText = `font-size:11px;color:#fff;background:${isOOW ? '#dc3545' : '#28a745'};text-align:center;font-weight:bold;padding:6px 10px;border-radius:4px;`;
            hsRow.appendChild(wBadge);
        }
        box.appendChild(hsRow);

        let tRow = document.createElement('div');
        tRow.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;';
        let rowBg = isDark ? '#2a2a2a' : '#f8f9fa';
        let rowBorder = isDark ? '#444' : '#e9ecef';
        let rowColor = isDark ? '#e0e0e0' : '#212529';

        let tr = document.createElement('label');
        tr.style.cssText = `display:flex;align-items:center;gap:6px;font-size:10px;cursor:pointer;user-select:none;background:${rowBg};padding:6px;border-radius:4px;border:1px solid ${rowBorder};flex:1;color:${rowColor};`;
        let tc = document.createElement('input');
        tc.type = 'checkbox';
        tc.checked = iam;
        tc.onchange = (e) => localStorage.setItem('preset_notes_append_mode', e.target.checked);
        tr.appendChild(tc);
        let tlt = document.createElement('span');
        tlt.innerText = 'Append mode';
        tlt.style.cssText = 'font-weight:bold;';
        tr.appendChild(tlt);
        tRow.appendChild(tr);

        let tr2 = document.createElement('label');
        tr2.style.cssText = `display:flex;align-items:center;gap:6px;font-size:10px;cursor:pointer;user-select:none;background:${rowBg};padding:6px;border-radius:4px;border:1px solid ${rowBorder};flex:1;color:${rowColor};`;
        let tc2 = document.createElement('input');
        tc2.type = 'checkbox';
        tc2.checked = hrm;
        tc2.onchange = (e) => {
            localStorage.setItem('preset_hide_recent', e.target.checked);
            ov.remove();
            showMainModal(activeTheme);
        };
        tr2.appendChild(tc2);
        let tlt2 = document.createElement('span');
        tlt2.innerText = 'Hide Clipboard History';
        tlt2.style.cssText = 'font-weight:bold;';
        tr2.appendChild(tlt2);
        tRow.appendChild(tr2);
        box.appendChild(tRow);

        let cont = document.createElement('div');
        cont.style.cssText = 'overflow-y:auto;flex:1;padding-right:5px;margin-bottom:12px;';
        let tds = new Date().toLocaleDateString('en-US', {month:'2-digit', day:'2-digit', year:'numeric'});

        if (/\s*(6000|infinity)/i.test(dt)) {
            let curlinPdfBtn = document.createElement('button');
            curlinPdfBtn.innerText = '⚡ Moog Invoice PDF Text Extract';
            curlinPdfBtn.className = 'onetrack-btn';
            curlinPdfBtn.style.cssText = 'display:block;width:100%;padding:8px 10px;margin:4px 0;background:#e2f0cb;color:#2b542c;border:1px solid #b5d89c;border-radius:4px;cursor:pointer;font-size:12px;text-align:left;font-weight:bold;line-height:1.4;';
            curlinPdfBtn.onclick = () => {
                console.log("Button clicked, attempting to open upload modal...");
                ov.remove();
                try {
                    showCurlinUploadModal(activeTheme);
                } catch (err) {
                    console.error("Caught error opening upload modal:", err);
                }
            };
            cont.appendChild(curlinPdfBtn);
        }

        if (/solis/i.test(dt)) {
            let solisOemBtn = document.createElement('button');
            solisOemBtn.innerText = '🔧 Solis OEM Replaced Parts Selection...';
            solisOemBtn.className = 'onetrack-btn';
            solisOemBtn.style.cssText = 'display:block;width:100%;padding:8px 10px;margin:4px 0;background:#e2f0cb;color:#2b542c;border:1px solid #b5d89c;border-radius:4px;cursor:pointer;font-size:12px;text-align:left;font-weight:bold;line-height:1.4;';
            solisOemBtn.onclick = () => {
                ov.remove();
                showSolisPartsModal(activeTheme);
            };
            cont.appendChild(solisOemBtn);
        }
        
        if (/enteralite\s*infinity/i.test(dt)) {
            let infBtn = document.createElement('button');
            infBtn.innerText = '⚡ Infinity Flat Rate Repair Calculation';
            infBtn.className = 'onetrack-btn';
            infBtn.style.cssText = 'display:block;width:100%;padding:8px 10px;margin:4px 0;background:#e2f0cb;color:#2b542c;border:1px solid #b5d89c;border-radius:4px;cursor:pointer;font-size:12px;text-align:left;font-weight:bold;line-height:1.4;';
            infBtn.onclick = () => {
                let findings = calculateInfinityFlatRateFindings();
                if (findings) { addHistoryItem(findings); processTextSelection(findings); }
            };
            cont.appendChild(infBtn);
            let oemBtn = document.createElement('button');
            oemBtn.innerText = '🔧 OEM Replaced Parts Selection...';
            oemBtn.className = 'onetrack-btn';
            oemBtn.style.cssText = 'display:block;width:100%;padding:8px 10px;margin:4px 0;background:#e2f0cb;color:#2b542c;border:1px solid #b5d89c;border-radius:4px;cursor:pointer;font-size:12px;text-align:left;font-weight:bold;line-height:1.4;';
            oemBtn.onclick = () => {
                ov.remove();
                showInfinityPartsModal(activeTheme);
            };
            cont.appendChild(oemBtn);
        }

        let db = document.createElement('button');
        db.innerText = 'Repairs declined...';
        db.className = 'onetrack-btn';
        db.style.cssText = 'display:block;width:100%;padding:8px 10px;margin:4px 0;background:#fff3cd;color:#856404;border:1px solid #ffeeba;border-radius:4px;cursor:pointer;font-size:12px;text-align:left;font-weight:bold;line-height:1.4;';
        db.onclick = () => { ov.remove(); showDeclineActionModal(activeTheme); };
        cont.appendChild(db);

        let ab = document.createElement('button');
        ab.innerText = 'Repairs approved...';
        ab.className = 'onetrack-btn';
        ab.style.cssText = 'display:block;width:100%;padding:8px 10px;margin:4px 0;background:#d4edda;color:#155724;border:1px solid #c3e6cb;border-radius:4px;cursor:pointer;font-size:12px;text-align:left;font-weight:bold;line-height:1.4;';
        ab.onclick = () => { ov.remove(); showClientSelectModal('Repairs approved', false, activeTheme); };
        cont.appendChild(ab);

        if (!hrm && hist.length > 0) {
            let rHead = document.createElement('div');
            rHead.innerText = '⭐ Smart Clipboard History';
            rHead.style.cssText = `font-size:11px;font-weight:bold;color:${isDark ? '#aaa' : '#666'};margin:8px 0 2px 2px;`;
            cont.appendChild(rHead);
            hist.forEach(hTxt => {
                let btn = document.createElement('button');
                btn.innerText = "⚡ " + hTxt;
                btn.className = 'onetrack-btn';
                btn.style.cssText = 'display:block;width:100%;padding:8px 10px;margin:4px 0;background:#eef7fe;color:#0366d6;border:1px solid #c8e1ff;border-radius:4px;cursor:pointer;font-size:12px;text-align:left;line-height:1.4;';
                btn.onclick = () => { addHistoryItem(hTxt); processTextSelection(hTxt); };
                cont.appendChild(btn);
            });
        }

        let pHead = document.createElement('div');
        pHead.innerText = '📝 Standard Presets';
        pHead.style.cssText = `font-size:11px;font-weight:bold;color:${isDark ? '#aaa' : '#666'};margin:8px 0 2px 2px;`;
        cont.appendChild(pHead);

        ph.forEach(txt => {
            let dtTxt = txt.replace(/\{DATE\}/gi, tds).replace(/\{SERIAL\}/gi, serialNum),
                cln = dtTxt.replace(/\s*\([^)]*\)\s*$/, '').trim(),
                btn = document.createElement('button');
            btn.innerText = dtTxt;
            btn.className = 'onetrack-btn';
            btn.style.cssText = `display:block;width:100%;padding:8px 10px;margin:4px 0;background:${isDark ? '#2a2a2a' : '#f8f9fa'};color:${isDark ? '#fff' : '#212529'};border:1px solid ${isDark ? '#444' : '#ced4da'};border-radius:4px;cursor:pointer;font-size:12px;text-align:left;line-height:1.4;`;
            btn.onclick = () => { addHistoryItem(cln); processTextSelection(cln); };
            cont.appendChild(btn);
        });
        box.appendChild(cont);

        let eb = document.createElement('button');
        eb.innerText = '✏️ Edit Device Notes & Phrases';
        eb.className = 'onetrack-btn';
        eb.style.cssText = 'width:100%;padding:8px;margin-bottom:6px;background:#780034;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;';
        eb.onclick = () => { ov.remove(); showEditModal(activeTheme); };
        box.appendChild(eb);

        let cb = document.createElement('button');
        cb.innerText = 'Cancel';
        cb.className = 'onetrack-btn';
        cb.style.cssText = isDark ? 'width:100%;padding:8px;background:#444;color:#e0e0e0;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;' : 'width:100%;padding:8px;background:#e0e0e0;color:#333;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;';
        cb.onclick = () => ov.remove();
        box.appendChild(cb);

        ov.appendChild(box);
        document.body.appendChild(ov);
    }

    function showDeclineActionModal(passedTheme) {
        let activeTheme = passedTheme || document.getElementById('preset-notes-modal')?.getAttribute('data-theme') || 'light';
        let isDark = activeTheme === 'dark';

        let ex = document.getElementById('preset-notes-modal');
        if (ex) ex.remove();

        let ov = document.createElement('div');
        ov.id = 'preset-notes-modal';
        ov.setAttribute('data-theme', activeTheme);
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:transparent;z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;pointer-events:none;';

        let box = document.createElement('div');
        box.className = 'onetrack-modal' + (compactMode ? ' onetrack-compact-mode' : '');
        let boxBg = isDark ? '#1e1e1e' : '#fff';
        let boxColor = isDark ? '#e0e0e0' : '#333';
        box.style.cssText = `background:${boxBg};color:${boxColor};padding:20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);width:400px;display:flex;flex-direction:column;position:relative;pointer-events:auto;`;
        applyUIScale(box);
        applySavedPosition(box);
        applySavedScale(box);

        let h = document.createElement('h3');
        h.innerText = 'Select Decline Action';
        h.style.cssText = `margin-top:0;margin-bottom:12px;font-size:16px;color:${isDark ? '#fff' : '#222'};text-align:center;cursor:move;`;
        makeDraggable(box, h);
        box.appendChild(h);

        [{
            label: "Asked to be disposed of here at biomed facility",
            actionText: "Repairs declined and asked to be disposed of"
        }, {
            label: "Asked to be returned unrepaired",
            actionText: "Repairs declined and asked to be returned"
        }].forEach(item => {
            let btn = document.createElement('button');
            btn.innerText = item.label;
            btn.className = 'onetrack-btn';
            btn.style.cssText = `display:block;width:100%;padding:10px;margin:6px 0;background:${isDark ? '#2a2a2a' : '#f8f9fa'};color:${isDark ? '#fff' : '#212529'};border:1px solid ${isDark ? '#444' : '#ced4da'};border-radius:4px;cursor:pointer;font-size:12px;text-align:left;font-weight:bold;line-height:1.4;`;
            btn.onclick = () => { ov.remove(); showClientSelectModal(item.actionText, false, activeTheme); };
            box.appendChild(btn);
        });

        let bBtn = document.createElement('button');
        bBtn.innerText = '← Back to Main Menu';
        bBtn.className = 'onetrack-btn';
        bBtn.style.cssText = isDark ? 'width:100%;padding:8px;margin-top:10px;background:#444;color:#e0e0e0;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;' : 'width:100%;padding:8px;margin-top:10px;background:#e0e0e0;color:#333;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;';
        bBtn.onclick = () => showMainModal(activeTheme);
        box.appendChild(bBtn);
        ov.appendChild(box);
        document.body.appendChild(ov);
    }

    function showClientSelectModal(ap, sao, passedTheme) {
        let activeTheme = passedTheme || document.getElementById('preset-notes-modal')?.getAttribute('data-theme') || 'light';
        let isDark = activeTheme === 'dark';
        let map = getClientMapping(), cc = getCurrentCompany(), clients = [], allClientsObj = {};

        Object.keys(map).forEach(comp => {
            if (Array.isArray(map[comp])) {
                map[comp].forEach(c => allClientsObj[c] = comp);
            }
        });

        if (!sao) clients = map[cc] || [];
        if (clients.length === 0) {
            clients = Object.keys(allClientsObj);
            sao = true;
        }

        let ex = document.getElementById('preset-notes-modal');
        if (ex) ex.remove();

        let ov = document.createElement('div');
        ov.id = 'preset-notes-modal';
        ov.setAttribute('data-theme', activeTheme);
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:transparent;z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;pointer-events:none;';

        let box = document.createElement('div');
        box.className = 'onetrack-modal' + (compactMode ? ' onetrack-compact-mode' : '');
        let boxBg = isDark ? '#1e1e1e' : '#fff';
        let boxColor = isDark ? '#e0e0e0' : '#333';
        box.style.cssText = `background:${boxBg};color:${boxColor};padding:20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);width:450px;max-height:80vh;display:flex;flex-direction:column;position:relative;pointer-events:auto;`;
        applyUIScale(box);
        applySavedPosition(box);
        applySavedScale(box);

        let h = document.createElement('h3');
        h.innerText = `Select Client (${sao ? 'All Clients' : cc})`;
        h.style.cssText = `margin-top:0;margin-bottom:6px;font-size:16px;color:${isDark ? '#fff' : '#222'};text-align:center;cursor:move;`;
        makeDraggable(box, h);
        box.appendChild(h);

        let cont = document.createElement('div');
        cont.style.cssText = 'overflow-y:auto;flex:1;padding-right:5px;margin-bottom:12px;max-height:240px;';

        clients.forEach(client => {
            let ft = `${ap} by ${client}.`,
                btn = document.createElement('button');
            btn.innerText = client;
            btn.className = 'onetrack-btn';
            btn.style.cssText = `display:block;width:100%;padding:8px 10px;margin:4px 0;background:${isDark ? '#2a2a2a' : '#f8f9fa'};color:${isDark ? '#fff' : '#212529'};border:1px solid ${isDark ? '#444' : '#ced4da'};border-radius:4px;cursor:pointer;font-size:12px;text-align:left;line-height:1.4;`;
            btn.onclick = () => { processTextSelection(ft); };
            cont.appendChild(btn);
        });
        box.appendChild(cont);

        let acBtn = document.createElement('button');
        acBtn.innerText = '+ Type New Client Name...';
        acBtn.className = 'onetrack-btn';
        acBtn.style.cssText = isDark ? 'width:100%;padding:6px;margin-bottom:8px;background:#333;color:#ccc;border:1px dashed #555;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;' : 'width:100%;padding:6px;margin-bottom:8px;background:#e9ecef;color:#333;border:1px dashed #adb5bd;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;';
        acBtn.onclick = () => {
            let nc = prompt("Enter new client name:", "");
            if (nc && nc.trim()) {
                let cleanNc = nc.trim();
                if (!map[cc]) map[cc] = [];
                if (!map[cc].includes(cleanNc)) map[cc].push(cleanNc);
                localStorage.setItem('my_preset_client_mapping', JSON.stringify(map));
                processTextSelection(`${ap} by ${cleanNc}.`);
            }
        };
        box.appendChild(acBtn);

        let configClientBtn = document.createElement('button');
        configClientBtn.innerText = '🏢 Manage Companies & Clients Sub-Menu';
        configClientBtn.className = 'onetrack-btn';
        configClientBtn.style.cssText = 'width:100%;padding:6px;margin-bottom:8px;background:#780034;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;';
        configClientBtn.onclick = () => { ov.remove(); showManageCompaniesModal(activeTheme); };
        box.appendChild(configClientBtn);

        if (!sao) {
            let sab = document.createElement('button');
            sab.innerText = '🌐 View All Clients Instead';
            sab.className = 'onetrack-btn';
            sab.style.cssText = isDark ? 'width:100%;padding:8px;margin-bottom:8px;background:#333;color:#e0e0e0;border:1px solid #555;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;' : 'width:100%;padding:8px;margin-bottom:8px;background:#f0f0f0;color:#333;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;';
            sab.onclick = () => showClientSelectModal(ap, true, activeTheme);
            box.appendChild(sab);
        }

        let bBtn = document.createElement('button');
        bBtn.innerText = '← Back';
        bBtn.className = 'onetrack-btn';
        bBtn.style.cssText = isDark ? 'width:100%;padding:8px;background:#444;color:#e0e0e0;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;' : 'width:100%;padding:8px;background:#e0e0e0;color:#333;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;';
        bBtn.onclick = () => ap.includes('declined') ? showDeclineActionModal(activeTheme) : showMainModal(activeTheme);
        box.appendChild(bBtn);

        ov.appendChild(box);
        document.body.appendChild(ov);
    }
    function processInvoiceTextToFindings(fullText) {
        let invoiceTotal = "N/A";
        let materials = [];
    
        // 1. Extract Invoice Total
        let totalMatch = fullText.match(/Invoice Total:\s*(\$[\d,]+\.\d{2}|\d+\.\d{2})/i);
        if (totalMatch) {
            invoiceTotal = totalMatch[1];
        }
    
        // 2. Extract Material Details via robust multi-line boundary matching
        let lines = fullText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        let inMaterials = false;
    
        for (let line of lines) {
            let lineUpper = line.toUpperCase();
    
            if (lineUpper.includes("MATERIAL DETAILS")) {
                inMaterials = true;
                continue;
            }
    
            // Stop collecting when reaching the next section
            if (inMaterials && (lineUpper.includes("LABOR AMOUNT") || lineUpper.includes("MISC. CHARGES") || lineUpper.includes("INVOICE TOTAL") || lineUpper.includes("INVESTIGATION FINDINGS"))) {
                inMaterials = false;
                break;
            }
    
            if (inMaterials) {
                if (lineUpper.includes("SECTION TOTAL") || lineUpper.includes("ITEM NUMBER") || lineUpper.includes("OP")) continue;
    
                let partsMatch = line.match(/\b(?:340-\d+|350-\d+|360-\d+|59933|66419|C12-\d+|C14-\d+|\d{5})\b.*?((?:REAR CASE ASSY|LENS LCD.*?|MOTOR AND WORM GEARASSEMBLY|[A-Z\s]{4,}))$/i);
                
                if (partsMatch) {
                    let desc = partsMatch[1].trim();
                    desc = desc.replace(/\b(BILLABLE|REGREPR)\b/gi, '').trim();
                    
                    if (desc.length > 3) {
                        let formattedDesc = desc.toLowerCase().replace(/(^\w{1})|(\s+\w{1})/g, l => l.toUpperCase());
                        formattedDesc = formattedDesc.replace(/\bLcd\b/g, 'LCD').replace(/\bCms\b/g, 'CMS').replace(/\bAssy\b/g, 'Assembly');
                        
                        if (!materials.includes(formattedDesc)) {
                            materials.push(formattedDesc);
                        }
                    }
                }
            }
        }
    
        // 3. Comprehensive Moog Medical Part Number Fallback Map (Curlin & Infinity Family)
        if (materials.length === 0) {
            const moogParts = {
                "340-0049": "Mech Seal",
                "340-0055": "Pump Mechanism Assembly",
                "340-0057": "Sub-Assembly w/o Motor",
                "340-0070": "Bezel with Overmold",
                "340-1003": "Rear Case Assembly",
                "350-2011": "Keypad w/o Overlay",
                "360-0016": "LCD Lens",
                "360-0022": "Battery Ejector",
                "360-1004": "Battery Door",
                "360-0091": "Battery Door",
                "360-2004-00": "PCB Assembly",
                "360-2009": "Keypad Overlay",
                "59933": "Motor & Worm Gear Assembly",
                "66419": "Front Case Sub Assembly",
                "C12-02001": "BT2",
                "C12-04002": "BT3",
                "C14-05003": "LCD Module",
                "58553": "LCD Module",
                "25771-001": "Backlight Diffuser",
                "25795-001": "LCD Display",
                "26503-001": "Battery Assembly",
                "26542-001": "Infinity II Pump Cover",
                "80786-001": "Infinity II Pump Cover",
                "27696-001": "Infinity Bottom Housing",
                "28270-001": "Infinity Motor",
                "84239": "Infinity Motor",
                "28483-001": "Rotor Assembly",
                "42611": "Canon Motor",
                "43763-101": "Infinity II PCB Assembly",
                "56717-001": "Top Housing",
                "80782-001": "Top Housing"
            };
    
            for (let [partNum, partName] of Object.entries(moogParts)) {
                if (fullText.includes(partNum) && !materials.includes(partName)) {
                    materials.push(partName);
                }
            }
        }
    
        let materialsStr = materials.length > 0 ? materials.join(", ") : "None";
    
        return (
            `Manufacturer findings, per Moog Medical the following will need replaced: ${materialsStr}.\n` +
            `The Invoice Total for this repair is ${invoiceTotal}.`
        );
    }

    let pdfLibLoadingPromise = null;
    
    async function extractTextFromPDFFile(file) {
        if (!window.pdfjsLib) {
            throw new Error("PDF.js library is not loaded. Please check Tampermonkey @require headers.");
        }
        
        // Explicitly set workerSrc to the matching CDN worker version
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        let arrayBuffer = await file.arrayBuffer();
        let loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        let pdfDoc = await loadingTask.promise;
        let fullText = '';
        
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            let page = await pdfDoc.getPage(i);
            let textContent = await page.getTextContent();
            let pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }
        return fullText;
    }
function showCurlinUploadModal(passedTheme) {
    try {
        let activeTheme = passedTheme || document.getElementById('preset-notes-modal')?.getAttribute('data-theme') || 'light';
        let isDark = activeTheme === 'dark';
        let ex = document.getElementById('preset-notes-modal');
        if (ex) ex.remove();
        
        let ov = document.createElement('div');
        ov.id = 'preset-notes-modal';
        ov.setAttribute('data-theme', activeTheme);
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:transparent;z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;pointer-events:none;';
        
        let box = document.createElement('div');
        box.className = 'onetrack-modal' + (compactMode ? ' onetrack-compact-mode' : '');
        let boxBg = isDark ? '#1e1e1e' : '#fff';
        let boxColor = isDark ? '#e0e0e0' : '#333';
        box.style.cssText = `background: ${boxBg};color: ${boxColor};padding:20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);width:420px;display:flex;flex-direction:column;position:relative;pointer-events:auto;`;
        
        applyUIScale(box);
        applySavedPosition(box);
        applySavedScale(box);
        
        let h = document.createElement('h3');
        h.innerText = 'Moog Invoice Text Import';
        h.style.cssText = `margin-top:0;margin-bottom:12px;font-size:16px;color: ${isDark ? '#fff' : '#222'};text-align:center;cursor:move;`;
        makeDraggable(box, h);
        box.appendChild(h);

        let dropZone = document.createElement('div');
        dropZone.style.cssText = `border: 2px dashed ${isDark ? '#555' : '#ccc'}; border-radius: 6px; padding: 24px; text-align: center; margin-bottom: 12px; background: ${isDark ? '#252525' : '#fafafa'}; color: ${isDark ? '#aaa' : '#666'}; font-size: 12px; cursor: pointer;`;
        dropZone.innerHTML = '<b>Drag & Drop Invoice PDF or Text data here</b><br><span style="font-size:10px;opacity:0.8;">or paste invoice text below</span>';
        
        // Explicitly block default actions on both dragover and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    
        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            let dt = e.dataTransfer;
            let files = dt.files;
            if (files && files.length > 0) {
                let file = files[0];
                if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                    dropZone.innerHTML = '<b>Reading PDF file... Please wait.</b>';
                    try {
                        if (!window.pdfjsLib) {
                            await new Promise((resolve, reject) => {
                                let script = document.createElement('script');
                                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                                script.onload = () => {
                                    if (window.pdfjsLib) {
                                        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                                        resolve();
                                    } else {
                                        reject(new Error("pdfjsLib failed to initialize"));
                                    }
                                };
                                script.onerror = reject;
                                document.head.appendChild(script);
                            });
                        }
                        let extractedText = await extractTextFromPDFFile(file);
                        textArea.value = extractedText;
                        dropZone.innerHTML = '<b>✓ PDF Loaded Successfully!</b><br><span style="font-size:10px;opacity:0.8;">Review text below or click process.</span>';
                    } catch (err) {
                        console.error("PDF extraction error:", err);
                        dropZone.innerHTML = '<b>❌ Error reading PDF file.</b><br><span style="font-size:10px;color:#dc3545;">Try pasting text manually below.</span>';
                    }
                } else {
                    let reader = new FileReader();
                    reader.onload = function(evt) {
                        textArea.value = evt.target.result;
                        dropZone.innerHTML = '<b>✓ Text File Loaded!</b>';
                    };
                    reader.readAsText(file);
                }
            }
        });
    
        box.appendChild(dropZone);

        let textArea = document.createElement('textarea');
        textArea.placeholder = 'Or paste invoice text content here...';
        textArea.style.cssText = `width: 100%; height: 120px; padding: 8px; box-sizing: border-box; border: 1px solid ${isDark ? '#444' : '#ccc'}; border-radius: 4px; background: ${isDark ? '#2a2a2a' : '#fff'}; color: ${isDark ? '#fff' : '#000'}; font-size: 11px; font-family: monospace; margin-bottom: 12px; resize: vertical;`;
        box.appendChild(textArea);

        let submitBtn = document.createElement('button');
        submitBtn.innerText = 'Process & Copy Findings';
        submitBtn.className = 'onetrack-btn';
        submitBtn.style.cssText = 'width:100%;padding:8px;background:#2b542c;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;margin-bottom:6px;';
        submitBtn.onclick = () => {
            let rawText = textArea.value.trim();
            if (!rawText) {
                alert('Please paste or provide invoice text first.');
                return;
            }
            let result = processInvoiceTextToFindings(rawText);
            addHistoryItem(result);
            processTextSelection(result);
            ov.remove();
        };
        box.appendChild(submitBtn);

        let buttonRow = document.createElement('div');
        buttonRow.style.cssText = 'display:flex;gap:6px;width:100%;';

        let backBtn = document.createElement('button');
        backBtn.innerText = '← Back';
        backBtn.className = 'onetrack-btn';
        backBtn.style.cssText = 'flex:1;padding:8px;background:#f1f3f5;color:#333;border:1px solid #ced4da;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;';
        backBtn.onclick = () => {
            ov.remove();
            showMainModal(activeTheme);
        };
        buttonRow.appendChild(backBtn);

        let closeBtn = document.createElement('button');
        closeBtn.innerText = 'Cancel';
        closeBtn.className = 'onetrack-btn';
        closeBtn.style.cssText = 'flex:1;padding:8px;background:#6c757d;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;';
        closeBtn.onclick = () => ov.remove();
        buttonRow.appendChild(closeBtn);

        box.appendChild(buttonRow);
        ov.appendChild(box);
        document.body.appendChild(ov);
    } catch (e) {
        console.error("CRITICAL ERROR inside showCurlinUploadModal:", e);
    }
}
    function showInfinityPartsModal(passedTheme) {
        let activeTheme = passedTheme || document.getElementById('preset-notes-modal')?.getAttribute('data-theme') || 'light';
        let isDark = activeTheme === 'dark';
    
        let ex = document.getElementById('preset-notes-modal');
        if (ex) ex.remove();
    
        let ov = document.createElement('div');
        ov.id = 'preset-notes-modal';
        ov.setAttribute('data-theme', activeTheme);
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:transparent;z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;pointer-events:none;';
    
        let box = document.createElement('div');
        box.className = 'onetrack-modal' + (compactMode ? ' onetrack-compact-mode' : '');
        let boxBg = isDark ? '#1e1e1e' : '#fff';
        let boxColor = isDark ? '#e0e0e0' : '#333';
        box.style.cssText = `background:${boxBg};color:${boxColor};padding:20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);width:460px;display:flex;flex-direction:column;position:relative;pointer-events:auto;`;
        
        applyUIScale(box);
        applySavedPosition(box);
        applySavedScale(box);
    
        let h = document.createElement('h3');
        h.innerText = 'Select OEM Replaced Parts';
        h.style.cssText = `margin-top:0;margin-bottom:12px;font-size:16px;color:${isDark ? '#fff' : '#222'};text-align:center;cursor:move;`;
        makeDraggable(box, h);
        box.appendChild(h);
    
        let listContainer = document.createElement('div');
        listContainer.style.cssText = 'max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;margin-bottom:12px;padding-right:4px;';
    
        let parts = [
            '25771-001 Backlight Difuser', '25795-001 LCD Display', 
            '26503-001 Battery Assembly', '26542-001/80786-001 Infinity II Pump Cover', 
            '27696-001 Infinity Bottom Housing', '28270-001/84239 Infinity Motor', 
            '28483-001 Rotor Assembly', '42611 Canon Motor', 
            '43763-101 Infinity II PCB Assembly', '56717-001/80782-001 Top Housing'
        ];
        
        let selectedItems = new Set();
    
        parts.forEach(part => {
            let spaceIndex = part.indexOf(' ');
            let partNum = part.substring(0, spaceIndex);
            let partName = part.substring(spaceIndex + 1);
    
            let itemBox = document.createElement('div');
            itemBox.className = 'onetrack-btn';
            
            let baseBg = isDark ? '#2a2a2a' : '#f8f9fa';
            let baseBorder = isDark ? '#444' : '#dee2e6';
            let baseColor = isDark ? '#ccc' : '#495057';
    
            itemBox.style.cssText = `display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:${baseBg};border:1px solid ${baseBorder};border-radius:4px;cursor:pointer;font-size:11px;transition:all 0.15s ease;`;
    
            let numSpan = document.createElement('span');
            numSpan.innerText = partNum;
            numSpan.style.cssText = `font-weight:bold;color:${isDark ? '#fff' : '#212529'};font-family:monospace;`;
    
            let nameSpan = document.createElement('span');
            nameSpan.innerText = partName;
            nameSpan.style.cssText = `color:${baseColor};text-align:right;max-width:60%;`;
    
            itemBox.appendChild(numSpan);
            itemBox.appendChild(nameSpan);
    
            itemBox.onclick = () => {
                if (selectedItems.has(part)) {
                    selectedItems.delete(part);
                    itemBox.style.background = baseBg;
                    itemBox.style.borderColor = baseBorder;
                    itemBox.style.color = baseColor;
                } else {
                    selectedItems.add(part);
                    itemBox.style.background = isDark ? '#0d3b66' : '#e7f5ff';
                    itemBox.style.borderColor = '#0366d6';
                }
            };
    
            listContainer.appendChild(itemBox);
        });
    
        box.appendChild(listContainer);
    
        let btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';
    
        let cancelBtn = document.createElement('button');
        cancelBtn.innerText = 'Cancel';
        cancelBtn.className = 'onetrack-btn';
        cancelBtn.style.cssText = isDark ? 'padding:8px 14px;background:#444;color:#e0e0e0;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;' : 'padding:8px 14px;background:#e0e0e0;color:#333;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;';
        cancelBtn.onclick = () => {
            ov.remove();
            showMainModal(activeTheme);
        };
    
        let okBtn = document.createElement('button');
        okBtn.innerText = 'OK';
        okBtn.className = 'onetrack-btn';
        okBtn.style.cssText = 'padding:8px 16px;background:#0366d6;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;';
        okBtn.onclick = () => {
            let selectedArray = Array.from(selectedItems);
            if (selectedArray.length > 0) {
                let cleanNames = selectedArray.map(p => {
                    let spIdx = p.indexOf(' ');
                    return spIdx !== -1 ? p.substring(spIdx + 1) : p;
                });
                let partsString = cleanNames.join(', ');
                let resultText = `Per Moog Medical the following has been replaced: ${partsString}. The device has met the release criteria associated with the inline inspection, testing and final release elements.`;
                addHistoryItem(resultText);
                processTextSelection(resultText);
            }
            ov.remove();
        };
    
        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(okBtn);
        box.appendChild(btnRow);
        ov.appendChild(box);
        document.body.appendChild(ov);
    }
    function showSolisPartsModal(passedTheme) {
        let activeTheme = passedTheme || document.getElementById('preset-notes-modal')?.getAttribute('data-theme') || 'light';
        let isDark = activeTheme === 'dark';
        
        let ex = document.getElementById('preset-notes-modal');
        if (ex) ex.remove();
    
        let ov = document.createElement('div');
        ov.id = 'preset-notes-modal';
        ov.setAttribute('data-theme', activeTheme);
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:transparent;z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;pointer-events:none;';
    
        let box = document.createElement('div');
        box.className = 'onetrack-modal' + (typeof compactMode !== 'undefined' && compactMode ? ' onetrack-compact-mode' : '');
        let boxBg = isDark ? '#1e1e1e' : '#fff';
        let boxColor = isDark ? '#e0e0e0' : '#333';
        box.style.cssText = `background:${boxBg};color:${boxColor};padding:20px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.25);width:600px;display:flex;flex-direction:column;position:relative;pointer-events:auto;max-height:90vh;`;
        
        if (typeof applyUIScale === 'function') applyUIScale(box);
        if (typeof applySavedPosition === 'function') applySavedPosition(box);
        if (typeof applySavedScale === 'function') applySavedScale(box);
    
        let h = document.createElement('h3');
        h.innerText = 'Select Solis OEM Replaced Parts & Scanner';
        h.style.cssText = `margin-top:0;margin-bottom:12px;font-size:16px;color:${isDark ? '#fff' : '#222'};text-align:center;cursor:move;`;
        if (typeof makeDraggable === 'function') makeDraggable(box, h);
        box.appendChild(h);
    
        // --- WEBCAM SCANNER SECTION ---
        let scanToggleBtn = document.createElement('button');
        scanToggleBtn.innerText = '📷 Open Webcam Document Scanner';
        scanToggleBtn.className = 'onetrack-btn';
        scanToggleBtn.style.cssText = 'width:100%;padding:6px;background:#17a2b8;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;margin-bottom:8px;';
        box.appendChild(scanToggleBtn);
    
        let webcamContainer = document.createElement('div');
        webcamContainer.style.cssText = 'display:none;flex-direction:column;align-items:center;gap:6px;margin-bottom:10px;background:rgba(0,0,0,0.05);padding:8px;border-radius:4px;';
        
        let videoElement = document.createElement('video');
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.style.cssText = 'width:100%;max-height:180px;background:#000;border-radius:4px;object-fit:cover;';
        webcamContainer.appendChild(videoElement);
    
        let captureBtn = document.createElement('button');
        captureBtn.innerText = '📸 Snap & Extract Text';
        captureBtn.className = 'onetrack-btn';
        captureBtn.style.cssText = 'padding:6px 12px;background:#28a745;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;';
        webcamContainer.appendChild(captureBtn);
    
        let mediaStream = null;
        scanToggleBtn.onclick = async () => {
            if (webcamContainer.style.display === 'flex') {
                if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
                webcamContainer.style.display = 'none';
                scanToggleBtn.innerText = '📷 Open Webcam Document Scanner';
            } else {
                try {
                    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                    videoElement.srcObject = mediaStream;
                    webcamContainer.style.display = 'flex';
                    scanToggleBtn.innerText = '❌ Close Webcam Scanner';
                } catch (err) {
                    alert('Unable to access webcam. Please check camera permissions.');
                }
            }
        };
    
        captureBtn.onclick = () => {
            let canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth || 640;
            canvas.height = videoElement.videoHeight || 480;
            let ctx = canvas.getContext('2d');
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            
            // Stop stream
            if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
            webcamContainer.style.display = 'none';
            scanToggleBtn.innerText = '📷 Open Webcam Document Scanner';
    
            // Simulate lightweight extraction or trigger text parsing via canvas snapshot data URL
            // (If using Tesseract or backend parsing, process canvas.toDataURL('image/png') here)
            alert('Snapshot captured successfully! (Connect your parser or OCR script here to auto-populate part fields).');
        };
        box.appendChild(webcamContainer);
    
        // --- STANDARD PARTS INVENTORY LIST & CONTROLS ---
        let defaultParts = [
            { num: '30-3285', name: 'ADHESIVE, PSA, PIEZO RING, CADD-SOLIS 1/EA' },
            { num: '70-0354', name: 'AIR DETECTOR, SOLIS' },
            { num: '70-0446', name: 'AY, 27MM PIEZO SOUNDER, FRONT' },
            { num: '70-0447', name: 'AY, 27MM PIEZO SOUNDER, REAR' },
            { num: '67-2341', name: 'AY, USO, CADD-SOLIS 1/EA' },
            { num: '60013', name: 'BEARING, CAMSHAFT' },
            { num: '30-3028', name: 'BEARING, CAMSHAFT, .375" OD X 0.187" ID, CADD-SOLIS 1/EA' },
            { num: '', name: 'BEZEL, CASSETTE DETECTION' },
            { num: '30-3052', name: 'BEZEL, DSO, CADD-SOLIS' },
            { num: '30-3130', name: 'BRACKET, OPTICAL SWITCH, CADD-SOLIS' },
            { num: '31-0485', name: 'CAMSHAFT, 3 LOBE, DUAL ACTIVATION' },
            { num: '10018270-001', name: 'CONNECTOR, LEMO HALF MOON INSERT (NUT FIXING) FIXED RECEPTACLE, CADD - SOLIS' },
            { num: '70-0227', name: 'CONTACT, BATTERY COMPARTMENT FLOOR' },
            { num: '70-0178', name: 'CONTACT, BATTERY, SPRING PIN, CADD-SOLIS' },
            { num: '30-3053', name: 'DISK, OPTICAL, DUAL FLAG, CADD-SOLIS' },
            { num: '70-0508', name: 'DISPLAY, LCD, TRULY/HIMAX, 320 X 320 W/BACKLIGHT, CADD-SOLIS' },
            { num: '30-3245', name: 'DOOR AY, BATTERY, PUMP' },
            { num: '10022627-001', name: 'DOOR AY, BATTERY, PUMP (Do Not Use)' },
            { num: '30-3086-001', name: 'EXPULSOR, MACHINED, .344"' },
            { num: '70-0243', name: 'FLEX AY, CAM SENSOR' },
            { num: '70-0303', name: 'FLEX AY, LED, CADD-SOLIS' },
            { num: '70-0335', name: 'FLEX CIRCUIT, SENSOR, L/L' },
            { num: '30-3181', name: 'FOAM, ISOLATION, LCD' },
            { num: '', name: 'FOAM, POSITIONING, LCD' },
            { num: '30-3174', name: 'GASKET, CONDUCTIVE, BAT COMP' },
            { num: '30-3173', name: 'GASKET, CONDUCTIVE, CHASSIS' },
            { num: '', name: 'GASKET, CONDUCTIVE, COPPER, RIGHT' },
            { num: '', name: 'GASKET, CONDUCTIVE, LCD, FRAMING' },
            { num: '', name: 'GASKET, CONDUCTIVE, LCD, TOP' },
            { num: '30-3289', name: 'GASKET, ENVIRONMENTAL, BATTERY COMPARTMENT' },
            { num: '30-3171', name: 'GASKET, ENVIRONMENTAL, CHASSIS' },
            { num: '30-3167', name: 'GASKET, ENVIRONMENTAL, POWER BOARD' },
            { num: '', name: 'GASKET, PERIMETER, EMC' },
            { num: '30-3288', name: 'GASKET, PSA, LENS, CADD-SOLIS' },
            { num: '', name: 'GASKET, TUBING, SILICON HOUSING' },
            { num: '60003', name: 'GEAR, FLAT' },
            { num: '60002', name: 'GEAR, HUB (FASTENS TO MOTOR)' },
            { num: '10009592', name: 'GEARMOTOR, PLANETARY, 12V, 16MM' },
            { num: '30-3299', name: 'GUARD, PIEZO ALARM' },
            { num: '30-4106', name: 'HANDLE, LATCH LEVER, CADD-SOLIS' },
            { num: '70-0216', name: 'HARNESS, WIRE, ON/OFF SWITCH' },
            { num: '30-3248', name: 'HSG, BATTERY COMPARTMENT' },
            { num: '', name: 'HSG, PUMP, FRONT, SHLD' },
            { num: '', name: 'HSG, PUMP, REAR SHLD' },
            { num: '30-3106', name: 'INSULATOR, KAPTON, CADD-SOLIS' },
            { num: '30-3322', name: 'INSULATOR, PWA/HOUSING' },
            { num: '30-4065', name: 'INSULATOR, USB' },
            { num: '70-0229', name: 'KEYPAD, MEMBRANE SW, W/O CONN, CADD-SOLIS' },
            { num: '10011174-001', name: 'LABEL, PUMP, REAR, CADD-SOLIS VIP' },
            { num: '67-2482', name: 'LATCH/LOCK' },
            { num: '10017410-001', name: 'LBL, DEVICE, PUMP, CADD-SOLIS, MODEL 2120, VIP, 3RD EDITION w cUL, BLUE, RX ONLY' },
            { num: '10017409-001', name: 'LBL, DEVICE, PUMP, CADD-SOLIS, MODEL 2120, VIP, 3RD EDITION w cUL, DRK GREY, RX ONLY' },
            { num: '10006271-002', name: 'LBL, DEVICE, PUMP, CADD-SOLIS, VIP' },
            { num: '10012921-001', name: 'LBL, DEVICE, PUMP, CADD-SOLIS, VIP, BLACK' },
            { num: '10013249-001', name: 'LBL, DEVICE, PUMP, CADD-SOLIS, VIP, BLUE' },
            { num: '40-6288-24A', name: 'LBL, SET, DEVICE, CADD-SOLIS' },
            { num: '40-5733-51A', name: 'LENS, PAD PRINTED, CADD-SOLIS' },
            { num: '', name: 'NLT - HEADER, IDC, 5 POS' },
            { num: '40-5482-51A', name: 'OVERLAY, MEMBRANE SWITCH, CE ENGLISH' },
            { num: '30-4205', name: 'PAD, GND, L/L SENSOR' },
            { num: '10015258-001', name: 'PCBA, CADD-SOLIS, TRULY/HIMAX LCD, FLASH MEMORY UPGRADE' },
            { num: '', name: 'PIN, CASSETTE DETECTOR' },
            { num: '30-4086', name: 'PLATE, AY, GROUNDING' },
            { num: '', name: 'SEAL, DIAPHRAGM, CASSETTE SENSOR' },
            { num: '30-3381', name: 'SEAL, DSO, NEOPRENE' },
            { num: '', name: 'SEAL, FOAM, CADD-SOLIS' },
            { num: '31-0993', name: 'SEAL, UPSTREAM OCCLUSION' },
            { num: '70-0171', name: 'SENSOR, DSO, CADD-SOLIS' },
            { num: '30-4712', name: 'SOLIS, CHASSIS, MACHINED 1/EA' },
            { num: '30-3294', name: 'STABILIZER, BATTERY, SST' },
            { num: '', name: 'STRIP, ADHESIVE, UPPER' },
            { num: '30-3163', name: 'SWITCH, POWER' },
            { num: '', name: 'TAB, LCD INSTALLATION' },
            { num: '', name: 'TAPE, ADHESIVE, PIEZO GUARD' },
            { num: '30-3306', name: 'TAPE, LCD HOLD DOWN' },
            { num: '40-4085', name: 'TAPE, POGO CONTACT' },
            { num: '30-3063', name: 'VALVE, DUAL ACTIVATION, CADD-SOLIS' }
        ];
    
        let storedPartsJson = localStorage.getItem('solis_custom_parts_list');
        let partsList = storedPartsJson ? JSON.parse(storedPartsJson) : defaultParts;
    
        let selectedItems = new Set();
        let usageCounts = JSON.parse(localStorage.getItem('solis_parts_usage') || '{}');
    
        let controlRow = document.createElement('div');
        controlRow.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center;';
    
        let searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = '🔍 Search part name or #...';
        searchInput.style.cssText = `flex:1;padding:6px 8px;background:${isDark ? '#2a2a2a' : '#fff'};color:${boxColor};border:1px solid ${isDark ? '#444' : '#ccc'};border-radius:4px;font-size:11px;`;
    
        let sortSelect = document.createElement('select');
        sortSelect.style.cssText = `background:${isDark ? '#2a2a2a' : '#fff'};color:${boxColor};border:1px solid ${isDark ? '#444' : '#ccc'};border-radius:4px;padding:6px;font-size:11px;cursor:pointer;`;
        
        let optAlpha = document.createElement('option');
        optAlpha.value = 'alpha';
        optAlpha.innerText = 'Alphabetical';
        
        let optRecent = document.createElement('option');
        optRecent.value = 'recent';
        optRecent.innerText = 'Most Recently Used';
        
        sortSelect.appendChild(optAlpha);
        sortSelect.appendChild(optRecent);
        sortSelect.value = localStorage.getItem('solis_parts_sort_pref') || 'alpha';
    
        controlRow.appendChild(searchInput);
        controlRow.appendChild(sortSelect);
        box.appendChild(controlRow);
    
        let listContainer = document.createElement('div');
        listContainer.style.cssText = 'max-height:160px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;margin-bottom:10px;padding-right:4px;';
    
        function renderList() {
            listContainer.innerHTML = '';
            let query = searchInput.value.toLowerCase();
            let filtered = partsList.filter(p => p.name.toLowerCase().includes(query) || p.num.toLowerCase().includes(query));
    
            if (sortSelect.value === 'alpha') {
                filtered.sort((a, b) => a.name.localeCompare(b.name));
            } else {
                filtered.sort((a, b) => (usageCounts[b.name] || 0) - (usageCounts[a.name] || 0));
            }
    
            filtered.forEach((partObj) => {
                let itemBox = document.createElement('div');
                let baseBg = isDark ? '#2a2a2a' : '#f8f9fa';
                let baseBorder = isDark ? '#444' : '#dee2e6';
                let isSelected = selectedItems.has(partObj.name);
    
                itemBox.style.cssText = `display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:${isSelected ? (isDark ? '#0d3b66' : '#e7f5ff') : baseBg};border:1px solid ${isSelected ? '#0366d6' : baseBorder};border-radius:4px;font-size:11px;`;
    
                let leftInfo = document.createElement('div');
                leftInfo.style.cssText = 'display:flex;align-items:center;gap:8px;flex:1;cursor:pointer;';
    
                let checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = isSelected;
    
                let nameSpan = document.createElement('span');
                nameSpan.innerText = partObj.name;
                nameSpan.style.cssText = `color:${isDark ? '#e0e0e0' : '#212529'};font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
    
                leftInfo.appendChild(checkbox);
                leftInfo.appendChild(nameSpan);
    
                let rightInfo = document.createElement('div');
                rightInfo.style.cssText = 'display:flex;align-items:center;gap:6px;';
                let numSpan = document.createElement('span');
                numSpan.innerText = partObj.num || '';
                numSpan.style.cssText = `font-family:monospace;font-size:10px;color:${isDark ? '#aaa' : '#666'};`;
                rightInfo.appendChild(numSpan);
    
                const toggle = () => {
                    if (selectedItems.has(partObj.name)) {
                        selectedItems.delete(partObj.name);
                        checkbox.checked = false;
                    } else {
                        selectedItems.add(partObj.name);
                        checkbox.checked = true;
                    }
                };
                leftInfo.onclick = toggle;
                checkbox.onclick = (e) => { e.stopPropagation(); toggle(); };
    
                itemBox.appendChild(leftInfo);
                itemBox.appendChild(rightInfo);
                listContainer.appendChild(itemBox);
            });
        }
    
        searchInput.oninput = renderList;
        sortSelect.onchange = () => {
            localStorage.setItem('solis_parts_sort_pref', sortSelect.value);
            renderList();
        };
        renderList();
        box.appendChild(listContainer);
    
        // Sentence Template Box
        let sentenceLabel = document.createElement('label');
        sentenceLabel.innerText = 'Customizable OEM Sentence Structure (Use [PARTS]):';
        sentenceLabel.style.cssText = `font-size:10px;font-weight:bold;color:${isDark ? '#aaa' : '#555'};margin-bottom:4px;display:block;`;
        box.appendChild(sentenceLabel);
    
        let defaultTemplate = "Per the OEM, the following parts have been replaced: [PARTS] and passed the related testing. The OEM also certifies that the device passes the following: Visual Inspection, Pump Power Up Test, Motor Test, Remote Dose Test, Keypad Test, Latch Lock Test, Disposable Test, Air Detector Test, Verify Air Detector Height, LCD Screen Inspection, Amber Green and LED Functional Test, Adjust LCD POT Screen, Downstream Occlusion Test, Upstream Occlusion Sensor Test, Battery Fallout Test, 50ml Cassette Test, Go_No_Go Test, and Delivery Accuracy Test 20mL";
        let sentenceTextarea = document.createElement('textarea');
        sentenceTextarea.value = localStorage.getItem('solis_oem_sentence_template') || defaultTemplate;
        sentenceTextarea.style.cssText = `width:100%;height:55px;padding:6px;box-sizing:border-box;border:1px solid ${isDark ? '#444' : '#ccc'};border-radius:4px;background:${isDark ? '#2a2a2a' : '#fff'};color:${boxColor};font-size:11px;resize:vertical;font-family:inherit;margin-bottom:10px;`;
        
        sentenceTextarea.oninput = () => localStorage.setItem('solis_oem_sentence_template', sentenceTextarea.value);
        box.appendChild(sentenceTextarea);
    
        // Buttons
        let btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';
    
        let cancelBtn = document.createElement('button');
        cancelBtn.innerText = 'Cancel';
        cancelBtn.style.cssText = 'padding:8px 12px;background:#dc3545;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;';
        cancelBtn.onclick = () => ov.remove();
    
        let backBtn = document.createElement('button');
        backBtn.innerText = '← Back';
        backBtn.style.cssText = 'padding:8px 12px;background:#6c757d;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;';
        backBtn.onclick = () => { ov.remove(); if (typeof showMainModal === 'function') showMainModal(activeTheme); };
    
        let confirmBtn = document.createElement('button');
        confirmBtn.innerText = 'Confirm Selection';
        confirmBtn.style.cssText = 'padding:8px 16px;background:#28a745;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;';
        
        confirmBtn.onclick = () => {
            let arr = Array.from(selectedItems);
            if (arr.length > 0) {
                let now = Date.now();
                arr.forEach(p => { usageCounts[p] = now; });
                localStorage.setItem('solis_parts_usage', JSON.stringify(usageCounts));
            }
    
            let partsString = arr.length > 0 ? arr.join(', ') : 'None';
            let template = sentenceTextarea.value.trim() || defaultTemplate;
            let summaryText = template.replace(/[PARTS]/gi, partsString);
            
            ov.remove();
            if (typeof addHistoryItem === 'function') addHistoryItem(summaryText);
            if (typeof processTextSelection === 'function') processTextSelection(summaryText);
        };
    
        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(backBtn);
        btnRow.appendChild(confirmBtn);
        box.appendChild(btnRow);
        ov.appendChild(box);
        document.body.appendChild(ov);
    }
    // --- NEW: COLLAPSIBLE COMPANY / CLIENT MAPPING SUB-MENU ---
    function showManageCompaniesModal(passedTheme) {
        let map = getClientMapping();
        let activeTheme = passedTheme || document.getElementById('preset-notes-modal')?.getAttribute('data-theme') || 'light';
        let isDark = activeTheme === 'dark';

        let ex = document.getElementById('preset-notes-modal');
        if (ex) ex.remove();

        let ov = document.createElement('div');
        ov.id = 'preset-notes-modal';
        ov.setAttribute('data-theme', activeTheme);
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:transparent;z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;pointer-events:none;';

        let box = document.createElement('div');
        box.className = 'onetrack-modal' + (compactMode ? ' onetrack-compact-mode' : '');
        let boxBg = isDark ? '#1e1e1e' : '#fff';
        let boxColor = isDark ? '#e0e0e0' : '#333';
        box.style.cssText = `background:${boxBg};color:${boxColor};padding:20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);width:480px;max-height:85vh;display:flex;flex-direction:column;position:relative;pointer-events:auto;`;
        applyUIScale(box);
        applySavedPosition(box);
        applySavedScale(box);

        let titleRow = document.createElement('div');
        titleRow.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;cursor:move;";
        let title = document.createElement('h3');
        title.innerText = "🏢 Manage Companies & Clients";
        title.style.cssText = `margin:0;color:${isDark ? '#ffffff' : '#333'};font-size:15px;`;
        titleRow.appendChild(title);
        makeDraggable(box, titleRow);
        box.appendChild(titleRow);

        let sa = document.createElement('div');
        sa.style.cssText = "flex-grow:1;overflow-y:auto;margin-bottom:12px;padding-right:5px;max-height:380px;";

        function renderCompanyAccordion() {
            sa.innerHTML = '';
            Object.keys(map).sort((a,b) => a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)).forEach(comp => {
                let compWrap = document.createElement('div');
                let cardBg = isDark ? '#252525' : '#fdfdfd';
                let cardBorder = isDark ? '#444' : '#e0e0e0';
                compWrap.style.cssText = `border:1px solid ${cardBorder};border-radius:4px;margin-bottom:8px;background:${cardBg};overflow:hidden;`;

                // Accordion Header Bar
                let headerBar = document.createElement('div');
                headerBar.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:8px 10px;cursor:pointer;user-select:none;background:" + (isDark ? '#2d2d2d' : '#f1f3f5');
                
                let titleLeft = document.createElement('div');
                titleLeft.style.cssText = "display:flex;align-items:center;gap:6px;font-weight:bold;font-size:12px;color:" + (isDark ? '#ff99bb' : '#780034');
                let countClients = Array.isArray(map[comp]) ? map[comp].length : 0;
                titleLeft.innerText = `▶ ${comp} (${countClients} clients)`;
                headerBar.appendChild(titleLeft);

                let delCompBtn = document.createElement('button');
                delCompBtn.innerText = "🗑️";
                delCompBtn.className = 'onetrack-btn';
                delCompBtn.style.cssText = "background:#d9534f;color:#fff;border:none;padding:2px 6px;border-radius:3px;cursor:pointer;font-size:10px;";
                delCompBtn.title = "Delete Company";
                delCompBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm(`Delete company "${comp}"?`)) {
                        delete map[comp];
                        renderCompanyAccordion();
                    }
                };
                headerBar.appendChild(delCompBtn);

                // Collapsible Content Drawer
                let contentDrawer = document.createElement('div');
                contentDrawer.style.cssText = "padding:8px 10px;display:none;border-top:1px solid " + cardBorder + ";";

                let isExpanded = false;
                headerBar.onclick = () => {
                    isExpanded = !isExpanded;
                    contentDrawer.style.display = isExpanded ? 'block' : 'none';
                    titleLeft.innerText = `${isExpanded ? '▼' : '▶'} ${comp} (${countClients} clients)`;
                };

                if (!Array.isArray(map[comp])) map[comp] = [];
                map[comp].forEach((cn, ci) => {
                    let r = document.createElement('div');
                    r.style.cssText = "display:flex;gap:6px;margin-bottom:4px;align-items:center;";
                    let ci2 = document.createElement('input');
                    ci2.type = 'text';
                    ci2.value = cn;
                    ci2.style.cssText = `flex-grow:1;padding:4px;border:1px solid ${isDark ? '#555' : '#ccc'};border-radius:3px;font-size:11px;background:${isDark ? '#333' : '#fff'};color:${isDark ? '#fff' : '#000'};`;
                    ci2.onchange = (e) => map[comp][ci] = e.target.value.trim();
                    r.appendChild(ci2);

                    let cd = document.createElement('button');
                    cd.innerText = "X";
                    cd.className = 'onetrack-btn';
                    cd.style.cssText = "background:#6c757d;color:#fff;border:none;padding:3px 6px;border-radius:3px;cursor:pointer;font-size:10px;font-weight:bold;";
                    cd.onclick = () => {
                        map[comp].splice(ci, 1);
                        countClients = map[comp].length;
                        renderCompanyAccordion();
                    };
                    r.appendChild(cd);
                    contentDrawer.appendChild(r);
                });

                let acb = document.createElement('button');
                acb.innerText = `+ Add Client to ${comp}`;
                acb.className = 'onetrack-btn';
                acb.style.cssText = isDark ? 
                    "background:#333;color:#e0e0e0;border:1px solid #555;padding:4px;border-radius:3px;cursor:pointer;font-size:11px;width:100%;margin-top:4px;" :
                    "background:#f9f9f9;color:#333;border:1px solid #ccc;padding:4px;border-radius:3px;cursor:pointer;font-size:11px;width:100%;margin-top:4px;";
                acb.onclick = () => {
                    map[comp].push("New Client");
                    renderCompanyAccordion();
                };
                contentDrawer.appendChild(acb);

                compWrap.appendChild(headerBar);
                compWrap.appendChild(contentDrawer);
                sa.appendChild(compWrap);
            });
        }
        renderCompanyAccordion();
        box.appendChild(sa);

        let addCompBtn = document.createElement('button');
        addCompBtn.innerText = "+ Add New Company";
        addCompBtn.className = 'onetrack-btn';
        addCompBtn.style.cssText = "background:#28a745;color:#fff;border:none;padding:6px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:11px;width:100%;margin-bottom:8px;";
        addCompBtn.onclick = () => {
            let nc = prompt("Enter new company name:", "");
            if (nc && nc.trim()) {
                let cleanNc = nc.trim();
                if (!map[cleanNc]) map[cleanNc] = [];
                renderCompanyAccordion();
            }
        };
        box.appendChild(addCompBtn);

        let btnRow = document.createElement('div');
        btnRow.style.cssText = "display:flex;gap:8px;";

        let sv = document.createElement('button');
        sv.innerText = "Save & Apply Mapping";
        sv.className = 'onetrack-btn';
        sv.style.cssText = "flex:1;padding:8px;background:#28a745;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;";
        sv.onclick = () => {
            localStorage.setItem('my_preset_client_mapping', JSON.stringify(map));
            ov.remove();
            showEditModal(activeTheme);
        };
        btnRow.appendChild(sv);

        let clBtn = document.createElement('button');
        clBtn.innerText = "← Back to Device Edit";
        clBtn.className = 'onetrack-btn';
        clBtn.style.cssText = isDark ? "flex:1;padding:8px;background:#444;color:#e0e0e0;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;" : "flex:1;padding:8px;background:#e0e0e0;color:#333;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;";
        clBtn.onclick = () => { ov.remove(); showEditModal(activeTheme); };
        btnRow.appendChild(clBtn);

        box.appendChild(btnRow);
        ov.appendChild(box);
        document.body.appendChild(ov);
    }

    // --- NEW: DEDICATED GLOBAL PHRASES EDITOR SUB-MENU ---
    function showManageGlobalPhrasesModal(passedTheme) {
        let gp = getGlobalPhrases();
        let activeTheme = passedTheme || document.getElementById('preset-notes-modal')?.getAttribute('data-theme') || 'light';
        let isDark = activeTheme === 'dark';

        let ex = document.getElementById('preset-notes-modal');
        if (ex) ex.remove();

        let ov = document.createElement('div');
        ov.id = 'preset-notes-modal';
        ov.setAttribute('data-theme', activeTheme);
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:transparent;z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;pointer-events:none;';

        let box = document.createElement('div');
        box.className = 'onetrack-modal' + (compactMode ? ' onetrack-compact-mode' : '');
        let boxBg = isDark ? '#1e1e1e' : '#fff';
        let boxColor = isDark ? '#e0e0e0' : '#333';
        box.style.cssText = `background:${boxBg};color:${boxColor};padding:20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);width:480px;max-height:85vh;display:flex;flex-direction:column;position:relative;pointer-events:auto;`;
        applyUIScale(box);
        applySavedPosition(box);
        applySavedScale(box);

        let titleRow = document.createElement('div');
        titleRow.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;cursor:move;";
        let title = document.createElement('h3');
        title.innerText = "💬 Edit Global Common Phrases";
        title.style.cssText = `margin:0;color:${isDark ? '#ffffff' : '#333'};font-size:15px;`;
        titleRow.appendChild(title);
        makeDraggable(box, titleRow);
        box.appendChild(titleRow);

        let sa = document.createElement('div');
        sa.style.cssText = "flex-grow:1;overflow-y:auto;margin-bottom:12px;padding-right:5px;max-height:360px;";

        let desc = document.createElement('p');
        desc.innerText = "These phrases appear automatically across all device types and unknown devices:";
        desc.style.cssText = "font-size:11px;color:" + (isDark ? '#aaa' : '#666') + ";margin-top:0;margin-bottom:8px;";
        sa.appendChild(desc);

        let nc = document.createElement('div');
        nc.style.cssText = `border:1px solid ${isDark ? '#444' : '#ddd'};padding:8px;border-radius:4px;background:${isDark ? '#2a2a2a' : '#fdfdfd'};margin-bottom:8px;`;

        function renderPhrasesList() {
            nc.innerHTML = '';
            if (gp.length === 0) {
                let em = document.createElement('div');
                em.innerText = "No global common phrases defined.";
                em.style.cssText = "font-size:11px;color:#888;font-style:italic;padding:4px;";
                nc.appendChild(em);
                return;
            }
            gp.forEach((pTxt, i) => {
                let r = document.createElement('div');
                r.style.cssText = "display:flex;gap:6px;margin-bottom:6px;align-items:center;";
                let inp = document.createElement('input');
                inp.type = 'text';
                inp.value = pTxt;
                inp.style.cssText = `flex-grow:1;padding:5px;border:1px solid ${isDark ? '#555' : '#ccc'};border-radius:3px;font-size:11px;background:${isDark ? '#333' : '#fff'};color:${isDark ? '#fff' : '#000'};`;
                inp.onchange = (e) => gp[i] = e.target.value.trim();
                r.appendChild(inp);

                let db = document.createElement('button');
                db.innerText = "X";
                db.className = 'onetrack-btn';
                db.style.cssText = "background:#d9534f;color:#fff;border:none;padding:5px 8px;border-radius:3px;cursor:pointer;font-size:11px;font-weight:bold;";
                db.onclick = () => {
                    gp.splice(i, 1);
                    renderPhrasesList();
                };
                r.appendChild(db);
                nc.appendChild(r);
            });
        }
        renderPhrasesList();
        sa.appendChild(nc);

        let addPhraseBtn = document.createElement('button');
        addPhraseBtn.innerText = "+ Add Global Phrase";
        addPhraseBtn.className = 'onetrack-btn';
        addPhraseBtn.style.cssText = "background:#2d2d2d;color:#e0e0e0;border:1px solid #444;padding:6px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:11px;width:100%;margin-bottom:8px;";
        addPhraseBtn.onclick = () => {
            gp.push("");
            renderPhrasesList();
        };
        sa.appendChild(addPhraseBtn);
        box.appendChild(sa);

        let btnRow = document.createElement('div');
        btnRow.style.cssText = "display:flex;gap:8px;";

        let sv = document.createElement('button');
        sv.innerText = "Save & Apply Phrases";
        sv.className = 'onetrack-btn';
        sv.style.cssText = "flex:1;padding:8px;background:#28a745;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;";
        sv.onclick = () => {
            localStorage.setItem('global_common_phrases', JSON.stringify(gp.map(x => x.trim()).filter(x => x)));
            ov.remove();
            showEditModal(activeTheme);
        };
        btnRow.appendChild(sv);

        let clBtn = document.createElement('button');
        clBtn.innerText = "← Back";
        clBtn.className = 'onetrack-btn';
        clBtn.style.cssText = isDark ? "flex:1;padding:8px;background:#444;color:#e0e0e0;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;" : "flex:1;padding:8px;background:#e0e0e0;color:#333;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;";
        clBtn.onclick = () => { ov.remove(); showEditModal(activeTheme); };
        btnRow.appendChild(clBtn);

        box.appendChild(btnRow);
        ov.appendChild(box);
        document.body.appendChild(ov);
    }
    function showManageDevicePhrasesModal(passedTheme) {
        let activeTheme = passedTheme || document.getElementById('preset-notes-modal')?.getAttribute('data-theme') || 'light';
        let isDark = activeTheme === 'dark';
    
        let ex = document.getElementById('device-phrases-modal');
        if (ex) ex.remove();
    
        let ov = document.createElement('div');
        ov.id = 'device-phrases-modal';
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:transparent;z-index:999999;pointer-events:none;';
    
        let box = document.createElement('div');
        let boxBg = isDark ? '#1e1e1e' : '#fff';
        let boxColor = isDark ? '#e0e0e0' : '#333';
        
        let savedPos = {};
        try {
            savedPos = JSON.parse(localStorage.getItem('device_phrases_modal_pos') || '{}');
        } catch(e) {}
    
        let initialStyle = `position:fixed;background:${boxBg};color:${boxColor};padding:20px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.25);width:500px;max-width:90vw;max-height:85vh;display:flex;flex-direction:column;font-family:sans-serif;pointer-events:auto;cursor:default;`;
        
        if (savedPos.left !== undefined && savedPos.top !== undefined) {
            initialStyle += `left:${savedPos.left}px;top:${savedPos.top}px;`;
        } else {
            initialStyle += `top:50%;left:50%;transform:translate(-50%,-50%);`;
        }
    
        box.style.cssText = initialStyle;
    
        box.innerHTML = `
            <div id="dp-drag-handle" style="cursor:move;padding-bottom:8px;margin-bottom:12px;border-bottom:1px solid ${isDark ? '#444' : '#eee'};">
                <h3 style="margin:0;font-size:16px;">Device Phrase Catalog</h3>
                <p style="font-size:11px;opacity:0.7;margin:4px 0 0 0;">Manage specific device model phrases offline.</p>
            </div>
    
            <div style="margin-bottom:12px;padding:8px;background:${isDark ? '#2a2a2a' : '#f9f9f9'};border-radius:4px;border:1px solid ${isDark ? '#444' : '#ddd'};">
                <label style="display:block;font-size:11px;font-weight:bold;margin-bottom:4px;">Add New Device Model:</label>
                <div style="display:flex;gap:6px;">
                    <input type="text" id="dp-new-device-input" placeholder="e.g., Alaris Pump Model 8015" style="flex:1;padding:6px;font-size:12px;box-sizing:border-box;background:${isDark ? '#1e1e1e' : '#fff'};color:${boxColor};border:1px solid ${isDark ? '#555' : '#ccc'};border-radius:4px;" />
                    <button id="dp-add-device-btn" class="onetrack-btn" style="padding:6px 10px;background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">Add</button>
                </div>
            </div>
            
            <div id="dp-device-list-container" style="flex:1;overflow-y:auto;max-height:48vh;margin-bottom:12px;padding-right:4px;"></div>
    
            <div id="dp-status-msg" style="font-size:11px;margin-bottom:8px;height:14px;color:#28a745;text-align:center;"></div>
    
            <div style="display:flex;gap:8px;margin-top:auto;">
                <button id="dp-back-btn" class="onetrack-btn" style="width:100%;padding:8px;background:${isDark ? '#444' : '#ccc'};color:${boxColor};border:none;border-radius:4px;cursor:pointer;font-weight:bold;">« Back to Settings</button>
            </div>
        `;
    
        ov.appendChild(box);
        document.body.appendChild(ov);
    
        // Draggable logic with viewport boundary protection
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;
        const handle = box.querySelector('#dp-drag-handle');
    
        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = box.getBoundingClientRect();
            box.style.transform = 'none';
            box.style.left = rect.left + 'px';
            box.style.top = rect.top + 'px';
            initialLeft = rect.left;
            initialTop = rect.top;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
        });
    
        function onMouseMove(e) {
            if (!isDragging) return;
            let newX = initialLeft + (e.clientX - startX);
            let newY = initialTop + (e.clientY - startY);
    
            const rect = box.getBoundingClientRect();
            const maxX = window.innerWidth - rect.width - 20;
            const maxY = window.innerHeight - rect.height - 20;
    
            newX = Math.max(10, Math.min(newX, maxX));
            newY = Math.max(10, Math.min(newY, maxY));
    
            box.style.left = newX + 'px';
            box.style.top = newY + 'px';
        }
    
        function onMouseUp() {
            if (!isDragging) return;
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            const rect = box.getBoundingClientRect();
            localStorage.setItem('device_phrases_modal_pos', JSON.stringify({ left: rect.left, top: rect.top }));
        }
    
        const listContainer = box.querySelector('#dp-device-list-container');
        const newDeviceInput = box.querySelector('#dp-new-device-input');
        const addDeviceBtn = box.querySelector('#dp-add-device-btn');
        const statusMsg = box.querySelector('#dp-status-msg');
        const backBtn = box.querySelector('#dp-back-btn');
    
        const getStorageData = () => {
            try {
                return JSON.parse(localStorage.getItem('device_preset_notes') || '{}');
            } catch (e) {
                return {};
            }
        };
    
        const saveStorageData = (data) => {
            localStorage.setItem('device_preset_notes', JSON.stringify(data));
        };
    
        function renderDeviceList() {
            const storedData = getStorageData();
            
            // Filter out placeholders and sort alphabetically (case-insensitive)
            const devices = Object.keys(storedData).filter(name => {
                const lower = name.toLowerCase();
                return name.trim() !== '' && 
                       !lower.includes('unknown') && 
                       !lower.includes('sub-model');
            }).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'accent', numeric: true }));
    
            listContainer.innerHTML = '';
    
            if (devices.length === 0) {
                listContainer.innerHTML = `<p style="font-size:12px;opacity:0.6;text-align:center;padding:15px;">No custom specific devices stored yet.</p>`;
                return;
            }
    
            devices.forEach(deviceName => {
                let phrases = Array.isArray(storedData[deviceName]) ? [...storedData[deviceName]] : [];
    
                let itemCard = document.createElement('div');
                itemCard.style.cssText = `margin-bottom:6px;border:1px solid ${isDark ? '#444' : '#ddd'};border-radius:4px;background:${isDark ? '#252525' : '#fff'};overflow:hidden;`;
    
                let cardHeader = document.createElement('div');
                cardHeader.style.cssText = `padding:8px 10px;background:${isDark ? '#2f2f2f' : '#f1f1f1'};cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-weight:bold;font-size:12px;`;
                cardHeader.innerHTML = `
                    <span>${deviceName} <span style="font-weight:normal;opacity:0.6;font-size:11px;">(${phrases.length} phrases)</span></span>
                    <span style="font-size:10px;">▼</span>
                `;
    
                let cardBody = document.createElement('div');
                cardBody.style.cssText = `display:none;padding:10px;border-top:1px solid ${isDark ? '#444' : '#ddd'};`;
    
                // Phrases container (stacked full-width block layout to prevent clipping)
                let phrasesContainer = document.createElement('div');
                phrasesContainer.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-bottom:10px;max-height:220px;overflow-y:auto;padding-right:2px;';
    
                function renderPhraseRows() {
                    phrasesContainer.innerHTML = '';
                    if (phrases.length === 0) {
                        phrasesContainer.innerHTML = `<div style="font-size:11px;opacity:0.5;text-align:center;padding:6px;">No phrases added for this device yet.</div>`;
                        return;
                    }
    
                    phrases.forEach((phrase, index) => {
                        let phraseBlock = document.createElement('div');
                        phraseBlock.style.cssText = `display:flex;flex-direction:column;gap:4px;background:${isDark ? '#1e1e1e' : '#f8f9fa'};padding:8px;border-radius:4px;border:1px solid ${isDark ? '#333' : '#e0e0e0'};`;
    
                        let textarea = document.createElement('textarea');
                        textarea.rows = 2; // multi-line support so long items don't get cut off
                        textarea.value = phrase;
                        textarea.style.cssText = `width:100%;background:${isDark ? '#252525' : '#fff'};border:1px solid ${isDark ? '#444' : '#ccc'};color:${boxColor};font-size:12px;padding:6px;box-sizing:border-box;border-radius:3px;resize:vertical;font-family:inherit;`;
                        
                        textarea.addEventListener('input', () => {
                            phrases[index] = textarea.value;
                        });
    
                        let rowBottom = document.createElement('div');
                        rowBottom.style.cssText = 'display:flex;justify-content:flex-end;';
    
                        let removeBtn = document.createElement('button');
                        removeBtn.type = 'button';
                        removeBtn.innerHTML = '&times; Remove';
                        removeBtn.style.cssText = 'background:none;border:none;color:#dc3545;font-size:11px;cursor:pointer;padding:0;font-weight:bold;';
                        removeBtn.addEventListener('click', () => {
                            phrases.splice(index, 1);
                            renderPhraseRows();
                        });
    
                        rowBottom.appendChild(removeBtn);
                        phraseBlock.appendChild(textarea);
                        phraseBlock.appendChild(rowBottom);
                        phrasesContainer.appendChild(phraseBlock);
                    });
                }
    
                renderPhraseRows();
    
                let addPhraseRow = document.createElement('div');
                addPhraseRow.style.cssText = 'display:flex;gap:6px;margin-bottom:10px;';
                
                let newPhraseInput = document.createElement('input');
                newPhraseInput.type = 'text';
                newPhraseInput.placeholder = 'Type new phrase...';
                newPhraseInput.style.cssText = `flex:1;padding:6px;font-size:11px;box-sizing:border-box;background:${isDark ? '#1e1e1e' : '#fff'};color:${boxColor};border:1px solid ${isDark ? '#555' : '#ccc'};border-radius:4px;`;
    
                let addPhraseBtn = document.createElement('button');
                addPhraseBtn.type = 'button';
                addPhraseBtn.innerText = '+ Add Phrase';
                addPhraseBtn.style.cssText = 'padding:6px 10px;background:#17a2b8;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;';
    
                addPhraseBtn.addEventListener('click', () => {
                    const val = newPhraseInput.value.trim();
                    if (val) {
                        phrases.push(val);
                        newPhraseInput.value = '';
                        renderPhraseRows();
                    }
                });
    
                newPhraseInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        addPhraseBtn.click();
                        e.preventDefault();
                    }
                });
    
                addPhraseRow.appendChild(newPhraseInput);
                addPhraseRow.appendChild(addPhraseBtn);
    
                let actionRow = document.createElement('div');
                actionRow.style.cssText = 'display:flex;gap:6px;justify-content:flex-end;border-top:1px solid ' + (isDark ? '#333' : '#eee') + ';padding-top:8px;';
    
                let saveItemBtn = document.createElement('button');
                saveItemBtn.className = 'onetrack-btn';
                saveItemBtn.innerText = 'Save Changes';
                saveItemBtn.style.cssText = 'padding:5px 10px;background:#28a745;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;';
                
                let deleteItemBtn = document.createElement('button');
                deleteItemBtn.className = 'onetrack-btn';
                deleteItemBtn.innerText = 'Delete Device';
                deleteItemBtn.style.cssText = 'padding:5px 10px;background:#dc3545;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px;';
    
                actionRow.appendChild(deleteItemBtn);
                actionRow.appendChild(saveItemBtn);
    
                cardBody.appendChild(phrasesContainer);
                cardBody.appendChild(addPhraseRow);
                cardBody.appendChild(actionRow);
    
                itemCard.appendChild(cardHeader);
                itemCard.appendChild(cardBody);
                listContainer.appendChild(itemCard);
    
                cardHeader.addEventListener('click', () => {
                    const isOpen = cardBody.style.display === 'block';
                    cardBody.style.display = isOpen ? 'none' : 'block';
                    cardHeader.querySelector('span:last-child').textContent = isOpen ? '▼' : '▲';
                });
    
                saveItemBtn.addEventListener('click', () => {
                    const cleanedPhrases = phrases.map(p => p.trim()).filter(p => p.length > 0);
                    let data = getStorageData();
                    data[deviceName] = cleanedPhrases;
                    saveStorageData(data);
    
                    statusMsg.style.color = '#28a745';
                    statusMsg.textContent = `Updated phrases for "${deviceName}"!`;
                    setTimeout(() => { statusMsg.textContent = ''; }, 2500);
                    renderDeviceList();
                });
    
                deleteItemBtn.addEventListener('click', () => {
                    if (confirm(`Are you sure you want to delete "${deviceName}" and all its saved phrases?`)) {
                        let data = getStorageData();
                        delete data[deviceName];
                        saveStorageData(data);
    
                        statusMsg.style.color = '#dc3545';
                        statusMsg.textContent = `Deleted device "${deviceName}".`;
                        setTimeout(() => { statusMsg.textContent = ''; }, 2500);
                        renderDeviceList();
                    }
                });
            });
        }
    
        addDeviceBtn.addEventListener('click', () => {
            const newName = newDeviceInput.value.trim();
            if (!newName) {
                alert('Please enter a valid device model name.');
                newDeviceInput.focus();
                return;
            }
    
            let data = getStorageData();
            if (data[newName]) {
                alert('A profile for this device already exists in storage.');
                return;
            }
    
            data[newName] = [];
            saveStorageData(data);
    
            newDeviceInput.value = '';
            statusMsg.style.color = '#28a745';
            statusMsg.textContent = `Added new device profile "${newName}"!`;
            setTimeout(() => { statusMsg.textContent = ''; }, 2500);
            renderDeviceList();
        });
    
        renderDeviceList();
    
        backBtn.addEventListener('click', () => {
            ov.remove();
            if (typeof showEditModal === 'function') {
                showEditModal(activeTheme);
            }
        });
    }
    function showFeedbackModal(passedTheme) {
        let activeTheme = passedTheme || document.getElementById('preset-notes-modal')?.getAttribute('data-theme') || 'light';
        let isDark = activeTheme === 'dark';
        let ex = document.getElementById('preset-notes-modal');
        if (ex) ex.remove();
    
        let ov = document.createElement('div');
        ov.id = 'preset-notes-modal';
        ov.setAttribute('data-theme', activeTheme);
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:transparent;z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;pointer-events:none;';
    
        let box = document.createElement('div');
        box.className = 'onetrack-modal' + (compactMode ? ' onetrack-compact-mode' : '');
        let boxBg = isDark ? '#1e1e1e' : '#fff';
        let boxColor = isDark ? '#e0e0e0' : '#333';
        box.style.cssText = `background:${boxBg};color:${boxColor};padding:20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);width:440px;display:flex;flex-direction:column;position:relative;pointer-events:auto;`;
        
        if (typeof applyUIScale === 'function') applyUIScale(box);
        if (typeof applySavedPosition === 'function') applySavedPosition(box);
    
        let title = document.createElement('h3');
        title.innerText = "💬 Submit Feedback & Feature Requests";
        title.style.cssText = `margin-top:0;margin-bottom:10px;font-size:15px;color:${isDark ? '#fff' : '#222'};text-align:center;`;
        box.appendChild(title);
    
        let desc = document.createElement('p');
        desc.innerText = "Have an idea or spotted a bug? Send it directly here without leaving OneTrack.";
        desc.style.cssText = `font-size:11px;color:${isDark ? '#aaa' : '#666'};margin-top:0;margin-bottom:12px;text-align:center;`;
        box.appendChild(desc);
    
        // Dropdown Category
        let selectWrapper = document.createElement('div');
        selectWrapper.style.cssText = "position:relative;margin-bottom:10px;width:100%;";
        
        let categorySelect = document.createElement('select');
        categorySelect.className = 'onetrack-btn';
        categorySelect.innerHTML = '<option value="Feature Request">💡 Feature Request</option><option value="Bug Report">🐛 Bug Report</option><option value="General Feedback">⭐ General Feedback</option>';
        
        let svgArrow = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${isDark ? '#aaa' : '#666'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`);
        categorySelect.style.cssText = `width:100%;padding:8px 32px 8px 10px;border-radius:4px;background:${isDark ? '#2a2a2a' : '#fff'} url("data:image/svg+xml;utf8,${svgArrow}") no-repeat right 10px center;color:${boxColor};border:1px solid ${isDark ? '#555' : '#ccc'};font-size:12px;appearance:none;-webkit-appearance:none;-moz-appearance:none;cursor:pointer;box-sizing:border-box;`;
        selectWrapper.appendChild(categorySelect);
        box.appendChild(selectWrapper);
    
        // Textarea
        let textarea = document.createElement('textarea');
        textarea.placeholder = "Type your feedback here...";
        textarea.style.cssText = `width:100%;height:90px;padding:8px;box-sizing:border-box;border:1px solid ${isDark ? '#444' : '#ccc'};border-radius:4px;background:${isDark ? '#2a2a2a' : '#fff'};color:${boxColor};font-size:12px;margin-bottom:10px;resize:vertical;font-family:inherit;`;
        box.appendChild(textarea);
    
        // File Attachment & Screenshot Preview Section
        let fileLabel = document.createElement('label');
        fileLabel.innerText = "Attach Screenshot / Image (Optional):";
        fileLabel.style.cssText = `font-size:11px;font-weight:bold;color:${isDark ? '#ccc' : '#555'};margin-bottom:4px;display:block;`;
        box.appendChild(fileLabel);
        
        let dropZone = document.createElement('div');
        dropZone.style.cssText = `width:100%;min-height:65px;border:2px dashed ${isDark ? '#555' : '#ccc'};border-radius:4px;background:${isDark ? '#2a2a2a' : '#fafafa'};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;box-sizing:border-box;cursor:pointer;margin-bottom:10px;text-align:center;position:relative;`;
        
        let dropText = document.createElement('span');
        dropText.innerText = "Drag & drop image here, click to browse, or Paste (Ctrl+V)";
        dropText.style.cssText = `font-size:11px;color:${isDark ? '#aaa' : '#666'};pointer-events:none;`;
        dropZone.appendChild(dropText);
        
        let fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.cssText = 'display:none;';
        dropZone.appendChild(fileInput);
        
        // Image Preview Container
        let previewContainer = document.createElement('div');
        previewContainer.style.cssText = 'display:none;align-items:center;gap:10px;margin-top:5px;width:100%;';
        
        let previewImg = document.createElement('img');
        previewImg.style.cssText = 'max-height:50px;max-width:80px;border-radius:4px;object-fit:cover;border:1px solid #ccc;';
        previewContainer.appendChild(previewImg);
        
        let previewText = document.createElement('span');
        previewText.style.cssText = `font-size:11px;color:${isDark ? '#28a745' : '#28a745'};font-weight:bold;flex-grow:1;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
        previewContainer.appendChild(previewText);
        
        let removeBtn = document.createElement('button');
        removeBtn.innerText = "✕";
        removeBtn.style.cssText = 'background:transparent;border:none;color:#ff4d4f;cursor:pointer;font-size:14px;font-weight:bold;padding:0 5px;';
        previewContainer.appendChild(removeBtn);
        
        box.appendChild(dropZone);
        box.appendChild(previewContainer);
        
        let attachedFileObject = null;
        let attachedBase64 = null;
        
        const handleFileSelected = (file) => {
            if (!file || !file.type.startsWith('image/')) return;
            attachedFileObject = file;
            
            let reader = new FileReader();
            reader.onload = function(e) {
                attachedBase64 = e.target.result;
                previewImg.src = attachedBase64;
                previewText.innerText = file.name || "pasted_screenshot.png";
                dropZone.style.display = 'none';
                previewContainer.style.display = 'flex';
            };
            reader.readAsDataURL(file);
        };
        
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            attachedFileObject = null;
            attachedBase64 = null;
            fileInput.value = '';
            previewContainer.style.display = 'none';
            dropZone.style.display = 'flex';
        };
        
        dropZone.onclick = () => fileInput.click();
        fileInput.onchange = (e) => {
            if (e.target.files[0]) handleFileSelected(e.target.files[0]);
        };
        
        // Drag and Drop Events
        dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.borderColor = '#28a745'; };
        dropZone.ondragleave = () => { dropZone.style.borderColor = isDark ? '#555' : '#ccc'; };
        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.style.borderColor = isDark ? '#555' : '#ccc';
            if (e.dataTransfer.files[0]) handleFileSelected(e.dataTransfer.files[0]);
        };
        
        // Global Paste Listener (Ctrl+V anywhere in modal or textarea)
        box.onpaste = (e) => {
            let items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for (let item of items) {
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                    e.preventDefault();
                    let file = item.getAsFile();
                    handleFileSelected(file);
                    break;
                }
            }
        };
    
        let submitBtn = document.createElement('button');
        submitBtn.innerText = "Send Feedback";
        submitBtn.className = 'onetrack-btn';
        submitBtn.style.cssText = "width:100%;padding:9px;background:#28a745;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;margin-bottom:8px;";
        
        submitBtn.onclick = () => {
            let text = textarea.value.trim();
            if (!text) {
                alert("Please enter some feedback first.");
                return;
            }
        
            const sendPayload = (imageBase64 = null, fileName = null) => {
                let feedbackPayload = {
                    category: categorySelect.value,
                    device: typeof getDeviceType === 'function' ? getDeviceType() : 'Unknown',
                    message: text,
                    timestamp: new Date().toLocaleString(),
                    userLocation: window.location.href
                };
        
                let webhookUrl = "https://defaultda67ef1bca594db29a8caa8d94617a.16.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/25/workflows/7e09ec03536d41e49c205a13b589c631/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=QJwQDrdWZ1oEV9z_h-oaZ4qoWUpFOs-LajftqiZ0-PI";
                let messageBody = `[OneTrack Feedback]\nCategory: ${feedbackPayload.category}\nDevice: ${feedbackPayload.device}\nMessage: ${feedbackPayload.message}\nTime: ${feedbackPayload.timestamp}`;
        
                fetch(webhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        text: messageBody, 
                        image: imageBase64, 
                        filename: fileName 
                    })
                })
                .then(response => {
                    if (response.ok) {
                        showToast("✓ Feedback sent successfully!");
                    } else {
                        console.error("Webhook error response:", response.status);
                        showToast("⚠️ Failed to send feedback (Status: " + response.status + ")");
                    }
                })
                .catch(error => {
                    console.error("Network error sending feedback:", error);
                    showToast("❌ Network error connecting to webhook.");
                });
        
                ov.remove();
                showAdvancedSettingsModal();
            };
        
            sendPayload(attachedBase64, attachedFileObject ? attachedFileObject.name : (attachedBase64 ? "screenshot.png" : null));
        };
        box.appendChild(submitBtn);
    
        let backBtn = document.createElement('button');
        backBtn.innerText = "← Back to Advanced Settings";
        backBtn.className = 'onetrack-btn';
        backBtn.style.cssText = isDark ? "width:100%;padding:8px;background:#444;color:#e0e0e0;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;" : "width:100%;padding:8px;background:#e0e0e0;color:#333;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;";
        backBtn.onclick = () => {
            ov.remove();
            showAdvancedSettingsModal();
        };
        box.appendChild(backBtn);
    
        ov.appendChild(box);
        document.body.appendChild(ov);
    }
    function showAdvancedSettingsModal() {
        let activeTheme = document.getElementById('preset-notes-modal')?.getAttribute('data-theme') || localStorage.getItem('onetrack_theme') || 'light';
        let isDark = activeTheme === 'dark';

        let ex = document.getElementById('preset-notes-modal');
        if (ex) ex.remove();

        let ov = document.createElement('div');
        ov.id = 'preset-notes-modal';
        ov.setAttribute('data-theme', activeTheme);
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:transparent;z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;pointer-events:none;';

        let box = document.createElement('div');
        box.className = 'onetrack-modal' + (compactMode ? ' onetrack-compact-mode' : '');
        let boxBg = isDark ? '#1e1e1e' : '#fff';
        let boxColor = isDark ? '#e0e0e0' : '#333';
        box.style.cssText = `background:${boxBg};color:${boxColor};padding:20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);width:450px;display:flex;flex-direction:column;position:relative;pointer-events:auto;`;
        applyUIScale(box);
        applySavedPosition(box);
        applySavedScale(box);

        let title = document.createElement('h3');
        title.innerText = "⚙️ Advanced Settings";
        title.style.cssText = `margin-top:0;color:${isDark ? '#fff' : '#333'};font-size:16px;text-align:center;margin-bottom:15px;cursor:move;`;
        makeDraggable(box, title);
        box.appendChild(title);

        let sa = document.createElement('div');
        sa.style.cssText = "flex-grow:1;overflow-y:auto;margin-bottom:15px;padding-right:5px;";

        let whatsNewHeader = document.createElement('h4');
        whatsNewHeader.innerText = "ℹ️ Release Info & Changelog";
        whatsNewHeader.style.cssText = `margin:0 0 6px 0;font-size:13px;color:${isDark ? '#ccc' : '#444'};`;
        sa.appendChild(whatsNewHeader);

        let whatsNewBtn = document.createElement('button');
        whatsNewBtn.innerText = "🎉 View What's New / Changelog";
        whatsNewBtn.className = 'onetrack-btn';
        whatsNewBtn.style.cssText = "background:#eef7fe;color:#0366d6;border:1px solid #c8e1ff;padding:8px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:12px;width:100%;margin-bottom:15px;";
        whatsNewBtn.onclick = () => { ov.remove(); checkWhatsNew(true); };
        sa.appendChild(whatsNewBtn);

        let feedbackBtn = document.createElement('button');
        feedbackBtn.innerText = "💬 Submit Feedback / Request Feature";
        feedbackBtn.className = 'onetrack-btn';
        feedbackBtn.style.cssText = "background:#2b542c;color:#fff;border:1px solid #b5d89c;padding:8px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:12px;width:100%;margin-bottom:6px;";
        feedbackBtn.onclick = () => {
            ov.remove();
            showFeedbackModal(activeTheme);
        };
        sa.appendChild(feedbackBtn);

        let themeRow = document.createElement('div');
        themeRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; font-size:13px; font-weight:bold;';
        themeRow.innerHTML = `<span>Theme Mode</span>`;
        let themeSelect = document.createElement('select');
        themeSelect.innerHTML = '<option value="light">Light</option><option value="dark">Dark</option>';
        themeSelect.value = currentTheme === 'auto' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : currentTheme;
        themeSelect.className = 'onetrack-btn';
        themeSelect.style.cssText = isDark ? 'padding:4px 8px; border-radius:4px; background:#2a2d2e; color:#fff; border:1px solid #444;' : 'padding:4px 8px; border-radius:4px;';
        themeSelect.onchange = (e) => {
            currentTheme = e.target.value;
            applyTheme(currentTheme);
            const resolvedTheme = (currentTheme === 'auto') ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : currentTheme;
            let activeModal = document.getElementById('preset-notes-modal');
            if (activeModal) {
                activeModal.remove();
                showAdvancedSettingsModal();
            }
            showToast(`Theme changed to ${currentTheme}`);
        };
        themeRow.appendChild(themeSelect);
        sa.appendChild(themeRow);

        let hotkeyRow = document.createElement('div');
        hotkeyRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; font-size:13px; font-weight:bold;';
        hotkeyRow.innerHTML = `<span>Trigger Hotkey (Alt + )</span>`;
        let hotkeyInput = document.createElement('input');
        hotkeyInput.type = 'text';
        hotkeyInput.maxLength = 1;
        hotkeyInput.value = customHotkey.replace('Key', '');
        hotkeyInput.style.cssText = isDark ? 'width:40px; text-align:center; padding:4px; font-weight:bold; border-radius:4px; border:1px solid #555; background:#2a2d2e; color:#fff;' : 'width:40px; text-align:center; padding:4px; font-weight:bold; border-radius:4px; border:1px solid #ccc;';
        hotkeyInput.onkeydown = (e) => {
            e.preventDefault();
            if (e.key.length === 1) {
                let newKey = 'Key' + e.key.toUpperCase();
                customHotkey = newKey;
                localStorage.setItem(CONFIG.storagePrefix + 'custom_hotkey', newKey);
                hotkeyInput.value = e.key.toUpperCase();
                showToast(`Hotkey updated to Alt + ${e.key.toUpperCase()}`);
            }
        };
        hotkeyRow.appendChild(hotkeyInput);
        sa.appendChild(hotkeyRow);

        let compactRow = document.createElement('div');
        compactRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; font-size:13px; font-weight:bold;';
        compactRow.innerHTML = `<span>Compact UI Mode</span>`;
        let compactToggle = document.createElement('input');
        compactToggle.type = 'checkbox';
        compactToggle.checked = compactMode;
        compactToggle.onchange = (e) => {
            compactMode = e.target.checked;
            applyCompactMode(compactMode);
            showToast(`Compact Mode ${compactMode ? 'Enabled' : 'Disabled'}`);
        };
        compactRow.appendChild(compactToggle);
        sa.appendChild(compactRow);

        let keepOpenRow = document.createElement('div');
        keepOpenRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; font-size:13px; font-weight:bold;';
        keepOpenRow.innerHTML = `<span>Keep Open After Applying Note</span>`;
        let keepOpenToggle = document.createElement('input');
        keepOpenToggle.type = 'checkbox';
        keepOpenToggle.checked = keepOpenMode;
        keepOpenToggle.onchange = (e) => {
            keepOpenMode = e.target.checked;
            localStorage.setItem('onetrack_keep_open', keepOpenMode);
            showToast(`Keep Open Mode ${keepOpenMode ? 'Enabled' : 'Disabled'}`);
        };
        keepOpenRow.appendChild(keepOpenToggle);
        sa.appendChild(keepOpenRow);

        let actionRow = document.createElement('div');
        actionRow.style.cssText = 'display:flex; justify-content:space-between; margin-bottom:12px; gap:8px;';
        let exportBtn = document.createElement('button');
        exportBtn.innerText = 'Export Config';
        exportBtn.className = 'onetrack-btn';
        exportBtn.style.cssText = 'flex:1; padding:6px 12px; cursor:pointer; border-radius:4px; background:#1976d2; color:#fff; border:none; font-size:12px; font-weight:bold;';
        exportBtn.onclick = exportSettings;

        let importLabel = document.createElement('label');
        importLabel.innerText = 'Import Config';
        importLabel.className = 'onetrack-btn';
        importLabel.style.cssText = 'flex:1; padding:6px 12px; cursor:pointer; border-radius:4px; background:#388e3c; color:#fff; text-align:center; display:inline-block; font-size:12px; font-weight:bold;';
        let importInput = document.createElement('input');
        importInput.type = 'file';
        importInput.accept = '.json';
        importInput.style.display = 'none';
        importInput.onchange = importSettings;
        importLabel.appendChild(importInput);
        actionRow.appendChild(exportBtn);
        actionRow.appendChild(importLabel);
        sa.appendChild(actionRow);

        box.appendChild(sa);
        let backBtn = document.createElement('button');
        backBtn.innerText = "← Back to Edit Notes";
        backBtn.className = 'onetrack-btn';
        backBtn.style.cssText = "width:100%;padding:8px;background:#780034;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;";
        backBtn.onclick = () => { ov.remove(); showEditModal(activeTheme); };
        box.appendChild(backBtn);

        ov.appendChild(box);
        document.body.appendChild(ov);
    }

    function showEditModal(passedTheme) {
        let dt = getDeviceType(), ph = [...getPhrasesForDevice(dt)];
        let activeTheme = passedTheme || document.getElementById('preset-notes-modal')?.getAttribute('data-theme') || localStorage.getItem('onetrack_theme') || 'light';
        let isDark = activeTheme === 'dark';
    
        let ex = document.getElementById('preset-notes-modal');
        if (ex) ex.remove();
    
        let ov = document.createElement('div');
        ov.id = 'preset-notes-modal';
        ov.setAttribute('data-theme', activeTheme);
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:transparent;z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;pointer-events:none;';
    
        let box = document.createElement('div');
        box.className = 'onetrack-modal' + (compactMode ? ' onetrack-compact-mode' : '');
        let boxBg = isDark ? '#1e1e1e' : '#fff';
        let boxColor = isDark ? '#e0e0e0' : '#333';
        box.style.cssText = `background:${boxBg};color:${boxColor};padding:20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);width:520px;max-height:85vh;display:flex;flex-direction:column;position:relative;pointer-events:auto;`;
        
        if (typeof applyUIScale === 'function') applyUIScale(box);
        if (typeof applySavedPosition === 'function') applySavedPosition(box);
        if (typeof applySavedScale === 'function') applySavedScale(box);
    
        // Title Row
        let titleRow = document.createElement('div');
        titleRow.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;cursor:move;";
        let title = document.createElement('h3');
        title.innerText = "✏️ Edit Device Notes";
        title.style.cssText = `margin:0;color:${isDark ? '#ffffff' : '#333'};font-size:16px;`;
        titleRow.appendChild(title);
    
        let settingsBtn = document.createElement('button');
        settingsBtn.innerText = "⚙️ Settings";
        settingsBtn.className = 'onetrack-btn';
        settingsBtn.style.cssText = isDark ? "background:#2d2d2d;color:#e0e0e0;border:1px solid #444;padding:5px 10px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:11px;" : "background:#f0f0f0;color:#333;border:1px solid #ccc;padding:5px 10px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:11px;";
        settingsBtn.onclick = () => { ov.remove(); showAdvancedSettingsModal(); };
        titleRow.appendChild(settingsBtn);
        if (typeof makeDraggable === 'function') makeDraggable(box, titleRow);
        box.appendChild(titleRow);
    
        // Wrap Toggle Row
        let wrapRow = document.createElement('label');
        let rowBg = isDark ? '#2a2a2a' : '#f8f9fa';
        let rowBorder = isDark ? '#444' : '#e9ecef';
        let rowColor = isDark ? '#e0e0e0' : '#212529';
        wrapRow.style.cssText = `display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer;user-select:none;background:${rowBg};padding:6px 8px;border-radius:4px;border:1px solid ${rowBorder};margin-bottom:10px;color:${rowColor};font-weight:bold;`;
        
        let wrapToggle = document.createElement('input');
        wrapToggle.type = 'checkbox';
        wrapToggle.checked = wrapMode;
        wrapToggle.onchange = (e) => {
            wrapMode = e.target.checked;
            localStorage.setItem('onetrack_wrap_mode', wrapMode);
            box.classList.toggle('onetrack-wrap-mode', wrapMode);
            box.querySelectorAll('.onetrack-phrase-input').forEach(ta => {
                ta.style.resize = wrapMode ? 'vertical' : 'none';
                if (wrapMode) {
                    ta.style.height = 'auto';
                    ta.style.height = (ta.scrollHeight) + 'px';
                } else {
                    ta.style.height = '32px';
                }
            });
        };
        wrapRow.appendChild(wrapToggle);
        
        let wrapLabelText = document.createElement('span');
        wrapLabelText.innerText = 'Enable dynamic text wrapping for entries';
        wrapRow.appendChild(wrapLabelText);
        box.appendChild(wrapRow);
    
        // Scrollable Area
        let sa = document.createElement('div');
        sa.style.cssText = "flex-grow:1;overflow-y:auto;margin-bottom:15px;padding-right:5px;max-height:340px;";
    
        // Submenu Action Buttons
        let navActionRow = document.createElement('div');
        navActionRow.style.cssText = "display:flex;gap:6px;margin-bottom:12px;";
        
        let subMenuCompBtn = document.createElement('button');
        subMenuCompBtn.innerText = "🏢 Manage Companies & Clients";
        subMenuCompBtn.className = 'onetrack-btn';
        subMenuCompBtn.style.cssText = "flex:1;background:#780034;color:#fff;border:none;padding:6px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;";
        subMenuCompBtn.onclick = () => { ov.remove(); showManageCompaniesModal(activeTheme); };
        navActionRow.appendChild(subMenuCompBtn);
    
        let subMenuPhrasesBtn = document.createElement('button');
        subMenuPhrasesBtn.innerText = "💬 Edit Global Phrases";
        subMenuPhrasesBtn.className = 'onetrack-btn';
        subMenuPhrasesBtn.style.cssText = isDark ? "background:#333;color:#fff;border:1px solid #555;padding:6px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;" : "background:#e2f0cb;color:#2b542c;border:1px solid #b5d89c;padding:6px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;";
        subMenuPhrasesBtn.onclick = () => { ov.remove(); showManageGlobalPhrasesModal(activeTheme); };
        navActionRow.appendChild(subMenuPhrasesBtn);
        sa.appendChild(navActionRow);
    
        // Search Input for Phrases
        let searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search device notes...';
        searchInput.style.cssText = `width:100%;padding:6px 8px;font-size:11px;background:${isDark ? '#2a2a2a' : '#fff'};color:${boxColor};border:1px solid ${isDark ? '#444' : '#ccc'};border-radius:4px;box-sizing:border-box;margin-bottom:8px;`;
        sa.appendChild(searchInput);
    
        let nl = document.createElement('h4');
        nl.innerText = `Device Specific Notes: ${dt} (supports {DATE} & {SERIAL})`;
        nl.style.cssText = `margin:0 0 6px 0;font-size:12px;color:${isDark ? '#cccccc' : '#444'};`;
        sa.appendChild(nl);
    
        // Notes Container
        let nc = document.createElement('div');
        let ncBorder = isDark ? '#444' : '#ddd';
        nc.style.cssText = `border:1px solid ${ncBorder};padding:8px;border-radius:4px;margin-bottom:12px;background:${isDark ? '#222' : '#fdfdfd'};display:flex;flex-direction:column;gap:6px;`;
        sa.appendChild(nc);
    
        let draggedItemIndex = null;
    
        function renderNotes(filter = '') {
            nc.innerHTML = '';
            const lowerFilter = filter.toLowerCase();
            let matchCount = 0;
    
            ph.forEach((nt, index) => {
                if (lowerFilter && !nt.toLowerCase().includes(lowerFilter)) return;
                matchCount++;
    
                let row = document.createElement('div');
                const isDraggable = (filter === '');
                row.draggable = isDraggable;
                row.dataset.index = index;
                
                let rowBgColor = isDark ? '#2a2a2a' : '#f8f9fa';
                let rowBorderColor = isDark ? '#3b3b3b' : '#e0e0e0';
                row.style.cssText = `display:flex;gap:6px;align-items:center;background:${rowBgColor};padding:6px;border-radius:4px;border:1px solid ${rowBorderColor};transition:border-color 0.2s;`;
    
                // Left-aligned Drag Handle
                let dragHandle = document.createElement('span');
                dragHandle.textContent = '⋮⋮';
                dragHandle.title = isDraggable ? 'Drag to reorder' : 'Clear search filter to reorder';
                dragHandle.style.cssText = `color:${isDraggable ? '#8c959f' : '#444'};font-size:14px;cursor:${isDraggable ? 'grab' : 'not-allowed'};user-select:none;padding:0 2px;`;
                row.appendChild(dragHandle);
    
                // Textarea Input
                let inp = document.createElement('textarea');
                inp.rows = wrapMode ? 2 : 1;
                inp.className = 'onetrack-phrase-input';
                inp.value = nt;
                inp.style.cssText = `flex-grow:1;padding:5px;border:1px solid ${isDark ? '#555' : '#ccc'};border-radius:3px;font-size:11px;font-family:sans-serif;resize:${wrapMode ? 'vertical' : 'none'};height:${wrapMode ? 'auto' : '32px'};background:${isDark ? '#1e1e1e' : '#fff'};color:${boxColor};`;
                
                if (wrapMode) {
                    setTimeout(() => {
                        inp.style.height = 'auto';
                        inp.style.height = (inp.scrollHeight) + 'px';
                    }, 0);
                }
                
                inp.oninput = function() {
                    if (wrapMode) {
                        this.style.height = 'auto';
                        this.style.height = (this.scrollHeight) + 'px';
                    }
                    ph[index] = this.value;
                };
                inp.onchange = (e) => {
                    ph[index] = e.target.value.trim();
                };
                row.appendChild(inp);
    
                // Delete Button
                let db = document.createElement('button');
                db.innerText = "X";
                db.className = 'onetrack-btn';
                db.style.cssText = "background:#d9534f;color:#fff;border:none;padding:5px 8px;border-radius:3px;cursor:pointer;font-size:11px;font-weight:bold;";
                db.onclick = () => {
                    ph.splice(index, 1);
                    renderNotes(searchInput.value);
                };
                row.appendChild(db);
    
                // --- HTML5 Drag and Drop Event Handlers ---
                if (isDraggable) {
                    row.ondragstart = (e) => {
                        draggedItemIndex = index;
                        e.dataTransfer.effectAllowed = 'move';
                        row.style.opacity = '0.4';
                    };
    
                    row.ondragend = () => {
                        draggedItemIndex = null;
                        row.style.opacity = '1';
                        Array.from(nc.children).forEach(child => {
                            child.style.borderColor = rowBorderColor;
                        });
                    };
    
                    row.ondragover = (e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                    };
    
                    row.ondragenter = () => {
                        if (draggedItemIndex === null || draggedItemIndex === index) return;
                        row.style.borderColor = '#007bff';
                    };
    
                    row.ondragleave = () => {
                        row.style.borderColor = rowBorderColor;
                    };
    
                    row.ondrop = (e) => {
                        e.preventDefault();
                        row.style.borderColor = rowBorderColor;
                        if (draggedItemIndex === null || draggedItemIndex === index) return;
    
                        const draggedItem = ph.splice(draggedItemIndex, 1)[0];
                        ph.splice(index, 0, draggedItem);
                        renderNotes(searchInput.value);
                    };
                }
    
                nc.appendChild(row);
            });
    
            if (matchCount === 0) {
                let em = document.createElement('div');
                em.innerText = filter ? "No matching notes found." : "No specific notes configured for this device.";
                em.style.cssText = "font-size:11px;color:#888;font-style:italic;padding:4px;text-align:center;";
                nc.appendChild(em);
            }
        }

        renderNotes();
    
        searchInput.addEventListener('input', (e) => {
            renderNotes(e.target.value);
        });
    
        let anb = document.createElement('button');
        anb.innerText = "+ Add Device Note";
        anb.className = 'onetrack-btn';
        anb.style.cssText = isDark ? "background:#2d2d2d;color:#e0e0e0;border:1px solid #444;padding:5px;border-radius:4px;cursor:pointer;margin-top:4px;margin-bottom:8px;font-weight:bold;font-size:11px;width:100%;" : "background:#f0f0f0;color:#333;border:1px solid #ccc;padding:5px;border-radius:4px;cursor:pointer;margin-top:4px;margin-bottom:8px;font-weight:bold;font-size:11px;width:100%;";
        anb.onclick = () => { 
            ph.push(""); 
            searchInput.value = '';
            renderNotes(); 
        };
        sa.appendChild(anb);
        box.appendChild(sa);
    
        // Bottom Action Button Row
        let btnRow = document.createElement('div');
        btnRow.style.cssText = "display:flex;gap:8px;";
    
        let sv = document.createElement('button');
        sv.innerText = "Save & Apply";
        sv.className = 'onetrack-btn';
        sv.style.cssText = "flex:1;padding:8px;background:#28a745;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;";
        sv.onclick = () => {
            let mObj = {};
            let s = localStorage.getItem('device_preset_notes');
            if (s) { try { mObj = JSON.parse(s); } catch (e) {} }
            mObj[dt] = ph.map(x => x.trim()).filter(x => x);
            localStorage.setItem('device_preset_notes', JSON.stringify(mObj));
            ov.remove();
            showMainModal(activeTheme);
        };
        btnRow.appendChild(sv);
    
        let clBtn = document.createElement('button');
        clBtn.innerText = "Cancel";
        clBtn.className = 'onetrack-btn';
        clBtn.style.cssText = isDark ? "flex:1;padding:8px;background:#444;color:#e0e0e0;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;" : "flex:1;padding:8px;background:#e0e0e0;color:#333;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;";
        clBtn.onclick = () => { ov.remove(); showMainModal(activeTheme); };
        btnRow.appendChild(clBtn);
    
        let manageDevicePhrasesBtn = document.createElement('button');
        manageDevicePhrasesBtn.innerText = "Edit Device Phrases";
        manageDevicePhrasesBtn.className = 'onetrack-btn';
        manageDevicePhrasesBtn.style.cssText = `flex:1;padding:8px;background:#17a2b8;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;`;
        manageDevicePhrasesBtn.onclick = () => {
            ov.remove();
            showManageDevicePhrasesModal(activeTheme);
        };
        btnRow.appendChild(manageDevicePhrasesBtn);
    
        box.appendChild(btnRow);
        ov.appendChild(box);
        document.body.appendChild(ov);
    }

    window.addEventListener('keydown', (e) => {
        let savedKey = localStorage.getItem(CONFIG.storagePrefix + 'custom_hotkey');
        let targetKey = savedKey ? savedKey : CONFIG.hotkey;
        if (e.altKey && e.code === targetKey) {
            e.preventDefault();
            console.log(`[OneTrack Debug] Fired via ${CONFIG.envName} environment script using hotkey: ${e.code}`);
            
            let existingModal = document.getElementById('preset-notes-modal');
            if (existingModal) existingModal.remove();
            else showMainModal();
        }
    });

    checkWhatsNew();
    showMainModal();

})();
