"use strict";
const { DaoFactory } = require("uu_appg01_server").ObjectStore;
const { UuDateTime } = require("uu_i18ng01");

const ShoppingMainUseCaseWarning = require("../api/warnings/shopping-main-use-case-warning");
const DtoBuilder = require("./dto-builder");
const ProgressConstants = require("../constants/progress-constants");
const ConsoleConstants = require("../constants/console-constants");

const TEMP_DATA_KEY = "temporaryData";

class StepHandler {
  constructor({ schema, progressClient, consoleClient, stepList = [], rollbackMode = false }) {
    this.progressClient = progressClient;
    this.consoleClient = consoleClient;
    this.stepList = stepList;
    this.doneWork = stepList.length;
    this.rollbackMode = rollbackMode;
    this.dao = DaoFactory.getDao(schema);
  }

  async handleStep(uuObject, step, stepLogic, progressRequired = true) {
    if (this._isStepLogged(step.code)) {
      return uuObject;
    }

    let result;
    try {
      await stepLogic();
      result = await this.storeStep(uuObject, step, progressRequired);
    } catch (e) {
      await this.storeStepError(uuObject, step, e);
      throw e;
    }
    return result;
  }

  _isStepLogged(stepCode) {
    return this.stepList.includes(stepCode);
  }

  async storeStep(uuObject, step, progressRequired = true) {
    uuObject[TEMP_DATA_KEY][this.rollbackMode ? "rollbackStepList" : "stepList"].push(step.code);
    let updateObject = {
      awid: uuObject.awid,
      id: uuObject.id,
      [TEMP_DATA_KEY]: {
        ...uuObject[TEMP_DATA_KEY],
      },
    };
    updateObject = await this.dao.update(updateObject);
    if (this.progressClient || progressRequired) {
      try {
        await this.progressClient.proceed({
          doneWork: ++this.doneWork,
          message: step.message,
          estimatedNextProgressTs: UuDateTime.now().shiftTime(1000),
          data: {
            control: { stepList: uuObject[TEMP_DATA_KEY].stepList },
            uuObject,
          },
        });
      } catch (e) {
        if (!progressRequired) {
          DtoBuilder.addWarning(new ShoppingMainUseCaseWarning(e.code, e.message, e.parameters));
        } else {
          throw e;
        }
      }
    }
    if (this.consoleClient) {
      await this.consoleClient.logMessage(step.message);
    }
    return updateObject;
  }

  async storeStepError(uuObject, step, error) {
    let updateObject = {
      awid: uuObject.awid,
      id: uuObject.id,
      [TEMP_DATA_KEY]: {
        ...uuObject[TEMP_DATA_KEY],
        error: {
          stepName: step.code,
          code: error.code,
          message: error.message,
          paramMap: error?.paramMap,
        },
      },
    };
    updateObject = await this.dao.update(updateObject);
    try {
      await this.progressClient.end({
        state: ProgressConstants.StateMap.COMPLETED_WITH_ERROR,
      });
    } catch (e) {
      DtoBuilder.addWarning(new ShoppingMainUseCaseWarning(e.code, e.message, e.parameters));
    }
    if (this.consoleClient) {
      try {
        await this.consoleClient.logMessage(error.message, ConsoleConstants.MessageTypeMap.ERROR);
      } catch (e) {
        DtoBuilder.addWarning(new ShoppingMainUseCaseWarning(e.code, e.message, e.parameters));
      }
    }
    return updateObject;
  }
}

module.exports = StepHandler;
