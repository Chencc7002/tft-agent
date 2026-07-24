import { applyClarificationPolicy } from "../src/understanding/ambiguity-policy.js";
import { resolveTaskFrameContext } from "../src/understanding/context-resolver.js";
import {
  buildPhase4ContextCases,
  PHASE4_CONTEXT_DATASET_VERSION
} from "./datasets/context-resolution-phase4-cases.mjs";

export const PHASE4_EVALUATION_VERSION = "context-clarification-phase4.v1";

function ids(values) {
  return (values ?? []).map((value) => value.resolvedId).filter(Boolean);
}
function sameMembers(actual, expected) {
  if (!expected) return true;
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

export async function runPhase4Evaluation(options = {}) {
  const cases = options.cases ?? buildPhase4ContextCases();
  const results = cases.map((testCase) => {
    const resolution = (options.resolver ?? resolveTaskFrameContext)(testCase.current, {
      input: testCase.input,
      conversation: testCase.conversation,
      defaults: testCase.defaults
    });
    const clarification = (options.clarificationPolicy ?? applyClarificationPolicy)(
      resolution.taskFrame,
      resolution
    );
    const actual = {
      subjectIds: ids(clarification.taskFrame.subjects),
      candidateIds: ids(clarification.taskFrame.candidates),
      conceptIds: ids(clarification.taskFrame.concepts),
      constraintSources: resolution.fieldSources.constraints,
      needsClarification: clarification.needsClarification,
      question: clarification.question
    };
    const referenceCorrect = sameMembers(actual.subjectIds, testCase.expected.subjectIds)
      && sameMembers(actual.candidateIds, testCase.expected.candidateIds)
      && sameMembers(actual.conceptIds, testCase.expected.conceptIds);
    const sourcesCorrect = !testCase.expected.constraintSources
      || Object.entries(testCase.expected.constraintSources)
        .every(([key, value]) => actual.constraintSources[key] === value);
    const clarificationCorrect = actual.needsClarification === testCase.expected.needsClarification
      && (!testCase.expected.oneKeyQuestion || (
        typeof actual.question === "string"
        && actual.question.length > 0
        && !Object.hasOwn(clarification, "suggestions")
      ));
    return {
      id: testCase.id,
      group: testCase.group,
      input: testCase.input,
      expected: testCase.expected,
      actual,
      referenceCorrect,
      sourcesCorrect,
      clarificationCorrect,
      passed: referenceCorrect && sourcesCorrect && clarificationCorrect
    };
  });

  const referenceCases = results.filter((result) => result.group === "multi_turn_reference");
  const nonClarificationCases = results.filter((result) => result.expected.needsClarification === false);
  const necessaryCases = results.filter((result) => result.expected.needsClarification === true);
  const ratio = (values, predicate) => values.length
    ? values.filter(predicate).length / values.length
    : 1;
  const metrics = {
    total: results.length,
    passed: results.filter((result) => result.passed).length,
    referenceTotal: referenceCases.length,
    referenceCorrect: referenceCases.filter((result) => result.referenceCorrect).length,
    multiTurnReferenceAccuracy: ratio(referenceCases, (result) => result.referenceCorrect),
    nonClarificationTotal: nonClarificationCases.length,
    unnecessaryClarifications: nonClarificationCases
      .filter((result) => result.actual.needsClarification).length,
    unnecessaryClarificationRate: ratio(
      nonClarificationCases,
      (result) => result.actual.needsClarification
    ),
    necessaryClarificationTotal: necessaryCases.length,
    oneKeyQuestionCorrect: necessaryCases.filter((result) => result.clarificationCorrect).length,
    oneKeyQuestionRate: ratio(necessaryCases, (result) => result.clarificationCorrect),
    conditionSourceAccuracy: ratio(
      results.filter((result) => result.group === "condition_source"),
      (result) => result.sourcesCorrect
    )
  };
  const gates = {
    multiTurnReferenceAccuracy: metrics.multiTurnReferenceAccuracy >= 0.9,
    unnecessaryClarificationRate: metrics.unnecessaryClarificationRate < 0.05,
    oneKeyQuestion: metrics.oneKeyQuestionRate === 1,
    conditionSources: metrics.conditionSourceAccuracy === 1
  };
  return {
    evaluationVersion: PHASE4_EVALUATION_VERSION,
    datasetVersion: PHASE4_CONTEXT_DATASET_VERSION,
    passed: Object.values(gates).every(Boolean),
    gates,
    metrics,
    results
  };
}
