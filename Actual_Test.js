// ==UserScript==
// @name         OneTrack Automation & Helper - Actual_Test
// @namespace    http://tampermonkey.net/
// @version      1.3.4
// @description  Automates workflows, UI enhancements, hotkeys, and persistent settings.
// @author       Biomed Team
// @match        *://*/*
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
    const CURRENT_VERSION = '1.3.4';
    const RELEASE_NOTES = [
        "Added customizable Theme Toggle (Dark/Light Mode).",
        "Enabled draggable floating UI panels.",
        "Added user-configurable hotkeys via settings menu.",
        "Introduced UI Compact Mode preferences.",
        "Added JSON Settings Export and Import backup functionality.",
        "Shifted Company/Client Mapping into a separate collapsible sub-menu.",
        "Added dedicated Global Common Phrases editor accessible from any device screen."
    ];

    // 1. Inject clean theme styles (Backdrop made fully transparent / non-dimming)
    const existingStyle = document.getElementById('onetrack-theme-styles');
    if (existingStyle) existingStyle.remove();

    const themeStyles = document.createElement('style');
    themeStyles.id = 'onetrack-theme-styles';
    themeStyles.innerHTML = `
        /* Light Mode Defaults */
        #preset-notes-modal-test, .onetrack-ui-panel {
            background-color: transparent;
            color: #333333;
        }

        /* 1. Make backdrop completely transparent / non-dimming and allow clicking through */
        #preset-notes-modal-test {
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
        #preset-notes-modal-test > .onetrack-modal,
        .onetrack-ui-panel {
            pointer-events: auto !important;
        }

        /* 3. Style the actual modal card container nicely in dark mode */
        #preset-notes-modal-test[data-theme="dark"] .onetrack-modal,
        #preset-notes-modal-test[data-theme="dark"] > div:not([style*="position:fixed"]) {
            background-color: #1e1e1e !important;
            color: #e0e0e0 !important;
            border: 1px solid #333333 !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
        }

        /* 4. Fix contrast for labels and text inside Advanced Settings and modals */
        #preset-notes-modal-test[data-theme="dark"] label,
        #preset-notes-modal-test[data-theme="dark"] span,
        #preset-notes-modal-test[data-theme="dark"] div {
            color: #e0e0e0;
        }

        /* 5. Force Company and Warranty Banners to keep their vibrant inline background colors */
        #preset-notes-modal-test[data-theme="dark"] div[style*="background:"] {
            color: #ffffff !important;
            text-shadow: 0 1px 2px rgba(0,0,0,0.4);
        }

        /* Dark Mode Text Inputs & Selects */
        #preset-notes-modal-test[data-theme="dark"] input:not([type="checkbox"]):not([type="radio"]),
        #preset-notes-modal-test[data-theme="dark"] textarea,
        #preset-notes-modal-test[data-theme="dark"] select {
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
            resize: vertical;
        }
    `;
    document.head.appendChild(themeStyles);

    function applyTheme(themeChoice) {
        localStorage.setItem('onetrack_theme', themeChoice);
        const activeTheme = (themeChoice === 'auto') 
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : themeChoice;

        const modals = document.querySelectorAll('#preset-notes-modal-test, .onetrack-ui-panel');
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
        const modal = document.getElementById('preset-notes-modal-test');
        if (modal) {
            modal.classList.toggle('onetrack-compact-mode', isCompact);
        }
    }

    let currentTheme = localStorage.getItem('onetrack_theme') || 'auto';
    let customHotkey = localStorage.getItem('onetrack_hotkey') || 'KeyP';
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
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:transparent;z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;pointer-events:none;';

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
        "CVS": ["William Maturo"],
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
            let modal = document.getElementById('preset-notes-modal-test');
            if (modal) modal.remove();
        }
    }

    function getSavedModalPosition() {
        let modal = document.getElementById('preset-notes-modal-test');
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
        let match = pageText.match(/Serial Number\D*([569]\d{8})/i) || pageText.match(/\b([569]\d{8})\b/);
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

        let activeTheme = passedTheme || document.getElementById('preset-notes-modal-test')?.getAttribute('data-theme') || localStorage.getItem('onetrack_theme') || 'light';
        let isDark = activeTheme === 'dark';

        let ex = document.getElementById('preset-notes-modal-test');
        if (ex) ex.remove();

        let ov = document.createElement('div');
        ov.id = 'preset-notes-modal-test';
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
        let activeTheme = passedTheme || document.getElementById('preset-notes-modal-test')?.getAttribute('data-theme') || 'light';
        let isDark = activeTheme === 'dark';

        let ex = document.getElementById('preset-notes-modal-test');
        if (ex) ex.remove();

        let ov = document.createElement('div');
        ov.id = 'preset-notes-modal-test';
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
        let activeTheme = passedTheme || document.getElementById('preset-notes-modal-test')?.getAttribute('data-theme') || 'light';
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

        let ex = document.getElementById('preset-notes-modal-test');
        if (ex) ex.remove();

        let ov = document.createElement('div');
        ov.id = 'preset-notes-modal-test';
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

    // --- NEW: COLLAPSIBLE COMPANY / CLIENT MAPPING SUB-MENU ---
    function showManageCompaniesModal(passedTheme) {
        let map = getClientMapping();
        let activeTheme = passedTheme || document.getElementById('preset-notes-modal-test')?.getAttribute('data-theme') || 'light';
        let isDark = activeTheme === 'dark';

        let ex = document.getElementById('preset-notes-modal-test');
        if (ex) ex.remove();

        let ov = document.createElement('div');
        ov.id = 'preset-notes-modal-test';
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
        let activeTheme = passedTheme || document.getElementById('preset-notes-modal-test')?.getAttribute('data-theme') || 'light';
        let isDark = activeTheme === 'dark';

        let ex = document.getElementById('preset-notes-modal-test');
        if (ex) ex.remove();

        let ov = document.createElement('div');
        ov.id = 'preset-notes-modal-test';
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

    function showAdvancedSettingsModal() {
        let activeTheme = document.getElementById('preset-notes-modal-test')?.getAttribute('data-theme') || localStorage.getItem('onetrack_theme') || 'light';
        let isDark = activeTheme === 'dark';

        let ex = document.getElementById('preset-notes-modal-test');
        if (ex) ex.remove();

        let ov = document.createElement('div');
        ov.id = 'preset-notes-modal-test';
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
            let activeModal = document.getElementById('preset-notes-modal-test');
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
                localStorage.setItem('onetrack_hotkey', newKey);
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
        let activeTheme = passedTheme || document.getElementById('preset-notes-modal-test')?.getAttribute('data-theme') || localStorage.getItem('onetrack_theme') || 'light';
        let isDark = activeTheme === 'dark';

        let ex = document.getElementById('preset-notes-modal-test');
        if (ex) ex.remove();

        let ov = document.createElement('div');
        ov.id = 'preset-notes-modal-test';
        ov.setAttribute('data-theme', activeTheme);
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:transparent;z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;pointer-events:none;';

        let box = document.createElement('div');
        box.className = 'onetrack-modal' + (compactMode ? ' onetrack-compact-mode' : '');
        let boxBg = isDark ? '#1e1e1e' : '#fff';
        let boxColor = isDark ? '#e0e0e0' : '#333';
        box.style.cssText = `background:${boxBg};color:${boxColor};padding:20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);width:500px;max-height:85vh;display:flex;flex-direction:column;position:relative;pointer-events:auto;`;
        applyUIScale(box);
        applySavedPosition(box);
        applySavedScale(box);

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
        makeDraggable(box, titleRow);
        box.appendChild(titleRow);

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

        let sa = document.createElement('div');
        sa.style.cssText = "flex-grow:1;overflow-y:auto;margin-bottom:15px;padding-right:5px;max-height:360px;";

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

        let nl = document.createElement('h4');
        nl.innerText = `Device Specific Notes: ${dt} (supports {DATE} & {SERIAL})`;
        nl.style.cssText = `margin:0 0 6px 0;font-size:12px;color:${isDark ? '#cccccc' : '#444'};`;
        sa.appendChild(nl);

        let nc = document.createElement('div');
        let ncBg = isDark ? '#2a2a2a' : '#fdfdfd';
        let ncBorder = isDark ? '#444' : '#ddd';
        nc.style.cssText = `border:1px solid ${ncBorder};padding:8px;border-radius:4px;margin-bottom:12px;background:${ncBg};`;

        function rnl() {
            nc.innerHTML = '';
            if (ph.length === 0) {
                let em = document.createElement('div');
                em.innerText = "No specific notes configured for this device.";
                em.style.cssText = "font-size:11px;color:#888;font-style:italic;padding:4px;";
                nc.appendChild(em);
                return;
            }
            ph.forEach((nt, i) => {
                let r = document.createElement('div');
                r.style.cssText = "display:flex;gap:6px;margin-bottom:6px;align-items:center;";
                let inp = document.createElement('textarea');
                inp.rows = wrapMode ? 2 : 1;
                inp.className = 'onetrack-phrase-input';
                inp.value = nt;
                inp.style.cssText = `flex-grow:1; padding:5px; border:1px solid ${isDark ? '#555' : '#ccc'}; border-radius:3px; font-size:11px; font-family:sans-serif; resize:${wrapMode ? 'vertical' : 'none'}; height:${wrapMode ? 'auto' : '32px'};`;
                
                r.appendChild(inp);
                
                // If wrapping is enabled, calculate the correct expanded height right away after it's in the DOM
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
                };
                inp.onchange = (e) => ph[i] = e.target.value.trim();
                r.appendChild(inp);
                r.appendChild(inp);

                let db = document.createElement('button');
                db.innerText = "X";
                db.className = 'onetrack-btn';
                db.style.cssText = "background:#d9534f;color:#fff;border:none;padding:5px 8px;border-radius:3px;cursor:pointer;font-size:11px;font-weight:bold;";
                db.onclick = () => {
                    ph.splice(i, 1);
                    rnl();
                };
                r.appendChild(db);
                nc.appendChild(r);
            });
        }
        rnl();
        sa.appendChild(nc);

        let anb = document.createElement('button');
        anb.innerText = "+ Add Device Note";
        anb.className = 'onetrack-btn';
        anb.style.cssText = isDark ? "background:#2d2d2d;color:#e0e0e0;border:1px solid #444;padding:5px;border-radius:4px;cursor:pointer;margin-bottom:8px;font-weight:bold;font-size:11px;width:100%;" : "background:#f0f0f0;color:#333;border:1px solid #ccc;padding:5px;border-radius:4px;cursor:pointer;margin-bottom:8px;font-weight:bold;font-size:11px;width:100%;";
        anb.onclick = () => { ph.push(""); rnl(); };
        sa.appendChild(anb);
        box.appendChild(sa);

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

        box.appendChild(btnRow);
        ov.appendChild(box);
        document.body.appendChild(ov);
    }

    window.addEventListener('keydown', (e) => {
        if (e.altKey && e.code === customHotkey) {
            e.preventDefault();
            let existingModal = document.getElementById('preset-notes-modal-test');
            if (existingModal) existingModal.remove();
            else showMainModal();
        }
    });

    checkWhatsNew();
    showMainModal();

})();
