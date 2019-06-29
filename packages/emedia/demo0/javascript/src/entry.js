var $ = require("zepto");

var currentConfr;
var ticket;

function displayEvent() {
    if(arguments.length === 0){
        return;
    }
    if(arguments.length > 1){
        for(var i = 0; i < arguments.length; i++){
            displayEvent(arguments[i]);
        }
        return;
    }

    var isError = false;

    var info = arguments[0];
    if(info instanceof TypeError){
        emedia.util.logger.error(info);
        info = info.message;
        isError = true;
    }else if(typeof info !== 'string'){
        isError = !!info.errorType;
        info = info.errorMessage || JSON.stringify(info);
    }

    emedia.util.logger.log(info);
    var $event = $('<p></p>').addClass('event').html(info);
    if(isError){
        $event.addClass('warn');
    }
    $('#div_events p:first-child').before($event);
}

emedia.mgr.setUrlCreator(function(url, apiName){
    var restApi = emedia.util.parseURL("rest");
    if(!restApi){
        restApi = "https://turn2.easemob.com";
    }
    return restApi + url;
});

// https://css-tricks.com/custom-controls-in-html5-video-full-screen/   video全屏时不显示控制按钮
function launchFullscreen(element) {
    //此方法不可以在異步任務中執行，否則火狐無法全屏
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    } else if (element.oRequestFullscreen) {
        element.oRequestFullscreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullScreen();
    } else {
        var docHtml = document.documentElement;
        var docBody = document.body;
        var videobox = document.getElementById('videobox');
        var cssText = 'width:100%;height:100%;overflow:hidden;';
        docHtml.style.cssText = cssText;
        docBody.style.cssText = cssText;
        videobox.style.cssText = cssText + ';' + 'margin:0px;padding:0px;';
        document.IsFullScreen = true;
    }
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.oRequestFullscreen) {
        document.oCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else {
        var docHtml = document.documentElement;
        var docBody = document.body;
        var videobox = document.getElementById('videobox');
        docHtml.style.cssText = "";
        docBody.style.cssText = "";
        videobox.style.cssText = "";
        document.IsFullScreen = false;
    }
}

function initEvents(stream, videoTag){
    var $div = $(videoTag).parent().parent();

    emedia.mgr.onMediaChanaged(videoTag, function (constaints) {
        $div.find("#aoff").html(constaints.audio ? "有声" : "无声");
        $div.find("#voff").html(constaints.video ? "有像" : "无像");

        console.warn($(videoTag).attr("easemob_stream"), "aoff", $(videoTag).attr("aoff"));
        console.warn($(videoTag).attr("easemob_stream"), "voff", $(videoTag).attr("voff"));
    });

    emedia.mgr.onSoundChanaged(videoTag, function (meterData) {
        var $volume = $div.find('#volume');

        $volume.html(meterData.instant.toFixed(2)
            + " " + meterData.slow.toFixed(2)
            + " " + meterData.clip.toFixed(2)
            + " " + (meterData.trackAudioLevel ? parseFloat(meterData.trackAudioLevel).toFixed(4) : "--")
            + " " + (meterData.trackTotalAudioEnergy ? parseFloat(meterData.trackAudioLevel).toFixed(4) : "--")
        );
    });

    emedia.mgr.onIceStateChanged(videoTag, function (state) {
        console.log(state);
    });

    emedia.mgr.onMediaTransmission(videoTag, function notify(trackId, type, subtype, data) {
        var $iceStatsShow = $div.find("#iceStatsShow");
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
    });

    if(stream.located()){
        $div.find('#close').click(function () {
            emedia.mgr.triggerHungup(videoTag);
        });

        $div.find('#chanageCamera').click(function () {
            emedia.mgr.triggerChanageCamera(videoTag).then(function () {
                displayEvent("切换成功")
            }).catch(function () {
                displayEvent("切换失败")
            });
        });

        $div.find("#aoff").click(function () {
            if(videoTag.hasAttribute("aoff")){
                emedia.mgr.triggerResumeAudio(videoTag);
            }else{
                emedia.mgr.triggerPauseAudio(videoTag);
            }
        });
        $div.find("#voff").click(function () {
            if(videoTag.hasAttribute("voff")){
                emedia.mgr.triggerResumeVideo(videoTag).catch(function (evt) {
                    displayEvent(evt)
                });
            }else{
                emedia.mgr.triggerPauseVideo(videoTag);
            }
        });
    }else{
        $div.find('#close').click(function () {
            if($(this).html() == '关闭'){
                emedia.mgr.triggerHungup(videoTag);
                $(this).html('订阅');
            }else{
                emedia.mgr.triggerSubscribe(videoTag, $div.find('#video').attr("checked") == "true", $div.find('#audio').attr("checked") == "true");
                $(this).html('关闭');
            }
        });

        $div.find('#audio').click(function () {
            if($(this).attr("checked")){
                $(this).removeAttr("checked");
                emedia.mgr.triggerPauseAudio(videoTag);
            }else{
                $(this).attr("checked", true);
                emedia.mgr.triggerResumeAudio(videoTag);
            }
        }).attr("checked", stream.subArgs && stream.subArgs.subSAudio || true);

        $div.find('#video').click(function () {
            if($(this).attr("checked")){
                $(this).removeAttr("checked");
                emedia.mgr.triggerPauseVideo(videoTag);
            }else{
                $(this).attr("checked", true);
                emedia.mgr.triggerResumeVideo(videoTag);
            }
        }).attr("checked", stream.subArgs && stream.subArgs.subSVideo || true);

        $div.find('#close').html(stream.subscribed() ? "关闭" : "订阅");

        $div.find('#freezeFrame').click(function () {
            emedia.mgr.triggerFreezeFrameRemote(videoTag).catch(function(){
                alert("定格失败");
            });
        });

        $div.find('#capture').click(function () {
            emedia.mgr.triggerCapturePictureRemote(videoTag).catch(function(){
                alert("抓图失败");
            });
        });

        $div.find('#torch').click(function () {
            emedia.mgr.triggerTorchRemote(videoTag).catch(function(){
                alert("Torch失败");
            });
        });

        $div.find('#big').click(function () {
            emedia.mgr.triggerZoomRemote(videoTag, 2).catch(function(){
                alert("放大失败");
            });
        });

        $div.find('#small').click(function () {
            emedia.mgr.triggerZoomRemote(videoTag, 0.5).catch(function(){
                alert("缩小失败");
            });
        });

        emedia.mgr.onFocusExpoRemoteWhenClickVideo(videoTag, function () {
           alert("曝光失败");
        });
    }

    $div.find("#full").click(function(){
        launchFullscreen(videoTag);
    });

    $div.find('#captureVideo').click(function () {
        emedia.mgr.triggerCaptureVideo(videoTag, true, 'aaa').then(function (base64) {
            console.log(base64);
        });
    });

    $div.find("#pannel").click(function () {
        if($(this).attr("checked")){
            $(this).removeAttr("checked");

            emedia.mgr.triggerFreeRemoteControl(videoTag);
        }else{
            $(this).attr("checked", true);

            function _ok() {
                var $pannelCheckbox = $div.find("#pannel");
                $pannelCheckbox.attr("checked", false);
                $pannelCheckbox.removeAttr("checked");
                $pannelCheckbox[0].checked = false;
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
            }

            function onDisControlled(stream){
                //targetDiv.style.display = "none";
                _ok();
            }
            // emedia.mgr.triggerRemoteControl(videoTag, false,
            //     onDisControlled, onAccept, onNotAllowRemoteControl, onRemoteControlTimeout, onReject, onBusy);
        }
    });

    emedia.mgr.onRemoteControl(videoTag, function (controler, controlRequest, stream) {
        var rtn = confirm("同意 来自<" + controler.memName + ">对流:" + stream.id + "控制申请吗？");
        if(rtn){
            var htmlId = stream.getHtmlDOMID();
            var $div = $('#' + htmlId);

            var $video = $div.find("#videoTag");
            var $videoTrack = $div.find("#video_box #track");
            var $canvas = $div.find("#video_box canvas");

            $videoTrack.show();
            $canvas.show();

            var MouseTrack = emedia.pannel.MouseTrack.extend({
                onMouseTrack: function (position, lastPosition, lastTrigger) {
                    console.log("Mouse move", position);
                },
                onMouseTrigger: function (trigger, _lastTrigger) {
                    console.log("OK?", trigger);
                },
                onReleaseTrigger: function (_lastTrigger) {
                }
            });
            var KeyboardTrack = emedia.pannel.KeyboardTrack.extend({
                onKeyDown: function (btn) {
                    console.log("Down ", btn);
                },

                onKeyUp: function (btn) {
                    console.log("Up ", btn);
                }
            });
            controlRequest.accept(new MouseTrack(), new KeyboardTrack);
        }else{
            controlRequest.reject();
        }
    });

    emedia.mgr.onFreeControl(videoTag, function (controler, cId, stream) {
        alert("<" + controler.memName + ">对流:" + stream.id + "控制 释放");
    });
}
emedia.mgr.crtAndReturnVideo = function(member, stream){
    var $div = $('<div></div>').appendTo('#participants').addClass("participant big");
    stream.located() && $div.addClass("self");
    var $span = $('<span></span>').appendTo($div).html(stream.id);
    var $videoBox = $("<div id='video_box' class='video_box'>" +
        "<video autoplay playsinline id='videoTag' ></video>" +
        "<div id='track' class='track'><canvas /></div>" +
        "</div>").appendTo($div);
    var videoTag = $videoBox.find('video')[0];
    var $btnsDiv = $('<div></div>').appendTo($div);
    var $soundMeters = $("<div class='soundMeters'></div>").appendTo($div);

    var btns = "";
    if(stream.located()){
        //&nbsp;<a id='record'>录</a>
        btns = "<div><a id='aoff'>无声</a>&nbsp;<a id='voff'>无像</a>&nbsp;" +
            "<a id='chanageCamera'>切</a>&nbsp;" +
            "<a id='captureVideo'>抓</a>&nbsp;" +
            "<a id='full'>全屏</a>&nbsp;" +
            "<a id='close'>关闭</a></div>";
        btns += "<div id='desc'></div>";
        btns += "<div id='volume'></div>";
        btns += "<div><a id='iceStatsShow'></a></div>";
        btns += "<div id='ice_stats'></div>";
    } else {
        //&nbsp;<a id='record'>录</a>
        btns = "<div><span id='aoff'>无声</span>&nbsp;<span id='voff'>无像</span>&nbsp;" +
            "<a id='freezeFrame'>定</a>&nbsp;" +
            "<a id='captureVideo'>抓</a>&nbsp;" +
            "<a id='capture'>拍</a>&nbsp;" +
            "<a id='big'>大</a>&nbsp;" +
            "<a id='small'>小</a>&nbsp;" +
            "<a id='torch'>开灯</a>&nbsp;" +
            "<a id='full'>全屏</a>&nbsp;" +
            "<a id='close'>关闭</a></div>"
        btns += "<div id='desc'></div>";
        btns += "<div id='volume'></div>";
        btns += "<div><input type='checkbox' id='audio' /><label for='audio'>Audio</label>" +
            "<input type='checkbox' id='video' /><label for='video'>Video</label>" +
            "<input type='checkbox' id='pannel' /><label for='pannel'>Pannel</label>" +
            "</div>";
        btns += "<div id='iceStats'><a id='iceStatsShow'></a></div>";
        btns += "<div id='ice_stats'></div>";
    }
    $btnsDiv.html(btns);

    initEvents(stream, videoTag);
    return videoTag;
};

emedia.mgr.onStreamAdded = function(member, stream){
    if(stream.located()){
        return;
    }
    var $div = $(emedia.mgr.getBindVideoBy(stream)).parent().parent();
    // if(emedia.isSafari){
    //     setTimeout(function(){
    //         $div.find("#close").click();
    //     }, 0);
    // }else{
    //     $div.find("#close").click();
    // }

    $div.find("#close").click();
}

emedia.mgr.unloadVideo = function(member, stream, video){
    $(video).parent().parent().remove();
};

emedia.mgr.onRoleChanged = function(role){
    displayEvent("Role -> " + role);

    if(role & 4){
        $("#member_select").parent().parent().show();
        $('#btn_discand').show();
    }else{
        $("#member_select").parent().parent().hide();
        $('#btn_discand').hide();
    }
};

emedia.mgr.onMemberJoin = function(member){
    displayEvent("Enter confr:" + member.name + ", " + member.id);

    var $option = $('<option></option>')
        .html(member.name + ":" + member.id)
        .val(member.name)
        .attr('memberId', member.id)
        .appendTo('#member_select')
        .on('click', function () {
            $('#role_select option').each(function (index) {
                var option = $(this);
                this.selected = (option.val() == member.role);
            });
        });

    $option[0].ondblclick = function () {
        var memberNames = $option.val();
        var rtn = confirm("确定踢走<" + memberNames + ">吗？");
        if(rtn) {
            emedia.mgr.kickMember([memberNames]).then(function () {
            }).catch(function (error) {
                displayEvent(error);
            });
        }
    }
};

$('#role_select option').each(function(index){
    this.ondblclick = function () {
        var role = this.value;
        var memberNames = $("#member_select").val();
        if(memberNames.length === 0){
            alert("人员未选择");
            return;
        }
        emedia.mgr.chanageRoles(role, memberNames).then(function () {
            displayEvent(memberNames + ": role ->" + role);
        }).catch(function (error) {
            displayEvent(error);
        });
    }
});

emedia.mgr.onMemberLeave = function(member, reason){
    displayEvent("Enter leave:" + member.name + ", " + member.id + ", " + reason);

    $('#member_select option').each(function (index) {
        var option = $(this);
        if (option.attr('memberId') == member.id) {
            option.remove();
        }
    })
};

emedia.mgr.onExit = function(reason, failed){
    displayEvent("Exit confr:" + reason + " " + (failed || ""));
};

$('#btn_setId').hide();
$('#btn_setId').click(function () {
    var memberName = $('#id_name').val();
    var token = $('#id_token').val();
    emedia.mgr.setIdentity(memberName, token);
});

function crtConfrAndJoin(confrType, password){
    emedia.mgr.createConfr(confrType, password).then(function (confr) {
        currentConfr = confr;

        console.log(confr);
        var url = location.href.substring(0, location.href.indexOf('?')) + "?rest=" + emedia.util.parseURL("rest") + "&confr=" + confr.confrId + "&password=" + confr.password;
        $('#setting h1').html(url);
        $("#setting h2").html("<img></img>").find("img").attr("src", "http://qr.liantu.com/api.php?text=" + escape(url));

        $('#confrId').val(confr.confrId);
        $('#password').val(confr.password);

        $('#btn_enter').click();

        $('#btn_discand').show();
        $("#member_select").parent().parent().show();
    }).catch(function (error) {
        displayEvent(error);
    });
}

$('#btn_crtConfr').click(function () {
    $('#btn_setId').click();

    //$("#ID").val() //获取选中的value
    //$("#ID option").eq($("#ID").attr("selectedIndex")).text() //获取选中的文本值

    var confrType = $("#confrType_select").val();
    var password = $('#setpassword').val();

    crtConfrAndJoin(confrType, password);
});

$('#btn_reqTkt').hide();
$('#btn_reqTkt').click(function () {
    var confrId = $('#confrId').val();
    var password = $('#password').val();

    emedia.mgr.reqTkt(confrId, password).then(function (confr) {
        console.log(confr.ticket);
    }).catch(function (error) {
        displayEvent(error);
    });
});

$('#btn_enter').click(function () {
    $('#btn_setId').click();

    var confrId = $('#confrId').val();
    var password = $('#password').val();

    emedia.mgr.joinUsePassword(confrId, password).then(function (confr) {
        if(confr.role & 4){
            $("#member_select").parent().parent().show();
            $('#btn_discand').show();
        }else{
            $("#member_select").parent().parent().hide();
            $('#btn_discand').hide();
        }
        displayEvent("Enter confr successfully. confrId is " + confr.confrId);
    }).catch(function (error) {
        displayEvent(error);
    });
});


$('#btn_pub_av').click(function () {
    emedia.mgr.shareVideoWithAudio(true, true).then(function (publishedStream) {
        displayEvent("Turn video audio. your stream is " + publishedStream.id);
    }).catch(function (error) {
        displayEvent(error);
    });

    // emedia.mgr.shareVideoWithAudio({
    //         width: {
    //             exact: 1280
    //         },
    //         height: {
    //             exact: 720
    //         },
    //         bitrate: 200
    //     }, {bitrate: 20}).then(function (publishedStream) {
    //     displayEvent("Turn video audio. your stream is " + publishedStream.id);
    // }).catch(function (error) {
    //     displayEvent(error);
    // });
});

$('#btn_pub_video').click(function () {
    emedia.mgr.shareVideoWithAudio(true, false).then(function (publishedStream) {
        displayEvent("Turn only video. your stream is " + publishedStream.id);
    }).catch(function (error) {
        displayEvent(error);
    });
});

$('#btn_pub_audio').click(function () {
    emedia.mgr.shareVideoWithAudio(false, true).then(function (publishedStream) {
        displayEvent("Turn only video. your stream is " + publishedStream.id);
    }).catch(function (error) {
        displayEvent(error);
    });
});

$('#btn_shareDesktop').click(function () {
    emedia.mgr.shareDesktopWithAudio().then(function (publishedStream) {
        displayEvent("Turn sharedesktop. your stream is " + publishedStream.id);
    }).catch(function (error) {
        displayEvent(error);
    });

    // emedia.mgr.shareDesktopWithAudio({
    //     screenOptions: ['screen'],
    //     // mandatory: {
    //     //     maxWidth: 640,
    //     //     maxHeight: 480
    //     // },
    //     bitrate: 200
    // }, {bitrate: 20}).then(function (publishedStream) {
    //     displayEvent("Turn sharedesktop. your stream is " + publishedStream.id);
    // }).catch(function (error) {
    //     displayEvent(error);
    // });
});

$('#btn_hangup').click(function () {
    var rtn = confirm("确定退出会议吗？");
    if(rtn) {
        emedia.mgr.exit();
    }
});

$('#btn_discand').click(function () {
    var rtn = confirm("确定解散会议吗？");
    if(rtn) {
        emedia.mgr.disbandConfr().then(function () {
        }).catch(function (error) {
            displayEvent(error);
        });
    }
});

$('#btn_report').click(function () {
    emedia.fileReport();
});


var type = emedia.util.parseURL("type");
var confrId = emedia.util.parseURL("confr");
var password = emedia.util.parseURL("password");
var name = emedia.util.parseURL("name");

function randomName () {
    return 'xxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

if(!name){
    name = randomName();
}

if(!password){
    password = "";
}

window.onload = function(){
    // emedia.util.addEvent(document, "keydown", function(event){
    //     var ascii = event.keyCode || event.which;
    //     if(ascii == 27){
    //         emedia.util.stopEvent(event);
    //         exitFullscreen();
    //     }
    // });

    $('#id_name').val(name);
    $('#id_token').val(name + " token");

    if(type && !confrId){
        $("#confrType_select").parent().parent().hide();
        $('#confrId').parent().parent().hide();

        $('#btn_setId').click();
        crtConfrAndJoin(type, password);

        $('#id_name').prop("readOnly", "readOnly");
        $('#id_token').prop("readOnly", "readOnly");
    }

    if(confrId){
        $("#confrType_select").parent().parent().hide();
        $('#confrId').parent().parent().hide();

        $('#confrId').val(confrId);
        $('#password').val(password);

        //$('#btn_enter').click();

        $('#id_name').prop("readOnly", "readOnly");
        $('#id_token').prop("readOnly", "readOnly");
    }
}
