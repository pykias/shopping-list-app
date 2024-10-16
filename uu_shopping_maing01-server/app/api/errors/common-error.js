"use strict";
const ShoppingMainUseCaseError = require("./shopping-main-use-case-error.js");

class InvalidDtoIn extends ShoppingMainUseCaseError {
  constructor(dtoOut, paramMap = {}, cause = null) {
    super("invalidDtoIn", "DtoIn is not valid.", paramMap, cause, undefined, dtoOut);
  }
}

module.exports = {
  InvalidDtoIn,
};
