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

const GLOBAL_PHRASES = [
    "Repair Estimate under pre-approved limit."
];

function getDeviceType() {
    let t = document.body ? document.body.innerText : '',
        m = t.match(/Model\s+([^\r\n]+)/i);
    return m && m[1] ? m[1].trim() : "Unknown Device";
}

function getSerialNumber() {
    let t = document.body ? document.body.innerText : '',
        m = t.match(/Serial\s*#?\s*([^\r\n\s]+)/i);
    return m && m[1] ? m[1].trim() : "N/A";
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
    if (tempDate > today) {
        ageMonths--;
    }
    ageMonths = Math.max(0, ageMonths);
    let cost = 0;
    if (ageMonths <= 24) {
        cost = 40.00;
    } else if (ageMonths <= 48) {
        cost = 225.00;
    } else if (ageMonths <= 72) {
        cost = 275.00;
    } else {
        cost = 325.00;
    }
    return `Device S/N: ${sn} requires an OEM level repair. Age of device is ${ageMonths} months. Cost of flat rate repair including handling is $${cost.toFixed(2)}. Pumps requiring PCB replacement will incur an additional charge which MOOG will notify and provide an estimate for. McKesson Biomed will provide an updated estimate for repair if required.`;
}

function getPhrasesForDevice(dt) {
    let s = localStorage.getItem('device_preset_notes'),
        m = {};
    if (s) {
        try {
            m = JSON.parse(s);
        } catch (e) {}
    }
    let dp = m[dt] && m[dt].length > 0 ? m[dt] : (dt.includes('Solis VIP PharmGuard Pump') ? [
        "Initial inspection completed. Unit powers on successfully. ({DATE})",
        "Keypad and display functioning normally. ({DATE})",
        "Error log checked; no critical faults found. ({DATE})"
    ] : []);

    let ts = localStorage.getItem('te_custom_mapping'),
        tp = [];
    if (ts) {
        try {
            let tm = JSON.parse(ts);
            if (tm[dt]) {
                let d = tm[dt],
                    rl = [];
                if (typeof d === 'object' && d !== null) {
                    rl = Array.isArray(d.repair) ? d.repair : (typeof d.repair === 'string' ? [d.repair] : []);
                } else if (Array.isArray(d)) {
                    rl = d;
                } else if (typeof d === 'string') {
                    rl = [d];
                }
                rl.forEach(r => {
                    if (r) tp.push(`Test equipment used for repair: ${r}`);
                });
            }
        } catch (e) {}
    }
    return Array.from(new Set([...GLOBAL_PHRASES, ...tp, ...dp]));
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

function showMainModal() {
    let dt = getDeviceType(),
        ph = getPhrasesForDevice(dt),
        hist = getAllHistory(),
        cc = getCurrentCompany(),
        iam = localStorage.getItem('preset_notes_append_mode') === 'true',
        hrm = localStorage.getItem('preset_hide_recent') === 'true';

    let ex = document.getElementById('preset-notes-modal');
    if (ex) ex.remove();

    let ov = document.createElement('div');
    ov.id = 'preset-notes-modal';
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;';

    let box = document.createElement('div');
    box.style.cssText = 'background:#fff;padding:20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);width:500px;max-height:80vh;display:flex;flex-direction:column;color:#333;';
    applyUIScale(box);

    let h = document.createElement('h3');
    h.innerText = `Preset Notes: ${dt}`;
    h.style.cssText = 'margin-top:0;margin-bottom:4px;font-size:16px;color:#222;text-align:center;';
    box.appendChild(h);

    let hsRow = document.createElement('div');
    hsRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px;';

    let companyColors = {
        "CORAM": "#2e7d32",
        "CVS": "#0277bd",
        "OPTUM": "#6a1b9a",
        "AmeriMed": "#c62828",
        "NELC": "#ef6c00",
        "OPTION CARE": "#00838f",
        "Amerita": "#4527a0",
        "Other": "#780034"
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
        if (!warrantyText) {
            let fullBody = document.body ? document.body.innerText : "";
            let match = fullBody.match(/Warranty\s+Status[\r\n\s]+([^\r\n]+)/i);
            if (match && match[1]) warrantyText = match[1].trim();
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

    let tr = document.createElement('label');
    tr.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:10px;cursor:pointer;user-select:none;background:#f8f9fa;padding:6px;border-radius:4px;border:1px solid #e9ecef;flex:1;';
    let tc = document.createElement('input');
    tc.type = 'checkbox';
    tc.checked = iam;
    tc.style.cssText = 'cursor:pointer;';
    tc.onchange = (e) => localStorage.setItem('preset_notes_append_mode', e.target.checked);
    let tlt = document.createElement('span');
    tlt.innerText = 'Append mode';
    tlt.style.cssText = 'color:#495057;font-weight:bold;';
    tr.appendChild(tc);
    tr.appendChild(tlt);
    tRow.appendChild(tr);

    let tr2 = document.createElement('label');
    tr2.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:10px;cursor:pointer;user-select:none;background:#f8f9fa;padding:6px;border-radius:4px;border:1px solid #e9ecef;flex:1;';
    let tc2 = document.createElement('input');
    tc2.type = 'checkbox';
    tc2.checked = hrm;
    tc2.style.cssText = 'cursor:pointer;';
    tc2.onchange = (e) => {
        localStorage.setItem('preset_hide_recent', e.target.checked);
        ov.remove();
        showMainModal();
    };
    let tlt2 = document.createElement('span');
    tlt2.innerText = 'Hide Clipboard History';
    tlt2.style.cssText = 'color:#495057;font-weight:bold;';
    tr2.appendChild(tc2);
    tr2.appendChild(tlt2);
    tRow.appendChild(tr2);
    box.appendChild(tRow);

    let cont = document.createElement('div');
    cont.style.cssText = 'overflow-y:auto;flex:1;padding-right:5px;margin-bottom:12px;';

    let tds = new Date().toLocaleDateString('en-US', {month:'2-digit', day:'2-digit', year:'numeric'});
    let serialNum = getSerialNumber();

    if (/enteralite\s*infinity/i.test(dt)) {
        let infBtn = document.createElement('button');
        infBtn.innerText = '⚡ Infinity Flat Rate Repair Calculation';
        infBtn.style.cssText = 'display:block;width:100%;padding:8px 10px;margin:4px 0;background:#e2f0cb;color:#2b542c;border:1px solid #b5d89c;border-radius:4px;cursor:pointer;font-size:12px;text-align:left;font-weight:bold;line-height:1.4;';
        infBtn.onclick = () => {
            let findings = calculateInfinityFlatRateFindings();
            if (findings) {
                ov.remove();
                addHistoryItem(findings);
                processTextSelection(findings);
            }
        };
        cont.appendChild(infBtn);
    }

    let db = document.createElement('button');
    db.innerText = 'Repairs declined...';
    db.style.cssText = 'display:block;width:100%;padding:8px 10px;margin:4px 0;background:#fff3cd;color:#856404;border:1px solid #ffeeba;border-radius:4px;cursor:pointer;font-size:12px;text-align:left;font-weight:bold;line-height:1.4;';
    db.onclick = () => {
        ov.remove();
        showDeclineActionModal();
    };
    cont.appendChild(db);

    let ab = document.createElement('button');
    ab.innerText = 'Repairs approved...';
    ab.style.cssText = 'display:block;width:100%;padding:8px 10px;margin:4px 0;background:#d4edda;color:#155724;border:1px solid #c3e6cb;border-radius:4px;cursor:pointer;font-size:12px;text-align:left;font-weight:bold;line-height:1.4;';
    ab.onclick = () => {
        ov.remove();
        showClientSelectModal('Repairs approved', false);
    };
    cont.appendChild(ab);

    if (!hrm && hist.length > 0) {
        let rHead = document.createElement('div');
        rHead.innerText = '⭐ Smart Clipboard History';
        rHead.style.cssText = 'font-size:11px;font-weight:bold;color:#666;margin:8px 0 2px 2px;';
        cont.appendChild(rHead);
        hist.forEach(hTxt => {
            let btn = document.createElement('button');
            btn.innerText = "⚡ " + hTxt;
            btn.style.cssText = 'display:block;width:100%;padding:8px 10px;margin:4px 0;background:#eef7fe;color:#0366d6;border:1px solid #c8e1ff;border-radius:4px;cursor:pointer;font-size:12px;text-align:left;line-height:1.4;';
            btn.onclick = () => {
                ov.remove();
                addHistoryItem(hTxt);
                processTextSelection(hTxt);
            };
            cont.appendChild(btn);
        });
    }

    let pHead = document.createElement('div');
    pHead.innerText = '📝 Standard Presets';
    pHead.style.cssText = 'font-size:11px;font-weight:bold;color:#666;margin:8px 0 2px 2px;';
    cont.appendChild(pHead);

    ph.forEach(txt => {
        let dtTxt = txt.replace(/\{DATE\}/gi, tds).replace(/\{SERIAL\}/gi, serialNum),
            cln = dtTxt.replace(/\s*\([^)]*\)\s*$/, '').trim(),
            btn = document.createElement('button');
        btn.innerText = dtTxt;
        btn.style.cssText = 'display:block;width:100%;padding:8px 10px;margin:4px 0;background:#f8f9fa;color:#212529;border:1px solid #ced4da;border-radius:4px;cursor:pointer;font-size:12px;text-align:left;line-height:1.4;';
        btn.onclick = () => {
            ov.remove();
            addHistoryItem(cln);
            processTextSelection(cln);
        };
        cont.appendChild(btn);
    });

    box.appendChild(cont);

    let eb = document.createElement('button');
    eb.innerText = '✏️ Edit Device Notes / Companies';
    eb.style.cssText = 'width:100%;padding:8px;margin-bottom:6px;background:#780034;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;';
    eb.onclick = () => {
        ov.remove();
        showEditModal();
    };
    box.appendChild(eb);

    let cb = document.createElement('button');
    cb.innerText = 'Cancel';
    cb.style.cssText = 'width:100%;padding:8px;background:#e0e0e0;color:#333;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;';
    cb.onclick = () => ov.remove();
    box.appendChild(cb);

    ov.appendChild(box);
    document.body.appendChild(ov);
}

function showDeclineActionModal() {
    let ex = document.getElementById('preset-notes-modal');
    if (ex) ex.remove();

    let ov = document.createElement('div');
    ov.id = 'preset-notes-modal';
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;';

    let box = document.createElement('div');
    box.style.cssText = 'background:#fff;padding:20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);width:400px;display:flex;flex-direction:column;color:#333;';
    applyUIScale(box);

    let h = document.createElement('h3');
    h.innerText = 'Select Decline Action';
    h.style.cssText = 'margin-top:0;margin-bottom:12px;font-size:16px;color:#222;text-align:center;';
    box.appendChild(h);

    [{
            label: "Asked to be disposed of here at biomed facility",
            actionText: "Repairs declined and asked to be disposed of"
        },
        {
            label: "Asked to be returned unrepaired",
            actionText: "Repairs declined and asked to be returned"
        }
    ].forEach(item => {
        let btn = document.createElement('button');
        btn.innerText = item.label;
        btn.style.cssText = 'display:block;width:100%;padding:10px;margin:6px 0;background:#f8f9fa;color:#212529;border:1px solid #ced4da;border-radius:4px;cursor:pointer;font-size:12px;text-align:left;font-weight:bold;line-height:1.4;';
        btn.onclick = () => {
            ov.remove();
            showClientSelectModal(item.actionText, false);
        };
        box.appendChild(btn);
    });

    let bBtn = document.createElement('button');
    bBtn.innerText = '← Back to Main Menu';
    bBtn.style.cssText = 'width:100%;padding:8px;margin-top:10px;background:#e0e0e0;color:#333;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;';
    bBtn.onclick = () => showMainModal();
    box.appendChild(bBtn);

    ov.appendChild(box);
    document.body.appendChild(ov);
}

function showClientSelectModal(ap, sao) {
    let map = getClientMapping(),
        cc = getCurrentCompany(),
        clients = [],
        allClientsObj = {};

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
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;';

    let box = document.createElement('div');
    box.style.cssText = 'background:#fff;padding:20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);width:450px;max-height:80vh;display:flex;flex-direction:column;color:#333;';
    applyUIScale(box);

    let h = document.createElement('h3');
    h.innerText = `Select Client (${sao ? 'All Clients' : cc})`;
    h.style.cssText = 'margin-top:0;margin-bottom:6px;font-size:16px;color:#222;text-align:center;';
    box.appendChild(h);

    let cont = document.createElement('div');
    cont.style.cssText = 'overflow-y:auto;flex:1;padding-right:5px;margin-bottom:12px;max-height:240px;';

    clients.forEach(client => {
        let ft = `${ap} by ${client}.`,
            btn = document.createElement('button');
        btn.innerText = client;
        btn.style.cssText = 'display:block;width:100%;padding:8px 10px;margin:4px 0;background:#f8f9fa;color:#212529;border:1px solid #ced4da;border-radius:4px;cursor:pointer;font-size:12px;text-align:left;line-height:1.4;';
        btn.onclick = () => {
            ov.remove();
            processTextSelection(ft);
        };
        cont.appendChild(btn);
    });
    box.appendChild(cont);

    let acBtn = document.createElement('button');
    acBtn.innerText = '+ Type New Client Name...';
    acBtn.style.cssText = 'width:100%;padding:6px;margin-bottom:8px;background:#e9ecef;color:#333;border:1px dashed #adb5bd;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;';
    acBtn.onclick = () => {
        let nc = prompt("Enter new client name:", "");
        if (nc && nc.trim()) {
            let cleanNc = nc.trim();
            if (!map[cc]) map[cc] = [];
            if (!map[cc].includes(cleanNc)) map[cc].push(cleanNc);
            localStorage.setItem('my_preset_client_mapping', JSON.stringify(map));
            ov.remove();
            processTextSelection(`${ap} by ${cleanNc}.`);
        }
    };
    box.appendChild(acBtn);

    if (sao) {
        let configClientBtn = document.createElement('button');
        configClientBtn.innerText = '✏️ Edit Configure Client/Companies';
        configClientBtn.style.cssText = 'width:100%;padding:6px;margin-bottom:8px;background:#780034;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;';
        configClientBtn.onclick = () => {
            ov.remove();
            showEditModal();
        };
        box.appendChild(configClientBtn);
    }

    if (!sao) {
        let sab = document.createElement('button');
        sab.innerText = '🌐 View All Clients Instead';
        sab.style.cssText = 'width:100%;padding:8px;margin-bottom:8px;background:#f0f0f0;color:#333;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;';
        sab.onclick = () => showClientSelectModal(ap, true);
        box.appendChild(sab);
    }

    let bRow = document.createElement('div');
    bRow.style.cssText = 'display:flex;gap:8px;';

    let bBtn = document.createElement('button');
    bBtn.innerText = '← Back';
    bBtn.style.cssText = 'flex:1;padding:8px;background:#e0e0e0;color:#333;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;';
    bBtn.onclick = () => ap.includes('declined') ? showDeclineActionModal() : showMainModal();
    bRow.appendChild(bBtn);

    if (!sao) {
        let ecBtn = document.createElement('button');
        ecBtn.innerText = '✏️ Edit';
        ecBtn.style.cssText = 'flex:1;padding:8px;background:#780034;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;';
        ecBtn.onclick = () => {
            ov.remove();
            showEditModal();
        };
        bRow.appendChild(ecBtn);
    }
    box.appendChild(bRow);

    ov.appendChild(box);
    document.body.appendChild(ov);
}

function showEditModal() {
    let dt = getDeviceType(),
        ph = [...getPhrasesForDevice(dt)],
        map = getClientMapping();

    let ex = document.getElementById('preset-notes-modal');
    if (ex) ex.remove();

    let ov = document.createElement('div');
    ov.id = 'preset-notes-modal';
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;';

    let box = document.createElement('div');
    box.style.cssText = 'background:#fff;padding:20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);width:500px;max-height:85vh;display:flex;flex-direction:column;color:#333;';
    applyUIScale(box);

    let title = document.createElement('h3');
    title.innerText = "Edit Configuration";
    title.style.cssText = "margin-top:0;color:#333;font-size:16px;text-align:center;";
    box.appendChild(title);

    let sa = document.createElement('div');
    sa.style.cssText = "flex-grow:1;overflow-y:auto;margin-bottom:15px;padding-right:5px;max-height:350px;";

    // UI Scale Settings Block
    let scaleHeader = document.createElement('h4');
    scaleHeader.innerText = "🖥️ UI Scale Setting";
    scaleHeader.style.cssText = "margin:0 0 6px 0;font-size:13px;color:#444;";
    sa.appendChild(scaleHeader);

    let scaleContainer = document.createElement('div');
    scaleContainer.style.cssText = "border:1px solid #ddd;padding:8px;border-radius:4px;margin-bottom:12px;background:#fdfdfd;display:flex;align-items:center;justify-content:space-between;gap:8px;";
    
    let scaleLabel = document.createElement('span');
    updateScaleLabel();
    scaleLabel.style.cssText = "font-size:12px;font-weight:bold;color:#333;";
    scaleContainer.appendChild(scaleLabel);

    function updateScaleLabel() {
        let current = Math.round(getUIScale() * 100);
        scaleLabel.innerText = `Current Scale: ${current}%`;
    }

    let scaleBtnGroup = document.createElement('div');
    scaleBtnGroup.style.cssText = "display:flex;gap:4px;";

    let minusBtn = document.createElement('button');
    minusBtn.innerText = "-";
    minusBtn.style.cssText = "padding:4px 10px;background:#e0e0e0;border:none;border-radius:3px;cursor:pointer;font-weight:bold;";
    minusBtn.onclick = () => {
        setUIScale(getUIScale() - 0.1);
        updateScaleLabel();
        box.style.transform = `scale(${getUIScale()})`;
    };
    scaleBtnGroup.appendChild(minusBtn);

    let resetBtn = document.createElement('button');
    resetBtn.innerText = "100%";
    resetBtn.style.cssText = "padding:4px 8px;background:#f0f0f0;border:1px solid #ccc;border-radius:3px;cursor:pointer;font-size:11px;";
    resetBtn.onclick = () => {
        setUIScale(1.0);
        updateScaleLabel();
        box.style.transform = `scale(1)`;
    };
    scaleBtnGroup.appendChild(resetBtn);

    let plusBtn = document.createElement('button');
    plusBtn.innerText = "+";
    plusBtn.style.cssText = "padding:4px 10px;background:#e0e0e0;border:none;border-radius:3px;cursor:pointer;font-weight:bold;";
    plusBtn.onclick = () => {
        setUIScale(getUIScale() + 0.1);
        updateScaleLabel();
        box.style.transform = `scale(${getUIScale()})`;
    };
    scaleBtnGroup.appendChild(plusBtn);

    scaleContainer.appendChild(scaleBtnGroup);
    sa.appendChild(scaleContainer);

    let nl = document.createElement('h4');
    nl.innerText = `Notes for Device: ${dt} (supports {DATE} & {SERIAL})`;
    nl.style.cssText = "margin:0 0 6px 0;font-size:13px;color:#444;";
    sa.appendChild(nl);

    let nc = document.createElement('div');
    nc.style.cssText = "border:1px solid #ddd;padding:8px;border-radius:4px;margin-bottom:12px;background:#fdfdfd;";

    function rnl() {
        nc.innerHTML = '';
        if (ph.length === 0) {
            let em = document.createElement('div');
            em.innerText = "No notes configured yet.";
            em.style.cssText = "font-size:11px;color:#888;font-style:italic;padding:4px;";
            nc.appendChild(em);
            return;
        }
        ph.forEach((nt, i) => {
            let r = document.createElement('div');
            r.style.cssText = "display:flex;gap:6px;margin-bottom:6px;align-items:center;";
            let inp = document.createElement('input');
            inp.type = 'text';
            inp.value = nt;
            inp.style.cssText = "flex-grow:1;padding:5px;border:1px solid #ccc;border-radius:3px;font-size:11px;";
            inp.onchange = (e) => ph[i] = e.target.value.trim();
            r.appendChild(inp);

            let db = document.createElement('button');
            db.innerText = "X";
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
    anb.innerText = "+ Add Note";
    anb.style.cssText = "background:#f0f0f0;color:#333;border:1px solid #ccc;padding:5px;border-radius:4px;cursor:pointer;margin-bottom:15px;font-weight:bold;font-size:11px;width:100%;";
    anb.onclick = () => {
        ph.push("");
        rnl();
    };
    sa.appendChild(anb);

    let cl = document.createElement('h4');
    cl.innerText = "Companies & Clients Mapping";
    cl.style.cssText = "margin:0 0 6px 0;font-size:13px;color:#444;";
    sa.appendChild(cl);

    let ccBox = document.createElement('div');
    ccBox.style.cssText = "border:1px solid #ddd;padding:8px;border-radius:4px;background:#fdfdfd;margin-bottom:8px;";

    function rcm() {
        ccBox.innerHTML = '';
        Object.keys(map).sort((a, b) => a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)).forEach(comp => {
            let cb = document.createElement('div');
            cb.style.cssText = "margin-bottom:10px;border-bottom:1px dashed #eee;padding-bottom:8px;";

            let cHeader = document.createElement('div');
            cHeader.style.cssText = "display:flex;gap:6px;margin-bottom:4px;align-items:center;";

            let cInp = document.createElement('input');
            cInp.type = 'text';
            cInp.value = comp;
            cInp.style.cssText = "flex-grow:1;font-weight:bold;font-size:11px;color:#780034;padding:4px;border:1px solid #ccc;border-radius:3px;background:#fff;";
            cInp.onchange = (e) => {
                let newComp = e.target.value.trim();
                if (newComp && newComp !== comp) {
                    map[newComp] = map[comp];
                    delete map[comp];
                    rcm();
                }
            };
            cHeader.appendChild(cInp);

            let delCompBtn = document.createElement('button');
            delCompBtn.innerText = "🗑️ Company";
            delCompBtn.style.cssText = "background:#d9534f;color:#fff;border:none;padding:3px 6px;border-radius:3px;cursor:pointer;font-size:10px;font-weight:bold;";
            delCompBtn.onclick = () => {
                if (confirm(`Delete entire company "${comp}"?`)) {
                    delete map[comp];
                    rcm();
                }
            };
            cHeader.appendChild(delCompBtn);
            cb.appendChild(cHeader);

            if (!Array.isArray(map[comp])) map[comp] = [];
            map[comp].forEach((cn, ci) => {
                let r = document.createElement('div');
                r.style.cssText = "display:flex;gap:6px;margin-bottom:4px;align-items:center;padding-left:12px;";

                let ci2 = document.createElement('input');
                ci2.type = 'text';
                ci2.value = cn;
                ci2.style.cssText = "flex-grow:1;padding:4px;border:1px solid #ccc;border-radius:3px;font-size:11px;";
                ci2.onchange = (e) => map[comp][ci] = e.target.value.trim();
                r.appendChild(ci2);

                let cd = document.createElement('button');
                cd.innerText = "X";
                cd.style.cssText = "background:#6c757d;color:#fff;border:none;padding:3px 6px;border-radius:3px;cursor:pointer;font-size:10px;font-weight:bold;";
                cd.onclick = () => {
                    map[comp].splice(ci, 1);
                    rcm();
                };
                r.appendChild(cd);
                cb.appendChild(r);
            });

            let acb = document.createElement('button');
            acb.innerText = `+ Add Client to ${comp}`;
            acb.style.cssText = "background:#f9f9f9;color:#333;border:1px solid #ccc;padding:3px;border-radius:3px;cursor:pointer;font-size:10px;width:calc(100% - 12px);margin-left:12px;margin-top:2px;";
            acb.onclick = () => {
                map[comp].push("New Client");
                rcm();
            };
            cb.appendChild(acb);
            ccBox.appendChild(cb);
        });
    }
    rcm();
    sa.appendChild(ccBox);

    let addCompBtn = document.createElement('button');
    addCompBtn.innerText = "+ Add Company";
    addCompBtn.style.cssText = "background:#e2f0cb;color:#2b542c;border:1px solid #b5d89c;padding:6px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:11px;width:100%;margin-bottom:8px;";
    addCompBtn.onclick = () => {
        let nc = prompt("Enter new company name:", "");
        if (nc && nc.trim()) {
            let cleanNc = nc.trim();
            if (!map[cleanNc]) map[cleanNc] = [];
            rcm();
        }
    };
    sa.appendChild(addCompBtn);

    box.appendChild(sa);

    let btnRow = document.createElement('div');
    btnRow.style.cssText = "display:flex;gap:8px;";

    let sv = document.createElement('button');
    sv.innerText = "Save & Apply";
    sv.style.cssText = "flex:1;padding:8px;background:#28a745;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;";
    sv.onclick = () => {
        let mObj = {};
        let s = localStorage.getItem('device_preset_notes');
        if (s) {
            try {
                mObj = JSON.parse(s);
            } catch (e) {}
        }
        mObj[dt] = ph.map(x => x.trim()).filter(x => x);
        localStorage.setItem('device_preset_notes', JSON.stringify(mObj));
        localStorage.setItem('my_preset_client_mapping', JSON.stringify(map));
        ov.remove();
        showMainModal();
    };
    btnRow.appendChild(sv);

    let clBtn = document.createElement('button');
    clBtn.innerText = "Cancel";
    clBtn.style.cssText = "flex:1;padding:8px;background:#e0e0e0;color:#333;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;";
    clBtn.onclick = () => {
        ov.remove();
        showMainModal();
    };
    btnRow.appendChild(clBtn);

    box.appendChild(btnRow);
    ov.appendChild(box);
    document.body.appendChild(ov);
}
