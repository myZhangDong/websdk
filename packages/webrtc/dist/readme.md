## 实时通话
webrtc 支持实时通话功能。用户可以与好友进行实时视频聊天。

注意：视频通话功能只支持 https+Webkit 浏览器。

## 集成步骤
集成步骤如下：

1. 安装。
```
	npm install easemob-webrtc
```
2. 初始化 WebRTC Call 。webrtc依赖easemob-websdk，需要先集成easemob-websdk。
```
var rtcCall = new WebIM.WebRTC.Call({
    connection: conn, //easemob-websdk
    mediaStreamConstaints: {
            audio: true,
            video: true
    },

    listener: {
        onAcceptCall: function (from, options) {
            console.log('onAcceptCall::', 'from: ', from, 'options: ', options);
        },
        //通过streamType区分视频流和音频流，streamType: 'VOICE'(音频流)，'VIDEO'(视频流)
        onGotRemoteStream: function (stream, streamType) {
            console.log('onGotRemoteStream::', 'stream: ', stream, 'streamType: ', streamType);
            var video = document.getElementById('video');
            video.srcObject = stream;
        },
        onGotLocalStream: function (stream, streamType) {
            console.log('onGotLocalStream::', 'stream:', stream, 'streamType: ', streamType);
            var video = document.getElementById('localVideo');
            video.srcObject = stream;
        },
        onRinging: function (caller, streamType) {
                        console.log("onRinging", caller)
        },
        onTermCall: function (reason) {
            console.log('onTermCall::');
            console.log('reason:', reason);
        },
        onIceConnectionStateChange: function (iceState) {
            console.log('onIceConnectionStateChange::', 'iceState:', iceState);
        },
        onError: function (e) {
            console.log(e);
        }
     }
});
```
3. 调用 RTC 接口。
```
// 视频呼叫对方
    var call = function () {
        rtcCall.caller = 'mengyuanyuan';
        rtcCall.makeVideoCall('asdfghj');
    };
    // 音频呼叫对方
    var call = function () {
        rtcCall.caller = 'mengyuanyuan';
        rtcCall.makeVoiceCall('asdfghj');
    };
    // 关掉/拒绝视频
    var endCall = function () {
        rtcCall.endCall();
    }
    // 接受对方呼叫
    var acceptCall = function () {
        rtcCall.acceptCall();
    }
```
4. 绑定事件。
```
document.getElementById('rtCall').onclick = call;
document.getElementById('rtEndCall').onclick = endCall;
document.getElementById('rtAcceptCall').onclick = acceptCall;
```
## 常见问题
Q：发起视频聊天时，收到提示“An error occurred when calling webrtc”，怎么办？

A：请开启浏览器使用摄像头的权限。以Chrome为例，在地址栏中输入chrome://settings/content，在“内容设置”页面下拉，找到“摄像头”，选择“当网站要求使用您的摄像头时询问您（推荐）”。