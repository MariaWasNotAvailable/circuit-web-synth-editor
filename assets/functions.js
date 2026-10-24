"use strict";

var synthHistory = [];
var synthHistoryValues = {};

function controllerChange(channel, controller, value) {
    var input = document.querySelector('[name="' + controller +'"]');
    input.value = value;

    setBadgeValue(input, value);
    updateStatusForControl(input);

    synthHistoryAdd(input.id, value);
}

function updateStatusForControl(control) {
    var label = Array.from(document.querySelectorAll('label[for]'))
        .find(function (item) { return item.htmlFor === control.id; });
    var fieldset = control.closest('fieldset');
    var legend = fieldset && fieldset.querySelector('legend');
    var groupName = legend ? legend.textContent.trim().replace(/^Oscillator\s+/i, 'Osc ') : '';
    var controlName = label ? label.textContent.trim() : control.id;
    var status = document.querySelector('#status');
    if (status.classList.contains('text-danger') || status.dataset.connectionState === 'waiting') {
        return;
    }

    var description = [groupName, controlName].filter(Boolean).join(': ');

    status.textContent = description + ': ' + control.value;
}

function dialogBox(question) {
    return confirm(question + "\n\nAre you sure?");
}

function extractSynthValuesFromDOM(items) {
    let synthData = [];

    for (var i = 0; i < items.length; i++) {
        synthData.push(parseInt(items[i].value));
    }

    // Set LFO exceptions values
    synthData.splice(59, 1, getLFO(1));
    synthData.splice(68, 1, getLFO(2));

    return synthData;
}

function getLFO(lfo) {
    var data = 0;

    var lfoFadeModeChoice = document.querySelector('#lfo_' + lfo + '_fade_mode').value;
    var lfoDelayTriggerChoice = document.querySelector('#lfo_' + lfo + '_delay_trigger').value;
    var lfoCommonSyncChoice = document.querySelector('#lfo_' + lfo + '_common_sync').value;
    var lfoKeySyncChoice = document.querySelector('#lfo_' + lfo + '_key_sync').value;
    var lfoOneShotChoice = document.querySelector('#lfo_' + lfo + '_one_shot').value;

    console.log(lfoFadeModeChoice, lfoDelayTriggerChoice, lfoCommonSyncChoice, lfoKeySyncChoice, lfoOneShotChoice);

    data += parseInt(LFO_MAP_TO_CIRCUIT[lfo][lfoFadeModeChoice]);
    data += parseInt(LFO_MAP_TO_CIRCUIT[lfo][lfoDelayTriggerChoice]);
    data += parseInt(LFO_MAP_TO_CIRCUIT[lfo][lfoCommonSyncChoice]);
    data += parseInt(LFO_MAP_TO_CIRCUIT[lfo][lfoKeySyncChoice]);
    data += parseInt(LFO_MAP_TO_CIRCUIT[lfo][lfoOneShotChoice]);

    console.log('getLFO', lfo, data);
    return data;
}

function getCurrentSelectedPatch() {
    if (!output) {
        return;
    }

    if (! dialogBox(WARNING_PATCH_LOAD)) {
        return;
    }

    var synth = parseInt(document.querySelector('#synth').value) -1;
    var productId = /\bcircuit\s+tracks\b/i.test(output.name)
        ? CIRCUIT_TRACKS_PRODUCT_ID
        : CIRCUIT_PRODUCT_ID;
    output.sendSysex([0, 32, 41], [1, productId, 64, synth]);
}

function getData() {
    let allItems = [].slice.call(document.querySelectorAll('fieldset input[order], fieldset select[order]'));

    // Sort
    allItems.sort(function(a, b) {
        var orderA = parseInt(a.getAttribute('order'));
        var orderB = parseInt(b.getAttribute('order'));

        return (orderA < orderB) ? -1 : (orderA > orderB) ? 1 : 0;
    });

    console.log('allItems length', allItems.length);

    // Synth values
    let synthData = extractSynthValuesFromDOM(allItems);

    // Category value
    let category = document.querySelector('#category').value;

    return mergeDataWithSysexMetadata(synthData, category);
}

function mergeDataWithSysexMetadata(data, category) {
    if (data.length !== 308) {
        throw "Synth data incoherent. Must be 308: " + data.length;
    }

    // 1 BOF
    let metadata = [240]

    // 3 Manufacturer Novation
    metadata = metadata.concat([0, 32, 41]);

    // 2 Type patch ?
    metadata = metadata.concat([1, 96]);

    // 3 Empty
    metadata = metadata.concat([0, 0, 0]);

    // 16 Patch name
    var patchName = document.querySelector('input[name="name"]').value;
    var patchNameCode = [];

    // Encode patch name
    for (var i = 0 ; i < patchName.length; i++) {
        var code = patchName.charCodeAt(i);
        patchNameCode.push(code);
    }

    // Fill empty char with spaces
    for (var i = patchNameCode.length ; i < 16; i++) {
        var code = " ".charCodeAt(0);
        patchNameCode.push(code);
    }
    metadata = metadata.concat(patchNameCode);

    // 2 Patch category & genre
    metadata = metadata.concat([category, 0]);

    // 14 Empty
    metadata = metadata.concat([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

    // 308 Synth data
    data = metadata.concat(data);

    // 1 EOF
    data = data.concat([247]);
    return data
}

function parseCircuitPatch(circuitData) {
    var productId = circuitData[5];
    var validProduct = productId === CIRCUIT_PRODUCT_ID || productId === CIRCUIT_TRACKS_PRODUCT_ID;
    var isPatchDump = circuitData.length === 350
        && circuitData[0] === 240
        && circuitData[1] === 0
        && circuitData[2] === 32
        && circuitData[3] === 41
        && circuitData[4] === 1
        && validProduct
        && circuitData[6] === 0
        && circuitData[349] === 247;

    if (!isPatchDump) {
        console.warn('Ignoring invalid Circuit patch SysEx message (length: ' + circuitData.length + ').');
        return;
    }

    // Patch name
    var patchNameArr = circuitData.slice(9, 25);
    var patchName= "";

    for (var i=0; i < patchNameArr.length; i++) {
        patchName += String.fromCharCode(patchNameArr[i]);
    }

    document.querySelector('input[name="name"]').value = patchName.replace(/\0+$/, '').trim();
    document.querySelector('#category').value = circuitData[25];

    // Synth values
    var synthValuesArr = circuitData.slice(41, 349);

    for (var i=0; i < synthValuesArr.length; i++) {
        var order = i + 1;

        var item = document.querySelector('[order="' + order + '"]');

        if (order == 60) {
            // LFO 1 exceptions
            setLFO(synthValuesArr[i], 1);
        }
        if (order == 69) {
            // LFO 2 exceptions
            setLFO(synthValuesArr[i], 2);
        }

        if (item) {
            item.value = synthValuesArr[i];

            if (item.type == 'range') {
                setBadgeValue(item, item.value);
            }
        }
    }

    synthHistoryInit();
}

function resetPatch() {
    if (! dialogBox(WARNING_PATCH_NEW)) {
        return;
    }

    synthHistoryInit();
    resetValues();

    let synth = parseInt(document.querySelector('#synth').value) -1;
    var data = getData();

    // Remove BOF and EOF
    data.splice(349, 1);
    data.splice(0, 1);

    // Remove manufacturer
    data.splice(0, 3);

    // Set selected synth
    data[3] = synth;

    console.log("reset Patch", data);

    if (output) {
        output.sendSysex([0, 32, 41], data);
    }
}

function resetValues() {
    let allItems = [].slice.call(document.querySelectorAll('fieldset input, fieldset select, #category'));

    for (var i = 0; i < allItems.length; i++) {
        var item = allItems[i];

        if (item.hasAttribute("default")) {
            item.value = allItems[i].getAttribute('default');
        } else {
            item.value = 0;
        }

    }

    let patchName = document.querySelector('#patchName');
    patchName.value = '';
    synthHistoryInit();
}

function sendMessage(control, value) {
    if (!output) {
        return;
    }

    let synth = parseInt(document.querySelector('#synth').value);

    console.log("sendMessage", control, value, synth);

    if (control.indexOf(':') > -1) {
        // NRPN
        control = control.split(':');

        output.setNonRegisteredParameter([parseInt(control[0]), parseInt(control[1])], parseInt(value), synth);
    } else {
        // CC
        output.sendControlChange(parseInt(control), parseInt(value), synth);
    }
}

function setBadgeValue(inputRange, value) {
    if (inputRange.disabled) {
        return;
    }

    if (inputRange.getAttribute("zero")) {
        value = value - inputRange.getAttribute("zero");
    }

    var valueBadge = inputRange.previousElementSibling.querySelector('.badge');
    if (valueBadge) {
        valueBadge.textContent = value;
    }
}

function setLFO(data, lfo) {
    // Fade mode
    var fadeOut = 16;
    var gateIn = 32;
    var gateOut = 48;

    if (data - gateOut >= 0) {
        console.log("fillLFO gateOut", data);
        document.querySelector('#lfo_' + lfo + '_fade_mode').value = LFO_MAP_FROM_CIRCUIT[lfo]["FADE_MODE"][gateOut];
        data -= gateOut;
    } else if (data - gateIn >= 0) {
        console.log("fillLFO gateIn", data);
        document.querySelector('#lfo_' + lfo + '_fade_mode').value = LFO_MAP_FROM_CIRCUIT[lfo]["FADE_MODE"][gateIn];
        data -= gateIn;
    } else if (data - fadeOut >= 0) {
        console.log("fillLFO fadeOut", data);
        document.querySelector('#lfo_' + lfo + '_fade_mode').value = LFO_MAP_FROM_CIRCUIT[lfo]["FADE_MODE"][fadeOut];
        data -= fadeOut;
    } else {
        document.querySelector('#lfo_' + lfo + '_fade_mode').value = LFO_MAP_FROM_CIRCUIT[lfo]["FADE_MODE"][0];
    }

    // Delay trigger
    var delayTrigger = 8;

    if (data - delayTrigger >= 0) {
        console.log("fillLFO delayTrigger", data);
        document.querySelector('#lfo_' + lfo + '_delay_trigger').value = LFO_MAP_FROM_CIRCUIT[lfo]["DELAY_TRIGGER"][delayTrigger];
        data -= delayTrigger;
    } else {
        document.querySelector('#lfo_' + lfo + '_delay_trigger').value = LFO_MAP_FROM_CIRCUIT[lfo]["DELAY_TRIGGER"][0];
    }

    // Common sync
    var commonSync = 4;

    if (data - commonSync >= 0) {
        console.log("fillLFO commonSync", data);
        document.querySelector('#lfo_' + lfo + '_common_sync').value = LFO_MAP_FROM_CIRCUIT[lfo]["COMMON_SYNC"][commonSync];
        data -= commonSync;
    } else {
        document.querySelector('#lfo_' + lfo + '_common_sync').value = LFO_MAP_FROM_CIRCUIT[lfo]["COMMON_SYNC"][0];
    }

    // Key sync
    var keySync = 2;

    if (data - keySync >= 0) {
        console.log("fillLFO keySync", data);
        document.querySelector('#lfo_' + lfo + '_key_sync').value = LFO_MAP_FROM_CIRCUIT[lfo]["KEY_SYNC"][keySync];
        data -= keySync;
    } else {
        document.querySelector('#lfo_' + lfo + '_key_sync').value = LFO_MAP_FROM_CIRCUIT[lfo]["KEY_SYNC"][0];
    }

    // One shot
    var oneShot = 1;

    if (data - oneShot >= 0) {
        console.log("fillLFO oneShot", data);
        document.querySelector('#lfo_' + lfo + '_one_shot').value = LFO_MAP_FROM_CIRCUIT[lfo]["ONE_SHOT"][oneShot];
        data -= oneShot;
    } else {
        document.querySelector('#lfo_' + lfo + '_one_shot').value = LFO_MAP_FROM_CIRCUIT[lfo]["ONE_SHOT"][0];
    }


    // Check result
    if (data < 0) {
        console.error('Bad LFO values');
    }
}

function synthHistoryAdd(id, value) {
    value = String(value);
    var previousValue = synthHistoryValues[id];

    if (previousValue === undefined || previousValue === value) {
        synthHistoryValues[id] = value;
        return;
    }

    var lastChange = synthHistory[synthHistory.length - 1];
    if (!lastChange || lastChange.id !== id) {
        synthHistory.push({id: id, value: previousValue});
    }

    synthHistoryValues[id] = value;
}

function synthHistoryInit() {
    synthHistory = [];
    synthHistoryValues = {};

    var items = document.querySelectorAll('fieldset input, fieldset select, #category');
    for (var i = 0; i < items.length; i++) {
        if (items[i].id) {
            synthHistoryValues[items[i].id] = String(items[i].value);
        }
    }
}

function synthHistoryUndo() {
    let undo = synthHistory.pop();
    if (!undo) {
        return;
    }

    let element = document.getElementById(undo.id);
    if (!element) {
        return;
    }

    element.value = undo.value;
    synthHistoryValues[undo.id] = undo.value;

    if (element.type == 'range') {
        setBadgeValue(element, element.value);
    }

    updateStatusForControl(element);

    sendMessage(element.name, element.value);
}

function writeSysexFile(data) {
    var ab = new ArrayBuffer(data.length); // bytes is the array with the integer
    var ia = new Uint8Array(ab);

    for (var i = 0; i < data.length; i++) {
      ia[i] = data[i];
    }

    var blob = new Blob([ia], {type: "application/octet-stream"});
    let patchName = document.querySelector('input[name="name"]').value || "circuit"
    saveAs(blob, patchName + "-patch.syx");
}
