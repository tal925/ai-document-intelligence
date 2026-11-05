import { describe, expect, it } from "vitest";
import { evaluateAnswers } from "./answerEvaluationService.js";

describe("answerEvaluationService", () => {
  describe("evaluateAnswers", () => {
    it("should identify a correct answer containing all expected facts", () => {
      const report = evaluateAnswers([
        {
          id: "remote-work",
          answer: "Employees may work remotely up to two days per week.",
          expectedFacts: ["two days per week"],
          shouldAbstain: false,
        },
      ]);

      expect(report.results[0]).toMatchObject({
        id: "remote-work",
        isCorrect: true,
        abstained: false,
        missingFacts: [],
        factCoverage: 1,
      });
    });

    it("should identify missing expected facts", () => {
      const report = evaluateAnswers([
        {
          id: "remote-work-approval",
          answer: "Employees may work remotely up to two days per week.",
          expectedFacts: ["two days per week", "direct manager approval"],
          shouldAbstain: false,
        },
      ]);

      expect(report.results[0]).toMatchObject({
        isCorrect: false,
        missingFacts: ["direct manager approval"],
        factCoverage: 0.5,
      });
    });

    it("should recognize an explicitly configured alternative phrasing", () => {
      const report = evaluateAnswers([
        {
          id: "manager-approval",
          answer: "Employees need immediate supervisor approval.",
          expectedFacts: ["direct manager approval"],
          expectedFactAliases: {
            "direct manager approval": ["immediate supervisor approval"],
          },
          shouldAbstain: false,
        },
      ]);

      expect(report.results[0]).toMatchObject({
        isCorrect: true,
        missingFacts: [],
        factCoverage: 1,
      });
    });

    it("should not recognize an alternative phrasing that was not configured", () => {
      const report = evaluateAnswers([
        {
          id: "manager-approval",
          answer: "Employees need immediate supervisor approval.",
          expectedFacts: ["direct manager approval"],
          shouldAbstain: false,
        },
      ]);

      expect(report.results[0]).toMatchObject({
        isCorrect: false,
        missingFacts: ["direct manager approval"],
        factCoverage: 0,
      });
    });

    it("should identify a correct abstention for an unanswerable question", () => {
      const report = evaluateAnswers([
        {
          id: "unsupported-location",
          answer: "אין מספיק מידע במסמך כדי לענות על השאלה.",
          expectedFacts: [],
          shouldAbstain: true,
        },
      ]);

      expect(report.results[0]).toMatchObject({
        isCorrect: true,
        abstained: true,
        missingFacts: [],
        factCoverage: 0,
      });
    });

    it("should identify an incorrect answer to an unanswerable question", () => {
      const report = evaluateAnswers([
        {
          id: "unsupported-location",
          answer: "The company is located in London.",
          expectedFacts: [],
          shouldAbstain: true,
        },
      ]);

      expect(report.results[0]).toMatchObject({
        isCorrect: false,
        abstained: false,
      });
    });

    it("should identify an incorrect abstention when an answer is expected", () => {
      const report = evaluateAnswers([
        {
          id: "office-hours",
          answer: "אין מספיק מידע במסמך כדי לענות על השאלה.",
          expectedFacts: ["9:00 AM to 5:00 PM"],
          shouldAbstain: false,
        },
      ]);

      expect(report.results[0]).toMatchObject({
        isCorrect: false,
        abstained: true,
      });
    });

    it("should calculate report metrics", () => {
      const report = evaluateAnswers([
        {
          id: "correct-answer",
          answer: "Employees may work remotely up to two days per week.",
          expectedFacts: ["two days per week"],
          shouldAbstain: false,
        },
        {
          id: "correct-abstention",
          answer: "אין מספיק מידע במסמך כדי לענות על השאלה.",
          expectedFacts: [],
          shouldAbstain: true,
        },
      ]);

      expect(report).toMatchObject({
        totalCases: 2,
        correctAnswers: 2,
        incorrectAnswers: 0,
        answerAccuracy: 1,
        factCoverage: 1,
        abstentionAccuracy: 1,
      });
    });

    it("should return zero metrics for an empty evaluation set", () => {
      expect(evaluateAnswers([])).toMatchObject({
        totalCases: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        answerAccuracy: 0,
        factCoverage: 0,
        abstentionAccuracy: 0,
        results: [],
      });
    });
  });
});
