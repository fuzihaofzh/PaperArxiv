// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

// The esm is used for using import
// ref: https://www.geeksforgeeks.org/how-to-use-an-es6-import-in-node-js/
//require = require("esm")(module);
//module.exports = require("./src/index.js");
require("./src/index.js");
