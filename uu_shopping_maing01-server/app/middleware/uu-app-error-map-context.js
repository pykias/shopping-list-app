"use strict";
const { UseCaseContext } = require("uu_appg01_server").AppServer;

const MIDDLEWARE_ORDER = -5;

class UuAppErrorMapContext {
  constructor() {
    this.order = MIDDLEWARE_ORDER;
  }

  pre(req, res, next) {
    UseCaseContext.setAttribute("uuAppErrorMap", {});
    return next();
  }
}

module.exports = UuAppErrorMapContext;
