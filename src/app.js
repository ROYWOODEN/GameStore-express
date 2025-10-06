const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Костыль для BigInt - один раз и навсегда
BigInt.prototype.toJSON = function () {
  return this.toString();
};




module.exports = app;
