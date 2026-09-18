import { Router, type IRouter } from "express";
import { RunDighaDecisionDemoBody, RunDighaDecisionDemoResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const demoResult = (question: string) => ({
  runId: "digha-fixture-2026-02-14",
  scenarioLabel: "Digha nearshore fishing window · static fixture",
  runStatus: "fixture-complete",
  generatedAt: "2026-02-14T09:30:00+05:30",
  context: {
    location: "Digha coast, West Bengal",
    coordinates: "21.62°N, 87.51°E · illustrative anchor",
    timeWindow: "12–18 June · 06:00–10:00 IST",
    timezone: "Asia/Kolkata (IST)",
    activity: "Small-vessel nearshore fishing · surface current",
    vessel: "Small fishing vessel · no telemetry connected",
    extractedFrom: `Question: “${question}”`,
  },
  stages: [
    { id: "pfz", label: "PFZ context", status: "fixture", detail: "Static illustrative potential-fishing-zone context retained for the comparison.", sourceRef: "E-01", freshness: "Fixture snapshot · 14 Feb 2026" },
    { id: "marine", label: "Marine conditions", status: "fixture", detail: "Surface-current field is a synthetic comparison input, not an observation.", sourceRef: "E-01", freshness: "Fixture snapshot · 14 Feb 2026" },
    { id: "weather", label: "Weather", status: "stale", detail: "A static weather context is retained, but it is stale and not used as a live forecast.", sourceRef: "E-04", freshness: "Stale snapshot · 14 Feb 2026" },
    { id: "warnings", label: "Warnings", status: "unavailable", detail: "No official warning feed is connected; check the relevant authority before any activity.", sourceRef: null, freshness: "Unavailable · not queried" },
    { id: "restrictions", label: "Restrictions", status: "unavailable", detail: "No live regulatory or local restriction registry is connected.", sourceRef: null, freshness: "Unavailable · not queried" },
    { id: "risk", label: "Deterministic risk", status: "derived", detail: "Repeatable fixture comparison of current-field overlap and the selected time window.", sourceRef: "E-02", freshness: "Local deterministic operation" },
    { id: "route", label: "Route context", status: "assumed", detail: "An illustrative nearshore segment is shown for spatial context only.", sourceRef: "E-03", freshness: "Assumption · 10 km coastal buffer" },
    { id: "evidence", label: "Evidence ledger", status: "derived", detail: "Material inputs, operations, assumptions, and unavailable sources are listed below.", sourceRef: "E-01", freshness: "Local run record" },
  ],
  finding: "The later comparison window is better-supported than the earlier window in this fixture.",
  findingQualifier: "Directional only. This is not a forecast, route instruction, catch prediction, or safety clearance.",
  confidence: "Limited",
  confidenceReason: "Two fixture inputs support the comparison; one input is stale, two source families are unavailable, and no field observation or vessel telemetry is connected.",
  riskDrivers: [
    { label: "Surface-current overlap", signal: "Later window shows lower illustrative overlap with the selected route segment.", impact: "Supports the later window in this fixture.", sourceRef: "E-01" },
    { label: "Weather context", signal: "Stale static snapshot retained for transparency.", impact: "Not used to establish a live marine condition.", sourceRef: "E-04" },
    { label: "Official warnings and restrictions", signal: "Unavailable", impact: "Must be checked outside ORCA before acting.", sourceRef: "E-05" },
  ],
  assumptions: [
    "A 10 km coastal buffer is used for the illustrative comparison.",
    "06:00–10:00 IST is interpreted as the local activity window.",
    "The route segment represents context, not a recommended or navigable route.",
    "No boat-specific telemetry, local catch observation, or community report is available.",
  ],
  limitations: [
    "All positive signals are synthetic/static fixture values.",
    "No live INCOIS, IMD, satellite, vessel, warning, restriction, or community feed is connected.",
    "The stale weather item is shown but excluded from the finding.",
    "Official warnings, local knowledge, and professional judgement take precedence.",
  ],
  mapLabel: "Digha coast · illustrative spatial context",
  mapNote: "Geometry is synthetic and not navigational. Coral lines show the example route segment; mint contours show context layers.",
  evidence: [
    { id: "E-01", claim: "Surface-current comparison", type: "fixture", source: "Synthetic marine conditions fixture", status: "used", timestamp: "14 Feb 2026", operation: "Spatial overlap across the two selected time windows", usedInFinding: true, detail: "Static current-field values are compared against an illustrative nearshore segment. No live observation is implied." },
    { id: "E-02", claim: "Later window finding", type: "derived", source: "Deterministic fixture operation", status: "used", timestamp: "Local run", operation: "Compare the two window signals after applying the selected buffer", usedInFinding: true, detail: "The result is repeatable for this fixture. It is not a calibrated risk score." },
    { id: "E-03", claim: "Coastal buffer and route context", type: "assumed", source: "Run parameter", status: "used", timestamp: "Local run", operation: "Apply a 10 km illustrative coastal buffer", usedInFinding: false, detail: "The geometry helps explain the spatial operation and must not be treated as a route instruction." },
    { id: "E-04", claim: "Weather context", type: "fixture", source: "Static weather fixture", status: "stale", timestamp: "14 Feb 2026", operation: "Retain for transparency; exclude from finding", usedInFinding: false, detail: "This item is intentionally visible as stale. It is not a current forecast." },
    { id: "E-05", claim: "Warnings and restrictions", type: "unavailable", source: "No connected official feeds", status: "unavailable", timestamp: "Not queried", operation: "No substitution performed", usedInFinding: false, detail: "No synthetic warning or restriction value is inserted. Verify official sources before acting." },
  ],
});

router.post("/decision-demo/digha", (req, res): void => {
  const parsed = RunDighaDecisionDemoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  res.json(RunDighaDecisionDemoResponse.parse(demoResult(parsed.data.question)));
});

export default router;