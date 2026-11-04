import type { TextChunk } from "../../chunkingService.js";

export interface RetrievalEvaluationCase {
  id: string;
  question: string;
  relevantChunkIndexes: number[];
}

export const evaluationChunks: TextChunk[] = [
  {
    index: 0,
    content:
      "Employees may work remotely up to two days per week. Remote work requires approval from their direct manager.",
  },
  {
    index: 1,
    content:
      "The company office operates from Sunday through Thursday. Standard office hours are 9:00 AM to 5:00 PM.",
  },
  {
    index: 2,
    content:
      "Employees must submit vacation requests at least five business days in advance. Their direct manager reviews each request.",
  },
  {
    index: 3,
    content:
      "Monthly attendance reports include the number of working days, total hours worked, and recorded absences.",
  },
  {
    index: 4,
    content:
      "Employees who need to correct an attendance record must submit a request with an explanation. A manager must review and approve the correction.",
  },
  {
    index: 5,
    content:
      "The customer support team is available from 8:00 AM to 6:00 PM, Sunday through Thursday. Urgent technical issues are escalated to the IT team.",
  },
];

export const evaluationCases: RetrievalEvaluationCase[] = [
  {
    id: "remote-work-days",
    question: "How many days per week can employees work remotely?",
    relevantChunkIndexes: [0],
  },
  {
    id: "vacation-requests",
    question: "How far in advance must employees submit vacation requests?",
    relevantChunkIndexes: [2],
  },
  {
    id: "attendance-reports",
    question: "What information is included in monthly attendance reports?",
    relevantChunkIndexes: [3],
  },
  {
    id: "attendance-corrections",
    question: "How can employees correct an attendance record?",
    relevantChunkIndexes: [4],
  },
  {
    id: "support-hours",
    question: "When is the customer support team available?",
    relevantChunkIndexes: [5],
  },
  {
    id: "remote-work-and-approval",
    question: "What are the remote work limits and who approves remote work?",
    relevantChunkIndexes: [0],
  },
];
