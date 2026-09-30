import { Router, type IRouter } from "express";
import auth from "./auth";
import orca from "./orca";

const router: IRouter = Router();
router.get("/healthz", (_req, res) => res.json({ status: "ok" }));
router.use(auth);
router.use(orca);

export default router;
