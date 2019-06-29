import _util from '../Util';
import zepto  from 'zepto';
import _ from 'underscore';

import { Observable, of, throwError } from 'rxjs';
import { map, concatMap, catchError } from 'rxjs/operators';

import __Stream from '../_Stream';

var _logger = _util.tagLogger("mgr");


window.emedia = window.emedia || {};

var restApis  = {
    createConfr: "/easemob/rtc/req/ticket",
    reqTkt: "/easemob/rtc/req/ticket",
    chanageRoles: "/easemob/rtc/chanage/roles",
    disbandConfr: "/easemob/rtc/disband/conference",
    kickMember: "/easemob/rtc/kick/member",
    selectConfr: "/easemob/rtc/select/confr"
};

function Manager(){
    this._confrs = {};
    this._services = {};
    this._events = {};
    this._videos = {};
}

Manager.prototype.ConfrType = {
    COMMUNICATION: 10,
    COMMUNICATION_MIX: 11,
    LIVE: 12,
    P2P: 13,
    INTERCOMM: 14
};

Manager.prototype.Role = {
    ADMIN: 7,
    TALKER: 3,
    AUDIENCE: 1
};

var _ajax = function(ajaxUrl, confrArgs){
    return new Promise(function(resolve, reject) {
        zepto.ajax({
            type: 'POST',
            url: ajaxUrl,
            data: JSON.stringify(confrArgs),
            contentType: 'application/json',
            dataType: 'json',
            success: function(data, status, xhr){
                _logger.debug("REST: ", data, " -> ", confrArgs, ajaxUrl);
                if(data.error === 0){
                    _util.removeAttribute(data, "error");
                    resolve(data);
                }else{
                    _util.extend(data, {errorType: "server_refuse"});
                    reject(data);
                }
            },
            error: function(xhr, errorType, error){
                var data = {
                    errorType: "http_error",
                    error: xhr.status,
                    errorMessage: error
                };
                _logger.debug("REST: ", data, " -> ", confrArgs, ajaxUrl);

                reject({
                    errorType: "http_error",
                    error: xhr.status,
                    errorMessage: error
                });
            }
        });
    });
};

var _ajax2 = function(ajaxUrl, confrArgs){
    return function onSubscription(observer) {
        zepto.ajax({
            type: 'POST',
            url: ajaxUrl,
            data: JSON.stringify(confrArgs),
            contentType: 'application/json',
            dataType: 'json',
            success: function(data, status, xhr){
                _logger.debug("REST: ", data, " -> ", confrArgs, ajaxUrl);
                if(data.error === 0){
                    _util.removeAttribute(data, "error");
                    observer.next(data);
                    observer.complete();
                }else{
                    _util.extend(data, {errorType: "server_refuse"});
                    observer.error(data);
                }
            },
            error: function(xhr, errorType, error){
                var data = {
                    errorType: "http_error",
                    error: xhr.status,
                    errorMessage: error
                };
                _logger.debug("REST: ", data, " -> ", confrArgs, ajaxUrl);

                observer.error({
                    errorType: "http_error",
                    error: xhr.status,
                    errorMessage: error
                });
            }
        })
    }
};


(function loadApi(_urls){
    _util.forEach(_urls, function (api, url) {
        Manager.prototype[api] = function(apiArgs){
            return _ajax2(this.createUrl(url, api), apiArgs);
        };
    })
})(restApis);

Manager.prototype.createUrl = function(url, api){
    return url;
};

Manager.prototype.setUrlCreator = function(creator){
    this.createUrl = creator.bind(this);
};

Manager.prototype.destroy = function(){

};

Manager.prototype.ZeroStream = __Stream.extend({
    __init__: function () {
        var self = this;

        self.type = 2;
        self.id = "0";
        self._located = false;

        self.mutedMuted = false;
    },

    onGotRemoteMediaStream: function(remoteMediaStream){
        var self = this;

        if(!self.remotePlayAudioObject){
            var _audioId = "__o_remote_play_audio_" + self.id;

            var audioObject = document.createElement("audio");
            audioObject.style.display = "none";
            audioObject.id = "__o_remote_play_audio_" + self.id;
            audioObject.autoplay = true;
            audioObject.playsinline = true;

            //monitorEvents && monitorEvents(audioObject);

            self.remotePlayAudioObject = audioObject;

            document.body.appendChild(audioObject);
        }

        // self.remotePlayAudioObject.autoplay = true;
        // self.remotePlayAudioObject.playsinline = true;
        self.remotePlayAudioObject.srcObject = remoteMediaStream;

        //window.__$_remoteMediaStream = remoteMediaStream;
    }
})

Manager.prototype.setIdentity = function(identityName, identityToken, extInfo){
    this.identityName = identityName;
    this.identityToken = identityToken;
    this.ext = extInfo;

    this._terminalInfo = {
        "browser": emedia.browser,
        "browserVersion": emedia.browserVersion,
        "version": emedia.config.version,
        "userAgent": emedia.config.userAgent
    };

    _logger.info("set identity: ", identityName, identityToken);
    this.destroy();

    emedia.config({
        autoSub: false,
        onlyEnter: true
    })
};

Manager.prototype.EventsObservable = require("./EventsObservable").default;

var errorHandler = catchError((err, caught) => {
    _logger.error(err);
    throw err;
});

function rxCreateConfr(confrType, password) {
    var self = this;

    if(typeof confrType === 'string'){
        confrType = parseInt(confrType);
    }

    return Observable.create(Manager.prototype.createConfr.call(self, {
        uid: self.identityName,
        token: self.identityToken,
        confrType: confrType,
        password: password,
        terminal: self._terminalInfo,
        // rec: true,
        // recMerge: true
    })).pipe(map((response) => {
        response.mixed = response.type === 11 || response.type === 12;
        response.id = response.serverConfrId = response.confrId;
        self._confrs[response.confrId] = _.extend({}, response);

        //_util.removeAttribute(response, "ticket");
        //_util.removeAttribute(response, "roleToken");
        _util.removeAttribute(response, "rtcCfg");

        return response;
    }), errorHandler);
}

function rxReqTkt(confrId, password) {
    var self = this;

    var apiArgs = {
        uid: self.identityName,
        token: self.identityToken,
        confrId: confrId,
        password: password,
        terminal: self._terminalInfo
    };

    self._confrs[confrId] && (apiArgs.roleToken = self._confrs[confrId].roleToken);
    return Observable.create(Manager.prototype.reqTkt.call(self, apiArgs)).pipe(map((response) => {
        response.mixed = response.type === 11 || response.type === 12;
        response.id = response.serverConfrId = response.confrId = confrId;
        self._confrs[confrId] = _util.extend(self._confrs[confrId] || {}, response);

        //_util.removeAttribute(response, "ticket");
        //_util.removeAttribute(response, "roleToken");
        _util.removeAttribute(response, "rtcCfg");

        return response;
    }), errorHandler);
}

function rxChanageRoles(role, uids, confrId) {
    var self = this;

    var confr = self._confr(confrId);
    var service = self._service(confrId);

    var apiArgs = {
        uids: uids,
        role: role,
        roleToken: confr.roleToken
    };

    return Observable.create(Manager.prototype.chanageRoles.call(self, apiArgs)).pipe(map((response) => {
        service && service.current && service.current._sysCopy();
        //return response.error === 0;
        return confr.id;
    }), errorHandler);
}

function rxDisbandConfr(confrId, roleToken) {
    var self = this;

    var confr = self._confr(confrId);
    var apiArgs = {
        roleToken: confr && confr.roleToken || roleToken
    };

    return Observable.create(Manager.prototype.disbandConfr.call(self, apiArgs)).pipe(map((response) => {
        _util.removeAttribute(self._confrs, confrId);
        return confr.id;
    }), errorHandler);
}

function rxKickMember(uids, confrId) {
    var self = this;

    var confr = self._confr(confrId);
    var apiArgs = {
        uids: uids,
        roleToken: confr.roleToken
    };

    return Observable.create(Manager.prototype.kickMember.call(self, apiArgs)).pipe(map((response) => {
        //return response.error === 0;
        return confr.id;
    }), errorHandler);
}

function rxSelectConfr(confrId, password) {
    var self = this;

    var confr = self._confr(confrId);

    var apiArgs = {
        uid: self.identityName,
        token: self.identityToken,
        confrId: confrId,
        password: password
    };

    if(confr){
        apiArgs.password = password || confr.password;
        apiArgs.roleToken = confr.roleToken
    }

    return Observable.create(Manager.prototype.selectConfr.call(self, apiArgs)).pipe(errorHandler);
}

function onRemoteStream(confrId, stream) {

}

function rxAfterJoinedConfr(confrId, joinMemberId) {
    var self = this;
    var confr = self._confr(confrId);
    var service = self._service(confrId);

    switch (confr.type) {
        case  0: //CONFR
        case 10: //COMMUNICATION
            break;
        case 11: //COMMUNICATION_MIX  Audio:Mixed
            break;
        case 12: //LIVE  Audio:Mixed=
            var zeroStream = new self.ZeroStream();
            service.current._cacheStreams[zeroStream.id] = zeroStream;
            if(service.current.role == single.Role.AUDIENCE){ //观众 订阅0
                return rxSubscribe.call(self, confrId, zeroStream, false, true).pipe(
                    concatMap(() => {
                        return of(_util.extend({}, self._confrs[confrId]));;
                    })
                );
            }
            break;
        case 13: //P2P
        case 14: //INTERCOMM
            return throwError("not support conf type: " + confr.type);
        default:
            return throwError("not support conf type: " + confr.type);
    }

    return of(_util.extend({}, self._confrs[confrId]));;
}

function rxSupportRemoteControl(confrId, joinMemberId, service) {
    var self = this;
    emedia.ctrl.support(service,
        function onHasRemoteControl(stream, controler, controlRequest){
            self.onHasRemoteControl(stream, controler, controlRequest, confrId);
        },

        function onRemoteFreeControl(stream, controler, cId) {
            self.onRemoteFreeControl(stream, controler, cId, confrId);
        }
    );
    _logger.info("support remote control. ", confrId, joinMemberId);

    return of(_util.extend({}, self._confrs[confrId]));
}

function rxJoinUseTicket(confrId, ticket, ext) {
    var self = this;

    if(self.joined(confrId)){
        return throwError("had joined confr " + confrId + ", if you want join again, please call exitConference");
    }

    var events = self._events[confrId] = new self.EventsObservable(self, confrId, function (stream) {
        onRemoteStream.call(self, confrId, stream);
    });

    self.confrEventsObserver && events.subscribe(self.confrEventsObserver);

    var service = self._service(confrId);
    service = self._services[confrId] = new emedia.XService({
        listeners: events
    });

    service.setup(ticket, ext);

    return Observable.create(function onSubscription(observer) {
        service.join(function (memId) {
            self.__current_confrId = confrId;
            self._confrs[confrId].joinId = memId;
            self._confrs[confrId].role = service.current && service.current.role;

            observer.next(self._confrs[confrId]);
            observer.complete();
        }, function (event) {
            service.exit();
            observer.error({
                errorType: "join_fail",
                error: -200,
                errorMessage: event.message()
            });
        })
    }).pipe(concatMap((joinMemberId, _index) => {
        return rxSupportRemoteControl.call(self, confrId, joinMemberId, service);
    }), concatMap((joinMemberId, _index) => {
        return rxAfterJoinedConfr.call(self, confrId, joinMemberId);
    }), errorHandler);
}

function rxJoinUsePassword(confrId, password, ext) {
    var self = this;

    return rxReqTkt.call(self, confrId, password, ext)
        .pipe(concatMap((_confr, _index) => {
            return rxJoinUseTicket.call(self, confrId, _confr.ticket, ext);
        }));
}

function rxJoinExistConfrUsePassword(confrId, password, ext) {
    var self = this;
    return rxSelectConfr.call(self, confrId, password, ext).pipe(
        concatMap((_confr, _index) => {
            return rxJoinUsePassword.call(self, confrId, password, ext);
        }));
}

function openUserMedia(confrId, openingStream) {
    var self = this;
    var service = self._service(confrId);

    return Observable.create(function onSubscription(observer) {
        service.openUserMedia(openingStream).then(function(){
            observer.next(openingStream);
            observer.complete();
        }, function fail(evt) {
            observer.error({
                errorType: "open_user_media_fail",
                error: -201,
                errorMessage: evt.message()
            });
        });
    }).pipe(errorHandler);
}

function rxPublish(confrId, userStream) {
    var self = this;
    var service = self._service(confrId);

    return Observable.create(function onSubscription(observer) {
        service.push(userStream, function(pushedStream){
            observer.next(pushedStream);
            observer.complete();
        }, function fail(evt) {
            observer.error({
                errorType: "push_fail",
                error: -203,
                errorMessage: evt.message()
            });
        });
    }).pipe(errorHandler);
}

function rxResumePauseVideo(pubS, videoConstaints, confrId) {
    var self = this;
    var confr = self._confr(confrId);
    var service = self._service(confrId);

    if(typeof pubS === 'string'){
        pubS = service.getStreamById(pubS);
    }else{
        pubS = service.getStreamById(pubS.id);
    }
    if(!pubS){
        return throwError("pub stream not exsits. it is " + pubS);
    }

    if((typeof videoConstaints !== 'boolean' && pubS.constaints && _.isEqual(videoConstaints, pubS.constaints.video))
        || videoConstaints == !pubS.voff){
        return of(_.extend({}, confr.av));
    }

    return rxVoff.call(self, confrId, pubS, videoConstaints);
}

function rxVoff(confrId, pubS, videoConstaints) {
    var self = this;
    var service = self._service(confrId);

    return Observable.create(function onSubscription(observer) {
        service._republishByVideoConstaints(pubS, videoConstaints, function fail(evt) {
            observer.error({
                errorType: "voff_fail",
                error: -203,
                errorMessage: evt.message()
            });
        }, function success() {
            observer.next(service.getStreamById(pubS.id));
            observer.complete();
        });
    }).pipe(errorHandler);
}

function rxResumePauseAudio(pubS, aoff, confrId) {
    var self = this;
    var confr = self._confr(confrId);
    var service = self._service(confrId);

    if(typeof pubS === 'string'){
        pubS = service.getStreamById(pubS);
    }else{
        pubS = service.getStreamById(pubS.id);
    }
    if(!pubS){
        return throwError("pub stream not exsits. it is " + pubS);
    }

    if(confr.type === self.ConfrType.COMMUNICATION_MIX || confr.type === self.ConfrType.LIVE){
        //混音时，共享桌面带声音，会造成 服务端错误。
        if(pubS.type === 1 && !aoff){
            _logger.warn("confr mix. not allow desktop with audio.");
            return throwError("confr mix. not allow desktop with audio.")
        }
    }


    return rxAoff.call(self, confrId, pubS, aoff);
}

function rxAoff(confrId, pubS, aoff) {
    var self = this;
    var service = self._service(confrId);

    return Observable.create(function onSubscription(observer) {
        service.aoff(pubS, aoff, function fail(evt) {
            observer.error({
                errorType: "aoff_fail",
                error: -203,
                errorMessage: evt.message()
            });
        }, function success() {
            observer.next(service.getStreamById(pubS.id));
            observer.complete();
        });
    }).pipe(errorHandler);
}

function rxPublishMedia(confrId, constaints, videoTag, ext) {
    var self = this;

    var confr = self._confr(confrId);
    var service = self._service(confrId);

    if(service.current.role == self.Role.AUDIENCE){
        return throwError("Audience not allow publish");
    }
    if(confr.av){
        return throwError("Audio and video stream has been published. not allow repeat publish.");
    }

    var Stream = confr.mixed ? service.AudioMixerPubstream : service.AVPubstream;
    var stream = confr.av = new Stream({
        constaints: constaints,
        aoff: 0,
        voff: 0,
        ext: ext
    });

    return openUserMedia.call(self, confr.id, stream).pipe(
        concatMap((userStream) => {
            videoTag && _util.targetDOM(videoTag) && attachMediaStream(videoTag, userStream.localStream);
            return rxPublish.call(self, confr.id, userStream, ext);
        }),
        map((pushedStream) => {
            confr.av = pushedStream;
            videoTag && self.streamBindVideo(confr.av, videoTag);
            confr.type == self.ConfrType.LIVE && self.hungup(0);
            return _util.extend({}, pushedStream);
        }),
        catchError((err, caught) => {
            confr.av && self.hungup(confr.av);
            confr.av = undefined;

            _logger.error(err);
            throw err;
        }));
}

function rxChanageCamera(confrId) {
    var self = this;

    var confr = self._confr(confrId);
    var service = self._service(confrId);

    if(service.current.role == self.Role.AUDIENCE){
        return throwError("Audience not allow publish");
    }

    return Observable.create(function onSubscription(observer) {
        service.chanageCamera(confr.av, function fail(evt) {
            observer.error({
                errorType: "switch_camera_fail",
                error: -203,
                errorMessage: evt.message()
            });
        }, function success() {
            observer.complete();
        });
    }).pipe(errorHandler);
}

function rxShareDesktop(confrId, constaints, videoTag, ext) {
    var self = this;

    var confr = self._confr(confrId);
    var service = self._service(confrId);

    if(service.current.role == self.Role.AUDIENCE){
        return throwError("Audience not allow publish");
    }
    if(confr.desktop){
        return throwError("desktop stream has been published. not allow repeat publish.")
    }

    if(confr.type === self.ConfrType.COMMUNICATION_MIX || confr.type === self.ConfrType.LIVE){
        //混音时，共享桌面带声音，会造成 服务端错误。
        if(constaints.audio){
            _logger.warn("confr mix. not allow desktop with audio.");
            return throwError("confr mix. not allow desktop with audio.")
        }
    }

    if(!constaints.audio && confr.av && !confr.av.aoff){
        _logger.warn("repeat audio. desktop and av");
    }

    var stream = confr.desktop = new service.ShareDesktopPubstream({
        screenOptions: (constaints.video && constaints.video.screenOptions) || ['screen', 'window', 'tab'],
        mandatory: (constaints.video && constaints.video.mandatory) || {},
        vbitrate: (constaints.video && constaints.video.bitrate),
        abitrate: (constaints.audio && constaints.audio.bitrate),
        aoff: !!constaints.audio ? 0 : 1,
        ext: ext
    });

    return openUserMedia.call(self, confr.id, stream).pipe(
        concatMap((userStream) => {
            videoTag && _util.targetDOM(videoTag) && attachMediaStream(videoTag, userStream.localStream);
            return rxPublish.call(self, confr.id, userStream, ext);
        }),
        map((pushedStream) => {
            confr.desktop = pushedStream;
            videoTag && _util.targetDOM(videoTag) && self.streamBindVideo(confr.desktop, videoTag);
            return _util.extend({}, pushedStream);
        }),
        catchError((err, caught) => {
            confr.desktop = undefined;
            _logger.error(err);
            throw err;
        }));
}

function rxSubscribe(confrId, stream, subSVideo, subSAudio, videoTag) {
    var self = this;
    var streamId = typeof stream === "string" ? stream : stream.id;

    var confr = self._confr(confrId);
    var service = self._service(confrId);

    if(stream.type === 2 && subSAudio == true && stream.id != 0){
        //return throwError("Mixed audio stream. not allow repeat sub audio");
        subSAudio = false;
        _logger.warn("Mixed audio stream. not allow repeat sub audio. force reset subSAudio = false")
    }

    videoTag && _util.targetDOM(videoTag) && self.streamBindVideo(streamId, videoTag);

    return Observable.create(function onSubscription(observer) {
        service.subscribe(streamId, function (remoteMediaStream){
            try{
                if(streamId != "0"){
                    var cacheStream = service.getStreamById(streamId);
                    var constaints = {
                        video: cacheStream.subArgs ? cacheStream.subArgs.subSVideo : !cacheStream.voff,
                        audio: cacheStream.subArgs ? cacheStream.subArgs.subSAudio : !cacheStream.aoff
                    };
                    if(cacheStream.type === 2){
                        constaints.audio = true;
                    }
                    self._onMemberMediaChanaged(cacheStream.owner, cacheStream, constaints, confr.confrId);
                }
            }finally{
                observer.next(remoteMediaStream);
                observer.complete();
            }
        }, function (evt) {
            observer.error({
                errorType: "sub_fail",
                error: -203,
                errorMessage: evt.message()
            });
        }, {subSVideo: subSVideo, subSAudio: subSAudio});
    }).pipe(errorHandler);
}

function streamBindVideo(stream, _videoTag, confrId) {
    var self = this;

    var service = self._service(confrId);
    stream = service.current._cacheStreams[typeof stream === "string" ? stream : stream.id];

    var videoTag = _videoTag || self.crtAndReturnVideo(stream.owner, stream);
    if(!videoTag){
        return;
    }
    self._videos[stream.id] = videoTag;

    videoTag.setAttribute("autoplay", "autoplay");
    videoTag.setAttribute("playsinline", "playsinline");
    videoTag.setAttribute("easemob_stream", stream.id);

    stream.aoff ? videoTag.setAttribute("aoff", "aoff") : videoTag.removeAttribute("aoff");
    stream.voff ? videoTag.setAttribute("voff", "voff") : videoTag.removeAttribute("voff");

    stream.ifMediaStream(function (mediaStream) {
        videoTag && attachMediaStream(videoTag, mediaStream);

        if(videoTag.hasAttribute("flow")){
            self.onMediaTransmission(videoTag, function cb(trackId, type, subtype, data) {
                zepto(videoTag).trigger("onMediaTransmission", [trackId, type, subtype, data]);
            });
        }
    });

    var $video = zepto(videoTag);
    $video.off("hungup");
    $video.on("hungup", function (e, fail, success) {
        self.hungup(stream, confrId);
        success && success();
    });

    $video.off("subscribe");
    $video.on("subscribe", function (e, subSVideo, subSAudio, fail, success) {
        if(stream.located()){
            fail && fail("local stream not allow sub");
        }else{
            subSVideo = stream.subArgs && stream.subArgs.subSVideo || true;
            subSAudio = stream.subArgs && stream.subArgs.subSAudio || true;
            self.subscribe(stream.owner, stream, subSVideo, subSAudio, confrId).then(success).catch(fail);
        }
    });

    $video.off("pauseVideo");
    $video.on("pauseVideo", function (e, fail, success) {
        if(stream.located()){
            self.pauseVideo(stream, confrId).then(success).catch(fail);
        }else{
            self.subscribe(stream.owner, stream, false, stream.subArgs && stream.subArgs.subSAudio || !stream.aoff, confrId).then(success).catch(fail);
        }
    });

    $video.off("resumeVideo");
    $video.on("resumeVideo", function (e, fail, success) {
        if(stream.located()){
            self.resumeVideo(stream, true, confrId).then(success).catch(fail);
        }else{
            self.subscribe(stream.owner, stream, true, stream.subArgs && stream.subArgs.subSVideo || !stream.voff, confrId).then(success).catch(fail);
        }
    });

    $video.off("pauseAudio");
    $video.on("pauseAudio", function (e, fail, success) {
        if(stream.located()){
            self.pauseAudio(stream, confrId).then(success).catch(fail);
        }else{
            self.subscribe(stream.owner, stream, stream.subArgs.subSVideo, false, confrId).then(success).catch(fail);
        }
    });

    $video.off("resumeAudio");
    $video.on("resumeAudio", function (e, fail, success) {
        if(stream.located()){
            self.resumeAudio(stream, confrId).then(success).catch(fail);
        }else{
            self.subscribe(stream.owner, stream, stream.subArgs.subSVideo, true, confrId).then(success).catch(fail);
        }
    });

    $video.off("remoteControl");
    $video.on("remoteControl", function (e, mirror, onDisControlled, onAccept, onNotAllowRemoteControl, onRemoteControlTimeout, onReject, onBusy) {
        if(stream.located()){
            _logger.error("not allow remote control at local");
            throw "not allow remote control at local"
        }else{
            self.remoteControl(stream, videoTag, videoTag, mirror,
                onDisControlled, onAccept, onNotAllowRemoteControl, onRemoteControlTimeout, onReject, onBusy, confrId);
        }
    });

    $video.off("chanageCamera");
    $video.on("chanageCamera", function (e, fail, success) {
        self.chanageCamera(confrId).then(success).catch(fail);
    });

    $video.off("captureVideo");
    $video.on("captureVideo", function (e, success, storeLocal, filename) {
        var base64 = self.captureVideo(videoTag, storeLocal, filename, confrId);
        success && success(base64);
    });

    $video.off("capturePictureRemote");
    $video.on("capturePictureRemote", function (e, fail, success) {
        self.capturePictureRemote(stream, false, confrId).then(success).catch(fail);
    });

    $video.off("freezeFrameRemote");
    $video.on("freezeFrameRemote", function (e, fail, success) {
        self.freezeFrameRemote(stream, confrId).then(success).catch(fail);
    });

    $video.off("zoomRemote");
    $video.on("zoomRemote", function (e, multiples, fail, success) {
        self.zoomRemote(stream, multiples, confrId).then(success).catch(fail);
    });

    $video.off("torchRemote");
    $video.on("torchRemote", function (e, torch, fail, success) {
        self.torchRemote(stream, torch, confrId).then(success).catch(fail);
    });

    $video.off("freeRemoteControl");
    $video.on('freeRemoteControl', function (e, fail, success) {
        try{
            self.freeRemoteControl(stream, confrId);
        }finally {
            success && success();
        }
    });

    var constaints = {video: !stream.voff, audio: !stream.aoff, voff: stream.voff, aoff: stream.aoff};
    if(!stream.located()){
        constaints = {
            video: stream.subArgs ? stream.subArgs.subSVideo : !stream.voff,
            audio: stream.subArgs ? stream.subArgs.subSAudio : !stream.aoff,
            voff: stream.voff,
            aoff: stream.aoff
        };
    }
    $video.trigger("onMediaChanaged", [constaints, stream, stream.owner, confrId]);

    if(videoTag.getAttribute("sound")){
        service.current._monitSoundChanagedStreams = service.current._monitSoundChanagedStreams || {};
        service.current._monitSoundChanagedStreams[stream.id] = stream.id;
    }
}

function rxFocusExpoRemote(confrId, streamId, videoTag, clickEvent) {
    var self = this;

    if(typeof streamId !== 'string'){
        streamId = streamId.id;
    }

    var confr = self._confr(confrId);
    var service = self._service(confrId);

    return Observable.create(function onSubscription(observer) {
        service.focusExpoRemote(streamId, videoTag, clickEvent, function (evt) {
            observer.error({
                errorType: "focusexpo_remote_fail",
                error: -203,
                errorMessage: evt.message()
            });
        }, function (){
            observer.complete();
        });
    }).pipe(errorHandler);
}

function rxCapturePictureRemote(confrId, streamId, rspBase64Pic){
    var self = this;

    if(typeof streamId !== 'string'){
        streamId = streamId.id;
    }

    var confr = self._confr(confrId);
    var service = self._service(confrId);

    return Observable.create(function onSubscription(observer) {
        service.capturePictureRemote(streamId, rspBase64Pic, function (base64){
            observer.next(base64);
            observer.complete();
        }, function (evt) {
            observer.error({
                errorType: "capture_remote_fail",
                error: -203,
                errorMessage: evt.message()
            });
        });
    }).pipe(errorHandler);
}

function rxZoomRemote(confrId, streamId, multiples) {
    var self = this;

    if(typeof streamId !== 'string'){
        streamId = streamId.id;
    }

    var confr = self._confr(confrId);
    var service = self._service(confrId);

    return Observable.create(function onSubscription(observer) {
        service.zoomRemote(streamId, multiples, function fail(evt) {
            observer.error({
                errorType: "capture_remote_fail",
                error: -203,
                errorMessage: evt.message()
            });
        }, function () {
            observer.complete();
        });
    }).pipe(errorHandler);
}

function rxTorchRemote(confrId, streamId, torch) {
    var self = this;

    if(typeof streamId !== 'string'){
        streamId = streamId.id;
    }

    var confr = self._confr(confrId);
    var service = self._service(confrId);

    return Observable.create(function onSubscription(observer) {
        service.torchRemote(streamId, torch, function (torch) {
            observer.next(torch);
            observer.complete();
        }, function fail(evt) {
            observer.error({
                errorType: "torch_remote_fail",
                error: -203,
                errorMessage: evt.message()
            });
        });
    }).pipe(errorHandler);
}

function rxFreezeFrameRemote(confrId, streamId) {
    var self = this;

    if(typeof streamId !== 'string'){
        streamId = streamId.id;
    }

    var confr = self._confr(confrId);
    var service = self._service(confrId);

    return Observable.create(function onSubscription(observer) {
        service.freezeFrameRemote(streamId, function (freezeFrame) {
            observer.next(freezeFrame);
            observer.complete();
        }, function fail(evt) {
            observer.error({
                errorType: "freeze_remote_fail",
                error: -203,
                errorMessage: evt.message()
            });
        });
    }).pipe(errorHandler);
}

var _single = _util.extend(new Manager(), {
    _confr: function(confrId){
        var self = this;
        confrId || (confrId = self.__current_confrId);
        return self._confrs[confrId];
    },
    _service: function(confrId){
        var self = this;
        confrId || (confrId = self.__current_confrId);
        return this._services[confrId];
    },

    getStreamById: function(streamId, confrId){
        var self = this;
        var service = self._service(confrId);
        return service && service.getStreamById(streamId);
    },
    getMemberById: function(memId, confrId){
        var self = this;
        var service = self._service(confrId);
        return service && service.getMemberById(memId);
    },

    streamBindVideo: function(stream, videoTag, confrId){
        streamBindVideo.call(this, stream, videoTag, confrId);
    },
    getBindVideoBy: function(stream){
        var self = this;
        if(typeof stream !== "string" && stream && stream.id){
            stream = stream.id;
        }
        if(typeof stream !== "string"){
            _logger.error("Bad stream ", stream);
            throw "Bad stream " + stream;
        }
        return self._videos[stream];
    },
    createConfr: function (confrType, password) {
        return rxCreateConfr.apply(this, arguments).toPromise();
    },

    reqTkt: function (confrId, password) {
        return rxReqTkt.apply(this, arguments).toPromise();
    },

    chanageRoles: function (role, uids, confrId) {
        return rxChanageRoles.apply(this, arguments).toPromise();
    },

    disbandConfr: function (confrId, roleToken) {
        return rxDisbandConfr.apply(this, arguments).toPromise();
    },

    kickMember: function (uids, confrId) {
        return rxKickMember.apply(this, arguments).toPromise();
    },

    selectConfr: function (confrId, password) {
        return rxSelectConfr.apply(this, arguments).toPromise();
    },

    joinUsePassword: function (confrId, password, ext) {
        return rxJoinExistConfrUsePassword.call(this, confrId, password, ext).toPromise();
    },
    joinUseTicket: function (confrId, ticket, ext) {
        return rxJoinUseTicket.call(this, confrId, ticket, ext).toPromise();
    },
    joined: function(confrId){
        return (confrId && this._confrs[confrId] && this._confrs[confrId].joinId)
            || (this.__current_confrId && this.joined(this.__current_confrId));
    },

    shareDesktopWithAudio: function (videoConstaints, withAudio, videoTag, ext, confrId) {
        var self = this;

        if(!_util.targetDOM(videoTag)){
            confrId = ext;
            ext = videoTag;
            videoTag = undefined;
        }

        var constaints = {
            video: videoConstaints,
            audio: withAudio
        };

        return rxShareDesktop.call(self, confrId, constaints, videoTag, ext).toPromise();
    },
    chanageCamera: function(confrId){
        return rxChanageCamera.call(this, confrId).toPromise();
    },
    switchCamera: function(confrId){
        return rxChanageCamera.call(this, confrId).toPromise();
    },
    shareVideoWithAudio: function (videoConstaints, withAudio, videoTag, ext, confrId) {
        var self = this;

        if(!_util.targetDOM(videoTag)){
            confrId = ext;
            ext = videoTag;
            videoTag = undefined;
        }

        var constaints = {
            video: videoConstaints,
            audio: withAudio
        };

        return rxPublishMedia.call(self, confrId, constaints, videoTag, ext).toPromise();
    },
    captureVideo: function captureVideo(videoObj, storeLocal, filename, confrId) {
        var self = this;
        var service = self._service(confrId);
        return service.captureVideo(videoObj, storeLocal, filename);
    },

    openUserMedia: function openUserMedia(constaints, confrId){
        var self = this;
        var service = self._service(confrId);

        return Observable.create(function onSubscription(observer) {
            service.__getUserMedia(constaints, function (attendee, stream) {
                observer.next(stream);
                observer.complete();
            }, function (error) {
                observer.error(error);
            })
        }).pipe(errorHandler).toPromise();
    },

    mediaDevices: function mediaDevices(kind){
        if(typeof kind === 'function'){
            kind = undefined;
        }

        return Observable.create(function onSubscription(observer) {
            navigator.mediaDevices.enumerateDevices().then(function(deviceInfos){
                var resultDeviceInfos = [];

                for (var i = 0; i !== deviceInfos.length; ++i) {
                    var deviceInfo = deviceInfos[i];
                    var deviceId = deviceInfo.deviceId;

                    if(!kind){
                        resultDeviceInfos.push(deviceInfo);
                    }

                    if(kind && kind === deviceInfo.kind){
                        resultDeviceInfos.push(deviceInfo);
                    }else if (deviceInfo.kind === 'audioinput') {
                    } else if (deviceInfo.kind === 'audiooutput') {
                    } else if (deviceInfo.kind === 'videoinput') {
                    } else {
                        _logger.info('Some other kind of source/device: ', deviceInfo);
                    }
                }

                observer.next(resultDeviceInfos);
                observer.complete();
            }).catch(function handleError(error) {
                _logger.warn('navigator.getUserMedia error: ', error);
                observer.error(error);
            });
        }).pipe(errorHandler).toPromise();
    },
    resumeVideo: function (pubS, videoConstaints, confrId) {
        return rxResumePauseVideo.call(this, pubS, videoConstaints || true, confrId).toPromise();
    },
    pauseVideo: function(pubS, confrId){
        return rxResumePauseVideo.call(this, pubS, false, confrId).toPromise();
    },

    resumeAudio: function (pubS, confrId) {
        return rxResumePauseAudio.call(this, pubS, false, confrId).toPromise();
    },
    pauseAudio: function(pubS, confrId){
        return rxResumePauseAudio.call(this, pubS, true, confrId).toPromise();
    },

    freezeFrameRemote: function(stream, confrId){
        return rxFreezeFrameRemote.call(this, confrId, stream).toPromise();
    },
    torchRemote: function(stream, torch, confrId){
        return rxTorchRemote.call(this, confrId, stream, torch).toPromise();
    },
    zoomRemote: function (stream, multiples, confrId) {
        return rxZoomRemote.call(this, confrId, stream, multiples).toPromise();
    },
    capturePictureRemote: function(streamId, confrId){
        return rxCapturePictureRemote.call(this, confrId, streamId, false).toPromise();
    },

    focusExpoRemote: function(stream, videoTag, clickEvent, confrId){
        return rxFocusExpoRemote.call(this, confrId, stream, videoTag, clickEvent).toPromise();
    },

    onFocusExpoRemoteWhenClickVideo: function(tag, event, fail, success){
        var self = this;

        if(typeof event === 'function'){
            success = fail;
            fail = event;
            event = undefined;
        }

        zepto(tag).off(event || 'click');
        zepto(tag).on(event || 'click', function (e) {
            var streamId = tag.getAttribute("easemob_stream");
            self.focusExpoRemote(streamId, tag, e).then(success).catch(fail);
        });

        return event;
    },
    offEventAtTag: function(tag, event){
        event && zepto(tag).off(event);
    },

    hungup: function (stream, confrId) {
        var self = this;

        var streamId;
        if (typeof stream === "string") {
            streamId = stream;
        } else {
            streamId = stream.id || (stream + "");
        }

        var service = self._service(confrId);
        var confr = self._confr(confrId);
        if(!confr || !service){
            _logger.warn("when hungup stream. not found confr and service.", stream);
            return;
        }

        service.hungup(streamId);

        var hungeAv = false;
        confr.av && (hungeAv = confr.av.id === streamId) && (confr.av = undefined);
        confr.desktop && confr.desktop.id === streamId && (confr.desktop = undefined);

        if(hungeAv && confr.type == self.ConfrType.LIVE && service.current.role == single.Role.AUDIENCE){ //观众 订阅0  && service.current.role == single.Role.AUDIENCE
            var zeroStream = service.current && service.current._cacheStreams["0"];
            self.subscribe(service.current, zeroStream, false, true, confrId);
        }
    },

    subscribe: function (member, stream, subSVideo, subSAudio, videoTag, confrId) {
        var self = this;
        if(!_util.targetDOM(videoTag)){
            confrId = videoTag;
            videoTag = undefined;
        }
        return rxSubscribe.call(self, confrId, stream, subSVideo, subSAudio, videoTag).toPromise();
    },

    exit: function (closeMyConfrIfICrtConfr, confrId) {
        var self = this;

        var service = self._service(confrId);
        if(!service){
            _logger.warn("when exit. not found service.", confrId);
            return;
        }

        service.exit(closeMyConfrIfICrtConfr);
    },

    _onExit: function (confrId, reason, failed) {
        var self = this;
        try{
            self.__current_confrId = undefined;
            self.onExit(reason, failed, confrId);
        } finally {
            _util.removeAttribute(self._confrs, confrId);
            _util.removeAttribute(self._services, confrId);
            _util.removeAttribute(self._videos, confrId);
            _util.removeAttribute(self._events, confrId);
        }
    },
    onExit: (reason, failed, confrId) => {
    },
    _onRoleUpdated: (role, confrId) => {
    },

    onMemberJoin: (member, confrId) => {
    },
    onMemberLeave: (member, reason, confrId) => {
    },
    _onRecvRemoteMessage: function (fromMember, argsObject, confrId) {
    },

    crtAndReturnVideo: (member, stream, confrId) => {
        //throw "Please set crtAndReturnVideo";
    },
    unloadVideo: (member, stream, video, confrId) => {
        //throw "Please set unloadVideo";
    },

    remoteControl: function (stream, videoObj, targetDiv, mirror,
                             onDisControlled, onAccept, onNotAllowRemoteControl, onRemoteControlTimeout, onReject, onBusy, confrId) {
        var self = this;
        var service = self._service(confrId);

        mirror = !!mirror;

        var streamId = typeof stream === "string" ? stream : stream.id;

        if(mirror){
            emedia.ctrl.mirrorControlled(service, streamId, videoObj, targetDiv,
                onDisControlled, onAccept, onNotAllowRemoteControl, onRemoteControlTimeout, onReject, onBusy);
        }else{
            emedia.ctrl.controlled(service, streamId, videoObj, targetDiv,
                onDisControlled, onAccept, onNotAllowRemoteControl, onRemoteControlTimeout, onReject, onBusy);
        }
    },

    freeRemoteControl: function(stream, confrId){
        var self = this;
        var service = self._service(confrId);
        var streamId = typeof stream === "string" ? stream : stream.id;
        emedia.ctrl.disControlled(service, streamId);
    },

    zeptoTrigger: function (tag, event) {
        //zepto(tag).trigger(event, [fail, success]);
        return Observable.create(function onSubscription(observer) {
            zepto(tag).trigger(event, [function fail() {
                observer.error.apply(observer, arguments);
            }, function success() {
                observer.next.apply(observer, arguments);
                observer.complete();
            }]);
        }).pipe(errorHandler).toPromise();
    },
    _onAddMemberStream: function(stream, confrId){

    },
    _onRemoveMemberStream: function(stream, confrId){

    },
    _onUpdateMemberStream: function(stream, constaints, confrId){

    },
    _onMemberMediaChanaged: function(member, stream, constaints, confrId){
        var tag = this._videos[stream.id];
        constaints && (constaints.voff = stream.voff, constaints.aoff = stream.aoff);
        tag && zepto(tag).trigger("onMediaChanaged", [constaints, stream, member, confrId]);
    },
    onMediaChanaged: function(tag, cb){ // cb video audio
        this.addVideoEventListener(tag, "onMediaChanaged", cb);
    },

    _onMemberSoundChanaged: function (member, stream, meterData, confrId) {
        var tag = this._videos[stream.id];
        tag && zepto(tag).trigger("onSoundChanaged", [meterData, stream, member, confrId]);
    },
    onSoundChanaged: function(tag, cb){ // cb video audio
        if(!emedia.config.getMediaMeterIntervalMillis || emedia.config.getMediaMeterIntervalMillis <= 0){
            _logger.error("monit sound chanaged not config. please config getMediaMeterIntervalMillis");
            throw "monit sound chanaged not config. please config getMediaMeterIntervalMillis";
        }

        tag.setAttribute("sound", "sound");
        this.addVideoEventListener(tag, "onSoundChanaged", cb);
    },

    onMediaTransmission: function(tag, cb){ // cb video audio
        if(!emedia.helper || typeof emedia.helper.inboundVideo !== "function"){
            _logger.warn("please import helper. <script>");
            return;
        }

        var service = this._service();

        var streamId = tag.getAttribute("easemob_stream");
        var stream = streamId && service.getStreamById(streamId);
        var flowWebrtc = tag.getAttribute("flowWebrtc");

        if(stream && stream._webrtc && flowWebrtc == stream._webrtc.__id){
            return;
        }

        if(tag.hasAttribute("flow")
            && stream
            && stream._webrtc){ //开启流量监控

            if(stream.located()){
                emedia.helper.outboundVideo(stream, cb, 1000);
            }else{
                emedia.helper.inboundVideo(stream, cb, 1000);
            }

            tag.setAttribute("flowWebrtc", stream._webrtc.__id);
        }else{
            this.addVideoEventListener(tag, "onMediaTransmission", cb);
            tag.setAttribute("flow", "flow");
        }
    },

    _onTalking: function (member, stream, meterData, confrId) {
    },

    _onNotSupportMemberPublishVideoCodecs: function (member, stream, confrId) {
        var tag = this._videos[stream.id];
        tag && zepto(tag).trigger("onNotSupportVideoCodecs", [stream, member, confrId]);
    },
    onNotSupportVideoCodecs: function(tag, cb){
        this.addVideoEventListener(tag, "onNotSupportVideoCodecs", cb);
    },

    _onStreamIceStateChanged: function (member, stream, state, confrId) {
        var tag = this._videos[stream.id];
        tag && zepto(tag).trigger("onIceStateChanged", [state, stream, member, confrId]);
    },
    onIceStateChanged: function(tag, cb){
        this.addVideoEventListener(tag, "onIceStateChanged", cb);
    },

    onHasRemoteControl: function onHasRemoteControl(stream, controler, controlRequest, confrId) {
        var tag = this._videos[stream.id];
        tag && zepto(tag).trigger("onRemoteControl", [controler, controlRequest, stream, confrId]);
    },
    onRemoteControl: function(tag, cb){
        this.addVideoEventListener(tag, "onRemoteControl", cb);
    },

    onRemoteFreeControl: function onRemoteFreeControl(stream, controler, cId, confrId) {
        var tag = this._videos[stream.id];
        tag && zepto(tag).trigger("onFreeControl", [controler, cId, stream, confrId]);
    },
    onFreeControl: function(tag, cb){
        this.addVideoEventListener(tag, "onFreeControl", cb);
    },

    addVideoEventListener: function (tag, event, callback) {
        zepto(tag).off(event);
        zepto(tag).on(event, function () {
            var args = [];
            for(var i = 1; i < arguments.length; i++){
                args.push(arguments[i]);
            }
            callback && callback.apply(tag, args);
        });
    }
});

_.each(["hungup", "subscribe", "pauseVideo", "resumeVideo", "pauseAudio",
    "resumeAudio", "chanageCamera", "freeRemoteControl",
    "capturePictureRemote", "freezeFrameRemote"], function (val, index) {
    var name = val.replace(/\b[a-z]/g,function(s){return s.toUpperCase();});
    _single["trigger" + name] = function (tag) {
        return _single.zeptoTrigger(tag, val);
    }
});

_single.triggerTorchRemote = function(tag, torch){
    return Observable.create(function onSubscription(observer) {
        zepto(tag).trigger("torchRemote", [torch, function fail() {
            observer.error.apply(observer, arguments);
        }, function success() {
            observer.next.apply(observer, arguments);
            observer.complete();
        }]);
    }).pipe(errorHandler).toPromise();
};

_single.triggerZoomRemote = function(tag, multiples){
    return Observable.create(function onSubscription(observer) {
        zepto(tag).trigger("zoomRemote", [multiples, function fail() {
            observer.error.apply(observer, arguments);
        }, function success() {
            observer.next.apply(observer, arguments);
            observer.complete();
        }]);
    }).pipe(errorHandler).toPromise();
};

_single.triggerSubscribe = function(tag, subSVideo, subSAudio){
    return Observable.create(function onSubscription(observer) {
        zepto(tag).trigger("subscribe", [subSVideo, subSAudio, function fail() {
            observer.error.apply(observer, arguments);
    }, function success() {
            observer.next.apply(observer, arguments);
            observer.complete();
        }]);
    }).pipe(errorHandler).toPromise();
};

_single.triggerRemoteControl = function (tag, mirror, onDisControlled, onAccept, onNotAllowRemoteControl, onRemoteControlTimeout, onReject, onBusy) {
    zepto(tag).trigger("remoteControl", [mirror, onDisControlled, onAccept, onNotAllowRemoteControl, onRemoteControlTimeout, onReject, onBusy]);
};
_single.triggerCaptureVideo = function (tag, storeLocal, filename) {
    return Observable.create(function onSubscription(observer) {
        zepto(tag).trigger("captureVideo", [function success() {
            observer.next.apply(observer, arguments);
            observer.complete();
        }, storeLocal, filename]);
    }).pipe(errorHandler).toPromise();
};


export let single = _single;