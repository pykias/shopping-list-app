"use strict";

//@@viewOn:constants
const ShoppingMainConstants = {
  AWSC_PREFIX: "uu-shopping",
  CONSOLE_PREFIX: "shopping",
  ERROR_PREFIX: "uu-shopping-main",
  INIT_PROGRESS_CODE_PREFIX: "uu-shopping-maing01-progress-init-",
  INIT_PROGRESS_NAME_PREFIX: "uuShopping Init ",
  SET_STATE_CLOSED_PROGRESS_CODE_PREFIX: "uu-shopping-maing01-progress-setStateClosed-",
  SET_STATE_CLOSED_PROGRESS_NAME_PREFIX: "uuShopping Set State Closed ",
  CLEAR_PROGRESS_CODE_PREFIX: "uu-shopping-maing01-progress-clear-",
  CLEAR_PROGRESS_NAME_PREFIX: "uuShopping Clear ",
  UUAPP_CODE: "uu-shopping-maing01",

  CONFIG_CACHE_KEY: "configuration",
  UU_APP_ERROR_MAP: "uuAppErrorMap",

  // This is bound matrix of uuAwsc and uuConsole which has authorization bounded to that uuAwsc.
  CONSOLE_BOUND_MATRIX: {
    Authorities: ["Authorities", "Readers", "Writers"],
    Operatives: ["Readers", "Writers"],
    Auditors: ["Readers"],
    SystemIdentity: ["Authorities", "Readers", "Writers"],
  },

  InitStepMap: {
    SHOPPING_OBJECT_CREATED: { code: "uuShoppingObjectCreated", message: "The uuObject of uuShopping created." },
    AWSC_CREATED: { code: "uuAwscCreated", message: "The uuAwsc of uuShopping created." },
    WS_CONNECTED: { code: "uuAppWorkspaceConnected", message: "The uuShopping uuAppWorkspace connected." },
    CONSOLE_CREATED: { code: "consoleCreated", message: "The console of uuShopping created." },
    PROGRESS_ENDED: { code: "progressEnded", message: "The progress has been ended." },
    WS_ACTIVE: { code: "uuAppWorkspaceActiveState", message: "The uuAppWorkspace of uuShopping set to active state." },
  },

  InitRollbackStepMap: {
    CONSOLE_CLEARED: { code: "consoleCleared", message: "The uuShopping console has been cleared." },
    WS_DISCONNECTED: { code: "uuAppWorkspaceDisonnected", message: "The uuShopping uuAppWorkspace disconnected." },
    AWSC_DELETED: { code: "uuAwscDeleted", message: "The uuAwsc of uuShopping deleted." },
    PROGRESS_DELETED: { code: "progressDeleted", message: "The progress has been deleted." },
  },

  SetStateClosedStepMap: {
    CLOSE_STARTED: { code: "setStateClosedStarted", message: "SetStateClosed has started." },
    AWSC_CLOSED: { code: "uuAwscClosed", message: "The uuObject of uuShopping set to closed state." },
    PROGRESS_ENDED: { code: "progressEnded", message: "The progress has been ended." },
  },

  ClearStepMap: {
    CLEAR_STARTED: { code: "clearStarted", message: "Clear has started." },
    INIT_PROGRESS_DELETED: { code: "initProgressDeleted", message: "The init progress has been deleted." },
    SET_STATE_CLOSED_PROGRESS_DELETED: {
      code: "setStateClosedProgressDeleted",
      message: "The setStateClosed progress has been deleted.",
    },
    CONSOLE_CLEARED: { code: "consoleCleared", message: "The uuShopping console has been cleared." },
    PROGRESS_AUTH_STRATEGY_SET: {
      code: "progressAuthorizationStrategySet",
      message: "The authorization strategy of progress has been set to roleGroupInterface.",
    },
    AUTH_STRATEGY_SET: {
      code: "authorizationStrategySet",
      message: "The authorization strategy has been set to roleGroupInterface.",
    },
    AWSC_DELETED: { code: "uuAwscDeleted", message: "The uuAwsc of uuShopping deleted." },
    PROGRESS_ENDED: { code: "progressEnded", message: "The progress has been ended." },
  },

  ModeMap: {
    STANDARD: "standard",
    RETRY: "retry",
    ROLLBACK: "rollback",
  },

  ProfileMask: {
    STANDARD_USER: parseInt("00010000000000000000000000000000", 2),
  },

  PropertyMap: {
    CONFIG: "config",
    SCRIPT_CONFIG: "scriptConfig",
    SHOPPING_CONFIG: "uuShoppingConfig",
  },

  Schemas: {
    SHOPPING_INSTANCE: "shoppingMain",
  },

  SharedResources: {
    SCRIPT_CONSOLE: "uu-console-maing02",
    SCRIPT_ENGINE: "uu-script-engineg02",
  },

  StateMap: {
    CREATED: "created",
    BEING_INITIALIZED: "beingInitialized",
    ACTIVE: "active",
    FINAL: "closed",
  },

  getMainConsoleCode: (awid) => {
    return `uu-shopping-maing01-console-${awid}`;
  },

  getInitProgressCode: (awid) => {
    return `${ShoppingMainConstants.INIT_PROGRESS_CODE_PREFIX}${awid}`;
  },

  getInitProgressName: (awid) => {
    return `${ShoppingMainConstants.INIT_PROGRESS_NAME_PREFIX}${awid}`;
  },

  getSetStateClosedProgressName: (awid) => {
    return `${ShoppingMainConstants.SET_STATE_CLOSED_PROGRESS_NAME_PREFIX}${awid}`;
  },

  getSetStateClosedProgressCode: (awid) => {
    return `${ShoppingMainConstants.SET_STATE_CLOSED_PROGRESS_CODE_PREFIX}${awid}`;
  },

  getClearProgressName: (awid) => {
    return `${ShoppingMainConstants.CLEAR_PROGRESS_NAME_PREFIX}${awid}`;
  },

  getClearProgressCode: (awid) => {
    return `${ShoppingMainConstants.CLEAR_PROGRESS_CODE_PREFIX}${awid}`;
  },

  getInitStepCount: () => {
    return Object.keys(ShoppingMainConstants.InitStepMap).length;
  },

  getInitRollbackStepCount: () => {
    return Object.keys(ShoppingMainConstants.InitRollbackStepMap).length;
  },

  getSetStateClosedStepCount: () => {
    return Object.keys(ShoppingMainConstants.SetStateClosedStepMap).length;
  },

  getClearStepCount: () => {
    return Object.keys(ShoppingMainConstants.ClearStepMap).length;
  },
};
//@@viewOff:constants

//@@viewOn:exports
module.exports = ShoppingMainConstants;
//@@viewOff:exports
