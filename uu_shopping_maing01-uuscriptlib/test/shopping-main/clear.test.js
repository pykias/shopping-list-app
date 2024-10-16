const { TestHelper } = require("uu_script_devkitg01");

describe("ShoppingMainClear", () => {
  test("HDS", async () => {
    const session = await TestHelper.login();

    const dtoIn = {};

    const result = await TestHelper.runScript("shopping-main/clear.js", dtoIn, session);
    expect(result.isError).toEqual(false);
  });
});
