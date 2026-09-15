// Turns a Python run result into short, kind feedback for kids: celebrate a
// match, show "goal vs. what you printed" for a wrong answer, and reword
// Python's error messages in plain language. Uses the shared diagnosis in
// lib/runDiagnostics.ts to find the error type and line.

import { ApiError } from "@/lib/api/client";
import type { RunCaseResult } from "@/lib/api/submissions";
import { diagnoseCase, firstDifference, normalizeOutput, type RunLimits } from "@/lib/runDiagnostics";
import type { PythonTest } from "./types";

export type PythonFeedback =
  | { kind: "success"; output: string }
  | {
      kind: "wrong";
      expected: string;
      actual: string;
      /** 1-based output line that differs first. */
      diffLine: number | null;
      tip: string;
      stdin?: string;
    }
  | { kind: "error"; title: string; tip: string; line?: number; details: string; stdin?: string }
  /** The code never ran (rate limit, network, server) — not counted as a try. */
  | { kind: "unavailable"; title: string; tip: string };

export interface FeedbackContext {
  testIndex: number;
  /** Whether this level's tests type anything into input(). */
  levelUsesInput: boolean;
}

// The runner's defaults for a run without a problem (run.service.ts).
const RUN_LIMITS: RunLimits = { timeLimitMs: 2000, memoryLimitMb: 256 };

const firstLine = (text: string) => text.split("\n")[0] ?? "";

function wrongAnswerTip(actual: string, expected: string, test: PythonTest, context: FeedbackContext): string {
  const mistake = test.mistakes?.find((item) => normalizeOutput(item.output) === actual);
  if (mistake) return mistake.tip;
  if (!actual) return "Bolt didn't see anything printed. Use `print()` to show your answer.";

  const actualFirst = firstLine(actual);
  const expectedFirst = firstLine(expected);
  if (context.levelUsesInput && actualFirst !== expectedFirst && actualFirst.endsWith(expectedFirst)) {
    return "Leave the brackets in `input()` empty. Any words inside them get printed too!";
  }
  if (actual.toLowerCase() === expected.toLowerCase()) return "So close! Check your capital letters. Python notices them.";

  const squash = (text: string) => text.replace(/\s+/g, " ").trim();
  if (squash(actual) === squash(expected)) return "Almost! The words are right, but the spaces or lines are different.";

  const lettersOnly = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (lettersOnly(actual) === lettersOnly(expected)) return "Nearly there! Check the spaces and punctuation, like `,` `!` and `.`";

  if (context.testIndex > 0 && test.stdin !== undefined) {
    return `It worked for the first test, but not when the tester typed ${firstLine(test.stdin.trim())}. Use your variables instead of typing the answer yourself.`;
  }

  const expectedLines = expected.split("\n").length;
  const actualLines = actual.split("\n").length;
  if (actualLines < expectedLines) return `The goal has ${expectedLines} lines, but your program printed ${actualLines}. Is something missing?`;
  if (actualLines > expectedLines) return `Your program printed ${actualLines} lines, but the goal only has ${expectedLines}. Are there extra prints?`;

  const difference = firstDifference(expected, actual);
  return difference ? `Look at line ${difference.line} of the output. It's different from the goal.` : "Compare your output with the goal.";
}

function explainError(result: RunCaseResult, test: PythonTest, context: FeedbackContext): PythonFeedback {
  const diagnostic = diagnoseCase("python", result, RUN_LIMITS);
  const name = diagnostic.title.includes(" · ") ? (diagnostic.title.split(" · ").pop() ?? "") : "";
  const message = diagnostic.message ?? "";
  const line = diagnostic.line;
  const onLine = line ? ` on line ${line}` : "";
  const details = (result.compileOutput || result.stderr).trim();
  const make = (title: string, tip: string): PythonFeedback => ({ kind: "error", title, tip, line, details, stdin: test.stdin });

  switch (name) {
    case "SyntaxError": {
      if (/invalid character '[“”‘’]'/.test(message)) {
        return make(`Curly quote marks${onLine}`, 'Python only understands straight quotes like `"` and `\'`, not curly ones like “ ”. Type the quote marks again.');
      }
      if (/unterminated string literal/.test(message)) return make(`A quote mark is missing${onLine}`, 'Text needs a quote mark at the start AND at the end, like `"hello"`.');
      if (/was never closed/.test(message)) return make(`A bracket is never closed${onLine}`, "Every `(` needs a matching `)`. Try counting them!");
      if (/unmatched '\)'/.test(message)) return make(`There's an extra bracket${onLine}`, "Every `)` needs a `(` before it.");
      if (/expected ':'/.test(message)) return make(`A colon is missing${onLine}`, "Lines that start with `if`, `else` or `for` must end with a colon `:`.");
      if (/Missing parentheses in call to 'print'/.test(message)) return make(`print needs brackets${onLine}`, 'Write it like this: `print("hi")`.');
      if (/forgot a comma/.test(message)) return make(`Maybe a comma is missing${onLine}`, "Inside `print()`, put a comma `,` between each thing you want to show.");
      if (/Maybe you meant '=='/.test(message)) return make(`Use == to compare${onLine}`, "One `=` puts a value in a box. To check if two things are equal, use `==`.");
      if (/invalid decimal literal/.test(message)) return make(`A number is stuck to a word${onLine}`, "Put a `*` between a number and a name, like `5 * i`. Names can't start with a number.");
      return make(
        line ? `Python couldn't read line ${line}` : "Python couldn't read your code",
        'Look for a missing quote mark `"`, bracket `)` or colon `:` on that line or the line just above it.',
      );
    }
    case "IndentationError":
      if (/expected an indented block/.test(message)) return make(`Push this line in${onLine}`, "The line after a colon `:` needs 4 spaces at the start.");
      if (/unexpected indent/.test(message)) return make(`Too many spaces${onLine}`, "This line starts with spaces it doesn't need. Move it back to the left edge.");
      return make(`The spaces don't line up${onLine}`, "Lines in the same group must start with the same number of spaces.");
    case "TabError":
      return make(`Tabs and spaces are mixed${onLine}`, "Use spaces only at the start of your lines.");
    case "NameError": {
      const unknown = /name '([^']+)' is not defined/.exec(message)?.[1];
      const suggestion = /Did you mean: '([^']+)'/.exec(message)?.[1];
      const word = unknown ?? "that word";
      if (suggestion) return make(`Python doesn't know "${word}"${onLine}`, `Did you mean \`${suggestion}\`? Spelling and capital letters matter in Python.`);
      return make(
        `Python doesn't know "${word}"${onLine}`,
        unknown
          ? `Check the spelling. If it's meant to be words, put it in quote marks: \`"${unknown}"\`. If it's a variable, create it first with \`=\`.`
          : "Check the spelling, or put words inside quote marks.",
      );
    }
    case "TypeError":
      if (/can only concatenate str|unsupported operand type\(s\) for \+/.test(message)) {
        return make(`Words and numbers don't mix with +${onLine}`, "`+` can't glue words and numbers together. Use commas inside `print()`, or use `int()` to turn typed text into a number.");
      }
      if (/not supported between instances of 'str' and 'int'|not supported between instances of 'int' and 'str'/.test(message)) {
        return make(`Comparing words with a number${onLine}`, "Use `int(input())` so the answer is a number before you compare it.");
      }
      if (/object is not callable/.test(message)) return make(`Something isn't a command${onLine}`, "Make sure you didn't use a word like `print` or `input` as a variable name.");
      return make(`Mixed-up types${onLine}`, `Python says: ${message || "an operation got the wrong kind of value."}`);
    case "ValueError":
      if (/invalid literal for int\(\)/.test(message)) return make(`int() needs a whole number${onLine}`, "`int()` can only turn whole numbers like `42` into numbers.");
      return make(`A value has the wrong format${onLine}`, `Python says: ${message}`);
    case "EOFError":
      return make(
        `input() has nothing to read${onLine}`,
        context.levelUsesInput
          ? "Your program asks for more answers than the tester types. Count your `input()` calls."
          : "This level doesn't type anything in, so you don't need `input()` here.",
      );
    case "ZeroDivisionError":
      return make(`You divided by zero${onLine}`, "Even robots can't divide by zero! Check your maths.");
    default:
      break;
  }

  if (result.outcome === "TIME_LIMIT_EXCEEDED") return make("Your program took too long", "Bolt waited and waited… Is there a loop that never stops?");
  if (result.outcome === "MEMORY_LIMIT_EXCEEDED") return make("Your program used too much memory", "Try making fewer or smaller things.");
  return make(line ? `Bolt hit a problem on line ${line}` : "Your program crashed", message ? `Python says: ${message}` : "Read what Python said below.");
}

/** Feedback for one test run. A run that finished cleanly is compared with the test's expected output. */
export function explainCase(result: RunCaseResult, test: PythonTest, context: FeedbackContext): PythonFeedback {
  switch (result.outcome) {
    case "RUNTIME_ERROR":
    case "COMPILATION_ERROR":
    case "TIME_LIMIT_EXCEEDED":
    case "MEMORY_LIMIT_EXCEEDED":
      return explainError(result, test, context);
    case "SKIPPED":
      return { kind: "unavailable", title: "Your code didn't run", tip: "Please press Check my code again." };
    default: {
      const actual = normalizeOutput(result.stdout ?? "");
      const expected = normalizeOutput(test.expected);
      if (actual === expected) return { kind: "success", output: actual };
      return {
        kind: "wrong",
        expected,
        actual,
        diffLine: firstDifference(expected, actual)?.line ?? null,
        tip: wrongAnswerTip(actual, expected, test, context),
        stdin: test.stdin,
      };
    }
  }
}

/** Feedback when the code couldn't be run at all. */
export function explainRunFailure(error: unknown): PythonFeedback {
  if (error instanceof ApiError) {
    if (error.statusCode === 429) return { kind: "unavailable", title: "Whoa, you're fast!", tip: "Wait a minute and try again." };
    if (error.statusCode === 401 || error.statusCode === 403) {
      return { kind: "unavailable", title: "You've been signed out", tip: "Sign in again to keep checking your code." };
    }
    if (error.statusCode === 400) return { kind: "unavailable", title: "Bolt couldn't run that", tip: error.message };
    if (error.statusCode >= 500) return { kind: "unavailable", title: "The code computer is taking a nap", tip: "Please try again in a moment." };
  }
  return { kind: "unavailable", title: "Bolt couldn't reach the code computer", tip: "Check your internet connection and try again." };
}

/** 3 stars: no hints and solved on the first or second check. 2: a few tries (hints allowed). 1: anything else, or after peeking at the answer. */
export function starsForPython({ checks, hintsUsed, sawAnswer }: { checks: number; hintsUsed: number; sawAnswer: boolean }): 1 | 2 | 3 {
  if (sawAnswer) return 1;
  if (hintsUsed === 0 && checks <= 2) return 3;
  if (checks <= 5) return 2;
  return 1;
}
