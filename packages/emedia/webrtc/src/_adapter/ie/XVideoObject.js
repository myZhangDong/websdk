var _util = require('../../components/Util');
var _logger = _util.tagLogger("IE.Video");

var globalVideoSeqno = 0;

var Video = _util.prototypeExtend({
    //plugin:
    //xplugin:

    classid: 'clsid:10b0eb8e-ed8b-48bd-9881-60e3fa79eb85',
    // width: 640,
    // height: 480,

    __init__: function () {
        this.id = _util.list(this.plugin.id, "video", globalVideoSeqno++).join("_");
        this.plugin._activeXVideos[this.id] = this;
    },

    // params: {},
    param: function (name, value) {
        (this.params || (this.params = {}))[name] = value;

        return this;
    },
    
    replace: function (videoTag) {
        var tag = createVideoObject(this);

        var parentNode = videoTag ? videoTag.parentNode : document.body;

        tag.style = videoTag.style;
        parentNode.insertBefore(tag, videoTag);

        _util.cloneCSS(videoTag, tag);

        videoTag.__preDisplayStyle = videoTag.style.display;
        videoTag.style.display = "none";

        this._replaceTag = videoTag;

        return tag;
    },

    remove: function () {
        try{
            removeVideo(this);
        }finally{
            this._attched = false;
            this._bindStream && (this._bindStream._attachToXVideo = undefined);
            if(this._replaceTag){
                this._replaceTag.bindXVideo = undefined;
                this._replaceTag.style.display = this._replaceTag.__preDisplayStyle;
            }

            this.plugin && _util.removeAttribute(this.plugin._activeXVideos, this.id);
            _logger.info("XVideo removed.", this.id);
        }
    },

    captureStream: function () { //TODO src/content/capture/video-video/js/main.js

    }
});

Video.factory = function (cfg) {
    return new Video(cfg || {});
}

function paramsHTMLTag(params) {
    var html = "";
    _util.forEach(params, function (param, value) {
        html += _util.list("<param name='", param, "'", "value='", value, "'", "/>").join(" ");
    });

    return html;
}

function createVideoObject(video) {
    // only inject once the page is ready
    // if (document.readyState !== 'interactive' && document.readyState !== 'complete') {
    //     return;
    // }

    var tag = document.getElementById("#" + video.id);
    if(tag){
        return video._xobj = video.tag = tag;
    }

    //"<object id=\"pc1LocalWindow\" classid=\"clsid:10b0eb8e-ed8b-48bd-9881-60e3fa79eb85\" width=\"200\" height=\"150\"><param name=\"WebRtcWindowName\" value=\"testWindow\"/></object>"
    video._xobj = video.tag = tag = document.createElement('object');
    tag.id = video.id;
    tag.classid =video.classid;
    // tag.width = video.width;
    // tag.height = video.height;

    if(video.params){
        tag.innerHTML = paramsHTMLTag(plugin.params);
    }

    tag._targetObject = video;
    tag.release = function () {
        video.remove();
    }

    return tag;
}

function removeVideo(video) {
    var id = video;
    if(typeof video !== 'string'){
        id = video.id;
    }

    var tag = document.getElementById(id);
    tag && tag.Stop();
    tag && tag.parentNode.removeChild(tag);
}

module.exports = Video;