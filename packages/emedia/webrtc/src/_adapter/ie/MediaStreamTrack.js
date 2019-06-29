var _util = require('../../components/Util');
var _logger = _util.tagLogger("IE");

var MediaStreamTrack = _util.prototypeExtend({
    //plugin:
    //xplugin:

    //id
    //_xobj: xtrack,

    //contentHint
    //enabled
    //id
    //kind "audio|video"
    //label
    //muted
    //readonly
    //readyState
    //remote

    //stop()
    //onmute
    //onunmute
    //onended

    __init__: function () {
        this.kind();
        this.state();
        this.remote();
        this.label();
        this.enable();
    },

    kind: function () {
        var self = this;
        return self.kind = self.xplugin.GetTrackKind(self._xobj);
    },
    state: function () {
        var self = this;
        return self.state = self.xplugin.GetTrackState(self._xobj);
    },
    remote: function () {
        var self = this;
        return self.remote = self.xplugin.GetTrackRemote(self._xobj);
    },
    label: function () {
        var self = this;
        return self.label = self.xplugin.GetTrackLabel(self._xobj);
    },
    enable: function (enabled) {
        var self = this;

        if(enabled === undefined){
            return self.enabled = self.xplugin.GetTrackEnable(self._xobj);
        }

        var result = self.xplugin.SetTrackEnable(self._xobj, !!enabled);
        if(result){
            self.enabled = enabled;
        }
    },
    stop: function () { //TODO
        var self = this;
        //self.xplugin.StopCapture(self._xobj);
    },

    getConstraints: function () {
        //TODO src/content/getusermedia/resolution/js/main.js
        return "not support";
    }
});

module.exports = MediaStreamTrack;