import { Router } from "express";
import {
  createCollection,
  getAllCollections,
  getSingleCollection,
  getCollectionsByOwner,
  updateCollection
} from "../controllers/cars/profiles.controller.js";
const collectionRouter = Router();

// Preflight OPTIONS support for all main endpoints
collectionRouter.route("/").options((req, res) => {
  res.setHeader('Allow', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.sendStatus(200);
});

collectionRouter.route("/create").post(createCollection);
collectionRouter.route("/all").post(getAllCollections);
collectionRouter.route("/single").post(getSingleCollection);
collectionRouter.route("/update").patch(updateCollection);
collectionRouter.route("/by-owner").post(getCollectionsByOwner);

export default collectionRouter;
