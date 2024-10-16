const { TestHelper } = require("uu_script_devkitg01");

describe("ShoppingMainInit", () => {
  test("HDS", async () => {
    const session = await TestHelper.login();

    const dtoIn = {};

    const result = await TestHelper.runScript("shopping-main/init.js", dtoIn, session);
    expect(result.isError).toEqual(false);
  });
});
