import { single as inner } from "./Manager";

import _ from 'underscore';
import zepto  from 'zepto';


var _outer = {};

inner.onMemberJoin = function (member, confrId){
    emedia.decodeMemeberName(member);
    this.onMemberJoined(member, inner._confr(confrId));
};
inner.onMemberLeave = function (member, reason, confrId){
    emedia.decodeMemeberName(member);
    this.onMemberExited(member, reason, inner._confr(confrId));
};
inner._onRoleUpdated = function (role, confrId){
    this.onRoleChanged(role, inner._confr(confrId));
};
inner._onAddMemberStream = function (stream, confrId){
    stream && emedia.decodeMemeberName(stream.owner);
    this.onStreamAdded(stream.owner, stream, inner._confr(confrId));
};
inner._onRemoveMemberStream = function (stream, confrId){
    stream && emedia.decodeMemeberName(stream.owner);
    this.onStreamRemoved(stream.owner, stream, inner._confr(confrId));
};
inner._onUpdateMemberStream = function(stream, constaints, confrId){
    stream && emedia.decodeMemeberName(stream.owner);
    this.onStreamUpdated && this.onStreamUpdated(stream.owner, stream, constaints, inner._confr(confrId));
};
inner.onExit = function(reason, failed, confrId){
    this.onConferenceExit(reason, failed, inner._confr(confrId));
};

_outer.onMemberJoined = function (member) {

};
_outer.onMemberExited = function (member, reason) {

};
_outer.onRoleChanged = function (role) {

};
_outer.onStreamAdded = function (member, stream) {

};
_outer.onStreamRemoved = function (member, stream) {

};
_outer.onConferenceExit = function (reason, error) {

};

// Promise
_outer.joinConferenceWithTicket = inner.joinUseTicket;
_outer.joinConference = inner.joinUsePassword;
_outer.getConferenceTkt = inner.reqTkt;

_outer.publish = function (constaints, videoTag, ext) {
    return inner.shareVideoWithAudio(constaints.video, constaints.audio, videoTag, ext);
};
_outer.unpublish = function (stream) {
    return inner.hungup(stream);
};
//_outer.subscribe = inner.subscribe; //subscribe: function (member, stream, subSVideo, subSAudio, videoTag, confrId)
_outer.unsubscribe = function (stream) {
    return inner.hungup(stream);
};
//_outer.switchCamera = inner.switchCamera;
_outer.exitConference = function (closedSelfConfr) {
    return inner.exit(closedSelfConfr || false);
};

_outer.getConferenceInfo = function (confrId, password) {
    return inner.selectConfr(confrId, password);
};
_outer.createConference = inner.createConfr;
_outer.grantRole = function (confr, members, role) {
    emedia.decodeMemeberName(members);
    return inner.chanageRoles(role, members, confr.id);
};
_outer.kickMembersById = function (confr, members) {
    emedia.decodeMemeberName(members);
    return inner.kickMember(members, confr.id);
};
_outer.destroyConference = function (confr) {
    return inner.disbandConfr(confr, confr.roleToken);
};

emedia.decodeMemeberName = function (member) {
    if(typeof emedia.decodeMemeberNameString !== "function"){
        return member;
    }

    if(typeof member === 'string'){
        return emedia.decodeMemeberNameString(member);
    }

    if(_.isArray(member)){
        for(var i = 0; i < member.length; i++){
            member[i] = emedia.decodeMemeberName(member[i]);
        }
        return member;
    }

    if(member.name){
        member.globalName = member.name;
        member.memName = member.name = emedia.decodeMemeberName(member.name);
        return;
    }

    if(member.memName){
        member.globalName = member.memName;
        member.memName = member.name = emedia.decodeMemeberName(member.memName);
        return;
    }
}

emedia.ConfrType = inner.ConfrType;
emedia.Role = inner.Role;

zepto(function () {
    var WebIM = window.WebIM;

    if(WebIM && WebIM.conn && typeof WebIM.conn.onOpened === "function"){
        // noinspection JSAnnotator
        function useIM() {
            emedia.decodeMemeberNameString = function (member) {
                if(typeof member === 'string'){
                    if(member.indexOf(WebIM.conn.orgName) < 0) {
                        return member;
                    }

                    var _index = member.indexOf("_");
                    if(_index < 0){
                        _index = 0;
                    }else{
                        _index++;
                    }

                    var endIndex = member.indexOf("@");
                    if(endIndex < 0){
                        endIndex = member.length;
                    }

                    return member.substring(_index, endIndex);
                }

                return member;
            };

            inner.setUrlCreator(function(url, apiName){
                return WebIM.conn.apiUrl + url;
            });

            inner.setIdentity(WebIM.conn.orgName + "#" + WebIM.conn.appName + "_" + WebIM.conn.user + "@" + WebIM.conn.domain, WebIM.conn.token);
        }

        var _onOpened = WebIM.conn.onOpened;
        WebIM.conn.onOpened = function () {
            _onOpened.apply(WebIM.conn, arguments);
            useIM();
        };

        if(WebIM.conn.token){
            useIM();
        };
    }
});


export let outer = _.extend(inner, _outer);