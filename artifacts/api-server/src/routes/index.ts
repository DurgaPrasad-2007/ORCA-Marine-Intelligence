import { Router, type IRouter } from "express";
import healthRouter from "./health";
import decisionDemoRouter from "./decision-demo";

const router: IRouter = Router();

router.use(healthRouter);
router.use(decisionDemoRouter);

export default router;
