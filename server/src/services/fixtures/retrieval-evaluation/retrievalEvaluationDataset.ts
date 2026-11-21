
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
  {
    index: 6,
    content:
      "Employees receive a monthly salary payment on the last working day of each month. Salary questions should be directed to the HR department.",
  },
  {
    index: 7,
    content:
      "New employees must complete an onboarding program during their first week. The program includes security training and an introduction to company systems.",
  },
  {
    index: 8,
    content:
      "Employees must use multi-factor authentication when accessing company systems remotely. Passwords must not be shared with other employees.",
  },
  {
    index: 9,
    content:
      "The IT department handles technical support requests. Critical system outages should be reported immediately through the internal help desk.",
  },
];

export const evaluationCases: RetrievalEvaluationCase[] = [
  {
    id: "remote-work-days",
    question: "How many days per week can employees work remotely?",
    relevantChunkIndexes: [0],
  },
  {
    id: "remote-work-alternative",
    question: "Can I work from home during the week?",
    relevantChunkIndexes: [0],
  },
  {
    id: "remote-work-hebrew",
    question: "כמה ימים בשבוע אפשר לעבוד מרחוק?",
    relevantChunkIndexes: [0],
  },
  {
    id: "remote-work-and-approval",
    question: "What are the remote work limits and who approves remote work?",
    relevantChunkIndexes: [0],
  },
  {
    id: "office-hours",
    question: "What are the company's standard office hours?",
    relevantChunkIndexes: [1],
  },
  {
    id: "office-days-and-hours",
    question: "On which days is the office open and what are its working hours?",
    relevantChunkIndexes: [1],
  },
  {
    id: "vacation-requests",
    question: "How far in advance must employees submit vacation requests?",
    relevantChunkIndexes: [2],
  },
  {
    id: "vacation-approval",
    question: "Who reviews employee vacation requests?",
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
    id: "attendance-process-combined",
    question:
      "What information appears in attendance reports and how can errors be corrected?",
    relevantChunkIndexes: [3, 4],
  },
  {
    id: "support-hours",
    question: "When is the customer support team available?",
    relevantChunkIndexes: [5],
  },
  {
    id: "support-escalation",
    question: "What happens when an urgent technical issue is reported?",
    relevantChunkIndexes: [5],
  },
  {
    id: "salary-payment",
    question: "When do employees receive their monthly salary?",
    relevantChunkIndexes: [6],
  },
  {
    id: "onboarding",
    question: "What must new employees complete during their first week?",
    relevantChunkIndexes: [7],
  },
  {
    id: "remote-security",
    question: "What security measures are required for remote system access?",
    relevantChunkIndexes: [8],
  },
  {
    id: "it-support",
    question: "How should employees report a critical system outage?",
    relevantChunkIndexes: [9],
  },
  {
    id: "unsupported-benefits",
    question: "How many vacation days do employees receive each year?",
    relevantChunkIndexes: [],
  },
  {
    id: "unsupported-office-location",
    question: "Where is the company's headquarters located?",
    relevantChunkIndexes: [],
  },
];
