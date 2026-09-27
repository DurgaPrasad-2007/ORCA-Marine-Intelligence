import { and, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateDighaDecisionRunBody,
  CreateDighaDecisionRunResponse,
  ListDecisionRunsResponse,
} from "@workspace/api-zod";
import { db, decisionRunsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { demoResult } from "./decision-demo";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/decision-runs", async (_req, res): Promise<void> => {
  const userId = res.locals.userId as string;
  const runs = await db
    .select({
      id: decisionRunsTable.id,
      question: decisionRunsTable.question,
      createdAt: decisionRunsTable.createdAt,
      result: decisionRunsTable.result,
    })
    .from(decisionRunsTable)
    .where(eq(decisionRunsTable.userId, userId))
    .orderBy(desc(decisionRunsTable.createdAt));

  res.json(ListDecisionRunsResponse.parse(runs));
});

router.post("/decision-runs/digha", async (req, res): Promise<void> => {
  const parsed = CreateDighaDecisionRunBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = res.locals.userId as string;
  const result = demoResult(parsed.data.question);
  const [run] = await db
    .insert(decisionRunsTable)
    .values({
      userId,
      question: parsed.data.question,
      result,
    })
    .returning({
      id: decisionRunsTable.id,
      question: decisionRunsTable.question,
      createdAt: decisionRunsTable.createdAt,
      result: decisionRunsTable.result,
    });

  res.status(201).json(CreateDighaDecisionRunResponse.parse(run));
});

export default router;