import { Router, type IRouter } from "express";
import healthRouter from "./health";
import decisionDemoRouter from "./decision-demo";
import decisionRunsRouter from "./decision-runs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(decisionDemoRouter);
router.use(decisionRunsRouter);

export default router;
