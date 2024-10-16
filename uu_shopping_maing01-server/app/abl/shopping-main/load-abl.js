"use strict";
const { DaoFactory } = require("uu_appg01_server").ObjectStore;
const { Validator } = require("uu_appg01_server").Validation;
const { UuAppWorkspace } = require("uu_appg01_server").Workspace;

const ShoppingMainConstants = require("../../constants/shopping-main-constants");

class LoadAbl {
  constructor() {
    this.validator = Validator.load();
    this.dao = DaoFactory.getDao(ShoppingMainConstants.Schemas.SHOPPING_INSTANCE);
  }

  async load(uri, session, authorizationResult, uuAppErrorMap = {}) {
    // HDS 1
    const awid = uri.getAwid();

    // HDS 2
    const awidData = await UuAppWorkspace.load(uri, session, uuAppErrorMap);

    // HDS 3
    const uuShopping = await this.dao.getByAwid(awid);

    // TODO Implement according to application needs...

    // HDS 4
    return { data: uuShopping, ...awidData };
  }

  async loadBasicData(uri, session, uuAppErrorMap = {}) {
    // HDS 1
    const dtoOut = await UuAppWorkspace.loadBasicData(uri, session, uuAppErrorMap);

    // TODO Implement according to application needs...
    // const awid = uri.getAwid();
    // const workspace = await UuAppWorkspace.get(awid);
    // if (workspace.sysState !== UuAppWorkspace.SYS_STATES.CREATED &&
    //    workspace.sysState !== UuAppWorkspace.SYS_STATES.ASSIGNED
    // ) {
    //   const appData = await this.dao.getByAwid(awid);
    //   dtoOut.data = { ...appData, relatedObjectsMap: {} };
    // }

    // HDS 2
    return dtoOut;
  }
}

module.exports = new LoadAbl();
