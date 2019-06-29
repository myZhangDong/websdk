var _util = require('./Util');
var _logger = _util.tagLogger("Me");

var Member = require('./_Member');

var __event = require('./event');

var Stream = require('./_Stream');

/**
 * 未体现 member 使用了 session。
 * 请 这样创建
 * Member({_session: sess})
 *
 *
 * close:
 * 1.服务端 踢掉
 * 2.手动点击 挂断
 * 3.enter失败！
 *
 * websocket 断开连接后，并不会 去close。因为发送消息可以实现重连，重新enter
 *
 *
 */
var Attendee = Member.extend({
    __init__: function(){
        var self = this;

        self._session || (self.sessionFactory && (self._session = self.sessionFactory()));

        if(!self._session) {
            _logger.error("Require session");
            throw "Require session";
        }

        self._cver = 0;

        self._cacheMembers = {};
        self._cacheStreams = {};
        self._mediaMeters = {};
        self._openedRtcMediaStreams = {};

        self._linkedStreams = {};
        self._maybeNotExistStreams = {}; //与self._streams结构相同，用 存储 断网时，ice fail的stream对象。这个对象可能不存在了

        self._records = {};

        self._ices = {};
        self.audioMixers = {};

        self.closed = false;

        self._nextStreamSeqno = 0;

        self.getMediaMeterIntervalMillis = self.getMediaMeterIntervalMillis || emedia.config.getMediaMeterIntervalMillis;
    },

    getCurrentMembers: function () {
        var self = this;

        var members = [];
        _util.forEach(self._cacheMembers, function (_memId, _cacheMember) {
            var member = _util.extend(true, {}, _cacheMember);
            members.push(member);
        });

        return members;
    },

    newStream: function(cfg){
        var attendee = this;

        return new Stream(cfg, {
            __init__: function () {
                var self = this;

                self.rtcId || (self._webrtc && (self.rtcId = self._webrtc.getRtcId()));
                self._webrtc || (self.rtcId && (self._webrtc = attendee._ices[self.rtcId]));

                self.__create_id = attendee._nextStreamSeqno++;

                if(self.memId && !self.owner){
                    self.owner = _util.extend({}, attendee._cacheMembers[self.memId]);
                    if(!self.owner && !self.located()){
                        _logger.error("Remote stream, not owner. it = ", self.id);
                        throw "Remote stream, not owner. it = " + self.id;
                    }
                }
            }
        });
    },

    getConfrId: function(){
        return this.ticket.confrId;
    },
    isCaller: function () {
        var self = this;
        return self.isP2P() && self.ticket.caller == self.ticket.memName;
    },
    isCallee: function () {
        var self = this;
        return self.isP2P() && self.ticket.callee == self.ticket.memName;
    },
    isP2P: function () {
        var self = this;
        return self.ticket && (self.ticket.type == "P2P" || self.ticket.type == "p2p");
    },
    isConfr: function () {
        var self = this;
        return self.ticket && (self.ticket.type == "CONFR" || self.ticket.type == "confr");
    },

    onEvent: function (evt) {

    },

    join: function(joined, joinError){
        _logger.debug("begin join ...");

        var self = this;

        var enter;

        if(self._memberId){
            _logger.warn("Had joined. igrone it");
            joined && joined(self.memId);
            return;
        }

        function onJoinError(_event_) {
            try{
                if((_event_ instanceof __event.WSClose) && _event_.retry){
                    return;
                }

                if(!(_event_ instanceof __event.EnterFail)){
                    _event_ = new __event.EnterFail({ //可能是 websocket 链接未成功
                        attendee: self,
                        cause: _event_,
                    });
                }

                self.onEvent(_event_);
                joinError && joinError(_event_);
            } finally {

            }
        }

        function enterRsp(rsp) {
            if(rsp.result != 0){
                try{
                    onJoinError(new __event.RspFail({request: enter, response: rsp}));
                } finally {
                    if(rsp.result !== -9527){ //-9527 客户端 自己返回，网络未通， 其他值服务端返回
                        self.onEvent(new __event.ServerRefuseEnter({failed: rsp.result, msg: rsp.msg}));
                    }
                }

                return;
            }

            self.reflushSupportVCodes(rsp.vcodes);

            self.setMemberId(rsp.memId);
            self.role = rsp.role;

            self.onEvent(new __event.EnterSuccess());

            joined && joined(rsp.memId);

            try{
                self.__rtc_cfg = rsp.rtcCfg;
                if(typeof rsp.rtcCfg === 'string'){
                    self.__rtc_cfg = JSON.parse(rsp.rtcCfg);
                }
            }finally {
                self.onMembers(rsp.cver, rsp.mems);
                self.onStreams(rsp.cver, rsp.streams);
            }
        }

        function onConnected() {
            enter = self.newMessage()
                .setOp(200)
                .setTicket(self.ticket)
                .setNickName(self.nickName || self.ticket.memName)
                .setResource(self.resource)
                .setExt(self.ext);
            self.postMessage(enter, enterRsp);
        }

        self.connect(onConnected, onJoinError);
        _logger.debug("join", self.ticket.url);
    },

    withpublish: function (pubS) {
        var self = this;

        if(!pubS || !pubS.localStream){
            _logger.error("pubS null or stream not open");
            throw "pubS null or stream not open";
        }

        var enter;

        var openedStream = pubS && pubS.localStream;

        var webrtc;

        function then(joined, joinError) {
            if(arguments.length === 1){
                joinError = joined;
                joined = undefined;
            }

            if(self._memberId){
                _logger.warn("Had joined. igrone it");
                joined && joined(self.memId);
                return;
            }


            function onJoinError(_event_) {
                try{
                    if((_event_ instanceof __event.WSClose) && _event_.retry){
                        return;
                    }

                    if(!(_event_ instanceof __event.EnterFail)){
                        _event_ = new __event.EnterFail({ //可能是 websocket 链接未成功
                            attendee: self,
                            cause: _event_,
                        });
                    }

                    self.onEvent(_event_);
                    joinError && joinError(_event_);
                } finally {
                    emedia.stopTracks(openedStream);

                    webrtc && self.closeWebrtc(webrtc.getRtcId());
                }
            }


            var optimalVideoCodecs = self.getOptimalVideoCodecs();

            function enterRsp(rsp) {
                if(rsp.result != 0){
                    try{
                        onJoinError(new __event.RspFail({request: enter, response: rsp}));
                    } finally {
                        if(rsp.result !== -9527){ //-9527 客户端 自己返回，网络未通， 其他值服务端返回
                            self.onEvent(new __event.ServerRefuseEnter({failed: rsp.result, msg: rsp.msg}));
                        }
                    }

                    return;
                }

                self.reflushSupportVCodes(rsp.vcodes);

                self.setMemberId(rsp.memId);
                self.role = rsp.role;

                self.onEvent(new __event.EnterSuccess());

                var stream = self.newStream(pubS);
                stream._localMediaStream = pubS.localStream;
                stream.rtcId = webrtc.getRtcId();
                stream._webrtc = webrtc;
                stream.id = rsp.streamId;
                stream.csrc = rsp.csrc;
                stream.owner = {id: rsp.memId, nickName: self.nickName, name: self.sysUserId, ext: self.extObj};

                stream.optimalVideoCodecs = optimalVideoCodecs;

                joined && joined(rsp.memId, stream);
                self.onEvent(new __event.PushSuccess({stream: stream, hidden: true})); //ice重连成功后 会 再次 onEvent PushSuccess

                rsp.sdp && self.ansC(webrtc.getRtcId(), rsp.sdp);
                rsp.cands && self.tcklC(webrtc.getRtcId(), rsp.cands)

                try{
                    self.__rtc_cfg = rsp.rtcCfg;
                    if(typeof rsp.rtcCfg === 'string'){
                        self.__rtc_cfg = JSON.parse(rsp.rtcCfg);
                    }
                    if(self.__rtc_cfg && self.__rtc_cfg.iceServers && self.__rtc_cfg.iceServers.length > 0){
                        _logger.warn("Server rsp one rtc cfg. publish will republish");

                        self._service && setTimeout(function () {
                            self._service._republish(stream);
                        }, 200);
                    }
                }finally {
                    self.onMembers(rsp.cver, rsp.mems);
                    self.onStreams(rsp.cver, rsp.streams);
                }
            }

            function onConnected() {
                _logger.debug("enter and pubs");

                var stream = pubS.localStream;

                var offerOptions, subArgs;
                if(pubS.type === 2){
                    offerOptions = {
                        offerToReceiveAudio: true,
                        offerToReceiveVideo: false
                    };
                    subArgs = {
                        subSVideo: false,
                        subSAudio: true
                    };
                }

                webrtc = self.createWebrtc({
                    _rtcId: pubS.rtcId,
                    optimalVideoCodecs: optimalVideoCodecs,
                    offerOptions: offerOptions,
                    subArgs: subArgs,
                    vbitrate: pubS.vbitrate || (pubS.constaints && pubS.constaints.video && pubS.constaints.video.bitrate),
                    abitrate: pubS.abitrate || (pubS.constaints && pubS.constaints.audio && pubS.constaints.audio.bitrate)
                }, pubS.iceRebuildCount);
                self.setLocalStream(stream, webrtc.getRtcId());

                self.doOffer(webrtc.getRtcId(), function (sdp) {
                    enter = self.newMessage()
                        .setOp(200)
                        .setTicket(self.ticket)
                        .setNickName(self.nickName || self.ticket.memName)
                        .setResource(self.resource)
                        .setSdp(sdp)
                        .setRtcId(webrtc.getRtcId())
                        .setPubS(pubS)
                        .setExt(self.ext);
                    self.postMessage(enter, enterRsp);
                });
            }

            self.connect(onConnected, onJoinError);
            _logger.debug("join", self.ticket.url);
        }

        return {
            join: then
        }
    },

    push: function(pubS, pushed, onPushError, autoPush){
        _logger.debug("begin push ...");

        var self = this;

        if(arguments.length === 2){
            onPushError = pushed;
            pushed = undefined;
        }


        if(!pubS || !pubS.localStream){
            _logger.error("pubS or stream open");
            throw "pubS or stream open";
        }


        var initC;

        var openedStream = pubS.localStream;

        var webrtc;

        function _onPushError(_event_) {
            try{
                var stream = self.newStream(pubS);
                stream._localMediaStream = pubS.localStream;
                stream._webrtc = webrtc;
                stream.rtcId = webrtc && webrtc.getRtcId();
                stream.owner = {id: self.getMemberId(), nickName: self.nickName, name: self.sysUserId, ext: self.extObj};

                var _event_ = new __event.PushFail({
                    stream: stream,
                    cause: _event_,
                    hidden: (autoPush && _event_.hidden === true)
                });

                self.onEvent(_event_);
                _event_.hidden || (onPushError && onPushError(_event_));
            } finally {
                if (openedStream && _event_.hidden !== true) {
                    emedia.stopTracks(openedStream);
                }

                webrtc && self.closeWebrtc(webrtc.getRtcId(), _event_.hidden === true);
            }
        }

        if(!pubS.rtcId && pubS.type === 2 && !emedia.config.allowRepeatAudioMixerPublish && self._service.hasAudioMixers()){
            _onPushError(new __event.AudioMixerStreamRepeatPublish());
            return;
        }

        var optimalVideoCodecs = pubS.optimalVideoCodecs || self.getOptimalVideoCodecs();

        function pushRsp(webrtc, rsp) {
            if(rsp.result != 0){
                _onPushError(new __event.RspFail({request: initC, response: rsp, hidden: rsp.retrying === true}));

                return;
            }

            var stream = self.newStream(pubS);

            stream._localMediaStream = pubS.localStream;
            stream._webrtc = webrtc;
            stream.rtcId = webrtc.getRtcId();
            stream.id = rsp.streamId;
            stream.csrc = rsp.csrc;
            stream.owner = {id: self.getMemberId(), nickName: self.nickName, name: self.sysUserId, ext: self.extObj};

            stream.optimalVideoCodecs = optimalVideoCodecs;

            stream.id && (stream.type === 2) && (self.audioMixers[stream.id] = stream);

            try{
                self.onEvent(new __event.PushSuccess({stream: stream, hidden: true})); //ice重连成功后 会 再次 onEvent PushSuccess
            } finally {
                rsp.sdp && self.ansC(webrtc.getRtcId(), rsp.sdp);
                rsp.cands && self.tcklC(webrtc.getRtcId(), rsp.cands);

                pushed && pushed(stream);
            }
        }

        function pub(pubS) {
            _logger.debug("pubs");

            var stream = pubS.localStream;

            var offerOptions, subArgs;
            if(pubS.type === 2){
                offerOptions = {
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: false
                };
                subArgs = {
                    subSVideo: false,
                    subSAudio: true
                };
            }

            webrtc = self.createWebrtc({
                _rtcId: pubS.rtcId,
                optimalVideoCodecs: optimalVideoCodecs,
                offerOptions: offerOptions,
                subArgs: subArgs,
                vbitrate: pubS.vbitrate || (pubS.constaints && pubS.constaints.video && pubS.constaints.video.bitrate),
                abitrate: pubS.abitrate || (pubS.constaints && pubS.constaints.audio && pubS.constaints.audio.bitrate)
            }, pubS.iceRebuildCount);

            self.setLocalStream(stream, webrtc.getRtcId());

            self.doOffer(webrtc.getRtcId(), function (sdp) {
                initC = self.newMessage()
                    .setOp(102)
                    .setRtcId(webrtc.getRtcId())
                    .setSdp(sdp)
                    .setPubS(pubS);

                self.postMessage(initC, function (rsp) {
                    pushRsp(webrtc, rsp);
                });
            });
        }

        pub(pubS);
        _logger.debug("push", self.ticket.url);
    },

    isSafari: function () {
        return /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    },

    isSafariButNotPushStream: function (successOpenMedia, failOpenMedia) {
        var self = this;

        if(self.isSafari() && !emedia._isSafariYetPushedStream){
            if(self.__tryingOpenMedia === true){
                self.__tryingOpenMediaWaitSuceess = (self.__tryingOpenMediaWaitSuceess || []);
                self.__tryingOpenMediaWaitFail = (self.__tryingOpenMediaWaitFail || []);

                if(typeof successOpenMedia === "function"){
                    self.__tryingOpenMediaWaitSuceess.push(successOpenMedia);
                }
                if(typeof failOpenMedia === "function"){
                    self.__tryingOpenMediaWaitFail.push(failOpenMedia);
                }
            }else {
                self.__tryingOpenMedia = true;
                self._service.__getUserMedia({audio: true}, function success(_user, mediaStream) {
                    emedia._isSafariYetPushedStream = true;
                    // setTimeout(function () {
                    //     emedia.stopAudioTracks(mediaStream);
                    // }, 700);
                    emedia.stopAudioTracks(mediaStream);

                    setTimeout(function () {
                        self.__tryingOpenMedia = false;
                        successOpenMedia && successOpenMedia.apply(self);
                        self.__tryingOpenMediaWaitSuceess && _util.forEach(self.__tryingOpenMediaWaitSuceess, function (index, func) {
                            func.apply(self);
                        });
                        self.__tryingOpenMediaWaitSuceess = [];
                        self.__tryingOpenMediaWaitFail = [];
                    }, 300);
                }, function (event) {
                    //emedia._isSafariYetPushedStream = false;
                    self.__tryingOpenMedia = false;
                    _logger.error("Safari must getUserMedia, gather cands. now try get audio. fail. subfail");

                    failOpenMedia && failOpenMedia.call(self, event);
                    self.__tryingOpenMediaWaitFail && _util.forEach(self.__tryingOpenMediaWaitFail, function (index, func) {
                        func.call(self, event);
                    });
                    self.__tryingOpenMediaWaitSuceess = [];
                    self.__tryingOpenMediaWaitFail = [];
                })
            }
            return true;
        }

        return false;
    },

    createWebrtcAndSubscribeStream: function (streamId, callbacks, iceServerConfig, subArgs) {
        var self = this;

        callbacks || (callbacks = {});

        var subStream = self._cacheStreams[streamId];
        var subMember = self._cacheMembers[subStream.memId];

        //var stream = self.newStream(subStream);
        var stream = subStream;
        subArgs = subArgs || stream.subArgs || {subSVideo: true, subSAudio: (subStream.type !== 2)}; //混音自动订阅不要订阅音频

        function _onSubFail(evt) {
            _logger.warn("sub stream error", streamId, evt);

            preSubArgs && stream._webrtc && stream._webrtc.setSubArgs(preSubArgs);
            preSubArgs && (stream.subArgs = preSubArgs);

            evt = new __event.SubFail({
                stream: stream,
                hidden: evt.hidden === true,
                cause: evt
            });

            callbacks && callbacks.onEvent && callbacks.onEvent(evt);
            self.onEvent && self.onEvent(evt);
        }


        var pubStreamVCodes = subStream.vcodes || [];
        var pubMemberSupportVCodes = subMember && subMember.vcodes || [];
        var selfSupportVCodes = self.supportVCodes;

        var optimalVideoCodecs = self._getOptimalVideoCodecsSubset(pubStreamVCodes, pubMemberSupportVCodes, selfSupportVCodes);


        // if(!stream.voff && subArgs.subSVideo && optimalVideoCodecs.length == 0){ // 订阅视频 但是 没有相同的 视频编码格式。失败
        //     _onSubFail(_util.extend(new __event.SubFail(), new __event.SubFailNotSupportVCodes({
        //         stream: stream
        //     })));
        //     return;
        // }

        subArgs = subArgs || stream.subArgs;

        var preSubArgs = stream.subArgs;

        var withoutVideo = !(stream.vcodes && stream.vcodes.length > 0);
        emedia.isSafari && (withoutVideo = withoutVideo || !!stream.voff);

        var offerOptions = {
            offerToReceiveAudio: true,
            offerToReceiveVideo: (subArgs.subSVideo && !withoutVideo)
        };

        if(!offerOptions.offerToReceiveAudio && !offerOptions.offerToReceiveVideo){
            _logger.warn("offerToReceiveAudio == false and offerToReceiveVideo == false");
        }

        var webrtc = self.createWebrtc({
            iceServerConfig: iceServerConfig,
            optimalVideoCodecs: optimalVideoCodecs,
            offerOptions: offerOptions,

            onGotMediaStream: function (remoteMediaStream) {
                var evt = new __event.SubSuccess({
                    stream: stream,
                    hidden: true
                });

                callbacks.onGotRemote && callbacks.onGotRemote(stream);
                self.onEvent && self.onEvent(evt);
            }
        }, stream.iceRebuildCount);
        var rtcId = webrtc.getRtcId();

        _logger.warn(rtcId, " sub stream ", streamId, optimalVideoCodecs);

        stream._webrtc = webrtc;
        stream.rtcId = rtcId;
        stream.owner = _util.extend({}, subMember);

        subArgs && stream._webrtc && stream._webrtc.setSubArgs(subArgs);
        subArgs && (stream.subArgs = subArgs);


        if(self.isSafariButNotPushStream(function success() {
            self.offerCall(rtcId, null, streamId, _onSubFail, function onRspSuccess() {
            });
        }, function (event) {
            _logger.error("Safari must getUserMedia, gather cands. now try get audio. fail. subfail", rtcId, streamId);
            _onSubFail(event);
        })){ // safari 如果没有getUserMedia时，是不会生成cands的
        }else{
            self.offerCall(rtcId, null, streamId, _onSubFail, function onRspSuccess() {

            });
        }
    },

    _getOptimalVideoCodecsSubset: function (pubStreamVCodes, pubMemberSupportVCodes, selfSupportVCodes) {
        var self = this;

        var optimalVideoCodecs = [];

        if(pubStreamVCodes && pubStreamVCodes.length > 0 && selfSupportVCodes[pubStreamVCodes[0]]){
            optimalVideoCodecs.push(pubStreamVCodes[0]);
        }
        if(optimalVideoCodecs.length == 0){
            for(var i = 0; i < self._orderVCodes.length; i ++){
                _util.forEach(pubMemberSupportVCodes, function (index, sVCode) {
                    if(sVCode == self._orderVCodes[i]){
                        optimalVideoCodecs.push(sVCode);
                    }
                });
            }
        }

        return optimalVideoCodecs;
    },

    subscribeStream: function (rtcId, streamId, rspFail, subArgs, onSub){
        var self = this;

        var webrtc = self._ices[rtcId];

        var subStream = self._cacheStreams[streamId];
        var subMember = self._cacheMembers[subStream.memId];

        //var stream = self.newStream(subStream);
        var stream = subStream;
        stream._webrtc = webrtc;
        stream.rtcId = rtcId;
        stream.owner = _util.extend({}, subMember);



        var preSubArgs = stream.subArgs;

        subArgs = subArgs || {subSVideo: true, subSAudio: true};
        stream.subArgs = stream.subArgs || {subSVideo: true, subSAudio: true};
        stream._webrtc && (stream._webrtc.subArgs = stream._webrtc.subArgs || {subSVideo: true, subSAudio: true});

        if(!stream.subArgs.subSVideo && subArgs.subSVideo && !stream.voff){
            var pubStreamVCodes = subStream.vcodes;
            var pubMemberSupportVCodes = subMember.vcodes;
            var selfSupportVCodes = self.supportVCodes;

            var optimalVideoCodecs = self._getOptimalVideoCodecsSubset(pubStreamVCodes, pubMemberSupportVCodes, selfSupportVCodes);

            // if(optimalVideoCodecs.length == 0){ // 订阅视频 但是 没有相同的 视频编码格式。失败
            //     preSubArgs && stream._webrtc && stream._webrtc.setSubArgs(preSubArgs);
            //     preSubArgs && (stream.subArgs = preSubArgs);
            //
            //     var evt = _util.extend(new __event.SubFail(), new __event.SubFailNotSupportVCodes({
            //         stream: stream
            //     }));
            //
            //     rspFail && rspFail(evt);
            //     self.onEvent(evt);
            //
            //     return;
            // }
        }


        subArgs && stream._webrtc && stream._webrtc.setSubArgs(subArgs);
        subArgs && (stream.subArgs = subArgs);


        var subMessage = self.newMessage()
            .setOp(205)
            .setRtcId(rtcId)
            .setSubSId(streamId);

        subArgs && _util.extend(subMessage, subArgs);

        self.postMessage(subMessage, function (rsp) {
            if(rsp.result != 0){
                preSubArgs && stream._webrtc && stream._webrtc.setSubArgs(preSubArgs);
                preSubArgs && (stream.subArgs = preSubArgs);

                var evt = new __event.SubFail({
                    stream: stream,
                    cause: (new __event.RspFail({request: subMessage, response: rsp}))
                });

                rspFail && rspFail(evt);
                self.onEvent(evt);

                return;
            }

            var evt = new __event.SubSuccess({
                stream: stream,
                hidden: true
            });
            self._updateRemoteStream(stream, stream._webrtc.getRemoteStream());
            self.onEvent(evt);

            typeof onSub === 'function' && (onSub());
        });
    },

    unsubscribeStream: function(streamId){
        var self = this;

        var stream = self._cacheStreams[streamId];
        var rtcId = stream._webrtc && stream._webrtc.getRtcId();
        if(!rtcId){
            return;
        }

        try {
            var unsubMessage = self.newMessage()
                .setOp(206)
                .setRtcId(rtcId)
                .setSubSId(streamId);

            self.postMessage(unsubMessage);
        } finally {
            self.closeWebrtc(rtcId);
        }

        return rtcId;
    },

    onEnter: function(cver, mem){
        var self = this;

        cver && (self._cver = cver);

        if(!mem) return;
        if(self._cacheMembers[mem.id]){
            return;
        }

        self._cacheMembers[mem.id] = mem;

        var _tmpMap = {};
        if(mem.res && mem.res.vcodes && mem.res.vcodes.length > 0){
            _util.forEach(mem.res.vcodes, function (index, vcode) {
                if(_tmpMap[vcode]){
                }else{
                    _tmpMap[vcode] = true;
                    self.supportVCodes[vcode] && self.supportVCodes[vcode]++;
                }

            });
        }

        // var hasOtherDevices;
        // _util.forEach(self._cacheMembers, function (_memId, _member) {
        //     if(!hasOtherDevices && _memId != mem.id && mem.memName === _member.memName){
        //         hasOtherDevices = true;
        //     }
        // });
        //
        // if(hasOtherDevices){
        //     return;
        // }

        self.onAddMember(_util.extend({}, mem));
    },

    _onFinally: function () {
        var self = this;

        self._cacheMembers = {}; // id, name, nickName, resource
        self._cacheStreams = {}; // id, memId, name, voff, aoff, type
        self._linkedStreams = {};
        self._ices = {};
        self._maybeNotExistStreams = {};

        //self._session._sessionId = undefined;
        //self._session = undefined;


        //push stream时，由于异步，在未返回成功后，退出会议，摄像头不会被关闭问题
        var openedMediaStreams = [];
        _util.forEach(self._openedRtcMediaStreams, function (streamId, mediaStream) {
            if(mediaStream.active !== false){ //还没有关闭的流
                openedMediaStreams.push(mediaStream);
            }
        });
        if(openedMediaStreams.length > 0){
            for(var i = 0; i < openedMediaStreams.length; i++){
                try{
                    var _openStream = openedMediaStreams[i];
                    _logger.info("exit, close stream = ", _openStream.id);
                    emedia.stopTracks(_openStream);
                }catch (e) {
                    _logger.error(e);
                }
            }
        }

        _logger.warn("finally. all clean.");
    },

    _onRoleUpdate: function(role, roleToken){
        var self = this;

        _logger.info("Role ", role, " <-", self.role);
        _logger.info(roleToken);
        self.role = role;
        self.roleToken = roleToken;

        self.onRoleUpdate && self.onRoleUpdate(role, roleToken);
    },

    onExit: function(cver, memId, reason){
        var self = this;

        cver && (self._cver = cver);

        if(memId == self.getMemberId()){ //被服务器 强制 exit
            _logger.warn("Me exit. ", reason, memId);

            try{
                self.closed || self.close(reason);
            }catch (e){
                self.onEvent(new __event.Hangup({reason: reason, self: {id: self._memberId}}));
                self.onMeExit && self.onMeExit(reason);

                _logger.warn(e);
            }

            return;
        }

        var rmMember = self._cacheMembers[memId];
        if(rmMember){
            if(rmMember.res && rmMember.res.vcodes && rmMember.res.vcodes.length > 0){
                _util.forEach(rmMember.res.vcodes, function (index, vcode) {
                    self.supportVCodes[vcode]--;
                });
            }

            self._onRemoveMember(rmMember, reason);
            self.onEvent(new __event.Hangup({reason: reason, parnter: rmMember}));
        }
    },

    onPub: function(cver, memId, pubS){
        var self = this;

        if(!self._cacheMembers[memId]) {
            _logger.error("No found member. when pub");
            throw "No found member. when pub";
        }

        // if(pubS.type === 2){ //强制 aoff = 1
        //     pubS._1_aoff = pubS.aoff;
        //     pubS.aoff = self._service.hasAudioMixers() ? 0 : 1;
        // }

        var newStream = self.newStream(pubS);
        var _stream = self._cacheStreams[pubS.id];

        cver && (self._cver = cver);

        if(_stream && (newStream.sver !== _stream.sver)){
            _logger.info("Onpub. the steam ", _stream.id, " republish. sver ", _stream.sver, newStream.sver);

            if(newStream && (newStream.aoff !== _stream.aoff || newStream.voff != _stream.voff)){
                self.onStreamControl(undefined, pubS.id, newStream.voff, newStream.aoff);
            }

            _util.extend(_stream, newStream);
            self._onRepublishStream(_stream);

            return;
        }

        var stream = newStream;

        stream.owner = self._cacheMembers[memId];
        self._cacheStreams[pubS.id] = stream;

        self._onAddStream(self.newStream(stream));

        if(self.autoSub){
            // if(self.isSafariButNotPushStream()){
            //     stream._autoSubWhenPushStream = true;
            //     _logger.warn("Dont auto sub stream ", stream.id, ", caused by safari not pub stream");
            //     //return;
            // }

            self.createWebrtcAndSubscribeStream(pubS.id, {
                onGotRemote: function(stream) {
                }
            }); //, undefined, subArgs
        }

        return stream;
    },

    onUnpub: function(cver, memId, sId){
        var self = this;

        var rmStream = self._cacheStreams[sId];
        self._onRemovePubstream(self._cacheMembers[memId], rmStream);

        cver && (self._cver = cver);
    },

    onClose: function(cver, confrId, reason){
        var self = this;

        try{
            self.close(reason || 0);
        } finally {
            self.onConfrClose && self.onConfrClose(confrId, reason);
        }
    },

    __getWebrtcFor: function (pubStreamId) {
        var self = this;

        var webrtc = self._cacheStreams[pubStreamId] && self._cacheStreams[pubStreamId]._webrtc;
        return webrtc && webrtc.getRtcId();
    },
    _getWebrtc: function (pubStreamId) {
        var self = this;

        var webrtc = self._cacheStreams[pubStreamId] && self._cacheStreams[pubStreamId]._webrtc;
        return webrtc;
    },

    _updateRemoteStream: function (stream, remoteMediaStream) {
        if(stream.located() && stream.type === 2){
            emedia.enableAudioTracks(remoteMediaStream, true);
        }else{
            emedia.enableAudioTracks(remoteMediaStream, !stream.aoff && !(stream.subArgs && stream.subArgs.subSAudio === false));
        }

        emedia.enableVideoTracks(remoteMediaStream, !stream.voff && !(stream.subArgs && stream.subArgs.subSVideo === false));
    },

    onStreamControl: function(cver, streamId, voff, aoff, sver){
        var self = this;

        var stream = self._cacheStreams[streamId];

        stream.voff = voff;
        stream.aoff = aoff;


        var webrtc = stream._webrtc;
        webrtc && webrtc._remoteStream && self._updateRemoteStream(stream, webrtc._remoteStream);

        var stream = self.newStream(stream);
        self.onUpdateStream && self.onUpdateStream(stream, new stream.Update({voff: voff, aoff: aoff}));

        cver && (self._cver = cver);
        sver && (stream.sver = sver);
    },

    aoff: function(pubS, _aoff, callback){
        var self = this;

        var rtcId = self.__getWebrtcFor(pubS.id);
        if(!rtcId){
            _logger.error("pubS not publish", pubS.id);
            throw "pubS not publish" + pubS.id;
        }

        self._linkedStreams[pubS.id].aoff = pubS.aoff = _aoff;


        var streamControl = self.newMessage()
            .setOp(400)
            .setRtcId(rtcId)
            .setVoff(pubS.voff)
            .setAoff(_aoff);
        self.postMessage(streamControl, callback);
        self.onUpdateStream && self.onUpdateStream(pubS, new pubS.Update({aoff: _aoff}));
    },

    voff: function(pubS, _voff, callback){
        var self = this;

        var rtcId = self.__getWebrtcFor(pubS.id);
        if(!rtcId){
            _logger.error("pubS not publish", pubS.id);
            throw "pubS not publish" + pubS.id;
        }

        self._linkedStreams[pubS.id].voff = pubS.voff = _voff;

        var streamControl = self.newMessage()
            .setOp(400)
            .setRtcId(rtcId)
            .setVoff(_voff)
            .setAoff(pubS.aoff);
        self.postMessage(streamControl, callback);
        self.onUpdateStream && self.onUpdateStream(pubS, new pubS.Update({voff: _voff}));
    },

    startRecord: function (_stream, success) {
        var self = this;

        var rtcId = _stream.rtcId;

        var startRecord = self.newMessage()
            .setOp(500)
            .setRtcId(rtcId)
            .setFlag(1);
        self.postMessage(startRecord, function (rsp) {
            _logger.warn("record ", rtcId, rsp.result, rsp.msg);
            success && success(rsp.result === 0);
            if(rsp.result === 0){
                self._records[_stream.id] = _util.extend(false, {}, _stream);
            }
        });
    },

    stopRecord: function (_stream, success) {
        var self = this;

        var rtcId = _stream.rtcId;

        var stopRecord = self.newMessage()
            .setOp(500)
            .setRtcId(rtcId)
            .setFlag(0);
        self.postMessage(stopRecord, function (rsp) {
            _logger.warn("stop record ", rtcId, rsp.result, rsp.msg);
            success && success(rsp.result === 0);
        });

        if(self._records[_stream.id]){
            _util.removeAttribute(self._records, _stream.id);
        }
    },

    onMembers: function(cver, members){
        var self = this;

        var removedMembers = [];
        _util.forEach(self._cacheMembers, function (_memberId, _member) {
            members[_memberId] || removedMembers.push(_member);
        });
        _util.forEach(removedMembers, function (_index, _member) {
            self.onExit(undefined, _member.id);
        });

        var addMembers = [];
        _util.forEach(members, function (_memberId, _member) {
            if(_memberId != self.getMemberId()){
                self._cacheMembers[_memberId] || addMembers.push(_member);
                self._cacheMembers[_memberId] && _util.extend(self._cacheMembers[_memberId], _member);
            }
        });
        _util.forEach(addMembers, function (_index, _member) {
            self.onEnter(undefined, _member);
        });

        cver && (self._cver = cver);
    },

    onStreams: function(cver, streams){
        var self = this;

        var removedStreams = [];
        _util.forEach(self._cacheStreams, function (_pubSId, _stream) {
            _stream.located() || streams[_pubSId] || removedStreams.push(_stream);
        });
        _util.forEach(removedStreams, function (_index, _stream) {
            self.onUnpub(undefined, _stream.memId, _stream.id);
        });

        var addStreams = [];
        _util.forEach(streams, function (_pubSId, stream) {
            // if(stream.type === 2){ //强制 aoff = 1
            //     stream._1_aoff = stream.aoff;
            //     stream.aoff = self._service.hasAudioMixers() ? 0 : 1;
            // }

            if(stream.memId != self.getMemberId()){
                self._cacheStreams[_pubSId] || addStreams.push(stream);
                self._cacheStreams[_pubSId] && _util.extend(self._cacheStreams[_pubSId], stream);
            }
        });
        _util.forEach(addStreams, function (_index, _stream) {
            self.onPub(undefined, _stream.memId, _stream)
        });

        _util.forEach(self._cacheStreams, function (_pubSId, _stream) {
            var newStream;
            _stream.located() || (newStream = streams[_pubSId]);
            if(newStream && (newStream.aoff !== _stream.aoff || newStream.voff != _stream.voff)){
                self.onStreamControl(undefined, _pubSId, newStream.voff, newStream.aoff);
            }

            if(newStream && (newStream.sver !== _stream.sver)){
                _util.extend(_stream, newStream);
                self._onRepublishStream(_stream);
            }
        });

        cver && (self._cver = cver);
    },

    _onRemoveMember: function(member, reason){
        var self = this;

        _logger.info("remove", member, reason);

        var unpubStreams = [];
        _util.forEach(self._cacheStreams, function (_pubSId, _stream) {
            if((_stream.memId || (_stream.owner && _stream.owner.id)) === member.id){
                unpubStreams.push(_stream);
            }
        });

        _util.forEach(unpubStreams, function (index, stream) {
            self._onRemovePubstream(stream.owner, stream, reason);
        });

        _util.removeAttribute(self._cacheMembers, member.id);

        // var hasOtherDevices;
        // _util.forEach(self._cacheMembers, function (_memId, _member) {
        //     if(!hasOtherDevices && _memId != member.id && member.memName === _member.memName){
        //         hasOtherDevices = true;
        //     }
        // });
        //
        // if(hasOtherDevices){
        //     return;
        // }

        self.onRemoveMember && self.onRemoveMember(member, reason);
    },


    _onAddStream: function(stream){
        _logger.info("add stream ", stream.id);
        _logger.debug("add stream ", stream);

        var self = this;
        self.onAddStream(stream);
    },

    _onRemovePubstream: function(member, stream){
        var self = this;

        if(!stream){
            return;
        }
        if(stream.id == 0){
            return;
        }

        function finallyDo(stream) {
            if(stream.type === 2){
                _util.removeAttribute(self.audioMixers, stream.id);

                if(stream.remotePlayAudioObject){
                    document.body.removeChild(stream.remotePlayAudioObject);
                }
            }

            var _rtcId = self.unsubscribeStream(stream.id);
            var rmStream = _util.removeAttribute(self._cacheStreams, stream.id);
            self._monitSoundChanagedStreams && _util.removeAttribute(self._monitSoundChanagedStreams, stream.id);

            if(self.onRemoveStream){
                var stream = self.newStream(stream);

                self.onRemoveStream(stream);
            }
        }

        try{
            var soundMeter = _util.removeAttribute(self._mediaMeters, stream.id);
            soundMeter && soundMeter._finally();
        } finally {
            finallyDo(stream);
        }
    },


    _onRepublishStream: function (_stream) {
        var self = this;

        if((self._ices[_stream.rtcId] || emedia.subscribed(_stream)) && !self._maybeNotExistStreams[_stream.id]){
            var _rtcId = self.unsubscribeStream(_stream.id);

            self.createWebrtcAndSubscribeStream(_stream.id, {
                onGotRemote: function(stream) {
                    //self.onUpdateStream(_stream);
                }
            });
        }else{
            self.onUpdateStream(_stream);
        }
    },

    _onRecvRemoteMessage: function (fromMemId, args, evt) {
        var self = this;

        _logger.debug("Recv remote message", fromMemId, args);

        var fromMember = self._cacheMembers[fromMemId];
        var argsObject;
        try{
            argsObject = JSON.parse(args);
        }catch(e){
        }

        self.onRecvRemoteMessage && self.onRecvRemoteMessage(fromMember || fromMemId, argsObject || args, evt);
    },

    _onSoundChanage: function (member, stream, meterData) {
        if(emedia.config._printSoundData){
            _logger.info("Stream id " + stream.id + ", meter " + (meterData && (meterData.instant.toFixed(2)
                + " " + meterData.slow.toFixed(2)
                + " " + meterData.clip.toFixed(2)
                + " " + (meterData.trackAudioLevel || "--")
                + " " + (meterData.trackTotalAudioEnergy || "--"))));
        }

        meterData || (meterData = {
            instant: 0,
            slow: 0,
            clip: 0
        });

        var self = this;

        if(meterData.instant === 0){
            meterData.instant = meterData.trackAudioLevel || meterData.trackTotalAudioEnergy || 0;
        }

        self.onSoundChanage(member, stream, meterData);
        if(self._service._judgeTalking(meterData)){
            self.onTalking(member, stream, meterData);
        }
    },

    onAddMember: function(member){

    },
    onRemoveMember: function(member, reason){

    },
    onAddStream: function(stream){ //stream undefined 表明 autoSub属性 空或false. autoSub = true时，自动订阅

    },
    onRemoveStream: function(stream){

    },
    onUpdateStream: function (stream, update) {

    },
    onRecvRemoteMessage: function (fromMember, argsObject) {

    },

    onSoundChanage: function (member, stream, meterData) {

    },
    onTalking: function (member, stream, meterData) {

    }
});

module.exports = Attendee;
