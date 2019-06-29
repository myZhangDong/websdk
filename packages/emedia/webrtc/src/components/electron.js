window.emedia = window.emedia || {};

var _util = require('./Util');
var _logger = _util.tagLogger("electron");

emedia.electron = window.require('electron');

emedia.chooseElectronDesktopMedia = function (sources, accessApproved, accessDenied) {
    _logger.info("Choose desktop. ", sources[0]);
    accessApproved(sources[0]);
}