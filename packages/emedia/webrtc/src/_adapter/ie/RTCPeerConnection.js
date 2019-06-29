var _util = require('../../components/Util');
var _logger = _util.tagLogger("IE.peer");

var globalPCSeqno = 0;

//iceConnectionState new checking connected completed failed disconnected closed
//onicecandidate ++
//onaddstream    ++
//onremovestream --
//oniceconnectionstatechange ++
//onsignalingstatechange //TODO
//ontrack  --
//ondatachannel //TODO src/content/peerconnection/munge-sdp/js/main.js
//getLocalStreams()
//getRemoteStreams()
//getStats() //TODO
// currentLocalDescription ++
// currentRemoteDescription ++
// peerIdentity ++

// https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
// plugin:
// xplugin:
function RTCPeerConnection(plugin, pcConfig, options) { //pcConfig //TODO src/content/peerconnection/trickle-ice/js/main.js
    this._xobjCallSeqno = 0;
    this.plugin = plugin;
    var xplugin = this.xplugin = plugin._xobj;
    var pcId = this.peerIdentity = this._id = _util.list(plugin.id, "__pc_", globalPCSeqno++).join("");

    options = (options && JSON.stringify(options)) || (JSON.stringify({
        optional: [
            {DtlsSrtpKeyAgreement: true},
            //{RtpDataChannels: true}
        ]
    }));
    var xpc = this._xpc = xplugin.CreateRtcPeerConnections(pcId, pcConfig && JSON.stringify(pcConfig) || "", options);
    plugin.pcs[pcId] = this;

    this.iceConnectionState = "new";

    _logger.info("create peer connection. it ", pcId);
}

RTCPeerConnection.prototype.getLocalStreams = function () {
    return this.remoteStreams;
}
RTCPeerConnection.prototype.getRemoteStreams = function () {
    return this.localStreams;
}

function _on(type, evt,  cb) {
    var callname = "on" + evt + type, callname = callname.toLowerCase();
    cb._evtname = evt;
    this[callname] = cb;
}

RTCPeerConnection.prototype._onSuccess = function (evt, cb) {
    _on.call(this, "success", evt, cb);
};
RTCPeerConnection.prototype._onError = function (evt, cb) {
    _on.call(this, "error", evt, cb);
};


// arg0 success
// arg1 error
// arg2 arg
['createOffer', 'createAnswer'].forEach(function(method) {
    RTCPeerConnection.prototype[method] = function() {
        this._onSuccess(method, arguments.length < 1 ? undefined : arguments[0]);
        this._onError(method, arguments.length < 2  ? undefined : arguments[1]);

        var options = arguments.length < 3 ? undefined : arguments[2],
            options = options && JSON.stringify(options) || "";

        _logger.info(this._id, method, options);
        switch (method){
            case "createOffer":
                // RTCOfferOptions{
                //      offerToReceiveAudio
                //      offerToReceiveVideo
                // }
                this.xplugin.CreateOffer(this._id, options);

                break;
            case "createAnswer":
                // RTCAnswerOptions{
                //     'mandatory': {
                //          'OfferToReceiveAudio': true,
                //          'OfferToReceiveVideo': true
                //     }
                // }
                this.xplugin.CreateAnswer(this._id, options);

                break;
            default:
        }
    };
});

// onaddicecandidatesuccess|onaddicecandidateerror
// setlocaldescriptionsuccess|setlocaldescriptionerror
// setremotedescriptionsuccess|setremotedescriptionerror
//
// arg1 success
// arg2 error
// arg0 arg
['setLocalDescription', 'setRemoteDescription', 'addIceCandidate'].forEach(function(method) {
    RTCPeerConnection.prototype[method] = function() {
        this._onSuccess(method, arguments.length < 2 ? undefined : arguments[1]);
        this._onError(method, arguments.length < 3 ? undefined : arguments[2]);

        var arg = arguments.length < 1 ? undefined : arguments[0];
        switch (method){
            case "setLocalDescription":
                var rtcSessionDescription = arg; //RTCSessionDescription
                this.currentLocalDescription = rtcSessionDescription;

                var json = rtcSessionDescription.toJSON();
                _logger.debug(this._id, method, json);
                _logger.debug(this._id, method, rtcSessionDescription.type, rtcSessionDescription.sdp);
                this.xplugin.SetLocalDescription(this._id, json);

                break;
            case "setRemoteDescription":
                var rtcSessionDescription = arg; //RTCSessionDescription
                this.currentRemoteDescription = rtcSessionDescription;

                var json = rtcSessionDescription.toJSON();
                _logger.debug(this._id, method, json);
                _logger.debug(this._id, method, rtcSessionDescription.type, rtcSessionDescription.sdp);
                this.xplugin.SetRemoteDescription(this._id, json);

                break;
            case "addIceCandidate":
                var candidate = arg; //RTCIceCandidate

                var json = candidate.toJSON();
                _logger.info(this._id, method, json);
                var result = this.xplugin.AddIceCandidate(this._id, json);
                _logger.info(this._id, method, result);

                if(result){
                    this.onaddicecandidatesuccess && this.onaddicecandidatesuccess();
                }else{
                    this.onaddicecandidateerror && this.onaddicecandidateerror();
                }

                break;
            default:
        }
    };
});

RTCPeerConnection.prototype.addStream = function (stream) {
    _logger.info("addStream", this._id, stream.id);
    this.localStreams = [stream];
    this.xplugin.AddLocalStream(this._id, stream._xobj);
};

RTCPeerConnection.prototype.close = function () {
    _logger.info("close", this._id, this.iceConnectionState);

    if(this.iceConnectionState === "closed"){
        return;
    }

    this.iceConnectionState = "closed";
    try{
        this.xplugin.Close(this._id);
    }finally{
        //_util.removeAttribute(this.plugin.pcs, this._id);
    }
};


RTCPeerConnection.prototype.removeStream = function (stream) {
    _logger.info("removeStream", this._id, stream.id);
    this.xplugin.RemoveStream(this._id, stream.id);
    typeof this.onremovestream === "function" && this.onremovestream(stream);
};

RTCPeerConnection.prototype.addTrack = function(track, stream) { //onaddtrack
    _logger.info("addTrack", this._id, track.id, stream.id);
    var sender = this.xplugin.PeerConnectionAddTrack(this._id, track._xobj, stream._xobj);
    return sender;
};

RTCPeerConnection.prototype.removeTrack = function(sender) {
    _logger.info("removeTrack", this._id, sender.id);
    return this.xplugin.PeerConnectionRemoveTrack(this._id, sender.id);
};

RTCPeerConnection.prototype.getReceivers = function () {
    return [];
};
RTCPeerConnection.prototype.getSenders = function () { //TODO src/content/peerconnection/bandwidth/js/main.js
    return [{
        getStats: function () {
            return {
                then: function () {
                    
                }
            }
        }
    }];
};
RTCPeerConnection.prototype.getStats = function (track) { //TODO src/content/peerconnection/constraints/js/main.js
    return [];
};

RTCPeerConnection.prototype.createDataChannel = function () { //TODO src/content/datachannel/datatransfer/js/main.js

};


module.exports = RTCPeerConnection;