"use strict";
const ShoppingMainUseCaseError = require("./shopping-main-use-case-error.js");

class CallScriptEngineFailed extends ShoppingMainUseCaseError {
  constructor(paramMap = {}, cause = null) {
    super("callScriptEngineFailed", "Call scriptEngine failed.", paramMap, cause);
  }
}

module.exports = {
  CallScriptEngineFailed,
};
