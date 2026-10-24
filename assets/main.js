"use strict";

var output;
var deviceDetectionInterval;

function isSupportedCircuitDevice(name) {
    return /\bcircuit\b/i.test(name) && !/\bcircuit\s+(?:rhythm|mono station)\b/i.test(name);
}

function showCompatibilityError(error) {
    console.log("WebMidi could not be enabled.", error);
    alert(STATUS_NOT_COMPATIBLE);

    var status = document.querySelector('#status');
    status.textContent = STATUS_NOT_COMPATIBLE;
    status.classList.add('text-danger');
}

function findSupportedCircuitPort(ports) {
    for (var i = 0; i < ports.length; i++) {
        if (isSupportedCircuitDevice(ports[i].name)) {
            return ports[i];
        }
    }

    return undefined;
}

function attachInputListeners(input) {
    if (!input) {
        return;
    }

    input.addListener('sysex', "all", function (event) {
        parseCircuitPatch(event.data);
    });

    input.addListener('controlchange', "all", function(event) {
        controllerChange(event.channel, event.controller.number, event.value);
    });
}

function detectCircuitDevice() {
    var status = document.querySelector('#status');

    output = findSupportedCircuitPort(WebMidi.outputs);
    if (!output) {
        status.textContent = STATUS_WAITING;
        status.dataset.connectionState = 'waiting';
        return;
    }

    console.log('Output', output.name, output);
    output.playNote("C3", 1, {duration: "+2000"});
    output.stopNote("C3", 1, {duration: "+2000"});

    var input = findSupportedCircuitPort(WebMidi.inputs);
    if (input) {
        console.log('Input', input.name, input);
        attachInputListeners(input);
    }

    status.textContent = STATUS_CONNECTED;
    status.dataset.connectionState = 'connected';
    window.clearInterval(deviceDetectionInterval);
}

if (!WebMidi.supported) {
    showCompatibilityError(new Error("The Web MIDI API is not supported by this browser."));
} else {
    WebMidi.enable(function (err) {
        if (err) {
            showCompatibilityError(err);
            return;
        }

        console.log("WebMidi enabled!");
        deviceDetectionInterval = window.setInterval(detectCircuitDevice, 3000);
        detectCircuitDevice();
    }, true);
}

resetValues();
