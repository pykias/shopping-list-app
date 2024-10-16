const Path = require("path");

const devkitConfigPath = require.resolve("uu_appg01_devkit/src/config/.eslintrc-nodejs.js", { paths: [__dirname] });

const config = {
  extends: ["./" + Path.relative(__dirname, devkitConfigPath).replace(/\\/g, "/")],
};

module.exports = config;
