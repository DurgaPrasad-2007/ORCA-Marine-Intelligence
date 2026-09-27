import { createInsertSchema } from "drizzle-zod";
import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const decisionRunsTable = pgTable("decision_runs", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: text("user_id").notNull(),
  question: text("question").notNull(),
  result: jsonb("result").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDecisionRunSchema = createInsertSchema(decisionRunsTable).omit({
  createdAt: true,
});

export type InsertDecisionRun = z.infer<typeof insertDecisionRunSchema>;
export type DecisionRun = typeof decisionRunsTable.$inferSelect;