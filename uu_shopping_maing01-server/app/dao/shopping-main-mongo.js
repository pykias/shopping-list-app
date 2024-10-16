"use strict";
const { UuObjectDao } = require("uu_appg01_server").ObjectStore;

class ShoppingMainMongo extends UuObjectDao {
  async createSchema() {
    await super.createIndex({ awid: 1 }, { unique: true });
  }

  async create(uuObject) {
    return await super.insertOne(uuObject);
  }

  async getByAwid(awid) {
    return await super.findOne({ awid });
  }

  async update(uuObject) {
    let filter = {
      awid: uuObject.awid,
      id: uuObject.id,
    };
    return await super.findOneAndUpdate(filter, uuObject, "NONE");
  }

  async updateByAwid(uuObject) {
    let filter = {
      awid: uuObject.awid,
    };
    return await super.findOneAndUpdate(filter, uuObject, "NONE");
  }

  async deleteByAwid(awid) {
    return await super.deleteOne({ awid });
  }
}

module.exports = ShoppingMainMongo;
