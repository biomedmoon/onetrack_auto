(function() {
    let customMapping = localStorage.getItem('te_custom_mapping');
    let teMapping = {};
    if (customMapping) {
        try {
            teMapping = JSON.parse(customMapping);
        } catch(e) {
            teMapping = {};
        }
    }

    let deviceName = "";
    const allElements = Array.from(document.querySelectorAll('*'));
    const descEl = allElements.find(el => el.childNodes.length === 1 && el.textContent.trim() === 'Description');
    if (descEl) {
        let parent = descEl.parentElement;
        if (parent) {
            let fullText = parent.textContent.trim();
            let cleaned = fullText.replace('Description', '').trim();
            if (cleaned) {
                deviceName = cleaned;
            }
        }
    }

    if (!deviceName) {
        let pageText = document.body.innerText;
        for (let key of Object.keys(teMapping)) {
            if (pageText.includes(key)) {
                deviceName = key;
                break;
            }
        }
    }

    if (!deviceName) {
        let allTds = Array.from(document.querySelectorAll('td, th, div, span'));
        let descLabelIndex = allTds.findIndex(el => el.textContent.trim() === 'Description');
        if (descLabelIndex !== -1 && allTds[descLabelIndex + 1]) {
            let candidate = allTds[descLabelIndex + 1].textContent.trim();
            if (candidate) {
                deviceName = candidate;
            }
        }
    }

    function executeScriptWithId(equipmentString) {
        navigator.clipboard.writeText(equipmentString).then(() => {
            const notification = document.createElement('div');
            notification.innerText = `Copied: ${equipmentString}`;
            notification.style.cssText = "position:fixed;top:20px;right:20px;background:#780034;color:#fff;padding:10px 15px;z-index:9999;border-radius:4px;font-family:sans-serif;";
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 2000);
        }).catch(err => {
            console.error('Clipboard copy failed:', err);
        });

        function createModal(title, options, callback) {
            let overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;';
            
            let box = document.createElement('div');
            box.style.cssText = 'background:#fff;padding:20px;border-radius:8px;box-shadow:0 4px 10px rgba(0,0,0,0.3);min-width:300px;max-width:400px;text-align:center;color:#333;';
            
            let heading = document.createElement('h3');
            heading.innerText = title;
            heading.style.cssText = 'margin-top:0;margin-bottom:15px;font-size:16px;color:#222;';
            box.appendChild(heading);

            options.forEach(opt => {
                let btn = document.createElement('button');
                btn.innerText = opt;
                btn.style.cssText = 'display:block;width:100%;padding:10px;margin:6px 0;background:#780034;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;font-weight:bold;';
                btn.onclick = () => {
                    document.body.removeChild(overlay);
                    callback(opt);
                };
                box.appendChild(btn);
            });

            overlay.appendChild(box);
            document.body.appendChild(overlay);
        }

        let rows = Array.from(document.querySelectorAll('tr'));
        function processNextRow(index) {
            if (index >= rows.length) return;
            let tr = rows[index];
            let label = tr.querySelector('td:nth-child(1)');
            let exp = tr.querySelector('td:nth-child(2)');
            let sel = tr.querySelector('select');
            let txt = tr.querySelector('input[type="text"], input:not([type]), textarea');
            let labelText = label ? label.innerText.trim().toLowerCase() : '';

            let fillValue = (val) => {
                if (sel) {
                    for (let opt of sel.options) {
                        let optText = opt.text.trim().toLowerCase();
                        let targetVal = val.toLowerCase();
                        if (optText === targetVal || (targetVal === 'yes' && optText === 'yes')) {
                            sel.value = opt.value;
                            sel.dispatchEvent(new Event('change', {bubbles:true}));
                            break;
                        }
                    }
                }
                if (txt) {
                    txt.value = val;
                    txt.dispatchEvent(new Event('input', {bubbles:true}));
                    txt.dispatchEvent(new Event('change', {bubbles:true}));
                }
                processNextRow(index + 1);
            };

            if (deviceName.toLowerCase().includes('curlin') && labelText.includes('latest software version installed')) {
                createModal('Select Latest Software Version', ['0106', '0106(M)'], fillValue);
                return;
            }

            if (deviceName.toLowerCase().includes('curlin') && labelText.includes('confirm software version 2.04 or greater')) {
                let opts = ['2.04 - F5 - B0', '2.04 - F6 - B1', '2.04 - F6 - B2', '2.05 - F5 - B0', '2.05 - F6 - B1', '2.05 - F6 - B2', '2.05 - F6 - B3'];
                createModal('Select Software Version', opts, fillValue);
                return;
            }

            if (exp) {
                let targetText = exp.innerText.trim();
                if (targetText === 'PASS' && sel) {
                    for (let opt of sel.options) {
                        if (opt.text.trim() === 'PASS') {
                            sel.value = opt.value;
                            sel.dispatchEvent(new Event('change', { bubbles: true }));
                            break;
                        }
                    }
                    processNextRow(index + 1);
                } else {
                    fillValue(targetText);
                }
            } else {
                processNextRow(index + 1);
            }
        }
        processNextRow(0);
    }

    if (deviceName) {
        if (teMapping.hasOwnProperty(deviceName)) {
            let entry = teMapping[deviceName];
            let pmList = [];
            if (typeof entry === 'object' && entry !== null) {
                if (Array.isArray(entry.pm)) {
                    pmList = entry.pm;
                } else if (typeof entry.pm === 'string') {
                    pmList = [entry.pm];
                }
            } else if (Array.isArray(entry)) {
                pmList = entry;
            } else if (typeof entry === 'string') {
                pmList = [entry];
            }

            if (pmList.length > 1) {
                let overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;';
                
                let box = document.createElement('div');
                box.style.cssText = 'background:#fff;padding:20px;border-radius:8px;box-shadow:0 4px 10px rgba(0,0,0,0.3);min-width:320px;max-width:450px;text-align:center;color:#333;';
                
                let heading = document.createElement('h3');
                heading.innerText = `Select PM Setup ID for "${deviceName}"`;
                heading.style.cssText = 'margin-top:0;margin-bottom:15px;font-size:16px;color:#222;';
                box.appendChild(heading);

                pmList.forEach(idOption => {
                    let btn = document.createElement('button');
                    btn.innerText = idOption;
                    btn.style.cssText = 'display:block;width:100%;padding:10px;margin:6px 0;background:#780034;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;font-weight:bold;';
                    btn.onclick = () => {
                        document.body.removeChild(overlay);
                        executeScriptWithId(idOption);
                    };
                    box.appendChild(btn);
                });

                let editBtn = document.createElement('button');
                editBtn.innerText = 'Edit TE Configuration';
                editBtn.style.cssText = 'display:block;width:100%;padding:10px;margin:6px 0;background:#444;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;font-weight:bold;';
                editBtn.onclick = () => {
                    document.body.removeChild(overlay);
                    let editOverlay = document.createElement('div');
                    editOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;';
                    
                    let editBox = document.createElement('div');
                    editBox.style.cssText = 'background:#fff;padding:20px;border-radius:8px;box-shadow:0 4px 10px rgba(0,0,0,0.3);min-width:320px;max-width:450px;text-align:center;color:#333;';
                    
                    let editHeading = document.createElement('h3');
                    editHeading.innerText = `Edit TE IDs for "${deviceName}"`;
                    editHeading.style.cssText = 'margin-top:0;margin-bottom:10px;font-size:16px;color:#222;';
                    editBox.appendChild(editHeading);

                    let labelTip = document.createElement('p');
                    labelTip.innerText = 'Enter each PM Test Equipment ID on a separate line:';
                    labelTip.style.cssText = 'font-size:12px;color:#666;margin-bottom:10px;text-align:left;';
                    editBox.appendChild(labelTip);

                    let textarea = document.createElement('textarea');
                    textarea.value = pmList.join('\n');
                    textarea.style.cssText = 'width:100%;height:100px;padding:8px;box-sizing:border-box;border:1px solid #ccc;border-radius:4px;font-family:sans-serif;font-size:14px;margin-bottom:12px;';
                    editBox.appendChild(textarea);

                    let saveBtn = document.createElement('button');
                    saveBtn.innerText = 'Save Changes';
                    saveBtn.style.cssText = 'display:block;width:100%;padding:10px;margin:6px 0;background:#780034;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;font-weight:bold;';
                    saveBtn.onclick = () => {
                        let newPmArray = textarea.value.split('\n').map(s => s.trim()).filter(Boolean);
                        if (!teMapping[deviceName] || typeof teMapping[deviceName] !== 'object' || Array.isArray(teMapping[deviceName])) {
                            teMapping[deviceName] = { pm: [], repair: [] };
                        }
                        teMapping[deviceName].pm = newPmArray;
                        localStorage.setItem('te_custom_mapping', JSON.stringify(teMapping, null, 2));
                        document.body.removeChild(editOverlay);
                        alert('Configuration updated successfully!');
                    };
                    editBox.appendChild(saveBtn);

                    let backBtn = document.createElement('button');
                    backBtn.innerText = 'Cancel';
                    backBtn.style.cssText = 'display:block;width:100%;padding:10px;margin:6px 0;background:#ccc;color:#333;border:none;border-radius:4px;cursor:pointer;font-size:14px;font-weight:bold;';
                    backBtn.onclick = () => {
                        document.body.removeChild(editOverlay);
                    };
                    editBox.appendChild(backBtn);

                    editOverlay.appendChild(editBox);
                    document.body.appendChild(editOverlay);
                };
                box.appendChild(editBtn);

                let cancelBtn = document.createElement('button');
                cancelBtn.innerText = 'Cancel';
                cancelBtn.style.cssText = 'display:block;width:100%;padding:10px;margin:6px 0;background:#ccc;color:#333;border:none;border-radius:4px;cursor:pointer;font-size:14px;font-weight:bold;';
                cancelBtn.onclick = () => {
                    document.body.removeChild(overlay);
                };
                box.appendChild(cancelBtn);

                overlay.appendChild(box);
                document.body.appendChild(overlay);
                return;
            } else if (pmList.length === 1) {
                executeScriptWithId(pmList[0]);
                return;
            }
        }

        let newId = prompt(`New device detected: "${deviceName}"\n\nEnter the PM test equipment identifier for this device:`, "TE: ");
        if (newId) {
            if (!teMapping[deviceName] || typeof teMapping[deviceName] !== 'object' || Array.isArray(teMapping[deviceName])) {
                teMapping[deviceName] = { pm: [], repair: [] };
            }
            teMapping[deviceName].pm = [newId];
            localStorage.setItem('te_custom_mapping', JSON.stringify(teMapping, null, 2));
            executeScriptWithId(newId);
            return;
        }
    } else {
        let manualDevice = prompt("Could not automatically detect device description.\n\nPlease confirm or edit the device name/type below:", "Sapphire");
        if (manualDevice) {
            let newId = prompt(`Enter the PM test equipment identifier for "${manualDevice}":`, "TE: ");
            if (newId) {
                if (!teMapping[manualDevice] || typeof teMapping[manualDevice] !== 'object' || Array.isArray(teMapping[manualDevice])) {
                    teMapping[manualDevice] = { pm: [], repair: [] };
                }
                teMapping[manualDevice].pm = [newId];
                localStorage.setItem('te_custom_mapping', JSON.stringify(teMapping, null, 2));
                executeScriptWithId(newId);
                return;
            }
        }
    }
})();
