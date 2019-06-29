module.exports = emedia.util.prototypeExtend({
    __displayInterval: null,

    intervalMillis: 1000,
    peerConnection: null,
    onStatsGot: null,

    stopIntervalGet: function () {
        var self = this;
        self.__displayInterval && clearInterval(self.__displayInterval);
        self.__displayInterval = null;
    },

    dumpStats:  function dumpStats(results) {
        var statsString = '';
        results.forEach(function(res) {
            statsString += '<h3>Report type=';
            statsString += res.type;
            statsString += '</h3>\n';
            statsString += 'id ' + res.id + '<br>\n';
            statsString += 'time ' + res.timestamp + '<br>\n';
            Object.keys(res).forEach(function(k) {
                if (k !== 'timestamp' && k !== 'type' && k !== 'id') {
                    statsString += k + ': ' + res[k] + '<br>\n';
                }
            });
        });
        return statsString;
    },

    report: function(stats){
        var self = this;

        var statsString = self.dumpStats(stats);
        return statsString;
    },

    intervalGet: function (peerConnection, onStatsGot) {
        var self = this;

        if(peerConnection){
            self.peerConnection = peerConnection;
        }
        peerConnection = self.peerConnection;

        if(onStatsGot){
            self.onStatsGot = onStatsGot;
        }
        onStatsGot = self.onStatsGot;

        if(!peerConnection){
            return;
        }

        function get() {
            peerConnection.getStats().then(function(stats) {
                var reportText = self.report(stats)

                onStatsGot && onStatsGot(reportText);
            });
        }
        get();
        self.__displayInterval = setInterval(get, self.intervalMillis);
    }
});