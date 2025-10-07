import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Костыль для BigInt - один раз и навсегда
BigInt.prototype.toJSON = function () {
  return this.toString();
};

import { gameRouter } from "./modules/games/index.js";

app.use("/api", gameRouter);

app.get("/", (req, res) => {
  res.send("<h1>Главная</h1>");
});

export { app };
