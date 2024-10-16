"use strict";
const ShoppingMainUseCaseError = require("./shopping-main-use-case-error.js");

class ConfigurationLoadFailed extends ShoppingMainUseCaseError {
  constructor(paramMap = {}, cause = null) {
    super("configurationLoadFailed", "Failed to obtain configuration needed to continue.", paramMap, cause);
  }
}

class UuAppMetaModelDoesNotExist extends ShoppingMainUseCaseError {
  constructor(paramMap = {}, cause = null) {
    super("uuAppMetaModelDoesNotExist", "Metamodel does not exist.", paramMap, cause);
  }
}

module.exports = {
  ConfigurationLoadFailed,
  UuAppMetaModelDoesNotExist,
};
