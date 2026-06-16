import { findEmDashLocations } from "../scripts/lib/no-em-dash.mjs";

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow em dash (—); use en dash (–) in user-facing and project copy",
    },
    messages: {
      emDash: "Use en dash (U+2013) instead of em dash (U+2014).",
    },
    schema: [],
  },
  create(context) {
    const source = context.sourceCode.getText();
    for (const { line, column } of findEmDashLocations(source)) {
      context.report({
        loc: {
          start: { line, column },
          end: { line, column: column + 1 },
        },
        messageId: "emDash",
      });
    }
    return {};
  },
};

export default rule;
