"use strict";
const ShoppingMainUseCaseError = require("../errors/shopping-main-use-case-error.js");

class ShoppingMainUseCaseWarning {
  constructor(code, message, paramMap) {
    this.code = ShoppingMainUseCaseError.generateCode(code);
    this.message = message;
    this.paramMap = paramMap instanceof Error ? undefined : paramMap;
  }
}

module.exports = ShoppingMainUseCaseWarning;
