import { evaluationCases } from "../retrieval-evaluation/retrievalEvaluationDataset.js";

const expectedFactsByCaseId = {
  "remote-work-days": ["יומיים בשבוע"],
  "remote-work-alternative": ["יומיים בשבוע"],
  "remote-work-hebrew": ["יומיים בשבוע"],
  "remote-work-and-approval": ["יומיים בשבוע", "המנהל הישיר"],
  "office-hours": ["9:00", "17:00"],
  "office-days-and-hours": ["ראשון עד חמישי", "9:00", "17:00"],
  "vacation-requests": ["חמישה ימי עסקים"],
  "vacation-approval": ["המנהל הישיר"],
  "attendance-reports": ["ימי עבודה", "שעות העבודה", "היעדרויות"],
  "attendance-corrections": ["בקשה", "הסבר", "מנהל", "לבדוק", "לאשר"],
  "attendance-process-combined": [
    "ימי עבודה",
    "שעות העבודה",
    "היעדרויות",
    "בקשה",
    "מנהל",
  ],
  "support-hours": ["8:00", "18:00", "ראשון עד חמישי"],
  "support-escalation": ["צוות ה-IT"],
  "salary-payment": ["יום העבודה האחרון", "החודש"],
  onboarding: ["השבוע הראשון", "הדרכת אבטחה", "מערכות החברה"],
  "remote-security": ["אימות רב-שלבי", "סיסמאות"],
  "it-support": ["מוקד התמיכה הפנימי"],
  "unsupported-benefits": [],
  "unsupported-office-location": [],
} satisfies Record<string, string[]>;

export interface AnswerEvaluationDatasetCase {
  id: string;
  question: string;
  expectedFacts: string[];
  shouldAbstain: boolean;
}

export const answerEvaluationCases: AnswerEvaluationDatasetCase[] =
  evaluationCases.map((evaluationCase) => ({
    id: evaluationCase.id,
    question: evaluationCase.question,
    expectedFacts:
      expectedFactsByCaseId[
        evaluationCase.id as keyof typeof expectedFactsByCaseId
      ],
    shouldAbstain: evaluationCase.relevantChunkIndexes.length === 0,
  }));
