var _util = require('../../components/Util');
var _logger = _util.tagLogger("IE");

var MediaDevicesInfo = require("./MediaDevicesInfo");

var MediaDevices = function (plugin) {
    this.plugin = plugin;
    var xplugin = this.xplugin = plugin._xobj;
}

//https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getUserMedia
MediaDevices.prototype.getUserMedia = function (constraints, successCallback, errorCallback) {
    constraints || (constraints = {audio: true, video: true});

    constraints.audio = !!constraints.audio;
    !constraints.video && (constraints.video = !!constraints.video);

    try{
        var constraintsJson = JSON.stringify(constraints);
        _logger.debug("get user media", constraintsJson);
        var xstream = this.xplugin.GetUserMedia(constraintsJson);
        var ms = new MediaStream({
            id: this.plugin.id + "_stream_" + xstream,
            _xobj: xstream
        });

        successCallback && successCallback(ms);

        return ms;
    } catch (e){
        _logger.debug("get user media error", e);
        errorCallback && errorCallback(e);
    }
}

//https://developer.mozilla.org/zh-CN/docs/Web/API/MediaDevices/enumerateDevices
MediaDevices.prototype.enumerateDevices = function (successCallback, errorCallback) {
    _logger.debug("enumerateDevices begin.");
    try{
        var xdevices = this.xplugin.EnumerateDevices();
        _logger.debug("enumerateDevices:", xdevices);

        xdevices && (xdevices = JSON.parse(xdevices));

        var mediaDevicesInfos = [];
        _util.forEach(xdevices, function (_index, device) {
            mediaDevicesInfos.push(new MediaDevicesInfo({
                deviceId: device.id,
                groupId: device.id,
                kind: device.kind,
                label: device.label
            }));
        });

        successCallback && successCallback(mediaDevicesInfos);

        return mediaDevicesInfos;
    } catch (e){
        _logger.debug("enumerateDevices error", e);
        errorCallback && errorCallback(e);
    }
}

module.exports = MediaDevices;