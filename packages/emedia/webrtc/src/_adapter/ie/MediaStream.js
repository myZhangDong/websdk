var _util = require('../../components/Util');
var _logger = _util.tagLogger("IE");

var MediaStream = _util.prototypeExtend({
    //plugin:
    //xplugin:

    //id
    //_xobj: stream,
    //getTracks
    //getVideoTracks
    //getAudioTracks
    //addTrack

    //oninactive  //TODO

    __init__: function () {

    },

    getVideoTracks: function () {
        var self = this;
        var _xtracks = self.xplugin.MediaStreamGetVideoTracks(self._xobj);

        _xtracks = JSON.parse(_xtracks);

        var tracks = [];
        _util.forEach(_xtracks, function (index, xtrack) {
            tracks.push(new MediaStreamTrack({
                id: self.id + "_track_kind_" + xtrack,
                _xobj: xtrack
            }));
        });
        return tracks;
    },
    getAudioTracks: function () {
        var self = this;
        var _xtracks = self.xplugin.MediaStreamGetAudioTracks(self._xobj);

        _xtracks = JSON.parse(_xtracks);

        var tracks = [];
        _util.forEach(_xtracks, function (index, xtrack) {
            tracks.push(new MediaStreamTrack({
                id: self.id + "_track_kind_" + xtrack,
                _xobj: xtrack
            }));
        });
        return tracks;
    },

    getTracks: function () {
        var tracks = this.getVideoTracks();
        var audioTracks = this.getAudioTracks();

        Array.prototype.push.apply(tracks, audioTracks);

        return tracks;
    },
    
    addTrack: function () {
        throw "Not support it"
    }
});

module.exports = MediaStream;