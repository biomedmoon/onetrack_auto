(function() {
    let existing = document.getElementById('te-config-modal');
    if (existing) existing.remove();

    let rawMapping = localStorage.getItem('te_custom_mapping'),
        mapping = {};
    try {
        mapping = rawMapping ? JSON.parse(rawMapping) : {
            "Sapphire": {
                pm: ["TE: 12345"],
                repair: ["TE: 54321"]
            },
            "Curlin 6000 CMS": {
                pm: ["TE: 67890"],
                repair: ["TE: 09876"]
            }
        };
    } catch (e) {
        mapping = {};
    }

    let overlay = document.createElement('div');
    overlay.id = 'te-config-modal';
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);z-index:10000;display:flex;justify-content:center;align-items:center;font-family:sans-serif;";

    let card = document.createElement('div');
    card.style.cssText = "background:#fff;padding:20px;border-radius:8px;width:580px;max-height:85vh;box-shadow:0 4px 12px rgba(0,0,0,0.15);display:flex;flex-direction:column;";

    let title = document.createElement('h3');
    title.innerText = "Test Equipment Configuration Manager";
    title.style.cssText = "margin-top:0;color:#333;font-size:16px;text-align:center;";
    card.appendChild(title);

    let listContainer = document.createElement('div');
    listContainer.id = 'te-list-container';
    listContainer.style.cssText = "flex-grow:1;overflow-y:auto;margin-bottom:15px;border:1px solid #ddd;padding:10px;border-radius:4px;max-height:420px;";
    card.appendChild(listContainer);

    function renderList() {
        listContainer.innerHTML = '';
        Object.keys(mapping).forEach((devName) => {
            let devBox = document.createElement('div');
            devBox.className = 'te-device-box';
            devBox.dataset.originalName = devName;
            devBox.style.cssText = "background:#f9f9f9;padding:10px;margin-bottom:12px;border-radius:4px;border:1px solid #e0e0e0;";

            let topRow = document.createElement('div');
            topRow.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;";

            let nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = devName;
            nameInput.className = 'te-device-name-input';
            nameInput.style.cssText = "flex-grow:1;padding:4px;font-weight:bold;border:1px solid #ccc;border-radius:3px;margin-right:8px;";
            topRow.appendChild(nameInput);

            let delDevBtn = document.createElement('button');
            delDevBtn.innerText = "Delete Device";
            delDevBtn.style.cssText = "background:#d9534f;color:#fff;border:none;padding:4px 8px;border-radius:3px;cursor:pointer;font-size:11px;";
            delDevBtn.onclick = () => {
                delete mapping[devName];
                renderList();
            };
            topRow.appendChild(delDevBtn);
            devBox.appendChild(topRow);

            let dataObj = mapping[devName];
            if (typeof dataObj !== 'object' || dataObj === null) {
                dataObj = { pm: ["TE: "], repair: ["TE: "] };
            } else {
                if (typeof dataObj.pm === 'string') dataObj.pm = [dataObj.pm];
                else if (!Array.isArray(dataObj.pm)) dataObj.pm = ["TE: "];
                if (typeof dataObj.repair === 'string') dataObj.repair = [dataObj.repair];
                else if (!Array.isArray(dataObj.repair)) dataObj.repair = ["TE: "];
            }
            mapping[devName] = dataObj;

            let fieldsContainer = document.createElement('div');
            fieldsContainer.style.cssText = "display:flex;flex-direction:column;gap:10px;padding-left:5px;";

            function renderSection(labelTitle, keyName, accentColor) {
                let sectionDiv = document.createElement('div');
                sectionDiv.style.cssText = "display:flex;flex-direction:column;gap:4px;";

                let headerRow = document.createElement('div');
                headerRow.style.cssText = "display:flex;justify-content:space-between;align-items:center;";

                let label = document.createElement('span');
                label.innerText = labelTitle;
                label.style.cssText = `font-size:11px;font-weight:bold;color:${accentColor};`;
                headerRow.appendChild(label);

                let addBtn = document.createElement('button');
                addBtn.innerText = "+ Add";
                addBtn.style.cssText = "background:#f0f0f0;color:#333;border:1px solid #ccc;padding:1px 6px;border-radius:3px;cursor:pointer;font-size:10px;font-weight:bold;";
                addBtn.onclick = () => {
                    collectCurrentDOMData();
                    mapping[devName][keyName].push("TE: ");
                    renderList();
                };
                headerRow.appendChild(addBtn);
                sectionDiv.appendChild(headerRow);

                let listDiv = document.createElement('div');
                listDiv.style.cssText = "display:flex;flex-direction:column;gap:4px;padding-left:10px;";
                let listClass = keyName === 'repair' ? 'te-repair-input' : 'te-pm-input';

                dataObj[keyName].forEach((val, index) => {
                    let row = document.createElement('div');
                    row.style.cssText = "display:flex;gap:6px;align-items:center;";

                    let input = document.createElement('input');
                    input.type = 'text';
                    input.value = val;
                    input.className = listClass;
                    input.style.cssText = "flex-grow:1;padding:3px;border:1px solid #ccc;border-radius:3px;font-family:monospace;font-size:12px;";
                    row.appendChild(input);

                    let delBtn = document.createElement('button');
                    delBtn.innerText = "X";
                    delBtn.style.cssText = "background:#d9534f;color:#fff;border:none;padding:3px 6px;border-radius:3px;cursor:pointer;font-size:10px;font-weight:bold;";
                    delBtn.onclick = () => {
                        dataObj[keyName].splice(index, 1);
                        renderList();
                    };
                    row.appendChild(delBtn);
                    listDiv.appendChild(row);
                });

                sectionDiv.appendChild(listDiv);
                return sectionDiv;
            }

            fieldsContainer.appendChild(renderSection("PM TE Setups:", "pm", "#555"));
            fieldsContainer.appendChild(renderSection("Repair TE Setups:", "repair", "#780034"));
            devBox.appendChild(fieldsContainer);
            listContainer.appendChild(devBox);
        });
    }

    function collectCurrentDOMData() {
        let newMapping = {};
        let devBoxes = listContainer.querySelectorAll('.te-device-box');
        devBoxes.forEach(box => {
            let nameInput = box.querySelector('.te-device-name-input');
            let devName = nameInput ? nameInput.value.trim() : '';
            if (!devName) return;

            let repairArr = [];
            box.querySelectorAll('.te-repair-input').forEach(inp => {
                if (inp.value.trim()) repairArr.push(inp.value.trim());
            });

            let pmArr = [];
            box.querySelectorAll('.te-pm-input').forEach(inp => {
                if (inp.value.trim()) pmArr.push(inp.value.trim());
            });

            newMapping[devName] = { pm: pmArr, repair: repairArr };
        });
        mapping = newMapping;
    }

    renderList();

    let addDevBtn = document.createElement('button');
    addDevBtn.innerText = "+ Add New Device Type";
    addDevBtn.style.cssText = "background:#f0f0f0;color:#333;border:1px solid #ccc;padding:6px;border-radius:4px;cursor:pointer;margin-bottom:15px;font-weight:bold;width:100%;";
    addDevBtn.onclick = () => {
        collectCurrentDOMData();
        let newName = prompt("Enter new device name/type:", "New Device");
        if (newName && newName.trim()) {
            mapping[newName.trim()] = { pm: ["TE: "], repair: ["TE: "] };
            renderList();
        }
    };
    card.appendChild(addDevBtn);

    let btnContainer = document.createElement('div');
    btnContainer.style.cssText = "display:flex;justify-content:flex-end;gap:10px;";

    let cancelBtn = document.createElement('button');
    cancelBtn.innerText = "Cancel";
    cancelBtn.style.cssText = "padding:6px 12px;background:#e0e0e0;border:none;border-radius:4px;cursor:pointer;";
    cancelBtn.onclick = () => overlay.remove();
    btnContainer.appendChild(cancelBtn);

    let saveBtn = document.createElement('button');
    saveBtn.innerText = "Save Configuration";
    saveBtn.style.cssText = "padding:6px 12px;background:#780034;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;";
    saveBtn.onclick = () => {
        collectCurrentDOMData();
        localStorage.setItem('te_custom_mapping', JSON.stringify(mapping));
        overlay.remove();
        let notification = document.createElement('div');
        notification.innerText = "TE Mapping successfully updated!";
        notification.style.cssText = "position:fixed;top:20px;right:20px;background:#780034;color:#fff;padding:10px 15px;z-index:9999;border-radius:4px;font-family:sans-serif;font-size:12px;";
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    };
    btnContainer.appendChild(saveBtn);
    card.appendChild(btnContainer);

    overlay.appendChild(card);
    document.body.appendChild(overlay);
})();
