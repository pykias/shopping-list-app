"use strict";
const { DaoFactory } = require("uu_appg01_server").ObjectStore;
const { UuAppWorkspace } = require("uu_appg01_server").Workspace;
const { AuthenticationService } = require("uu_appg01_server").Authentication;
const { ConsoleClient, ProgressClient } = require("uu_consoleg02-uulib");
const { UuTerrClient: UuTerritoryClient } = require("uu_territory_clientg01");
const Errors = require("../../api/errors/shopping-main-error");
const Warnings = require("../../api/warnings/shopping-main-warning");
const DtoBuilder = require("../../components/dto-builder");
const Validator = require("../../components/validator");
const TerritoryConstants = require("../../constants/territory-constants");
const ScriptEngineClient = require("../../components/script-engine-client");
const StepHandler = require("../../components/step-handler");
const ConsoleConstants = require("../../constants/console-constants");
const ProgressConstants = require("../../constants/progress-constants");
const ShoppingMainConstants = require("../../constants/shopping-main-constants");

class InitRollbackAbl {
  constructor() {
    this.dao = DaoFactory.getDao(ShoppingMainConstants.Schemas.SHOPPING_INSTANCE);
  }

  async initRollback(appUri, configuration, lockSecret) {
    const sysIdentitySession = await AuthenticationService.authenticateSystemIdentity();
    const scriptEngineClient = new ScriptEngineClient({
      scriptEngineUri: configuration.uuScriptEngineBaseUri,
      consoleUri: configuration.uuConsoleBaseUri,
      consoleCode: ShoppingMainConstants.getMainConsoleCode(appUri.getAwid()),
      scriptRepositoryUri: configuration.uuScriptRepositoryBaseUri,
      session: sysIdentitySession,
    });
    const scriptDtoIn = {
      uuShoppingUri: appUri.toString(),
      lockSecret,
    };

    return await scriptEngineClient.runScript({
      scriptCode: "uu_shopping_maing01-uuscriptlib/shopping-main/init-rollback",
      scriptDtoIn,
    });
  }

  async _initFinalizeRollback(uri, dtoIn) {
    // HDS 1
    const awid = uri.getAwid();
    Validator.validateDtoInCustom(uri, dtoIn, "sysUuAppWorkspaceInitFinalizeRollbackDtoInType");

    // HDS 2
    let uuShopping = await this.dao.getByAwid(awid);

    // HDS 3
    if (!uuShopping) {
      // 3.1
      throw new Errors._initFinalizeRollback.UuShoppingDoesNotExist({ awid });
    }

    if (![ShoppingMainConstants.StateMap.BEING_INITIALIZED, ShoppingMainConstants.StateMap.CREATED].includes(uuShopping.state)) {
      // 3.2
      throw new Errors._initFinalizeRollback.NotInProperState({
        state: uuShopping.state,
        expectedStateList: [ShoppingMainConstants.StateMap.BEING_INITIALIZED, ShoppingMainConstants.StateMap.CREATED],
      });
    }

    // HDS 4
    const sysIdentitySession = await AuthenticationService.authenticateSystemIdentity();
    const { uuConsoleUri, progressCode, consoleCode } = uuShopping.temporaryData.progressMap;
    let progressClient = null;
    if (
      !uuShopping.temporaryData.rollbackStepList.includes(ShoppingMainConstants.InitRollbackStepMap.PROGRESS_DELETED.code)
    ) {
      progressClient = await ProgressClient.get(
        uuConsoleUri,
        { code: progressCode, lockSecret: dtoIn.lockSecret },
        { session: sysIdentitySession },
      );
    }
    const stepHandler = new StepHandler({
      schema: ShoppingMainConstants.Schemas.SHOPPING_INSTANCE,
      progressClient,
      stepList: uuShopping.temporaryData.rollbackStepList,
      rollbackMode: true,
    });

    // TODO If your application requires any additional steps, add them here...

    // HDS 5
    if (uuShopping.temporaryData.stepList.includes(ShoppingMainConstants.InitStepMap.CONSOLE_CREATED.code)) {
      uuShopping = await stepHandler.handleStep(
        uuShopping,
        ShoppingMainConstants.InitRollbackStepMap.CONSOLE_CLEARED,
        async () => {
          await this._clearConsole(uuConsoleUri, consoleCode, sysIdentitySession);
        },
      );
    }

    // HDS 6
    if (uuShopping.temporaryData.stepList.includes(ShoppingMainConstants.InitStepMap.WS_CONNECTED.code)) {
      uuShopping = await stepHandler.handleStep(
        uuShopping,
        ShoppingMainConstants.InitRollbackStepMap.WS_DISCONNECTED,
        async () => {
          await UuAppWorkspace.setAuthorizationStrategy(
            uri,
            {
              authorizationStrategy: "roleGroupInterface",
              roleGroupUriMap: {},
            },
            sysIdentitySession,
          );
        },
      );
    }

    // HDS 7
    if (uuShopping.temporaryData.stepList.includes(ShoppingMainConstants.InitStepMap.AWSC_CREATED.code)) {
      await stepHandler.handleStep(uuShopping, ShoppingMainConstants.InitRollbackStepMap.AWSC_DELETED, async () => {
        await this._deleteAwsc(uuShopping, uri, sysIdentitySession);
      });
    }

    // HDS 8
    await stepHandler.handleStep(
      uuShopping,
      ShoppingMainConstants.InitRollbackStepMap.PROGRESS_DELETED,
      async () => {
        try {
          await progressClient.end({
            state: ProgressConstants.StateMap.COMPLETED,
            message: "Rollback finished.",
            doneWork: ShoppingMainConstants.getInitRollbackStepCount(),
          });
        } catch (e) {
          throw new Errors._initFinalizeRollback.ProgressEndCallFailed({}, e);
        }

        try {
          await progressClient.setState({
            state: ProgressConstants.StateMap.CANCELLED,
          });
        } catch (e) {
          throw new Errors._initFinalizeRollback.ProgressSetStateCallFailed({}, e);
        }

        try {
          await progressClient.delete();
        } catch (e) {
          throw new Errors._initFinalizeRollback.ProgressDeleteCallFailed({}, e);
        }
      },
      false,
    );

    // HDS 9
    await this.dao.deleteByAwid(awid);

    // HDS 10
    try {
      await UuAppWorkspace.setAssignedSysState(awid);
    } catch (e) {
      throw new Errors._initFinalizeRollback.SetAssignedSysStateFailed({}, e);
    }

    // HDS 11
    return DtoBuilder.prepareDtoOut();
  }

  async _clearConsole(uuConsoleUri, consoleCode, session) {
    let consoleClient;
    try {
      consoleClient = await ConsoleClient.get(uuConsoleUri, { code: consoleCode }, { session });
    } catch (e) {
      if (e.cause?.code === ConsoleConstants.CONSOLE_GET_DOES_NOT_EXISTS) {
        throw new Errors._initFinalizeRollback.ConsoleGetCallFailed({ code: consoleCode }, e);
      }
    }

    try {
      await consoleClient.clear();
    } catch (e) {
      if (e.cause?.code === ConsoleConstants.CONSOLE_CLEAR_DOES_NOT_EXISTS) {
        DtoBuilder.addWarning(new Warnings._initFinalizeRollback.ConsoleDoesNotExist({ code: consoleCode }));
      } else {
        throw new Errors._initFinalizeRollback.ConsoleClearCallFailed({ code: consoleCode }, e);
      }
    }
  }

  async _deleteAwsc(uuShopping, appUri, session) {
    const appClientOpts = { baseUri: uuShopping.uuTerritoryBaseUri, appUri, session };

    try {
      await UuTerritoryClient.Awsc.setState(
        {
          id: uuShopping.artifactId,
          state: ShoppingMainConstants.StateMap.FINAL,
        },
        appClientOpts,
      );
    } catch (e) {
      let throwError = true;

      switch (e.code) {
        case TerritoryConstants.ARTIFACT_DOES_NOT_EXIST:
          // 5.1.1.
          throwError = false;
          DtoBuilder.addWarning(new Warnings._initFinalizeRollback.UuAwscDoesNotExist());
          break;

        case TerritoryConstants.INVALID_ARTIFACT_STATE:
          if (e.paramMap?.artifactState === ShoppingMainConstants.StateMap.FINAL) {
            // 5.1.2.
            throwError = false;
            DtoBuilder.addWarning(new Warnings._initFinalizeRollback.UuAwscDoesNotExist());
          }
          break;
      }

      if (throwError) {
        // 5.1.3.
        throw new Errors.ShoppingMain.SetAwscStateFailed({}, e);
      }
    }

    try {
      await UuTerritoryClient.Awsc.delete({ id: uuShopping.artifactId }, appClientOpts);
    } catch (e) {
      if (e.code === TerritoryConstants.ARTIFACT_DOES_NOT_EXIST) {
        // 5.2.1.
        DtoBuilder.addWarning(new Warnings._initFinalizeRollback.UuAwscDoesNotExist());
      } else {
        // 5.2.2.
        throw new Errors.ShoppingMain.DeleteAwscFailed({}, e);
      }
    }
  }
}

module.exports = new InitRollbackAbl();
