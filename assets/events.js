"use strict";

var allInputs = document.querySelectorAll('fieldset input');
var allSelects = document.querySelectorAll('fieldset select');

synthHistoryInit();

for (let input of allInputs) {
    input.addEventListener('input', function(event) {
        let item = event.target;

        setBadgeValue(item, item.value);

        synthHistoryAdd(item.id, item.value);

        sendMessage(item.name, item.value);
    });

    if (input.type === "range") {
        input.addEventListener('change', function(event) {
            updateStatusForControl(event.target);
        });
    }

    // Initialize badges
    if (input.type === "range") {
        setBadgeValue(input, input.getAttribute('default'));
    }
}

for (let select of allSelects) {
    select.addEventListener('change', function(event) {
        let item = event.target;

        synthHistoryAdd(item.id, item.value);

        updateStatusForControl(item);
        sendMessage(item.name, item.value);
    });
}


var exportBtn = document.querySelector('#export');
var getPatchBtn = document.querySelector('#getPatch');
var resetBtn = document.querySelector('#reset');

exportBtn.addEventListener('click', function(event) {
    writeSysexFile(getData());
});

getPatchBtn.addEventListener('click', function(event) {
    console.log('Get Current Selected Patch');
    getCurrentSelectedPatch();
});

resetBtn.addEventListener('click', function(event) {
    console.log('Reset all values');

    resetPatch();
});

var synthSelect = document.querySelector("#synth");

synthSelect.addEventListener('change', function(event) {
    var containers;
    var newCssClass;
    var oldCssClass;

    if (event.target.value == "1") {
        oldCssClass = "synth2";
        newCssClass = "synth1";
    } else {
        oldCssClass = "synth1";
        newCssClass = "synth2";
    }
    containers = document.querySelectorAll('.' + oldCssClass);

    for (var i=0; i < containers.length ; i++) {
        var container = containers[i];
        container.classList.remove(oldCssClass);
        container.classList.add(newCssClass);
    }
});

var synthTabs = document.querySelectorAll('.synth-tabs a');

for (let synthTab of synthTabs) {
    synthTab.addEventListener('click', function(event) {
        var tab = event.target;
        var containers = document.querySelectorAll('*[tabId="' + tab.getAttribute('tab') + '"]')

        tab.classList.toggle('active');

        for (let container of containers) {
            if (tab.classList.contains('active')) {
                container.hidden = false;
            } else {
                container.hidden = true;
            }

        }
    });
}

var macroTabLists = document.querySelectorAll('.nav-pills[role="tablist"]');

for (let tabList of macroTabLists) {
    let macroTabs = tabList.querySelectorAll('a[role="tab"][href^="#"]');

    for (let macroTab of macroTabs) {
        macroTab.setAttribute('aria-selected', macroTab.classList.contains('active'));
        macroTab.tabIndex = macroTab.classList.contains('active') ? 0 : -1;

        macroTab.addEventListener('click', function(event) {
            var tab = event.currentTarget;
            var panelId = tab.getAttribute('href').slice(1);
            var panel = document.getElementById(panelId);
            var tabContent = tabList.nextElementSibling;

            if (!panel || !tabContent || !tabContent.contains(panel)) {
                return;
            }

            event.preventDefault();

            for (let siblingTab of macroTabs) {
                var isActive = siblingTab === tab;
                siblingTab.classList.toggle('active', isActive);
                siblingTab.setAttribute('aria-selected', isActive);
                siblingTab.tabIndex = isActive ? 0 : -1;
            }

            for (let siblingPanel of tabContent.querySelectorAll('.tab-pane')) {
                siblingPanel.classList.toggle('active', siblingPanel === panel);
            }
        });
    }

    tabList.addEventListener('keydown', function(event) {
        var activeTabIndex = Array.from(macroTabs).indexOf(document.activeElement);
        var nextTabIndex;

        if (event.key === 'ArrowRight') {
            nextTabIndex = (activeTabIndex + 1) % macroTabs.length;
        } else if (event.key === 'ArrowLeft') {
            nextTabIndex = (activeTabIndex - 1 + macroTabs.length) % macroTabs.length;
        } else if (event.key === 'Home') {
            nextTabIndex = 0;
        } else if (event.key === 'End') {
            nextTabIndex = macroTabs.length - 1;
        } else {
            return;
        }

        event.preventDefault();
        macroTabs[nextTabIndex].focus();
        macroTabs[nextTabIndex].click();
    });
}

var undoBtn = document.querySelector('#undo');

undoBtn.addEventListener('click', function(event) {
    synthHistoryUndo();
});
