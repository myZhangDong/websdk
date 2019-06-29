import _util from '../Util';

import { Subject } from 'rxjs';
import zepto from "zepto";

function EventsObservable(mgr, confrId, onRemoteStream){
    this.mgr = mgr;
    this.confrId = confrId;
    init.apply(this);
    this.subject = new Subject();
    this.onRemoteStream = onRemoteStream;
}

function init(){
    _util.extend(this, {
        subscribe: function(observerOrNext, error, complete){
            return this.subject.subscribe(observerOrNext, error, complete);
        }
    },{ //以下监听，this object == me == service.current
        onMeExit: function (reason, failed) {
            this.mgr._onExit(this.confrId, reason, failed);
        },

        onAddMember: function (member) {
            this.mgr.onMemberJoin(member, this.confrId);
        },
        onRemoveMember: function (member, reason) {
            this.mgr.onMemberLeave(member, reason, this.confrId);
        },

        onAddStream: function (stream) {
            if(stream.id == 0){
                return;
            }
            if(!stream.located()){
                this.onRemoteStream && this.onRemoteStream(stream);
            }

            this.mgr.streamBindVideo(stream, undefined, this.confrId);
            this.mgr._onAddMemberStream(stream, this.confrId);
        },
        onRemoveStream: function (stream) {
            if(stream.id == 0){
                return;
            }

            var confr = this.mgr._confr(this.confrId);
            if(confr && stream && stream.located()){
                confr.av && confr.av.id === stream.id && (confr.av = undefined);
                confr.desktop && confr.desktop.id === stream.id && (confr.desktop = undefined);
            }

            var video = _util.removeAttribute(this.mgr._videos, stream.id);
            this.mgr._onRemoveMemberStream(stream, this.confrId);
            video && this.mgr.unloadVideo(stream.owner, stream, video);
        },
        onUpdateStream: function (stream, update) {
            if(stream.id == 0){
                return;
            }

            var self = this;

            var videoTag = this.mgr._videos[stream.id];
            if(videoTag){
                update && update.ifMediaStream(function (mediaStream) {
                    videoTag && attachMediaStream(videoTag, mediaStream);

                    if(videoTag && videoTag.hasAttribute("flow")){
                        self.mgr.onMediaTransmission(videoTag, function cb(trackId, type, subtype, data) {
                            zepto(videoTag).trigger("onMediaTransmission", [trackId, type, subtype, data]);
                        });
                    }
                });

                stream.aoff ? videoTag.setAttribute("aoff", "aoff") : videoTag.removeAttribute("aoff");
                stream.voff ? videoTag.setAttribute("voff", "voff") : videoTag.removeAttribute("voff");
            }

            var constaints = {video: !stream.voff, audio: !stream.aoff};
            update && update.ifVoff(function (voff) {
                constaints || (constaints = {});
                constaints.video = !voff;
                if(!stream.located()){
                    //constaints.video = constaints.video && (!stream.subArgs ||(stream.subArgs && stream.subArgs.subSVideo));
                    constaints.video = stream.subArgs ? stream.subArgs.subSVideo : !stream.voff;
                }
            });
            update && update.ifAoff(function (aoff) {
                constaints || (constaints = {});
                constaints.audio = !aoff;
                if(!stream.located()){
                    //constaints.audio = constaints.audio && (!stream.subArgs ||(stream.subArgs && stream.subArgs.subSAudio));
                    constaints.audio = stream.subArgs ? stream.subArgs.subSAudio : !stream.aoff;

                    if(stream.type === 2){
                        constaints.audio = true;
                    }
                }
            });

            constaints && this.mgr._onMemberMediaChanaged(stream.owner, stream, constaints, this.confrId);
            constaints && this.mgr._onUpdateMemberStream(stream, constaints, this.confrId);
        },
        onNetworkWeak: function () {
        },
        onNotSupportPublishVideoCodecs: function (stream) {
            this.mgr._onNotSupportMemberPublishVideoCodecs(stream, this.confrId);
        },
        onRecvRemoteMessage: function (fromMember, argsObject) {
            this.mgr._onRecvRemoteMessage(fromMember, argsObject, this.confrId);
        },

        onSoundChanage: function (member, stream, meterData) {
            this.mgr._onMemberSoundChanaged(member, stream, meterData, this.confrId);
        },
        onTalking: function (member, stream, meterData) {
            this.mgr._onTalking(member, stream, meterData, this.confrId);
        },

        onRoleUpdate: function(role, roleToken){
            var confr = this.mgr._confrs[this.confrId];
            roleToken && (confr.roleToken = roleToken);
            confr.role = role;

            if(role == this.mgr.Role.AUDIENCE){
                confr.av && this.mgr.hungup(confr.av);
                confr.desktop && this.mgr.hungup(confr.desktop);
            }

            this.mgr._onRoleUpdated(role, this.confrId);
        },

        onNotifyEvent: function (evt) {
            var self = this;

            try{
                if(evt instanceof emedia.event.ICEChanage){
                    var webrtc = evt.webrtc;
                    var state = evt.state;
                    _util.forEach(self._cacheStreams, function (sid, stream) {
                        if(stream.rtcId == webrtc.getRtcId()){

                            var _stream = _util.extend({}, stream);
                            var _member = _util.extend({}, stream.owner);

                            self.mgr._onStreamIceStateChanged(_member, _stream, state, self.confrId);
                        }
                    });
                }
            }finally {
                self.subject.next(evt);
            }
        }
    });
}


export default EventsObservable;