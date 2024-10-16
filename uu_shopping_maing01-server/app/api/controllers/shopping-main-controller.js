"use strict";
const InitAbl = require("../../abl/shopping-main/init-abl.js");
const InitRollbackAbl = require("../../abl/shopping-main/init-rollback-abl.js");
const LoadAbl = require("../../abl/shopping-main/load-abl.js");
const SetStateClosedAbl = require("../../abl/shopping-main/set-state-closed-abl.js");
const ClearAbl = require("../../abl/shopping-main/clear-abl.js");
const CommenceAbl = require("../../abl/shopping-main/commence-abl.js");

class ShoppingMainController {
  init(ucEnv) {
    return InitAbl.init(ucEnv.getUri(), ucEnv.getDtoIn());
  }

  _initFinalize(ucEnv) {
    return InitAbl._initFinalize(ucEnv.getUri(), ucEnv.getDtoIn());
  }

  _initFinalizeRollback(ucEnv) {
    return InitRollbackAbl._initFinalizeRollback(ucEnv.getUri(), ucEnv.getDtoIn());
  }

  load(ucEnv) {
    return LoadAbl.load(ucEnv.getUri(), ucEnv.getSession(), ucEnv.getAuthorizationResult());
  }

  loadBasicData(ucEnv) {
    return LoadAbl.loadBasicData(ucEnv.getUri(), ucEnv.getSession());
  }

  setStateClosed(ucEnv) {
    return SetStateClosedAbl.setStateClosed(ucEnv.getUri(), ucEnv.getDtoIn());
  }

  _setStateClosedFinalize(ucEnv) {
    return SetStateClosedAbl._setStateClosedFinalize(ucEnv.getUri(), ucEnv.getDtoIn());
  }

  clear(ucEnv) {
    return ClearAbl.clear(ucEnv.getUri(), ucEnv.getDtoIn(), ucEnv.getSession());
  }

  _clearFinalize(ucEnv) {
    return ClearAbl._clearFinalize(ucEnv.getUri(), ucEnv.getDtoIn(), ucEnv.getSession());
  }

  commence(ucEnv) {
    return CommenceAbl.commence(ucEnv.getUri(), ucEnv.getDtoIn());
  }
}

module.exports = new ShoppingMainController();
