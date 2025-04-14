import { Router } from "express";

import carRoutes from "./transcations.routes.js";

const router = Router();

router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  if (req.headers?.accept === "application/json") {
    next();
  } else {
    res
      .status(400)
      .json({ ERROR: "Incorrect header please send application/json" });
  }
});

// Authentication routes
router.use("/nft", carRoutes);



export default router;
