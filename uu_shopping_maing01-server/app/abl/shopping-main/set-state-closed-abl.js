"use strict";
const Crypto = require("crypto");
const { DaoFactory } = require("uu_appg01_server").ObjectStore;
const { AuthenticationService } = require("uu_appg01_server").Authentication;
const { UriBuilder } = require("uu_appg01_server").Uri;
const { UuDateTime } = require("uu_i18ng01");
const { ProgressClient } = require("uu_consoleg02-uulib");

const Errors = require("../../api/errors/shopping-main-error");
const Warnings = require("../../api/warnings/shopping-main-warning");
const Validator = require("../../components/validator");
const DtoBuilder = require("../../components/dto-builder");
const ScriptEngineClient = require("../../components/script-engine-client");
const ShoppingMainClient = require("../../components/shopping-main-client");
const StepHandler = require("../../components/step-handler");

const ProgressConstants = require("../../constants/progress-constants");
const ShoppingMainConstants = require("../../constants/shopping-main-constants");
const TerritoryConstants = require("../../constants/territory-constants");
const Configuration = require("../../components/configuration");

const SCRIPT_CODE = "uu_shopping_maing01-uuscriptlib/shopping-main/set-state-closed";

class SetStateClosedAbl {
  constructor() {
    this.dao = DaoFactory.getDao(ShoppingMainConstants.Schemas.SHOPPING_INSTANCE);
  }

  async setStateClosed(uri, dtoIn) {
    // HDS 1
    const awid = uri.getAwid();
    Validator.validateDtoIn(uri, dtoIn);

    // HDS 2
    let uuShopping = await this.dao.getByAwid(awid);

    if (!uuShopping) {
      // 2.1
      throw new Errors.SetStateClosed.UuShoppingDoesNotExist({ awid });
    }

    if (uuShopping.state !== ShoppingMainConstants.StateMap.ACTIVE) {
      // 2.2
      throw new Errors.SetStateClosed.NotInProperState({
        state: uuShopping.state,
        expectedStateList: [ShoppingMainConstants.StateMap.ACTIVE],
      });
    }

    if (uuShopping.temporaryData && uuShopping.temporaryData.useCase !== uri.getUseCase()) {
      // 2.3
      throw new Errors.SetStateClosed.UseCaseExecutionForbidden({
        concurrencyUseCase: uuShopping.temporaryData.useCase,
      });
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
    const progressClient = await this._createSetStateClosedProgress(
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
          dtoIn: {},
          stepList: [ShoppingMainConstants.SetStateClosedStepMap.CLOSE_STARTED.code],
          progressMap: {
            progressCode: progressClient.progress.code,
            uuConsoleUri: configuration.uuConsoleBaseUri,
            consoleCode: ShoppingMainConstants.getMainConsoleCode(awid),
          },
        },
      });
    }

    // TODO If your application requires any additional steps, add them here...

    // HDS 6
    await this._runScript(uri.getBaseUri(), configuration, progressClient.progress.lockSecret, sysIdentitySession);

    // HDS 7
    return DtoBuilder.prepareDtoOut({ data: uuShopping });
  }

  async _setStateClosedFinalize(uri, dtoIn) {
    // HDS 1
    const awid = uri.getAwid();
    Validator.validateDtoInCustom(uri, dtoIn, "sysUuAppWorkspaceSetStateClosedFinalizeDtoInType");

    // HDS 2
    let uuShopping = await this.dao.getByAwid(awid);

    if (!uuShopping) {
      // 2.1
      throw new Errors._setStateClosedFinalize.UuShoppingDoesNotExist({ awid });
    }

    if (!uuShopping.state === ShoppingMainConstants.StateMap.ACTIVE) {
      // 2.2
      throw new Errors._setStateClosedFinalize.NotInProperState({
        state: uuShopping.state,
        expectedStateList: [ShoppingMainConstants.StateMap.ACTIVE],
      });
    }

    if (!uuShopping.temporaryData) {
      // 2.3
      throw new Errors._setStateClosedFinalize.MissingRequiredData();
    }

    if (uuShopping.temporaryData && uuShopping.temporaryData.useCase !== "sys/uuAppWorkspace/setStateClosed") {
      // 2.4
      throw new Errors._setStateClosedFinalize.UseCaseExecutionForbidden({
        concurrencyUseCase: uuShopping.temporaryData.useCase,
      });
    }

    // HDS 3
    const sysIdentitySession = await AuthenticationService.authenticateSystemIdentity();
    const progress = {
      code: ShoppingMainConstants.getSetStateClosedProgressCode(uuShopping.awid),
      lockSecret: dtoIn.lockSecret,
    };
    let progressClient = null;
    if (!uuShopping.temporaryData.stepList.includes(ShoppingMainConstants.SetStateClosedStepMap.PROGRESS_ENDED.code)) {
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

    // HDS 4
    uuShopping = await stepHandler.handleStep(uuShopping, ShoppingMainConstants.SetStateClosedStepMap.AWSC_CLOSED, async () => {
      const shoppingMainClient = new ShoppingMainClient(uuShopping, uuShopping.uuTerritoryBaseUri);
      try {
        await shoppingMainClient.setAwscState(ShoppingMainConstants.StateMap.FINAL);
      } catch (e) {
        if (e.cause?.code !== TerritoryConstants.INVALID_ARTIFACT_STATE) {
          throw e;
        } else {
          DtoBuilder.addWarning(new Warnings._setStateClosedFinalize.AwscAlreadyInFinalState());
        }
      }
    });

    // HDS 5
    uuShopping = await stepHandler.handleStep(
      uuShopping,
      ShoppingMainConstants.SetStateClosedStepMap.PROGRESS_ENDED,
      async () => {
        await progressClient.end({
          state: ProgressConstants.StateMap.COMPLETED,
          message: "Setting closed state finished.",
          expireAt: UuDateTime.now().shiftDay(7),
          doneWork: ShoppingMainConstants.getSetStateClosedStepCount(),
        });
      },
      false,
    );

    // HDS 6
    uuShopping = await this.dao.updateByAwid({
      awid,
      state: ShoppingMainConstants.StateMap.FINAL,
      temporaryData: null,
    });

    // HDS 7
    return DtoBuilder.prepareDtoOut();
  }

  _parseTerritoryUri(locationUri) {
    let uuTerritoryUri;

    try {
      uuTerritoryUri = UriBuilder.parse(locationUri);
    } catch (e) {
      throw new Errors.SetStateClosed.UuTLocationUriParseFailed({ uri: locationUri }, e);
    }

    return uuTerritoryUri;
  }

  async _createSetStateClosedProgress(uuShopping, dtoIn, config, lockSecret, session) {
    const uuTerritoryUri = this._parseTerritoryUri(uuShopping.uuTerritoryBaseUri);

    let progressClient;
    let progress = {
      expireAt: UuDateTime.now().shiftDay(7),
      name: ShoppingMainConstants.getSetStateClosedProgressName(uuShopping.awid),
      code: ShoppingMainConstants.getSetStateClosedProgressCode(uuShopping.awid),
      authorizationStrategy: "boundArtifact",
      boundArtifactUri: uuTerritoryUri.setParameter("id", uuShopping.artifactId).toUri().toString(),
      boundArtifactPermissionMatrix: ShoppingMainConstants.CONSOLE_BOUND_MATRIX,
      lockSecret,
    };

    try {
      progressClient = await ProgressClient.get(config.uuConsoleBaseUri, { code: progress.code }, { session });
    } catch (e) {
      if (e.cause?.code !== ProgressConstants.PROGRESS_DOES_NOT_EXIST) {
        throw new Errors.SetStateClosed.ProgressGetCallFailed({ code: progress.code }, e);
      }
    }

    if (!progressClient) {
      try {
        progressClient = await ProgressClient.createInstance(config.uuConsoleBaseUri, progress, { session });
      } catch (e) {
        throw new Errors.SetStateClosed.ProgressCreateCallFailed({ code: progress.code }, e);
      }
    } else if (dtoIn.force) {
      try {
        await progressClient.releaseLock();
      } catch (e) {
        if (e.cause?.code !== ProgressConstants.PROGRESS_RELEASE_DOES_NOT_EXIST) {
          throw new Errors.SetStateClosed.ProgressReleaseLockCallFailed({ code: progress.code }, e);
        }
      }

      try {
        await progressClient.setState({ state: "cancelled" });
      } catch (e) {
        DtoBuilder.addWarning(new Warnings.SetStateClosed.ProgressSetStateCallFailed(e.cause?.paramMap));
      }

      try {
        await progressClient.delete();
      } catch (e) {
        if (e.cause?.code !== ProgressConstants.PROGRESS_DELETE_DOES_NOT_EXIST) {
          throw new Errors.SetStateClosed.ProgressDeleteCallFailed({ code: progress.code }, e);
        }
      }

      try {
        progressClient = await ProgressClient.createInstance(config.uuConsoleBaseUri, progress, { session });
      } catch (e) {
        throw new Errors.SetStateClosed.ProgressCreateCallFailed({ code: progress.code }, e);
      }
    }

    try {
      await progressClient.start({
        message: "Progress was started",
        totalWork: ShoppingMainConstants.getSetStateClosedStepCount(),
        lockSecret,
      });
    } catch (e) {
      throw new Errors.SetStateClosed.ProgressStartCallFailed({ code: progress.code }, e);
    }

    return progressClient;
  }

  async _runScript(appUri, configuration, lockSecret, session) {
    const scriptEngineClient = new ScriptEngineClient({
      scriptEngineUri: configuration.uuScriptEngineBaseUri,
      consoleUri: configuration.uuConsoleBaseUri,
      consoleCode: ShoppingMainConstants.getMainConsoleCode(appUri.getAwid()),
      scriptRepositoryUri: configuration.uuScriptRepositoryBaseUri,
      session,
    });

    const scriptDtoIn = {
      uuShoppingUri: appUri.toString(),
      lockSecret,
    };

    await scriptEngineClient.runScript({ scriptCode: SCRIPT_CODE, scriptDtoIn });
  }
}

module.exports = new SetStateClosedAbl();
