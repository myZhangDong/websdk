//console.  emedia.__easemob_current_mservice.current


var emedia = window.emedia = window.emedia || {};

var util = emedia.util = require('./components/Util');
var zepto = require("zepto");

emedia.config = function (cfg) {
    cfg = util.extend({}, cfg);

    for(var key in cfg){
        emedia.config[key] = cfg[key];
        if(key === "logLevel"){
            emedia.LOG_LEVEL = cfg[key];
        }
    }

    if(emedia.config.loglastConfrCount && !emedia._logContext){
        emedia._logContext = new Array(emedia.config.loglastConfrCount);
        emedia._logContextIndex = -1; //代表没有日志
    }
};

emedia.config({
    autoSub: true,

    onlyEnter: false,

    reconnect: 13, //重连次数
    reconnectDelay: 3000, //重连间隔 毫秒

    getCopyIntervalMillis: 30000,
    checkConnectIntervalMillis: 1000,

    iceRebuildCount: 3,
    iceRebuildIntervalMillis: 500,

    enterTimeout: 20000,

    useRTCCfgIfServerReturn: false,
    forceUseRTCCfgIfServerReturnWhenP2P: true,

    allowRepeatAudioMixerPublish: false,

    getMediaMeterIntervalMillis: 400,
    _useRequestAnimationFrame: false,

    meterWithTrackAudioLevel: false,
    judgeTalkingByInstantGE: 0.05,

    _printSoundData: false,

    trackBufferSize: 20,
    allowSendWhenLessThan: 4,
    disableTrack: false,

    ctrlCheckIntervalMillis: 10 * 1000,
    ctrlTimeoutMillis: 30 * 1000,

    _printDebugStats: false,
    statsSeconds: 3,
    //wsorigin

    loglastConfrCount: 2,
    consoleLogger: true
});

util.logger.count();
//util.logger.info(navigator.userAgent);

(function requireWebrtcAdapter() {
    var adapter = require('./_adapter/_Adapter.import');
    emedia.browser = adapter.__browser; // firefox chrome safari IE
    emedia.browserVersion = adapter.__browserVersion;
})();
util.logger.info("Current browser", emedia.browser, emedia.browserVersion);


emedia.AudioContext = window.AudioContext || window.webkitAudioContext;

if(emedia.config.getMediaMeterIntervalMillis){
    // https://stackoverflow.com/questions/46363048/onaudioprocess-not-called-on-ios11/46534088#46534088
    // There are two problems.
    // The main one is that Safari on iOS 11 seems to automatically suspend new AudioContext's that aren't created in response to a tap.
    // You can resume() them, but only in response to a tap.
    //
    // So, you have to either create it before you get the MediaStream, or else get the user to tap again later.
    try {
        if (typeof emedia.AudioContext === 'function') {
            emedia.__audioContext = new emedia.AudioContext();
            emedia.__usingWebAudio = true;
        }else{
            emedia.__usingWebAudio = false;
        }
    } catch(e) {
        emedia.__usingWebAudio = false;
    }

    // context state at this time is `undefined` in iOS8 Safari
    if (emedia.__usingWebAudio && emedia.__audioContext.state === 'suspended') {
        zepto(function(){
            var resume = function () {
                (emedia.__audioContext.state === 'suspended') && emedia.__audioContext.resume();
                util.logger.warn("AudioContext state suspended ->", emedia.__audioContext.state);

                setTimeout(function () {
                    if (emedia.__audioContext.state === 'running') {
                        document.body.removeEventListener('touchend', resume, false);
                        document.body.removeEventListener('click', resume, false);
                    }
                }, 0);
            };

            document.body.addEventListener('touchend', resume, false);
            //document.body.addEventListener('load', resume, false);
            document.body.addEventListener('click', resume, false);
        });
    }

    if(!emedia.__usingWebAudio){
        console.warn("'new AudioContext()' failed. can not know who talking.");
    }
    if(emedia.__audioContext && emedia.__audioContext.state === 'suspended'){
        console.warn("audioContext.state is suspended. can not know who talking. You can resume() emedia.__audioContext, but only in response to a tap.");
    }
}


if (!window.requestAnimationFrame || !emedia.config._useRequestAnimationFrame) {
    emedia.requestAnimationFrame = function(fn, timeoutMillis) {
        return setTimeout(fn, timeoutMillis || emedia.config.getMediaMeterIntervalMillis);
    };
}else{
    emedia.requestAnimationFrame = function(callback){
        window.requestAnimationFrame(callback);
    }
}

if (!window.cancelAnimationFrame || !emedia.config._useRequestAnimationFrame) {
    emedia.cancelAnimationFrame = function(id) {
        clearTimeout(id);
    };
}else{
    emedia.cancelAnimationFrame = function(id){
        window.cancelAnimationFrame(id);
    }
}

emedia.stopAudioTracks = function (_stream) {
    _stream && _stream.getAudioTracks().forEach(function (track) {
        track.stop();
    });
};
emedia.stopAndRemoveAudioTracks = function (_stream) {
    var tracks = [];
    _stream && _stream.getAudioTracks().forEach(function (track) {
        track.stop();
        tracks.push(track);
    });

    util.forEach(tracks, function (_index, track) {
        _stream.removeTrack(track);
    });
};

emedia.stopTracks = function (_stream) {
    try{
        if(!_stream || _stream.active === false){
            util.logger.debug("stream tracks had been stoped. it ", _stream && _stream.id);
            return;
        }

        function stop() {
            _stream.getTracks().forEach(function (track) {
                track.stop();
            });

            if(_stream._bindAttendee){
                //push stream时，由于异步，在未返回成功后，退出会议，摄像头不会被关闭问题
                util.removeAttribute(_stream._bindAttendee._openedRtcMediaStreams, _stream.id);
                _stream._bindAttendee = null;
            }
            util.logger.info("stream tracks stoped. it ", _stream);
        }
        stop();
        //setTimeout(stop, 300);
    }catch (e) {
        util.logger.error(e);
    }
};

emedia.enableVideoTracks = function (_stream, enabled) {
    _stream && _stream.getVideoTracks().forEach(function (track) {
        if(typeof track.enable === "function"){
            track.enable();
            track.enabled === enabled || track.enable(enabled);
            return;
        }

        track.enabled === enabled || (track.enabled = enabled);
    });
};

emedia.enableAudioTracks = function (_stream, enabled) {
    _stream && _stream.getAudioTracks().forEach(function (track) {
        if(typeof track.enable === "function"){
            track.enable();
            track.enabled === enabled || track.enable(enabled);
            return;
        }

        track.enabled === enabled || (track.enabled = enabled);
    });
};

emedia.hasEnabledTracks = function (mediaStream) {
    if(!mediaStream || (typeof mediaStream.getAudioTracks !== 'function')){
        return false;
    }

    if(!mediaStream.active){
        return false;
    }

    var tracks = mediaStream.getAudioTracks();

    if(tracks.length === 0){
        return false;
    }

    for(var i in tracks){
        if(typeof tracks[i].enable === "function"){
            tracks[i].enable();
        }
        if(tracks[i].enabled){
            return true;
        }
    }

    return false;
};

emedia.fileReport = function () {
    if(!emedia._logContext){
        return;
    }
    if(!(emedia._logContext instanceof Array)){
        return;
    }
    if(typeof emedia._logContextIndex === 'undefined' || emedia._logContextIndex < 0){
        return;
    }

    var start = 0;
    var end = emedia._logContextIndex;
    if(emedia._logContextIndex >= emedia._logContext.length){
        start = emedia._logContextIndex - emedia._logContext.length + 1;
    }

    var report = "";
    for(var i = start; i <= end; i++){
        var index = i % emedia._logContext.length;
        var oneConfrLogs = emedia._logContext[index];
        report += oneConfrLogs.join("\r\n") + "\r\n";
    }

    if(emedia._logContext.loadlogs && emedia._logContext.loadlogs instanceof Array){
        report += "-------------------------------------------------------------\r\n";
        report += emedia._logContext.loadlogs.join("\r\n") + "\r\n";
    }

    var fileContent = report;
    var content = encodeURIComponent(fileContent);

    var link = document.createElement('a');
    link.style.display = 'none';
    link.download = 'emedia-' + (new Date().toJSON()) + '.log';
    link.href = 'data:text/plain;charset=utf-8,' + content;
    //link.setAttribute('download', link.download);
    //link.setAttribute('href', 'data:text/plain;charset=utf-8,' + content); //'data:attachment/file;charset=utf-8,' + content

    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
};


var Service = require('./components/Service');
var __event = require('./components/event');

emedia.Webrtc = require('./components/_Webrtc');

emedia.Service = Service;
emedia.P2P = require('./components/AddonsP2P');
// var cloneService = util.extend({}, Service).extend(Service);
emedia.XService = Service;
emedia.XServiceWithP2P = emedia.P2P(Service);

// emedia.mgr = require("./components/mgr/Manager");
// emedia.mgr = emedia.mgr.single;
emedia.mgr = require("./components/mgr/outer").outer;

emedia.ctrl = require('./components/pannelVideo');
emedia.CompositeCanvas = require('./components/CompositeCanvas');

emedia.pannel || (emedia.pannel = {});
emedia.pannel.DefaultMouseTrack = require('../../pannel/src/components/DefaultTrack');
emedia.pannel.MouseTrack = require('../../pannel/src/components/MouseTrack');
emedia.pannel.KeyboardTrack = require('../../pannel/src/components/KeyboardTrack');

var PCStats = emedia.PCStats = require('./components/PCStats');

emedia.helper = emedia.helper || {};

emedia.helper.PCStats = PCStats;

emedia.helper.pcstats = PCStats.echo;
emedia.helper.intervalPcstats= PCStats.intervalEcho;

emedia.helper.inboundAudio = PCStats.inboundAudio;
emedia.helper.inboundVideo = PCStats.inboundVideo;

emedia.helper.outboundAudio = PCStats.outboundAudio;
emedia.helper.outboundVideo = PCStats.outboundVideo;


emedia.event = __event;


emedia.LOG_LEVEL = 0;

emedia.isFirefox = 'firefox' === emedia.browser;
emedia.isChrome = 'chrome' === emedia.browser;
emedia.isSafari = 'safari' === emedia.browser;
emedia.isEdge = 'edge' === emedia.browser;

emedia.isElectron = /Electron/.test(navigator.userAgent);
if(emedia.isElectron){
    try{
        require("./components/electron");
    }catch(e){
        util.logger.error(e)
    }
}

emedia.isWebRTC = window.RTCPeerConnection && /^https\:$/.test(window.location.protocol);

/**
 * 判断是否支持pranswer
 */
if (emedia.isChrome || emedia.isSafari) {
    emedia.supportPRAnswer = true;
}
/**
 * 2019.02.21
 * 发现chrome72版本 对pranswer支持有问题，https://webrtc.github.io/samples/src/content/peerconnection/pr-answer 事例也不能正显示视频
 * video.srcObject [remote media stream] active: false.
 *
 * 统一设置为不支持pranswer
 *
 */
emedia.supportPRAnswer = false;


emedia.config({
   baseAcptOps: [102, 104, 105, 106, 107, 300, 302, 303, 304, 301, 204, 206, 400, 401, 1001, 100201, 100202, 100203]
    // baseAcptOps: [107, 300, 302, 303, 304, 301, 204, 206, 400, 401, 1001]
});
emedia.config({
    clientType: 'WEB',
    version: '2.1.1',

    userAgent: navigator.userAgent,

    acptOps:[
        100230, //远程控制
        100205, //远程抓图
        1003, //透传消息
        1004,  //P2P消息支持
        // 100201, //缩放
        // 100202, //聚焦
        // 100203, //曝光
        // 100204, //定格
        // 100205 //远程抓图
    ]
});

// /**
//  *  Enter 客户端携带，进入
//  *  服务端可支持，Json字符串，或Json数据
//  */
// var res = {
//     type: 'ios|android|web',
//     ver: '1.0.2',
//     agent: '', //ios android可以不传，web navigator.userAgent
//     //可缺省，缺省默认支持
//     //107 300 302 303 304 301 204 206 400 401 1001
//     ops:[
//         1003, //透传消息
//         100201, //缩放
//         100202, //聚焦
//         100203, //曝光
//         100204, //定格
//         100205 //远程抓图
//     ],
//
//     vcodes:['H264', 'VP8'] //客户端进入，可以携带，也可以不携带。携带了，就使用这个广播给其他人。
//                            // A进入，没有携带此参数，服务端通过 type ver agent 补全此字段，广播给B C
// }


module.exports = emedia;