"use strict";
const Crypto = require("crypto");
const { DaoFactory } = require("uu_appg01_server").ObjectStore;
const { UuAppWorkspace } = require("uu_appg01_server").Workspace;
const { AuthenticationService } = require("uu_appg01_server").Authentication;
const { UriBuilder } = require("uu_appg01_server").Uri;
const { UuDateTime } = require("uu_i18ng01");
const { ConsoleClient, ProgressClient } = require("uu_consoleg02-uulib");

const Errors = require("../../api/errors/shopping-main-error");
const Warnings = require("../../api/warnings/shopping-main-warning");
const Validator = require("../../components/validator");
const DtoBuilder = require("../../components/dto-builder");
const ScriptEngineClient = require("../../components/script-engine-client");
const ShoppingMainClient = require("../../components/shopping-main-client");
const StepHandler = require("../../components/step-handler");

const ProgressConstants = require("../../constants/progress-constants");
const ShoppingMainConstants = require("../../constants/shopping-main-constants");
const Configuration = require("../../components/configuration");

const SCRIPT_CODE = "uu_shopping_maing01-uuscriptlib/shopping-main/clear";

class ClearAbl {
  constructor() {
    this.dao = DaoFactory.getDao(ShoppingMainConstants.Schemas.SHOPPING_INSTANCE);
  }

  async clear(uri, dtoIn, session) {
    // HDS 1
    const awid = uri.getAwid();
    Validator.validateDtoIn(uri, dtoIn);

    // HDS 2
    let uuShopping = await this.dao.getByAwid(awid);

    if (uuShopping) {
      if (uuShopping.state !== ShoppingMainConstants.StateMap.FINAL) {
        // 2.1
        throw new Errors.Clear.NotInProperState({
          state: uuShopping.state,
          expectedStateList: [ShoppingMainConstants.StateMap.FINAL],
        });
      }

      if (uuShopping.temporaryData && uuShopping.temporaryData.useCase !== uri.getUseCase()) {
        // 2.2
        throw new Errors.SetStateClosed.UseCaseExecutionForbidden({
          concurrencyUseCase: uuShopping.temporaryData.useCase,
        });
      }
    } else {
      try {
        await UuAppWorkspace.setAssignedSysState(awid);
      } catch (e) {
        // 2.3
        throw new Errors.Clear.SetAssignedSysStateFailed({}, e);
      }

      return DtoBuilder.prepareDtoOut({ progressMap: {} });
    }

    // HDS 3
    const configuration = await Configuration.getUuSubAppConfiguration({
      awid,
      artifactId: uuShopping.artifactId,
      uuTerritoryBaseUri: uuShopping.uuTerritoryBaseUri,
    });

    // HDS 4
    const sysIdentitySession = await AuthenticationService.authenticateSystemIdentity();
    const lockSecret = Crypto.randomBytes(32).toString("hex");
    const progressClient = await this._createClearProgress(
      uuShopping,
      dtoIn,
      configuration,
      lockSecret,
      sysIdentitySession,
    );

    // HDS 5
    if (!uuShopping.temporaryData) {
      uuShopping = await this.dao.updateByAwid({
        awid,
        temporaryData: {
          useCase: uri.getUseCase(),
          dtoIn: dtoIn.data,
          stepList: [ShoppingMainConstants.ClearStepMap.CLEAR_STARTED.code],
          progressMap: {
            progressCode: progressClient.progress.code,
            uuConsoleUri: configuration.uuConsoleBaseUri,
            consoleCode: ShoppingMainConstants.getMainConsoleCode(awid),
          },
        },
      });
    }

    if (uuShopping.temporaryData.stepList.includes(ShoppingMainConstants.ClearStepMap.CONSOLE_CLEARED.code)) {
      await this._clearFinalize(uri, { lockSecret }, session);
    } else {
      // TODO If your application requires any additional steps, add them here...
  
      // HDS 6
      await this._runScript(
        uri.getBaseUri(),
        dtoIn,
        configuration,
        progressClient.progress.lockSecret,
        sysIdentitySession,
      );
    }

    // HDS 7
    return DtoBuilder.prepareDtoOut({ data: uuShopping });
  }

  async _clearFinalize(uri, dtoIn, session) {
    // HDS 1
    const awid = uri.getAwid();
    Validator.validateDtoInCustom(uri, dtoIn, "sysUuAppWorkspaceInitFinalizeDtoInType");

    // HDS 2
    let uuShopping = await this.dao.getByAwid(awid);

    if (!uuShopping) {
      // 2.1
      throw new Errors._clearFinalize.UuShoppingDoesNotExist({ awid });
    }

    if (uuShopping.state !== ShoppingMainConstants.StateMap.FINAL) {
      // 2.2
      throw new Errors._clearFinalize.NotInProperState({
        state: uuShopping.state,
        expectedStateList: [ShoppingMainConstants.StateMap.FINAL],
      });
    }

    if (!uuShopping.temporaryData) {
      // 2.3
      throw new Errors._clearFinalize.MissingRequiredData();
    }

    if (uuShopping.temporaryData && uuShopping.temporaryData.useCase !== "sys/uuAppWorkspace/clear") {
      // 2.4
      throw new Errors._clearFinalize.UseCaseExecutionForbidden({
        concurrencyUseCase: uuShopping.temporaryData.useCase,
      });
    }

    // HDS 3
    const sysIdentitySession = await AuthenticationService.authenticateSystemIdentity();
    const progress = {
      code: ShoppingMainConstants.getClearProgressCode(uuShopping.awid),
      lockSecret: dtoIn.lockSecret,
    };
    let progressClient = null;
    if (!uuShopping.temporaryData.stepList.includes(ShoppingMainConstants.ClearStepMap.PROGRESS_ENDED.code)) {
      progressClient = await ProgressClient.get(uuShopping.temporaryData.progressMap.uuConsoleUri, progress, {
        session: sysIdentitySession,
      });
    }
    const stepHandler = new StepHandler({
      schema: ShoppingMainConstants.Schemas.SHOPPING_INSTANCE,
      progressClient,
      stepList: uuShopping.temporaryData.stepList,
    });

    // TODO If your application requires any additional steps, add them here...

    // HDS 5
    uuShopping = await stepHandler.handleStep(uuShopping, ShoppingMainConstants.ClearStepMap.INIT_PROGRESS_DELETED, async () => {
      await this._deleteProgress(
        ShoppingMainConstants.getInitProgressCode(awid),
        uuShopping.temporaryData.progressMap.uuConsoleUri,
        sysIdentitySession,
      );
    });

    // HDS 6
    uuShopping = await stepHandler.handleStep(
      uuShopping,
      ShoppingMainConstants.ClearStepMap.SET_STATE_CLOSED_PROGRESS_DELETED,
      async () => {
        await this._deleteProgress(
          ShoppingMainConstants.getSetStateClosedProgressCode(awid),
          uuShopping.temporaryData.progressMap.uuConsoleUri,
          sysIdentitySession,
        );
      },
    );

    // HDS 7
    uuShopping = await stepHandler.handleStep(uuShopping, ShoppingMainConstants.ClearStepMap.CONSOLE_CLEARED, async () => {
      await this._clearConsole(
        uuShopping.temporaryData.progressMap.uuConsoleUri,
        ShoppingMainConstants.getMainConsoleCode(awid),
        sysIdentitySession,
      );
    });

    // HDS 8
    uuShopping = await stepHandler.handleStep(uuShopping, ShoppingMainConstants.ClearStepMap.PROGRESS_AUTH_STRATEGY_SET, async () => {
      await this._setClearProgressAuthorizationStrategy(
        uuShopping.temporaryData.progressMap.uuConsoleUri,
        uuShopping.temporaryData.progressMap.progressCode,
        awid,
        uuShopping.temporaryData.dtoIn.awidInitiatorList,
        sysIdentitySession,
      );
    });

    // HDS 9
    uuShopping = await stepHandler.handleStep(uuShopping, ShoppingMainConstants.ClearStepMap.AUTH_STRATEGY_SET, async () => {
      await UuAppWorkspace.setAuthorizationStrategy(
        uri,
        {
          authorizationStrategy: "roleGroupInterface",
          roleGroupUriMap: {},
        },
        session,
      );
    });

    // HDS 10
    uuShopping = await stepHandler.handleStep(uuShopping, ShoppingMainConstants.ClearStepMap.AWSC_DELETED, async () => {
      const shoppingMainClient = new ShoppingMainClient(uuShopping, uuShopping.uuTerritoryBaseUri);
      await shoppingMainClient.deleteAwsc();
    });

    // HDS 11
    uuShopping = await stepHandler.handleStep(
      uuShopping,
      ShoppingMainConstants.ClearStepMap.PROGRESS_ENDED,
      async () => {
        await progressClient.end({
          state: ProgressConstants.StateMap.COMPLETED,
          message: "Clear finished.",
          expireAt: UuDateTime.now().shiftDay(1),
          doneWork: ShoppingMainConstants.getSetStateClosedStepCount(),
        });
      },
      false,
    );

    // HDS 12
    if (uuShopping.temporaryData.dtoIn.awidInitiatorList) {
      await UuAppWorkspace.reassign({
        awid,
        awidInitiatorList: uuShopping.temporaryData.dtoIn.awidInitiatorList,
      });
    }

    // HDS 13
    await this.dao.deleteByAwid(awid);

    // HDS 14
    try {
      await UuAppWorkspace.setAssignedSysState(awid);
    } catch (e) {
      throw new Errors._clearFinalize.SetAssignedSysStateFailed({}, e);
    }

    // HDS 15
    return DtoBuilder.prepareDtoOut();
  }

  _parseTerritoryUri(locationUri) {
    let uuTerritoryUri;

    try {
      uuTerritoryUri = UriBuilder.parse(locationUri);
    } catch (e) {
      throw new Errors.Clear.UuTLocationUriParseFailed({ uri: locationUri }, e);
    }

    return uuTerritoryUri;
  }

  async _createClearProgress(uuShopping, dtoIn, config, lockSecret, session) {
    const uuTerritoryUri = this._parseTerritoryUri(uuShopping.uuTerritoryBaseUri);

    let progressClient;
    let progress = {
      expireAt: UuDateTime.now().shiftDay(7),
      name: ShoppingMainConstants.getClearProgressName(uuShopping.awid),
      code: ShoppingMainConstants.getClearProgressCode(uuShopping.awid),
      authorizationStrategy: "boundArtifact",
      boundArtifactUri: uuTerritoryUri.setParameter("id", uuShopping.artifactId).toUri().toString(),
      boundArtifactPermissionMatrix: ShoppingMainConstants.CONSOLE_BOUND_MATRIX,
      lockSecret,
    };

    try {
      progressClient = await ProgressClient.get(config.uuConsoleBaseUri, { code: progress.code }, { session });
    } catch (e) {
      if (e.cause?.code !== ProgressConstants.PROGRESS_DOES_NOT_EXIST) {
        throw new Errors.Clear.ProgressGetCallFailed({ code: progress.code }, e);
      }
    }

    if (!progressClient) {
      try {
        progressClient = await ProgressClient.createInstance(config.uuConsoleBaseUri, progress, { session });
      } catch (e) {
        throw new Errors.Clear.ProgressCreateCallFailed({ code: progress.code }, e);
      }
    } else if (dtoIn.force) {
      try {
        await progressClient.releaseLock();
      } catch (e) {
        if (e.cause?.code !== ProgressConstants.PROGRESS_RELEASE_DOES_NOT_EXIST) {
          throw new Errors.Clear.ProgressReleaseLockCallFailed({ code: progress.code }, e);
        }
      }

      try {
        await progressClient.setState({ state: "cancelled" });
      } catch (e) {
        DtoBuilder.addWarning(new Warnings.Clear.ProgressSetStateCallFailed(e.cause?.paramMap));
      }

      try {
        await progressClient.delete();
      } catch (e) {
        if (e.cause?.code !== ProgressConstants.PROGRESS_DELETE_DOES_NOT_EXIST) {
          throw new Errors.Clear.ProgressDeleteCallFailed({ code: progress.code }, e);
        }
      }

      try {
        progressClient = await ProgressClient.createInstance(config.uuConsoleBaseUri, progress, { session });
      } catch (e) {
        throw new Errors.Clear.ProgressCreateCallFailed({ code: progress.code }, e);
      }
    }

    try {
      await progressClient.start({
        message: "Progress was started",
        totalWork: ShoppingMainConstants.getClearStepCount(),
        lockSecret,
      });
    } catch (e) {
      throw new Errors.Clear.ProgressStartCallFailed({ code: progress.code }, e);
    }

    return progressClient;
  }

  async _setClearProgressAuthorizationStrategy(uuConsoleBaseUri, progressCode, awid, awidInitiatorList, session) {
    let progressClient;

    try {
      progressClient = await ProgressClient.get(uuConsoleBaseUri, { code: progressCode }, { session });
    } catch (e) {
      if (e.cause?.code === ProgressConstants.PROGRESS_DOES_NOT_EXIST) {
        return;
      } else {
        throw new Errors._clearFinalize.ProgressGetCallFailed({ code: progressCode }, e);
      }
    }

    try {
      await progressClient.setAuthorizationStrategy({
        authorizationStrategy: "uuIdentityList",
        permissionMap: await this._getClearProgressPermissionMap(awid, awidInitiatorList, session),
        force: true,
      });
    } catch (e) {
      if (e.cause?.code !== ProgressConstants.PROGRESS_HAS_SAME_AUTH_STRATEGY) {
        throw new Errors._clearFinalize.ProgressSetAuthorizationStrategyCallFailed({ code: progressCode }, e);
      }
    }
  }

  async _getClearProgressPermissionMap(awid, awidInitiatorList, sysIdentitySession) {
    const awidData = await UuAppWorkspace.get(awid);

    let permissionMap = {};
    for (let identity of Array.from(new Set([...awidData.awidInitiatorList, ...awidInitiatorList]))) {
      permissionMap[identity] = ShoppingMainConstants.CONSOLE_BOUND_MATRIX.Authorities;
    }
    permissionMap[sysIdentitySession.getIdentity().getUuIdentity()] =
      ShoppingMainConstants.CONSOLE_BOUND_MATRIX.Authorities;

    return permissionMap;
  }

  async _deleteProgress(progressCode, uuConsoleBaseUri, session) {
    let progressClient;

    try {
      progressClient = await ProgressClient.get(uuConsoleBaseUri, { code: progressCode }, { session });
    } catch (e) {
      if (e.cause?.code === ProgressConstants.PROGRESS_DOES_NOT_EXIST) {
        return;
      } else {
        throw new Errors.Clear.ProgressGetCallFailed({ code: progressCode }, e);
      }
    }

    try {
      await progressClient.setState({ state: "final" });
      await progressClient.delete();
    } catch (e) {
      DtoBuilder.addWarning(new Warnings._clearFinalize.FailedToDeleteProgress(e.parameters));
    }
  }

  async _clearConsole(uuConsoleBaseUri, consoleCode, session) {
    const consoleClient = new ConsoleClient(uuConsoleBaseUri, { code: consoleCode }, { session });

    try {
      await consoleClient.clear();
    } catch (e) {
      DtoBuilder.addWarning(new Warnings._clearFinalize.FailedToClearConsole({ code: consoleCode }));
    }
  }

  async _runScript(appUri, dtoIn, configuration, lockSecret, session) {
    const scriptEngineClient = new ScriptEngineClient({
      scriptEngineUri: configuration.uuScriptEngineBaseUri,
      consoleUri: configuration.uuConsoleBaseUri,
      consoleCode: ShoppingMainConstants.getMainConsoleCode(appUri.getAwid()),
      scriptRepositoryUri: configuration.uuScriptRepositoryBaseUri,
      session,
    });

    const scriptDtoIn = {
      uuShoppingUri: appUri.toString(),
      awidInitiatorList: dtoIn.data.awidInitiatorList,
      lockSecret,
    };

    await scriptEngineClient.runScript({ scriptCode: SCRIPT_CODE, scriptDtoIn });
  }
}

module.exports = new ClearAbl();
