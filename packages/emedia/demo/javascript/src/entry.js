//http://localhost/web/?__log_level___=0&__member_name__=yss002
//import emedia1 from "../../../webrtc/dist/EMedia_sdk-dev";
var $ = require('jquery');

// var emedia1 = require("../../../webrtc/dist/EMedia_sdk-dev");
// console.error(emedia1);

//初始化对象使用
var _logger = emedia.util.logger;

var StatsGetter = require('./components/PCStatsGetter');


emedia.LOG_LEVEL = 3;


//eg:
// https://localhost:9443/EMedia/?__super_tkt__=true&__confr_id__=MS1000C333
// https://localhost:9443/EMedia/?__log_level___=0&__only_enter__=true&__auto_sub__=false&__super_tkt__=true&__confr_id__=MS1000C333&__member_name__=God123
// https://121.41.87.159:8443/EMedia-1.0.0/?__log_level___=0&__only_enter__=false&__auto_sub__=true&__url__=ws://121.41.87.159:8443/ws&__confr_id__=MS1000C101&__member_name__=yss002
// https://localhost/EMedia/?__log_level___=0&__confr_id__=MS1000C101&__only_enter__=true&__member_name__=yss001&__auto_sub__=false&__url__=ws://127.0.0.1:9092/ws
// https://localhost:9443/EMedia/?__log_level___=0&__only_enter__=false&__1use_mixer__=true&__auto_sub__=true&__url__=wss://turn2.easemob.com/ws&__confr_id__=2&__member_name__=GodPCChrome
//根据URL初始化配置，目的为了，减少测试时的乱点
var confrId;

var tkt = document.getElementById('text_tkt');
var __memberName = emedia.util.parseURL("__member_name__");
var __confr_id__ = emedia.util.parseURL("__confr_id__");

var __autoSub__ = emedia.util.parseURL("__auto_sub__");
var __url__ = emedia.util.parseURL("__url__");

var __only_enter__ = emedia.util.parseURL("__only_enter__");

var __super_tkt__ = emedia.util.parseURL("__super_tkt__");
var __forward__ = emedia.util.parseURL("__forward__");
var __visible__ = emedia.util.parseURL("__visible__");
var __audio__ = emedia.util.parseURL("__audio__");
var __video__ = emedia.util.parseURL("__video__");

var __1use_mixer__ = emedia.util.parseURL("__1use_mixer__");

var __confrType__ = emedia.util.parseURL("__confrType__");

var __caller__ = emedia.util.parseURL("__caller__");
var __callee__ = emedia.util.parseURL("__callee__");

__forward__ || (__forward__ = document.domain);
var __invisible__ = "false" === __visible__;

__memberName = __memberName || ("God" + (new Date()).getTime());

if(__memberName){
    var tktJson = tkt.value;
    tktJson = JSON.parse(tktJson);
    tktJson.memName = __memberName;

    tkt.value = JSON.stringify(tktJson);
}
if(__url__){
    var tktJson = tkt.value;
    tktJson = JSON.parse(tktJson);

    tktJson.url = __url__;

    tkt.value = JSON.stringify(tktJson);
}
if(__confrType__){
    var tktJson = tkt.value;
    tktJson = JSON.parse(tktJson);

    tktJson.type = __confrType__;

    tkt.value = JSON.stringify(tktJson);
}
if(__caller__){
    var tktJson = tkt.value;
    tktJson = JSON.parse(tktJson);

    tktJson.caller = __caller__;

    tkt.value = JSON.stringify(tktJson);
}
if(__callee__){
    var tktJson = tkt.value;
    tktJson = JSON.parse(tktJson);

    tktJson.callee = __callee__;

    tkt.value = JSON.stringify(tktJson);
}

if(__invisible__){
    var tktJson = tkt.value;
    tktJson = JSON.parse(tktJson);

    tktJson.invisible = __invisible__;

    tkt.value = JSON.stringify(tktJson);
}

if(__autoSub__){
    emedia.config({autoSub: __autoSub__ === 'true'});
}
if(__only_enter__){
    emedia.config({onlyEnter: __only_enter__ === 'true'});
}
if(__confr_id__){
    var tktJson = tkt.value;
    tktJson = JSON.parse(tktJson);
    confrId = tktJson.confrId = __confr_id__;

    tkt.value = JSON.stringify(tktJson);
}else{
    var tktJson = tkt.value;
    tktJson = JSON.parse(tktJson);
    confrId = tktJson.confrId;
}


var titleP = document.querySelector("#join #title_p");
titleP.innerHTML = "member: " + __memberName + ", autoSub: " + emedia.config.autoSub + ", onlyEnter: " + emedia.config.onlyEnter;

if(__super_tkt__){
    $("#join h1").append("<a></a>").find("a").html(confrId).attr("href", "/confr/desc/?forward=" + __forward__ + "&confrId=" + confrId);
    $("#join h1").append("<a></a>").find("a:last-child").html('[SER]').attr("href", "/confr/?forward=" + __forward__);

    var tktUrl = "/confr/superticket/?forward=" + __forward__
        + "&confrId=" + confrId
        + "&invisible=" + __invisible__;
    $("#join h1").append("<a></a>").find("a:last-child").html('[TKT]').attr("href", tktUrl);
    $("#join h1").append("<a></a>").find("a:last-child").html('[BLANK]').attr("href", window.location.href);

    __memberName && (tktUrl =  tktUrl + "&memName" + __memberName);

    $.getJSON(tktUrl, function (ticketJson) {
        tkt.value = JSON.stringify(ticketJson);
    }).fail(function(jqxhr, textStatus, error ) {
        var err = textStatus + ", " + error;
        displayEvent( "Request Failed: " + err );
    });
} else {
    $("#join h1").html(confrId);
}

$(function () {
    displayEvent( navigator.userAgent );
    displayEvent( navigator.appName );
});

var service = new emedia.XService({
    // useRTCCfg: false, //{"relayOnly":false,"iceServers":[{"credential":"r7vPljzvpNhVofguvOwnMUeyLdk=","url":"turn:turn2.easemob.com:3478","username":"GodCaller%11111M59:1517316316"}]},

    // getHTMLVideo: function(stream){
    //     var htmlId = stream.getHtmlDOMID();
    //     var div = rtcs.querySelector("#" + htmlId);
    //
    //     var video = div.querySelector("video");
    //
    //     return video;
    // },

    onCapturePicture: function (stream) {
        var self = this;

        var htmlId = stream.getHtmlDOMID();
        var div = rtcs.querySelector("#" + htmlId);
        var video = div.querySelector("video");

        //self.captureVideo(video, true);

        var base64 = self.getCaptureBase64Context(video);

        $("<img class='captureImg'>").attr('src', base64).appendTo('body')
            .click(function () {
                $(this).hide();
            });
    },

    listeners: { //以下监听，this object == me == service.current
        onMeExit: function (reason, failed) {
            reason = (reason || 0);
            switch (reason){
                case 0:
                    reason = "正常挂断";
                    break;
                case 1:
                    reason = "没响应";
                    break;
                case 2:
                    reason = "服务器拒绝";
                    break;
                case 3:
                    reason = "对方忙";
                    break;
                case 4:
                    reason = "失败,可能是网络或服务器拒绝";
                    if(failed === -9527){
                        reason = "失败,网络原因";
                    }
                    if(failed === -500){
                        reason = "Ticket失效";
                    }
                    if(failed === -502){
                        reason = "Ticket过期";
                    }
                    if(failed === -504){
                        reason = "链接已失效";
                    }
                    if(failed === -508){
                        reason = "会议无效";
                    }
                    if(failed === -510){
                        reason = "服务端限制";
                    }
                    break;
                case 5:
                    reason = "不支持";
                    break;
                case 10:
                    reason = "其他设备登录";
                    break;
                case 11:
                    reason = "会议关闭";
                    break;
            }
            displayEvent("Hangup reason " + (reason || 0));
            rtcs.innerHTML = "";
        },

        onAddMember: function (member) {
            displayEvent(member.id + " " + (member.nickName || "") + " enter， ext = " + member.ext + ", supportVCodecs: " + member.vcodes);
        },
        onRemoveMember: function (member, reason) {
            displayEvent(member.id + " " + (member.nickName || "") + " " + reason  + " exit, has members: " + service.getCurrentMembers().length);
        },

        onAddStream: function (stream) {
            displayEvent("Add stream: " + stream.id + " located: " + stream.located() + " use: " + stream.vcodes + " webrtc: " + (stream.rtcId || "--") + "， ext = " + stream.ext);
            genOrUpdateHtml(stream);
        },
        onRemoveStream: function (stream) {
            displayEvent("Remove stream: " + stream.id + " located: " + stream.located() + " webrtc: " + (stream.rtcId || "--"));

            rmHtml(stream);
        },
        onUpdateStream: function (stream, update) {
            displayEvent("Update stream: " + stream.id + " located: " + stream.located() + " webrtc: " + (stream.rtcId || "--"));
            genOrUpdateHtml(stream, update);
        },
        onNetworkWeak: function () {
            //displayEvent("当前通话连接质量不佳");
        },
        onNotSupportPublishVideoCodecs: function (stream) {
            displayEvent("One sub not support video codecs: " + stream.id + " located: " + stream.located() + " webrtc: " + (stream.rtcId || "--"));
        },
        onRecvRemoteMessage: function (fromMember, argsObject) {
            displayEvent("On recv remote message, from " + fromMember.id + " " + argsObject);
        },

        onSoundChanage: function (member, stream, meterData) {
            //console.info("onSoundChanage", stream.id);
            displaySoundMeters(member, stream, meterData);
        },
        onTalking: function (member, stream, meterData) {
            displayOntalking(member, stream, meterData);
        },

        onNotifyEvent: function (evt) {
            if(evt instanceof emedia.event.ServerRefuseEnter){ //服务器拒绝进入；也可以可以在join 时
                displayEvent(evt.message());
            } else if(evt instanceof emedia.event.EnterSuccess){ //进入成功；也可以调用 join时，直接传入回调方法
                displayEvent(evt.message());
            } else if(evt instanceof emedia.event.EnterFail){ //进入失败；也可以调用 join时，直接传入失败回调方法
                displayEvent(evt.message());
            } else if(evt instanceof emedia.event.ICERemoteMediaStream) { //获取到远端的流
                //displayEvent(evt.message());
            } else if(evt instanceof emedia.event.PushSuccess){ //推送流成功，本地 摄像头，麦克风等；别人订阅成功后，可以被别人看见
                                                                //也可以在push时传入 成功 失败的 回调方法
                displayEvent(evt.message());
            } else if(evt instanceof emedia.event.SubSuccess){ //订阅其他人的媒体流成功，就可以看到被人
                                                               //也可以在订阅时传入 成功 失败的 回调方法
                displayEvent(evt.message());
            } else if(evt instanceof emedia.event.PushFail){ //推送流失败
                displayEvent(evt.message());
            } else if(evt instanceof emedia.event.SubFail){ //订阅失败
                displayEvent(evt.message());
            } else if(evt instanceof emedia.event.StreamState){ //流状态改变，比如 checking connected disconnected，fail complete
                displayEvent(evt.message());
            } else if(evt instanceof emedia.event.ShareDesktopExtensionNotFound){ //共享桌面插件没有 被发现
                displayEvent(evt.message());
            } else if(evt instanceof emedia.event.RemoteControlFail){ //远程控制失败，比如 控制远端 聚焦、曝光、截屏等
                displayEvent(evt.message());
            } else if(evt instanceof emedia.event.OtherDeviceAnswer){ //多端时，其他设备 接听
                displayEvent(evt.message());
            } else if(evt instanceof emedia.event.AudioMixerStreamNotAllowSub){ // 忽略
                displayEvent(evt.message());
            } else if(evt instanceof emedia.event.AudioMixerStreamNotAllowOnlySubVideo){// 忽略
                displayEvent(evt.message());
            }
        }
    }
});


tkt.ondblclick = function () {
    // this.removeAttribute("readonly");
    // tkt.focus();
}
tkt.onblur = function () {
    // this.setAttribute("readOnly","readonly");

    try{
        this.value = eval(this.value);
    }catch (e){
    }
}

function appInfo(){
    // var browser = {
    //         msie: false, firefox: false, opera: false, safari: false,
    //         chrome: false, netscape: false, appname: 'unknown', version: 0
    //     },
    //     userAgent = window.navigator.userAgent.toLowerCase();
    // if ( /(msie|firefox|opera|chrome|netscape)\D+(\d[\d.]*)/.test( userAgent ) ){
    //     browser[RegExp.$1] = true;
    //     browser.appname = RegExp.$1;
    //     browser.version = RegExp.$2;
    // } else if ( /version\D+(\d[\d.]*).*safari/.test( userAgent ) ){ // safari
    //     browser.safari = true;
    //     browser.appname = 'safari';
    //     browser.version = RegExp.$2;
    // }
    //
    // return browser;

    return {
        appname : emedia.browser,
        version : emedia.browserVersion
    };
}

var app = appInfo();

//初始化流程

var btnEnter = document.getElementById("btn_enter");
var btnHangup = document.getElementById("btn_hangup");
var btnPub = document.getElementById("btn_pub");
var btnShareDesktop = document.getElementById("btn_shareDesktop");
var btnCanvas = document.getElementById("btn_canvas");
var btnAudioMixer = document.getElementById("btn_audioMixer");

var btnReport = document.getElementById("btn_report");
btnReport.onclick = function () {
    emedia.fileReport();
};


var selectEvents = document.getElementById("div_events");

var rtcs = document.getElementById("participants");

function displayEvent(event__) {
    var option = document.createElement("p");
    option.innerHTML = event__;

    //selectEvents.insertBefore(option, null);

    selectEvents.innerHTML = option.outerHTML + selectEvents.innerHTML;
}

function displayOntalking(member, stream, meterData) {
    var htmlId = stream.getHtmlDOMID();
    var $div = $('#' + htmlId);

    var timeoutId = $div.attr("_timeout_id");
    if(timeoutId !== "" || !timeoutId){
        clearTimeout(timeoutId);
    }

    $div.addClass("talking");
    setTimeout(function () {
        $div.removeClass("talking");
    }, 700);
}
function displaySoundMeters(member, stream, meterData) {
    var htmlId = stream.getHtmlDOMID();
    var $div = $('#' + htmlId).find('.soundMeters');
    var $volume = $('#' + htmlId).find('#volume');

    $volume.html(meterData.instant.toFixed(2)
        + " " + meterData.slow.toFixed(2)
        + " " + meterData.clip.toFixed(2)
        + " " + (meterData.trackAudioLevel ? parseFloat(meterData.trackAudioLevel).toFixed(4) : "--")
        + " " + (meterData.trackTotalAudioEnergy ? parseFloat(meterData.trackAudioLevel).toFixed(4) : "--")
    );

    //<meter high="0.25" max="1" value="0.01"></meter>
    var $instant = $div.find('#instant');
    if(!$instant || $instant.length === 0){
        $instant = $('<meter id="instant" high="0.07" max="1"></meter>').appendTo($div);
        emedia.isSafari && $instant.css("-webkit-appearance", "none");
    }
    $instant.val(meterData.instant.toFixed(2));

    var $slow = $div.find('#slow');
    if(!$slow || $slow.length === 0){
        $slow = $('<meter id="slow" high="0.07" max="1"></meter>').appendTo($div);
        emedia.isSafari && $slow.css("-webkit-appearance", "none");
    }
    $slow.val(meterData.slow.toFixed(2));

    var $clip = $div.find('#clip');
    if(!$clip || $clip.length === 0){
        $clip = $('<meter id="clip" high="0,07" max="1"></meter>').appendTo($div);
        emedia.isSafari && $clip.css("-webkit-appearance", "none");
    }
    $clip.val(meterData.clip.toFixed(2));


}
function genOrUpdateHtml(stream, update) {
    var htmlId = stream.getHtmlDOMID();
    var div = rtcs.querySelector("#" + htmlId);

    var streamId = stream.id;
    var streamName = stream.name;

    if(!div){
        div = document.createElement("div");
        div.className = "participant big ";
        stream.located() && (div.className += "self");

        div.id = htmlId;

        div.innerHTML = "<span></span>" +
            "<div id='video_box' class='video_box'><video autoplay playsinline id='videoTag'></video><div id='track' class='track'><canvas /></div></div>" +
            "<div id='video_box2' class='video_box'><video autoplay playsinline id='videoTag2'></video><div id='track2' class='track'><canvas /></div></div>" +
            "<div class='soundMeters'></div>";

        rtcs.appendChild(div);
    } else {
        var btns = div.querySelector("#btns_div");
        btns && btns.parentNode.removeChild(btns);
    }

    $(div).find("#video_box2").hide();

    var btnsDiv = document.createElement("div");
    btnsDiv && (btnsDiv.id = 'btns_div');

    var btns = "";
    // if(stream.type == 1){
    //     btns = "<div><a id='captureVideo'>抓</a>&nbsp;<a id='capture'>拍</a>&nbsp;<a id='close'>关闭</a></div>"
    //     btns += "<div id='desc'></div>";
    //     if(!stream.located()){
    //         btns += "<div><input type='checkbox' id='pannel' /><label for='pannel'>Pannel</label>" +
    //             "<input type='checkbox' id='draw' /><label for='draw'>Draw</label>" +
    //             "</div>";
    //     }else{
    //         btns += "<div></div>";
    //     }
    //
    //     btns += "<div><a id='iceStatsShow'>ICE stats</a></div>";
    //     btns += "<div id='ice_stats'></div>";
    // }
    // // else if(stream.type == 2 && stream.located()){
    // //     btns = "<div>混音 <a id='close'>关闭</a></div>"
    // //     btns += "<div id='desc'></div>";
    // //     btns += "<div>&nbsp;</div>";
    // //     btns += "<div><a id='iceStatsShow'>ICE stats</a></div>";
    // //     btns += "<div id='ice_stats'></div>";
    // // }else if(stream.type == 2 && !stream.located()){
    // //     btns = "<div>混音</div>"
    // //     btns += "<div id='desc'></div>";
    // //     btns += "<div>&nbsp;</div>";
    // //     btns += "<div><a id='iceStatsShow'>ICE stats</a></div>";
    // //     btns += "<div id='ice_stats'></div>";
    // // }
    // else
    if(stream.located()){
        //&nbsp;<a id='record'>录</a>
        btns = "<div><a id='aoff'>无声</a>&nbsp;<a id='voff'>无像</a>&nbsp;<a id='chanageCamera'>切</a>&nbsp;<a id='captureVideo'>抓</a>&nbsp;<a id='close'>关闭</a></div>"
        btns += "<div id='desc'></div>";
        btns += "<div id='volume'></div>";
        btns += "<div><input type='checkbox' id='Graffiti' /><label for='Graffiti'>Graffiti</label></div>";
        btns += "<div><a id='iceStatsShow'></a></div>";
        btns += "<div id='ice_stats'></div>";
    } else {
        //&nbsp;<a id='record'>录</a>
        btns = "<div><span id='aflag'>无声</span>&nbsp;<span id='vflag'>无像</span>&nbsp;<a id='freezeFrame'>定</a>&nbsp;<a id='captureVideo'>抓</a>&nbsp;<a id='capture'>拍</a>&nbsp;<a id='big'>大</a>&nbsp;<a id='small'>小</a>&nbsp;<a id='torch'>开灯</a>&nbsp;<a id='close'>关闭</a></div>"
        btns += "<div id='desc'></div>";
        btns += "<div id='volume'></div>";
        btns += "<div><input type='checkbox' id='audio' /><label for='audio'>Audio</label>" +
            "<input type='checkbox' id='video' /><label for='video'>Video</label>" +
            "<input type='checkbox' id='pannel' /><label for='pannel'>Pannel</label>" +
            "<input type='checkbox' id='draw' /><label for='draw'>Draw</label>" +
            "</div>";
        btns += "<div id='iceStats'><a id='iceStatsShow'></a></div>";
        btns += "<div id='ice_stats'></div>";
    }
    btnsDiv.innerHTML = btns;
    div.appendChild(btnsDiv);


    if(stream.type === 2){
        $(btnsDiv).find("div:first-child").html("<span>混音</span>&nbsp;" + $(btnsDiv).find("div:first-child").html());
    }

    //btns.find('input[type="checkbox"]')

    var subVideoCheckbox = $(btnsDiv).find("#video");
    var subAudioCheckbox = $(btnsDiv).find("#audio");

    var $iceStatsShow = $(btnsDiv).find("#iceStatsShow");
    var $iceStats = $(btnsDiv).find("#ice_stats");
    initShowStats($iceStatsShow, $iceStats, stream);

    if(!stream.located()){
        var subArgs = stream.subArgs || {subSVideo: true, subSAudio: true};
        if(subArgs.subSVideo){
            subVideoCheckbox.attr("checked", true);
        }else{
            subVideoCheckbox.removeAttr("checked");
        }

        if(subArgs.subSAudio){
            subAudioCheckbox.attr("checked", true);
        }else{
            subAudioCheckbox.removeAttr("checked");
        }

        if(!stream.subArgs && stream.type === 2){
            //subVideoCheckbox && subVideoCheckbox.attr("disabled", true);
            //subAudioCheckbox && subAudioCheckbox.attr("disabled", true);
            subAudioCheckbox && subAudioCheckbox.removeAttr("checked");
            //subAudioCheckbox && subAudioCheckbox.attr("checked", false);
        }

        subVideoCheckbox.click(function () {
            if($(this).attr("checked")){
                $(this).removeAttr("checked");
            }else{
                $(this).attr("checked", true);
            }

            if(close.innerHTML == "关闭"){
                var subSVideo = subVideoCheckbox.attr("checked") === "checked";
                var subSAudio = subAudioCheckbox.attr("checked") === "checked";
                service.subscribe(streamId, {subSVideo: subSVideo, subSAudio: subSAudio});
            }
        });

        subAudioCheckbox.click(function () {
            if($(this).attr("checked")){
                $(this).removeAttr("checked");
            }else{
                $(this).attr("checked", true);
            }

            if(close.innerHTML == "关闭"){
                var subSVideo = subVideoCheckbox.attr("checked") === "checked";
                var subSAudio = subAudioCheckbox.attr("checked") === "checked";
                service.subscribe(streamId, {subSVideo: subSVideo, subSAudio: subSAudio});
            }
        });

        emedia.helper.inboundVideo(stream, notify, 1000)
        //emedia.helper.inboundAudio(stream, notify, 1000)
    } else{
        emedia.helper.outboundVideo(stream, notify, 1000)
        //emedia.helper.outboundAudio(stream, notify, 1000)
    }

    function notify(trackId, type, subtype, data) {
        var $iceStatsShow = $(div).find("#iceStatsShow");
        var $em = $iceStatsShow.find("#"+subtype);
        if(!$em.length){
            $em  = $("<em></em>").appendTo($iceStatsShow).attr("id", subtype);
        }

        if(subtype === "bytesReceived" || subtype === "bytesSent"){
            $em.text(subtype + ":" + (data*8/1000).toFixed(2));
        }else if(subtype === "packageLossRate"){
            $em.text(subtype + ":" + data.toFixed(4));
        }else{
            $em.text(subtype + ":" + data);
        }
    }

    var controller = emedia.ctrl.getController(service, streamId);

    $(btnsDiv).find("#desc").html((stream.owner.res && stream.owner.res.platType || "")
        + ":" + stream.id + ":" + (stream.vcodes || stream.optimalVideoCodecs || "-")
        + " < " + (stream.rtcId || "-")
        + ":<em id='fv'>" + (stream.finalVCodeChoices && stream.finalVCodeChoices.length > 0 && stream.finalVCodeChoices || "-") + "</em>"
        // + (controller ? " 受控于:" + controller : "")
    );

    function updateFinalVCodeChoices(stream) {
        stream && $(btnsDiv).find("#fv").html(stream.finalVCodeChoices && stream.finalVCodeChoices.length > 0 && stream.finalVCodeChoices || "-");
    }
    setTimeout(function () {
        updateFinalVCodeChoices(service.getStreamById(streamId));
    }, 1500);

    //if(stream.type != 2)
    $(btnsDiv).find("div:first-child").append("&nbsp;<a id='zoom'>1X</a>").find("a:last-child").click(function () {
        var zoom = parseInt(this.innerHTML);
        zoom = zoom % 3 + 1;

        if(zoom == 1){
            $(div).find("#videoTag").css("height", "none");
        }else{
            $(div).find("#videoTag").css("height", "auto");
        }

        var width = zoom * 270;

        $(div).css("width", width);
        this.innerHTML = zoom + "X";
    });
    //$(div).css("width", 150);

    var aoff = div.querySelector("#aoff");
    var voff = div.querySelector("#voff");

    voff && (stream.voff ? (voff.innerHTML = "无像") : (voff.innerHTML = "有像"));
    aoff && (stream.aoff ? (aoff.innerHTML = "无声") : (aoff.innerHTML = "有声"));

    var aflag = div.querySelector("#aflag");
    var vflag = div.querySelector("#vflag");

    vflag && (stream.voff ? (vflag.innerHTML = "无像") : (vflag.innerHTML = "有像"));
    aflag && (stream.aoff ? (aflag.innerHTML = "无声") : (aflag.innerHTML = "有声"));


    var close = div.querySelector("#close");

    var span = div.querySelector("span");
    var video = div.querySelector("#videoTag");
    var videoTrack = div.querySelector("#video_box #track");

    var canvas2 = div.querySelector("#track2").querySelector("canvas");

    var pannelCheckbox = $(btnsDiv).find("#pannel");
    pannelCheckbox && pannelCheckbox.click(function () {
        if($(this).attr("checked")){
            $(this).removeAttr("checked");
            dispannel(video, stream);

            drawCheckbox[0].checked = false;
            drawCheckbox.attr("disabled", true);
        }else{
            $(this).attr("checked", true);
            pannel(video, stream);

            drawCheckbox.attr("disabled", false);
        }
    });

    var drawCheckbox = $(btnsDiv).find("#draw");
    drawCheckbox && drawCheckbox.click(function () {
        if($(this).attr("checked")){
            $(this).removeAttr("checked");
            disDrawPannel(video, stream);
        }else{
            $(this).attr("checked", true);
            drawPannel(video, stream);
        }
    });

    drawCheckbox && drawCheckbox.attr("disabled", !pannelCheckbox.attr("checked"));

    var $graffiti = $(btnsDiv).find("#Graffiti");
    $graffiti.click(function () {
        graffiti(this.checked, stream, video, videoTrack, div);
    });

    if(video){ //IE video 被替换成了Object了，所以 video找不到了
        video.muted = stream.mutedNeed();
        _logger.info("Mute", stream.id, video.muted);

        if(stream.located() && stream.type !== 1){
            $(video).addClass("mirror");
        }else{
            $(video).removeClass("mirror");
        }

        pannelCheckbox && pannelCheckbox.attr("checked", isPannel(video));
        drawCheckbox && drawCheckbox.attr("checked", isDrawPannel(video));

        if(stream.canvas){
            videoTrack.innerHTML="";

            !stream.isRepublished && videoTrack.appendChild(stream.canvas);
            !stream.isRepublished && service.resetCanvas(stream.canvas, {width: video.offsetWidth, height: videoTrack.offsetHeight}, function (canvasTag) {
                var ctx = canvasTag.getContext("2d");

                // ctx.save();
                // ctx.restore();

                ctx.globalAlpha = 1;
                ctx.fillStyle = "rgba(255, 255, 255, 255)";
                ctx.fillRect(0, 0, canvasTag.width, canvasTag.height);

                service.requestFrame(stream, 500);

                _logger.debug("Pushed fill rect");
            });

            diy(stream, video, stream.canvas, videoTrack);
        }

        span.innerHTML = (stream.owner.nickName || stream.owner.id) + ":" + (stream.name || stream.id);
        //stream.getMediaStream() && attachMediaStream(video, stream.getMediaStream());

        _logger.info("Webrtc Update stream.....");
        update ? update.ifMediaStream(function (mediaStream) {
                _logger.info("Webrtc Update11111 stream.....", mediaStream);
                attachMediaStream(video, (window.remote___stream = mediaStream));
            }) : stream.ifMediaStream(function (mediaStream) {
                _logger.info("Webrtc Update22222 stream.....", mediaStream);
                attachMediaStream(video, mediaStream);
            });
        _logger.info("Webrtc Update stream end");

        function displayHW(video){
            var $em = $(btnsDiv).find("#desc").find("#xd");
            if($em.length > 0){
                $em.html(video.videoWidth + 'x' + video.videoHeight);
            }else{
                var html = $(btnsDiv).find("#desc").html();
                html += "&nbsp;<em id='xd'>" + video.videoWidth + 'x' + video.videoHeight + "</em>";
                $(btnsDiv).find("#desc").html(html);
            }
        }
        displayHW(video);

        emedia.util.addEvent(video, "resize", function () {
            displayHW(video);
        });

        video.oncontextmenu_ = function () {
            var className = div.className;

            var index;
            if(( index = className.indexOf('big')) > 0){
                className = className.substring(0, index - 1);
            } else {
                className += ' big';
            }

            div.className = className;
        };

        video.onclick = function (event) {
            var xy = service.getClickXY(video, event);
            console.log(xy);

            if (document.all) { // for IE
                window.event.returnValue = false;
            } else {
                event.preventDefault();
            }
            if(stream.located()){
                displayEvent("Web本地摄像头不支持聚焦");
                return;
            }
            service.focusExpoRemote(stream.id, video, event, function fail(evt) {
                _logger.error("Oh,no.", evt.message())
            });
        };

        video.onmousemove_ = function (event) {
            var floatDiv = document.querySelector("#float_div");
            if(!floatDiv){
                return;
            }

            var e = event || window.event;

            floatDiv.querySelector("#client").innerHTML = e.clientX + ":" + e.clientY;
            floatDiv.querySelector("#screen").innerHTML = e.screenX + ":" + e.screenY;


            var e = event || window.event;
            var scrollX = document.documentElement.scrollLeft || document.body.scrollLeft;
            var scrollY = document.documentElement.scrollTop || document.body.scrollTop;
            var x = e.pageX || e.clientX + scrollX;
            var y = e.pageY || e.clientY + scrollY;

            floatDiv.querySelector("#document").innerHTML = x + ":" + y;


            var xy = service._getPosition(video);
            floatDiv.querySelector("#self").innerHTML = (x - xy.clientX) + ":" + (y - xy.clientY);
        };
    }


    update && vflag && update.ifVoff(function (voff) {
        (voff ? (vflag.innerHTML = "无像") : (vflag.innerHTML = "有像"));
    });
    update && aflag && update.ifAoff(function (aoff) {
        (aoff ? (aflag.innerHTML = "无声") : (aflag.innerHTML = "有声"));
    });

    //stream.getMediaStream() ? (close && (close.innerHTML = "关闭")) : (close && (close.innerHTML = "订阅"));
    stream.subscribed() ? (close && (close.innerHTML = "关闭")) : (close && (close.innerHTML = "订阅"));


    var chanageCamera = div.querySelector("#chanageCamera");
    chanageCamera && (chanageCamera.onclick = function () {
        service.chanageCamera(stream.id);
    });

    var captureVideo = div.querySelector("#captureVideo");
    captureVideo && (captureVideo.onclick = function () {
        //service.captureVideo(video, true);
        var base64 = service.getCaptureBase64Context(video);

        $("<img class='captureImg'>").attr('src', base64).appendTo('body')
            .click(function () {
                $(this).hide();
            });
    });

    var capture = div.querySelector("#capture");
    capture && (capture.onclick = function () {
        service.capturePictureRemote(stream.id, false, function (base64Pic) {
            displayEvent("capture success", base64Pic);
        }, function fail(evt) {
            _logger.error("Oh,no. capture", evt.message())
            displayEvent("capture fail");
        });
    });

    var freezeFrame = div.querySelector("#freezeFrame");
    freezeFrame && (freezeFrame.onclick = function () {
        (freezeFrame.innerHTML === "定") ? (freezeFrame.innerHTML = "动") : (freezeFrame.innerHTML = "定");

        service.freezeFrameRemote(stream.id, function (freezeFramed) {
            freezeFramed ? (freezeFrame.innerHTML = "动") : (freezeFrame.innerHTML = "定");
        }, function fail(evt, freezeFramed) {
            freezeFramed ? (freezeFrame.innerHTML = "动") : (freezeFrame.innerHTML = "定");
            _logger.error("Oh,no. freeze frame", evt.message())
            displayEvent("freeze frame fail");
        });
    });

    var torchObject = div.querySelector("#torch");
    torchObject && (torchObject.onclick = function () {
        (torchObject.innerHTML === "开灯") ? (torchObject.innerHTML = "关灯") : (torchObject.innerHTML = "开灯");

        service.torchRemote(stream.id, function (torch) {
            torch ? (torchObject.innerHTML = "关灯") : (torchObject.innerHTML = "开灯");
        }, function fail(evt, torch) {
            torch ? (torchObject.innerHTML = "关灯") : (torchObject.innerHTML = "开灯");
            _logger.error("Oh,no. torch fail", evt.message())
            displayEvent("torch fail");
        });
    });

    var big = div.querySelector("#big");
    var small = div.querySelector("#small");

    big && (big.onclick = function () {
        service.zoomRemote(stream.id, 2, function fail(evt) {
            _logger.error("Oh,no. zoom", evt.message())
        });
    });
    small && (small.onclick = function () {
        service.zoomRemote(stream.id, 0.5, function fail(evt) {
            _logger.error("Oh,no. zoom", evt.message())
        });
    });

    aoff && (aoff.onclick = function () {
        var _aoff;
        if(this.innerHTML == "无声"){
            this.innerHTML = "有声";
            _aoff = 0;
        } else {
            this.innerHTML = "无声";
            _aoff = 1;
        }

        service.aoff(stream, _aoff, function (evt) {
            displayEvent(evt.message());
            aoff.innerHTML = "无声";
        });
    });

    voff && (voff.onclick = function () {
        var _voff;
        if(this.innerHTML == "无像"){
            this.innerHTML = "有像";
            _voff = 0;
        } else {
            this.innerHTML = "无像";
            _voff = 1;
        }

        service.voff(stream, _voff, function (evt) {
            displayEvent(evt.message());
            voff.innerHTML = "无像";
        });
    });


    var record = div.querySelector("#record");

    if(service.recording(stream.id)){
        record && (record.innerHTML = "停");
    }

    record && (record.onclick = function () {
        if(this.innerHTML == "录"){
            service.startRecord(stream.id, function (_result) {
                _result && (record.innerHTML = "停");
            });
        } else {
            service.startRecord(stream.id, function (_result) {
                _result && (record.innerHTML = "录");
            });
        }
    });

    close && (close.onclick = function () {
        if(this.innerHTML == "关闭"){ //关闭
            record && (record.innerHTML = "录");

            service.hungup(streamId);

            if(stream.located()){
                this.innerHTML = "";
                //rtcs.querySelector("#" + div.id) && rtcs.removeChild(div);
            }else{
                this.innerHTML = "订阅"
            }

        } else { //订阅
            this.innerHTML = "关闭";

            var self = this;

            var subSVideo = stream.type == 1 || subVideoCheckbox.attr("checked") === "checked";
            var subSAudio = stream.type == 1 || subAudioCheckbox.attr("checked") === "checked";
            service.subscribe(streamId, function(){

            }, function (_evt) {
                _logger.warn(_evt);
                self.innerHTML = "订阅";
            }, {subSVideo: subSVideo, subSAudio: subSAudio});
        }
    });
}

function rmHtml(stream) {
    var id = "#" + stream.getHtmlDOMID();

    var div = rtcs.querySelector(id);
    div && rtcs.removeChild(div);
}


btnHangup.onclick = function () {
    service.exit();
}

btnHangup.oncontextmenu = function (event) {
    if (document.all) { // for IE
        window.event.returnValue = false;
    } else {
        event.preventDefault();
    }

    service.exit(true);
}

btnEnter.onclick = function () {
    var tktJson = tkt.value;
    tktJson = JSON.parse(tktJson);

    var ext = {role: "admin000"};

    service.setup(tkt.value, ext);

    if(emedia.config.onlyEnter){
        service.join();

        return;
    }

    var div;

    // function openMedia(audio, video){
    //     var pubS = new service.AVPubstream({
    //         constaints: {
    //             audio: audio,
    //             video: video
    //         },
    //         aoff: 0,
    //         voff: 0,
    //         name: "video",
    //         ext: {
    //             browser: app.appname
    //         }
    //     });
    //
    //     service.openUserMedia(pubS).then(
    //         function success(_user, stream) { //成功 attachMediaStream(video, mediaStream);
    //             service.join(function () {
    //                 service.push(pubS);
    //             });
    //         },
    //         function fail(evt) {
    //             if(evt instanceof emedia.event.ShareDesktopExtensionNotFound){ //共享桌面抄件未找到
    //
    //             }
    //             if(evt instanceof emedia.event.OpenMediaError){ //设备可能不支持，比如 没有摄像头，或 被禁止访问摄像头
    //
    //             }
    //             displayEvent("打开Media失败", evt.message());
    //
    //             openMedia(true, false);
    //         }
    //     )
    // }
    //
    // openMedia(true, true);

    var pubS = new service.AVPubstream({
        constaints: {
            audio: "false" !== __audio__,
            video: "false" !== __video__,
        },
        aoff: 0,
        voff: 0,
        name: "video",
        ext: {
            browser: app.appname
        }
    });

    service.join(function success() { //成功 attachMediaStream(video, mediaStream);
        service.openUserMedia(pubS).then(
            function success(_user, stream) { //成功 attachMediaStream(video, mediaStream);
                service.push(pubS);
            },
            function fail(evt) {
                if(evt instanceof emedia.event.ShareDesktopExtensionNotFound){ //共享桌面抄件未找到

                }
                if(evt instanceof emedia.event.OpenMediaError){ //设备可能不支持，比如 没有摄像头，或 被禁止访问摄像头

                }
                displayEvent("打开Media失败", evt.message());
            }
        );
    });

    // var pubS = new service.AVPubstream({
    //     constaints: {
    //         audio: "false" !== __audio__,
    //         video: "false" !== __video__,
    //     },
    //     aoff: 0,
    //     voff: 0,
    //     name: "video",
    //     ext: {
    //         browser: app.appname
    //     }
    // });
    // service.openUserMedia(pubS).then(
    //     function success(_user, stream) { //成功 attachMediaStream(video, mediaStream);
    //         service.withpublish(pubS).join();
    //     },
    //     function fail(evt) {
    //         if(evt instanceof emedia.event.ShareDesktopExtensionNotFound){ //共享桌面抄件未找到
    //
    //         }
    //         if(evt instanceof emedia.event.OpenMediaError){ //设备可能不支持，比如 没有摄像头，或 被禁止访问摄像头
    //
    //         }
    //         displayEvent("打开Media失败", evt.message());
    //     }
    // );
};

btnPub.onclick =  function () {
    var pubS = new service.AVPubstream({
        constaints: {
            //audio: "false" !== __audio__ && !service.hasAudioMixers(),
            audio: "false" !== __audio__,
            video: "false" !== __video__,
            //video: {width: {exact: 1280}, height: {exact: 720}}
        },
        // constaints: {
        //     //audio: "false" !== __audio__ && !service.hasAudioMixers(),
        //     audio: {bitrate: 100},
        //     video: {
        //         width: {
        //             exact: 1280
        //         },
        //         height: {
        //             exact: 720
        //         },
        //         bitrate: 200
        //     }
        // },
        // constaints: {
        //     "audio": true,
        //     "video": {
        //         "width": {
        //             "min": "700",
        //             "max": "1280"
        //         },
        //         "height": {
        //             "min": "600",
        //             "max": "720"
        //         }
        //     }
        // },
        // constraints： {
        //     audio: {deviceId: audioSource ? {exact: audioSource} : undefined},
        //     video: {deviceId: videoSource ? {exact: videoSource} : undefined}
        // },
        aoff: 0,
        voff: 0,
        name: "video",
        ext: {
            browser: app.appname
        }
    });

    var div;
    service.openUserMedia(pubS).then(function () {
        service.push(pubS);
    }, function fail(evt) {
        displayEvent("打开Media失败" + evt.message());
    });
};

btnCanvas.onclick = function () {
    service.graffitiCanvas().push();
}

btnShareDesktop.onclick = function () {
    var pubS = new service.ShareDesktopPubstream({
        aoff: 1,
        name: "共享桌面",
        ext: "hello 共享桌面",
        //screenOptions: ['screen', 'window', 'tab']
        screenOptions: ['screen'],
        // vbitrate: 200,
        // abitrate: 150,
        // mandatory: {
        //     maxWidth: 640,
        //     maxHeight: 480
        // }
    });

    var div;
    service.openUserMedia(pubS).then(function () {
        service.push(pubS);
    }, function fail(evt) {
        displayEvent("打开Media失败" + evt.message());
    });
}

btnAudioMixer.onclick = function () {
    var pubS = new service.AudioMixerPubstream({
            constaints: {
                video : "false" !== __video__,
            },

            aoff: 0
        });

    var div;
    service.openUserMedia(pubS).then(function () {
        service.push(pubS);
    }, function fail(evt) {
        displayEvent("打开Media失败" + evt.message());
    });
}

window._statsGetters = {};
function initShowStats($iceStatsShow, $iceStats, stream){
    $iceStats.html("");

    $iceStatsShow.click(function(){
        var html = $iceStats.html();
        if(html === ""){
            _statsGetters[stream.id] && _statsGetters[stream.id].stopIntervalGet();
            if(stream._webrtc && stream._webrtc._rtcPeerConnection){
                _statsGetters[stream.id] = new StatsGetter({peerConnection: stream._webrtc._rtcPeerConnection, onStatsGot: function (statsHtml) {
                        $iceStats.html(statsHtml);
                    }});
                _statsGetters[stream.id].intervalGet();
            }
        }else{
            _statsGetters[stream.id].stopIntervalGet();
            $iceStats.html("");
        }
    });
}


emedia.ctrl.support(service,
    function onHasRemoteControl(stream, controler, controlRequest){
        var rtn = confirm("同意 来自<" + controler.memName + ">对流:" + stream.id + "控制申请吗？")
        if(rtn){
            var htmlId = stream.getHtmlDOMID();
            var $div = $('#' + htmlId);

            var $video = $div.find("#videoTag");
            var $videoTrack = $div.find("#video_box #track");
            var $canvas = $div.find("#video_box canvas");

            $videoTrack.show();
            $canvas.show();

            controlRequest.accept(new DrawMouseTrack({
                target__: $videoTrack[0],
                canvas__: $canvas[0],
                video__: $video[0]
            }), new KeyboardTrack());
        }else{
            controlRequest.reject();
        }
    },

    function onRemoteFreeControl(stream, controler, cId) {
        var htmlId = stream.getHtmlDOMID();
        var $div = $('#' + htmlId);

        var $video = $div.find("#videoTag");
        var $videoTrack = $div.find("#video_box #track");
        var $canvas = $div.find("#video_box canvas");

        if($videoTrack[0]._nerver_none){
            return;
        }

        $videoTrack.hide();
        $canvas.hide();
    }
);

function isPannel(videoObj) {
    var targetDiv = videoObj.parentNode.querySelector("#track");
    return targetDiv.style.display === "block";
}

function pannel(videoObj, stream){
    if(isPannel(videoObj)){
        return;
    }

    var targetDiv = videoObj.parentNode.querySelector("#track");
    targetDiv.style.display = "none";

    function _ok() {
        var $pannelCheckbox = $(videoObj).parent().parent().find("#pannel");
        $pannelCheckbox.attr("checked", false);
        $pannelCheckbox.removeAttr("checked");
        $pannelCheckbox[0].checked = false;

        targetDiv.style.display = "none";
    }

    function onReject(stream) {
        _ok();
        alert("Reject remote control. the stream is " + stream.id);
    }

    function onBusy(stream) {
        _ok();
        alert("Busy remote control. the stream is " + stream.id);
    }

    function onNotAllowRemoteControl(stream){
        _ok();
        alert("Not support remote control. the stream is " + stream.id);
    }

    function onRemoteControlTimeout(stream){
        _ok();
        alert("Remote control timeout. the stream is " + stream.id);
    }

    function onAccept(stream){
        targetDiv.style.display = "block";
    }

    function onDisControlled(stream){
        //targetDiv.style.display = "none";
        _ok();
    }

    if($(videoObj).hasClass('mirror')){
        emedia.ctrl.mirrorControlled(service, stream.id, videoObj, targetDiv,
            onDisControlled, onAccept, onNotAllowRemoteControl, onRemoteControlTimeout, onReject, onBusy);
    }else{
        emedia.ctrl.controlled(service, stream.id, videoObj, targetDiv,
            onDisControlled, onAccept, onNotAllowRemoteControl, onRemoteControlTimeout, onReject, onBusy);
    }

    var videoXY = emedia.util.getDomPageRect(videoObj);
    var targetDivXY = emedia.util.getDomPageRect(targetDiv);

    _logger.warn("Video", videoXY.width, videoXY.height);
    _logger.warn("Canvas", targetDivXY.width, targetDivXY.height);
}

function dispannel(videoObj, stream){
    var targetDiv = videoObj.parentNode.querySelector("#track");
    targetDiv.style.display = "none";

    emedia.ctrl.disControlled(service, stream.id);
}

function isDrawPannel(videoObj) {
    return isPannel(videoObj) && videoObj.___track;
}

function drawPannel(videoObj, stream){
    var targetDiv = videoObj.parentNode.querySelector("#track");

    emedia.ctrl.echoControl(service, stream.id, new DrawMouseTrack({
        target__: targetDiv,
        canvas__: targetDiv.querySelector("canvas"),
        video__: videoObj
    }), new KeyboardTrack());
}

function disDrawPannel(videoObj, stream){
    emedia.ctrl.disEchoControl(service, stream.id);
}

var KeyboardTrack = emedia.pannel.KeyboardTrack.extend({
    onKeyDown: function (btn) {
        _logger.info("Down ", btn);
    },

    onKeyUp: function (btn) {
        _logger.info("Up ", btn);
    }
})

var DrawMouseTrack = emedia.pannel.MouseTrack.extend({
    __init__:function () {
        this.draw = new emedia.pannel.DefaultMouseTrack({
            _target: this.target__,
            _canvas: this.canvas__,
            _referenceVideo: this.video__
        });
    },
    onMouseTrack: function (position, lastPosition, lastTrigger) {
        //console.log("Mouse move", position);

        if($(this.video__).hasClass('mirror') && !this._mirror){
            position.x = 0 - position.x;
        }
        this.draw.track(position);
    },
    onMouseTrigger: function (trigger, _lastTrigger) {
        _logger.info("OK?", trigger);

        if($(this.video__).hasClass('mirror') && !this._mirror){
            trigger.xy.x = 0 - trigger.xy.x;
        }
        this.draw.trigger(trigger);
    },
    onReleaseTrigger: function (_lastTrigger) {
        this.draw.releaseTrigger();
    }
});


function diy(stream, video, canvas, canvasTrack){
    canvasTrack.style.display = "block";

    canvasTrack._nerver_none = true;

    emedia.ctrl.graffiti(canvasTrack, new DrawMouseTrack({
        _stream: stream,
        target__: canvasTrack,
        canvas__: canvas,
        video__: video
    }), video, $(video).hasClass('mirror'));
}


function graffiti(checked, stream, video, videoTrack, div) {
    var graffitiCanvasTag = videoTrack.querySelector("canvas");
    var compositeCanvasTag = $(div).find("#video_box2").find("canvas")[0];

    $(graffitiCanvasTag).hide();

    if(checked){
        $(div).find("#video_box2").show();
        $(div).find("#video_box2").find("div").show();

        videoTrack.style.display = "block";
        videoTrack._nerver_none = true;


        video._graffiti = emedia.ctrl.graffiti(videoTrack, new DrawMouseTrack({
            _stream: stream,
            target__: videoTrack,
            canvas__: graffitiCanvasTag,
            video__: video
        }), video);

        compositeCanvasTag.compositeCanvas = emedia.CompositeCanvas.compositeVideoOverCanvas(compositeCanvasTag, video, graffitiCanvasTag)
            .setCanvas({width: video.videoWidth, height: video.videoHeight})
            .requestAnimationFrame();

        //$(div).find("#videoTag2")[0].srcObject = compositeCanvasTag.captureStream(25);
    }else{
        video._graffiti && video._graffiti.ungrab();

        $(div).find("#video_box2").hide();
        videoTrack.style.display = "none";

        if(compositeCanvasTag.compositeCanvas){
            compositeCanvasTag.compositeCanvas.cancelAnimationFrame();
        }
    }
}