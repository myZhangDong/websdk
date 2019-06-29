window.emedia = window.emedia || {};

var _util = require('../components/Util');
var _logger = _util.tagLogger("adapter.ie");
_logger.info("use plugin.");

if (typeof Promise === 'undefined') {
    window.Promise = require("bluebird");
}


var Plugin = require('./ie/XPluginObject');

var plugin = Plugin.single(_export, function (type, state, msg) {

});

function _args(_args, count) {
    var args = (_args.length === 1 ? [_args[0]] : Array.apply(null, _args));
    while(args.length < (count || 3)){
        args.push(undefined);
    }
    return args;
}

function _export(plugin) {
    _logger.info("load ie plugin. init global function...");

    window.reattachMediaStream = window.attachMediaStream = plugin.attachMediaStream;

    window.XVideo = plugin.XVideo;
    window.RTCSessionDescription = plugin.RTCSessionDescription;
    window.RTCIceCandidate = plugin.RTCIceCandidate;
    window.MediaStream = plugin.MediaStream;
    window.MediaStreamTrack = plugin.MediaStreamTrack;
    window.RTCStatsReport = plugin.RTCStatsReport;
    window.AudioContext = plugin.AudioContext;
    window.MediaSource = plugin.MediaSource;
    window.RTCError = plugin.RTCError;

    var _NativeRTCPeerConnection = plugin.RTCPeerConnection;

    window.RTCPeerConnection = function (pcConfig, options) {
        var self = this;
        self._nativeRTCPeerConnection = new _NativeRTCPeerConnection(pcConfig, options);

        self._nativeRTCPeerConnection.onicecandidate = function (event) {
            self.onicecandidate && self.onicecandidate(event);
        };

        self._nativeRTCPeerConnection.oniceconnectionstatechange = function (event) {
            self.iceConnectionState = self._nativeRTCPeerConnection.iceConnectionState;
            self.oniceconnectionstatechange && self.oniceconnectionstatechange(event);
        };

        self._nativeRTCPeerConnection.onaddstream = function (event) {
            self.onaddstream && self.onaddstream(event);
        };

        //_logger.info("create peer connection.");
    };

    ['createOffer', 'createAnswer'].forEach(function(method) {
        window.RTCPeerConnection.prototype[method] = function() {
            var self = this;

            var pc = self._nativeRTCPeerConnection;
            var args = _args(arguments);

            var isLegacyCall = args.length && typeof args[0] === 'function';

            if (isLegacyCall) {
                var obj = pc[method](args[1], args[2], args[0]);
                self.iceConnectionState = self._nativeRTCPeerConnection.iceConnectionState;

                return obj;
            }

            return new Promise(function(resolve, reject) {
                pc[method](resolve, reject, args[0]);
                self.iceConnectionState = self._nativeRTCPeerConnection.iceConnectionState;
            });
        };
    });

    ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate', "getStats"].forEach(function(method) {
        window.RTCPeerConnection.prototype[method] = function() {
            var self = this;

            var pc = self._nativeRTCPeerConnection;
            var args = _args(arguments);

            var isLegacyCall = args.length && typeof args[0] === 'function';

            if (isLegacyCall) {
                var obj = pc[method](args[0], args[1], args[2]);
                self.iceConnectionState = self._nativeRTCPeerConnection.iceConnectionState;

                return obj;
            }

            return new Promise(function(resolve, reject) {
                pc[method](args[0], resolve, reject);
                self.iceConnectionState = self._nativeRTCPeerConnection.iceConnectionState;
            });
        };
    });

    ['removeStream', 'addTrack', 'addStream', "close", "getReceivers", "getSenders", "createDataChannel"].forEach(function(method) {
        window.RTCPeerConnection.prototype[method] = function() {
            var self = this;

            var pc = self._nativeRTCPeerConnection;
            try{
                return pc[method].apply(pc, arguments);
            }catch (e){
                _logger.error(pc._id, method, e);
                throw e;
            }
        };
    });

    var mediaDevices = navigator.mediaDevices = plugin.mediaDevices;
    var MediaDevices = plugin._MediaDevices;

    mediaDevices.getUserMedia = navigator.getUserMedia = function () {
        var self = this;

        var getUserMedia = MediaDevices.prototype.getUserMedia.bind(this);
        var args = _args(arguments);

        var isLegacyCall = args.length && typeof args[0] === 'function';

        if (isLegacyCall) {
            var obj = getUserMedia(args[0], args[1], args[2]);

            return obj;
        }

        return new Promise(function(resolve, reject) {
            getUserMedia(args[0], resolve, reject);
        });
    }

    mediaDevices.enumerateDevices = function () {
        var self = this;

        var enumerateDevices = MediaDevices.prototype.enumerateDevices.bind(this);


        return new Promise(function(resolve, reject) {
            enumerateDevices(resolve, reject);
        });
    }

    _logger.info("^_^. Hi", plugin);
}

module.exports = plugin;