var _util = require('../../components/Util');

var cls = {};
var _RTCError = cls.RTCError = require("./RTCError");
var _RTCSessionDescription = cls.RTCSessionDescription = require('./RTCSessionDescription');
var _RTCIceCandidate = cls.RTCIceCandidate = require('./RTCIceCandidate');
var _MediaStream = cls.MediaStream = require('./MediaStream');
var _MediaStreamTrack = cls.MediaStreamTrack = require('./MediaStreamTrack');
var _RTCStatsReport = cls.RTCStatsReport = require('./RTCStatsReport');
var _AudioContext = cls.AudioContext = require('./AudioContext');
var _MediaSource = cls.MediaSource = require('./MediaSource');

var RTCPeerConnection = require('./RTCPeerConnection');
var MediaDevices = require('./MediaDevices');

var _XVideo = cls.XVideo = require('./XVideoObject');


var _logger = _util.tagLogger("IE.plugin");

var hasMatch = /\brv[ :]+(\d+)/g.exec(navigator.userAgent) || [];
var webrtcDetectedVersion   = parseInt(hasMatch[1], 10);

var globalPluginSeqno = 0;
var plugins = emedia.__ieWebrtcPlugins__ = (emedia.__ieWebrtcPlugins__ || {});

var State = {
    NONE : 0,           // no plugin use
    INITIALIZING : 1,   // Detected need for plugin
    INJECTING : 2,      // Injecting plugin
    INJECTED: 3,        // Plugin element injected but not usable yet
    READY: 4,
    STOP: 5
};

var Plugin = _util.prototypeExtend({
    id: _util.list("plugin", globalPluginSeqno++).join("_"),
    classid: 'clsid:8b9cc1b7-2703-44bc-a317-a025b24b7464',
    width: 0,
    height: 0,

    cbScrpitTags: [],
    pcs: {},
    _activeXVideos: {},

    // params: {},
    param: function (name, value) {
        (this.params || (this.params = {}))[name] = value;
        return this;
    },

    release: function () {
        removePlugin(this);
    }
});

function paramsHTMLTag(params) {
    var html = "";
    _util.forEach(params, function (param, value) {
        html += _util.list("<param name='", param, "'", "value='", value, "'", "/>").join(" ");
    });

    return html;
}

function inject(plugin, injected) {
    _logger.info("plugin injecting...");

    // // only inject once the page is ready
    // if (document.readyState !== 'interactive' && document.readyState !== 'complete') {
    //     _logger.warn("plugin inject fail. document.readyState", document.readyState);
    //     return;
    // }

    var plugin = plugins[plugin.id];
    if(!plugin){
        _logger.error("require plugin.");
        throw "Require plugin."
    }

    if (plugin.state !== State.INJECTING) {
        _logger.error("plugin inject fail. not injecting. ", plugin.state);
        return;
    }

    if (webrtcDetectedVersion <= 10) {
        //"<object id=\"WebRtcPlugin\" classid=\"clsid:8b9cc1b7-2703-44bc-a317-a025b24b7464\" width=\"0\" height=\"0\"></object>"
        plugin.innerHTML = _util.list('<object id="', plugin.id, '"',
            'classid="', plugin.classid, '"',
            'width="', plugin.width, '"',
            'height="', plugin.height, '"', '/>').join(" ");

        plugin.tag = document.getElementById(plugin.id);

        if(plugin.params){
            var pluginObject = plugin.tag.getElementById("#" + plugin.id);
            pluginObject.innerHTML = paramsHTMLTag(plugin.params);
        }
    } else {
        plugin.tag = document.createElement('object');
        plugin.tag.id = plugin.id;
        plugin.tag.classid =plugin.classid;
        plugin.tag.width = '0px';
        plugin.tag.height = '0px';

        if(plugin.params){
            var pluginObject = plugin.tag.getElementById("#" + plugin.id);
            plugin.tag.innerHTML = paramsHTMLTag(plugin.params);
        }
    }

    document.body.appendChild(plugin._xobj = plugin.tag);

    plugin.state = State.INJECTED;
    _logger.info("plugin injected");

    _util.addEvent(window, "unload", function(event) {
        _logger.warn("All resources finished loading!");
        plugin._release();
    });
    injected && injected();

    return plugin;
}

function setXObjCallback(plugin, callback, event){
    var eventName = event.substring(0, event.indexOf('('));
    var eventArgs = event.substring(event.indexOf('('));

    var callbackname = "__easemob_ie_webrtc_plugin_" + plugin.id + "$" + eventName;
    var callbackScrpit = document.getElementById("#" + callbackname);
    if(callbackScrpit){
        return;
    }

    callbackScrpit = document.createElement("script");
    callbackScrpit.language = "javascript";
    callbackScrpit.event = event;

    var forAttribute = document.createAttribute("for");
    forAttribute.nodeValue = plugin.id;
    callbackScrpit.setAttributeNode(forAttribute);

    callbackScrpit.innerHTML = callbackname + eventArgs;

    window[callbackname] = callback.bind(plugin);

    plugin.cbScrpitTags.push(callbackScrpit);

    document.body.appendChild(callbackScrpit);
}

function removePlugin(plugin) {
    try{
        plugin.tag && document.removeChild(plugin.tag);
        plugin.tag === undefined;

        _util.forEach(plugin.cbScrpitTags, function (_index, cbTag) {
            cbTag && document.removeChild(cbTag);
        });
        plugin.cbScrpitTags = [];
    }catch (e){

    }
}

function isPluginInstalled(clsid, installedCb, notInstalledCb) {
    try {
        var shellObj = new ActiveXObject("WScript.Shell");
        var progid = shellObj.RegRead("HKEY_CLASSES_ROOT\\CLSID\\{"+clsid+"}\\ProgID\\");

        var axo = new ActiveXObject(progid);

        _logger.info("plugin installed.", clsid);

        installedCb && installedCb();
        return true;
    } catch (e) {
        _logger.info("plugin not installed.", clsid);
        notInstalledCb && notInstalledCb();
        return false;
    }
}

module.exports = Plugin = Plugin.extend({
    // XVideo: XVideo,
    // RTCSessionDescription: RTCSessionDescription,
    // RTCIceCandidate: RTCIceCandidate,
    // MediaStream: MediaStream,
    // MediaStreamTrack: MediaStreamTrack,
    // RTCStatsReport: RTCStatsReport,

    __init__: function () {
        var self = this;

        self.RTCPeerConnection = function (pcConfig, options) {
            return new RTCPeerConnection(self, pcConfig, options);
        };

        _util.forEach(cls, function (clsName, clsFunc) {
            self[clsName] = function () {
                var args = {
                    plugin: self,
                    xplugin: self._xobj
                }

                for(var i = 0; i < arguments.length; i++){
                    var cfg = arguments[i] || {};
                    _util.extend(args, cfg)
                }
                return new clsFunc(args);
            }
        });
    },

    _MediaDevices: MediaDevices,
    MediaDevices: function () {
        var self = this;
        return function () {
            return new MediaDevices(self);
        }
    },

    attachMediaStream: function (videoTag, stream, cfg) {
        videoTag.bindXVideo && videoTag.bindXVideo.remove();
        videoTag.bindXVideo = undefined;

        var xvideo = new XVideo(cfg || {});
        xvideo.replace(videoTag);
        videoTag.bindXVideo = xvideo;

        xvideo._xobj && stream.xplugin.AttachToWindow(xvideo._xobj.GetRtcWindow(), stream._xobj);
        xvideo._attched = true;
        xvideo._bindStream = stream;
        stream._attachToXVideo = xvideo;
    },

    _release: function () {
        var self = this;
        if(self.state === State.STOP){
            _logger.info("Plugin had been released. it ", self._id);
            return;
        }

        _util.forEach(self.pcs, function (pcId, pc) {
            try {
                pc.iceConnectionState !== "closed" && pc.close();
                _logger.info("plugin release. pc close:", pcId);
            }catch(e){

            }
        });

        _util.forEach(self._activeXVideos, function (videoId, xvideo) {
            try {
                xvideo.remove();
                _logger.info("plugin release. remove xvideo:", videoId);
            }catch(e){

            }
        });

        //self._xobj.StopCapture();
        self.state = State.STOP;

        removePlugin(self);
        _logger.info("Plugin released. it ", self._id);
    }
});


Plugin.isPluginInstalled = isPluginInstalled;
Plugin.remove = removePlugin;

Plugin.get = function (id) {
    return id ? plugins[id] : (function () {
        var p;
        _util.forEach(plugins, function (key, val) {
            if(p){
                throw "Plugin load mn";
            }
            p = val;
        })

        return p;
    })();
};

Plugin._load = function (plugin, success, error) {
    _logger.info("load ie plugin.");

    var _p;
    if((_p = Plugin.get(plugin.id)) && _p.state === State.READY){
        throw "Plugin has been load. or loading. " + plugin.id;
    }

    plugins[plugin.id] = plugin;

    plugin.state = State.INJECTING;

    function injected() {
        plugin.state = State.INITIALIZING;

        _util.forEach(xObjCallbacks, function (event, callback) {
            setXObjCallback(plugin, callback, event);
        });

        plugin.mediaDevices = new MediaDevices(plugin);

        plugin.state = State.READY;
        _logger.info("ie plugin ", plugin.state);

        success && success(plugin);
    }

    inject(plugin, injected.bind(this));
}

Plugin.load = function (plugin, success, error) {
    _logger.info("hi while load..");

    plugin.notfound = true;

    var whileCount = 0;
    while (true){
        _logger.debug("while loading. ", whileCount++);
        if(false && !isPluginInstalled(plugin.classid)){
            _logger.debug("not found ActiveXObject:" + plugin.classid);
            error("error", plugin.state, "Not found ActiveXObject:" + plugin.classid);
            return;
        }
        switch(plugin.state){
            case undefined:
            case State.NONE:
                Plugin._load(plugin, undefined, error);
                break;
            case State.INJECTING:
            case State.INJECTED:
                error("warn", plugin.state, "Plugin loading. it " + plugin.classid);
                break;
            case State.READY:
                _logger.info("plugin single success ", plugin.state);

                plugin.notfound = false;
                plugin.ready = true;

                success(plugin);
                return plugin;
            case State.STOP:
                error("error", "plugin STOP");
                return;
            default:
                _logger.error("Unkown state ", plugin.state);
                error("error", plugin.state, "Unkown state " + plugin.state);
                return;
        }
    }
}

//Plugin.load(plugin);
Plugin.factory = function (cfg) {
    var plugin = new Plugin(cfg || {});
    //Plugin.load(plugin);

    return plugin;
}

Plugin.single = function (success, error, cfg) {
    var t = this;

    var plugin;
    while (!(plugin = Plugin.get())){
        plugin = new Plugin(cfg || {});
        break;
    }
    Plugin.load(plugin, success, error);

    return plugin;
}


function defaultOnError(on, pcId, BstrError) {
    _logger.error("Plugin", this.id, on, pcId, BstrError, ".");

    var pc = this.pcs[pcId];

    var error;
    try{
        error = JSON.parse(BstrError);
    }catch(e){
        error = BstrError;
    }

    var event = new RTCError(error);

    pc[on.toLowerCase()](event);
}

var xObjCallbacks = {
    // this is plugin
    "onRemoveStream(pcId, stream)": function onRemoveStream(pcId, stream) { //TODO
        _logger.info("Plugin", this.id, "onAddstream", pcId, stream, ".");

        var pc = this.pcs[pcId];

        var remainStreams = [];
        pc.remoteStreams && pc.remoteStreams.length > 0 && _util.forEach(pc.remoteStreams, function (_index, remoteStream) {
            if(remoteStream._xobj && remoteStream._xobj.id === stream.id){
                pc.onremovestream && pc.onremovestream({streams: [remoteStream]});
            }else{
                remainStreams.push(remoteStream);
            }
        });
        pc.remoteStreams = remainStreams;
    },

    "onAddstream(pcId, stream)": function onAddstream(pcId, stream) {
        _logger.info("Plugin", this.id, "onAddstream", pcId, stream, ".");

        var ms = new MediaStream({
            id: pcId + "_stream_" + stream,
            _xobj: stream,
        });

        var pc = this.pcs[pcId];

        pc.remoteStreams = [ms];
        pc.ontrack && pc.ontrack({streams: [ms]});
        pc.ontrack || (pc.onaddstream && pc.onaddstream({streams: [ms]}));
    },

    "onIceCandidate(pcId, BstrIceCandidate)": function onIceCandidate(pcId, BstrIceCandidate) {
        _logger.info("Plugin", this.id, "onIceCandidate", pcId, BstrIceCandidate, ".");

        var pc = this.pcs[pcId];

        var _xcand = JSON.parse(BstrIceCandidate);
        var rtcIceCandidate = new RTCIceCandidate(_xcand);

        pc.onicecandidate && pc.onicecandidate({candidate: rtcIceCandidate});
    },

    //new checking connected completed failed disconnected closed
    "onIceConnectionStateChange(pcId, nowState, oldState)": function onIceConnectionStateChange(pcId, nowState, oldState) {
        _logger.info("Plugin", this.id, "onIceConnectionStateChange", pcId, nowState, ".");

        var pc = this.pcs[pcId];
        pc.iceConnectionState = nowState;

        pc.oniceconnectionstatechange && pc.oniceconnectionstatechange({target: {iceConnectionState: nowState}});

        if(nowState === "closed"){
            _util.removeAttribute(this.pcs, this._id);
        }
    },

    "onCreateSessionDescription(pcId, BstrDesc)": function onCreateSessionDescription(pcId, BstrDesc) { //onCreateOfferSuccess
        _logger.info("Plugin", this.id, "onRTCSessionDescriptionCreate", pcId, BstrDesc, ".");

        var pc = this.pcs[pcId];
        var descJSON = JSON.parse(BstrDesc);

        var description = new RTCSessionDescription({
            sdp: descJSON.sdp,
            type: descJSON.type
        });

        switch(descJSON.type){
            case "offer":
                pc.oncreateoffersuccess && pc.oncreateoffersuccess(description);
                break;
            case "answer":
                pc.oncreateanswersuccess && pc.oncreateanswersuccess(description);
                break;
            default:
                throw "Unknow sdp type " + descJSON.type;
        }
    },

    "onSetLocalDescriptionSuccess(pcId)": function onSetLocalDescriptionSuccess(pcId) {
        _logger.info("Plugin", this.id, "onSetLocalDescriptionSuccess", pcId, ".");

        var pc = this.pcs[pcId];
        pc.onsetlocaldescriptionsuccess && pc.onsetlocaldescriptionsuccess();
    },

    "onSetRemoteDescriptionSuccess(pcId)": function onSetRemoteDescriptionSuccess(pcId) {
        _logger.info("Plugin", this.id, "onSetRemoteDescriptionSuccess", pcId, ".");

        var pc = this.pcs[pcId];
        pc.onsetremotedescriptionsuccess && pc.onsetremotedescriptionsuccess();
    },

    // "onAddIceCandidateSuccess(pcId)": function onAddIceCandidateSuccess(pcId) {
    //     _logger.info("Plugin", this.id, "onAddIceCandidateSuccess", pcId, ".");
    //
    //     var pc = this.pcs[pcId];
    //     pc.onaddicecandidatesuccess && pc.onaddicecandidatesuccess();
    // },

    "onCreateSessionDescriptionError(pcId, BstrError)": function (pcId, BstrError) {
        defaultOnError.bind(this)("onCreateSessionDescriptionError", pcId, BstrError);
    },
    "onSetLocalDescriptionError(pcId, BstrError)": function (pcId, BstrError) {
        defaultOnError.bind(this)("onSetLocalDescriptionError", pcId, BstrError);
    },
    "onSetRemoteDescriptionError(pcId, BstrError)": function (pcId, BstrError) {
        defaultOnError.bind(this)("onSetRemoteDescriptionError", pcId, BstrError);
    },
    // "onAddIceCandidateError(pcId, BstrError)": function (pcId, BstrError) {
    //     defaultOnError.bind(this)("onAddIceCandidateError", pcId, BstrError);
    // }
};
