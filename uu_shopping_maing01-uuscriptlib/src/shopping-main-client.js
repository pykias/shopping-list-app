const AppClient = require("uu_appg01_server").AppClient;
const { UseCaseError } = require("uu_appg01_server").AppServer;

const { session, dtoOut } = scriptContext;

/*@@viewOn:names*/
const Names = {
  SCRIPT_LIB_NAME: "uu_shopping_maing01-uuscriptlib",
  CLASS_NAME: "ShoppingMainClient",
};
/*@@viewOff:names*/

/*@@viewOn:errors*/
const Errors = {
  ERROR_PREFIX: `${Names.SCRIPT_LIB_NAME}/${Names.CLASS_NAME}/`,

  LoadUuShoppingFailed: class extends UseCaseError {
    constructor(paramMap, cause) {
      super({ dtoOut, paramMap, status: 400 }, cause);
      this.message = "Calling sys/uuAppWorkspace/load failed.";
      this.code = `${Errors.ERROR_PREFIX}loadUuShoppingFailed`;
    }
  },

  GetUuShoppingFailed: class extends UseCaseError {
    constructor(paramMap, cause) {
      super({ dtoOut, paramMap, status: 400 }, cause);
      this.message = "Calling sys/uuAppWorkspace/get failed.";
      this.code = `${Errors.ERROR_PREFIX}getUuShoppingFailed`;
    }
  },

  InitFinalizeFailed: class extends UseCaseError {
    constructor(paramMap, cause) {
      super({ dtoOut, paramMap, status: 400 }, cause);
      this.message = "Calling sys/uuAppWorkspace/_initFinalize failed.";
      this.code = `${Errors.ERROR_PREFIX}initFinalizeFailed`;
    }
  },

  InitFinalizeRollbackFailed: class extends UseCaseError {
    constructor(paramMap, cause) {
      super({ dtoOut, paramMap, status: 400 }, cause);
      this.message = "Calling sys/uuAppWorkspace/_initFinalizeRollback failed.";
      this.code = `${Errors.ERROR_PREFIX}initFinalizeRollbackFailed`;
    }
  },

  SetStateClosedFinalizeFailed: class extends UseCaseError {
    constructor(paramMap, cause) {
      super({ dtoOut, paramMap, status: 400 }, cause);
      this.message = "Calling sys/uuAppWorkspace/_setStateClosedFinalize failed.";
      this.code = `${Errors.ERROR_PREFIX}setStateClosedFinalizeFailed`;
    }
  },

  ClearFinalizeFailed: class extends UseCaseError {
    constructor(paramMap, cause) {
      super({ dtoOut, paramMap, status: 400 }, cause);
      this.message = "Calling sys/uuAppWorkspace/_clearFinalize failed.";
      this.code = `${Errors.ERROR_PREFIX}clearFinalizeFailed`;
    }
  },
};

/*@@viewOff:errors*/

class ShoppingMainClient {
  constructor(baseUri) {
    this.appClient = new AppClient({ baseUri, session });
    // base uri can be used as parameter in error
    this.baseUri = baseUri;
  }

  async load() {
    let shopping;
    try {
      shopping = await this.appClient.cmdGet("sys/uuAppWorkspace/load");
    } catch (e) {
      throw new Errors.LoadUuShoppingFailed({ baseUri: this.baseUri }, e);
    }
    return shopping;
  }

  async get() {
    let shopping;
    try {
      shopping = await this.appClient.cmdGet("sys/uuAppWorkspace/get");
    } catch (e) {
      throw new Errors.GetUuShoppingFailed({ baseUri: this.baseUri }, e);
    }
    return shopping;
  }

  async initFinalize(lockSecret) {
    let shopping;
    try {
      shopping = await this.appClient.cmdPost("sys/uuAppWorkspace/_initFinalize", { lockSecret });
    } catch (e) {
      throw new Errors.InitFinalizeFailed({ baseUri: this.baseUri }, e);
    }
    return shopping;
  }

  async initFinalizeRollback(lockSecret) {
    let shopping;
    try {
      shopping = await this.appClient.cmdPost("sys/uuAppWorkspace/_initFinalizeRollback", { lockSecret });
    } catch (e) {
      throw new Errors.InitFinalizeRollbackFailed({ baseUri: this.baseUri }, e);
    }
    return shopping;
  }

  async setStateClosedFinalize(lockSecret) {
    let shopping;
    try {
      shopping = await this.appClient.cmdPost("sys/uuAppWorkspace/_setStateClosedFinalize", { lockSecret });
    } catch (e) {
      throw new Errors.SetStateClosedFinalizeFailed({ baseUri: this.baseUri }, e);
    }
    return shopping;
  }

  async clearFinalize(lockSecret) {
    let shopping;
    try {
      shopping = await this.appClient.cmdPost("sys/uuAppWorkspace/_clearFinalize", { lockSecret });
    } catch (e) {
      throw new Errors.ClearFinalizeFailed({ baseUri: this.baseUri }, e);
    }
    return shopping;
  }
}

module.exports = ShoppingMainClient;
