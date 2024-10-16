const { TestHelper } = require("uu_script_devkitg01");

describe("ShoppingMainSetStateClosed", () => {
  test("HDS", async () => {
    const session = await TestHelper.login();

    const dtoIn = {};

    const result = await TestHelper.runScript("shopping-main/set-state-closed.js", dtoIn, session);
    expect(result.isError).toEqual(false);
  });
});
