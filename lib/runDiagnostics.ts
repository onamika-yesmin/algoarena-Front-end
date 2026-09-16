// Turns a raw "Run" result into something a learner can act on: what kind of
// error it is, where in their code it happened, and a plain-language hint
// about the usual cause. Pure functions (no React) so the same logic can
// label the result banner, the per-sample chips and the editor's error marker.

import type { Language } from "@/types/api";
import type { RunCaseResult, RunOutcome, RunResult } from "@/lib/api/submissions";

export type RunTone = "ok" | "bad" | "warn" | "info";

export interface RunDiagnostic {
  tone: RunTone;
  /** Headline, e.g. "Runtime Error · EOFError". */
  title: string;
  /** The compiler's / runtime's own message, when there is one. */
  message?: string;
  /** 1-based line in the learner's code the error points at, when known. */
  line?: number;
  column?: number;
  /** Plain-language explanation of the usual cause and how to fix it. */
  hint?: string;
}

export interface RunLimits {
  timeLimitMs: number;
  memoryLimitMb: number;
}

export const OUTCOME_LABEL: Record<RunOutcome, string> = {
  PASSED: "Passed",
  WRONG_ANSWER: "Wrong Answer",
  NO_EXPECTED: "Finished",
  COMPILATION_ERROR: "Compilation Error",
  RUNTIME_ERROR: "Runtime Error",
  TIME_LIMIT_EXCEEDED: "Time Limit Exceeded",
  MEMORY_LIMIT_EXCEEDED: "Memory Limit Exceeded",
  SKIPPED: "Not run",
};

export const OUTCOME_TONE: Record<RunOutcome, RunTone> = {
  PASSED: "ok",
  NO_EXPECTED: "info",
  SKIPPED: "info",
  WRONG_ANSWER: "bad",
  COMPILATION_ERROR: "bad",
  RUNTIME_ERROR: "bad",
  TIME_LIMIT_EXCEEDED: "warn",
  MEMORY_LIMIT_EXCEEDED: "warn",
};

const isFailure = (outcome: RunOutcome) => outcome !== "PASSED" && outcome !== "NO_EXPECTED" && outcome !== "SKIPPED";

// Same normalization the judge applies before comparing (back end
// judge.service.ts normalizeOutput), so a difference shown here is never one
// the judge itself would ignore.
export const normalizeOutput = (raw: string): string =>
  raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n+$/g, "")
    .trim();

export interface OutputDifference {
  /** 1-based line of the first line that differs. */
  line: number;
  expected: string | null;
  actual: string | null;
}

export const firstDifference = (expected: string, actual: string): OutputDifference | null => {
  const expectedLines = normalizeOutput(expected).split("\n");
  const actualLines = normalizeOutput(actual).split("\n");
  const length = Math.max(expectedLines.length, actualLines.length);
  for (let index = 0; index < length; index += 1) {
    if (expectedLines[index] !== actualLines[index]) {
      return { line: index + 1, expected: expectedLines[index] ?? null, actual: actualLines[index] ?? null };
    }
  }
  return null;
};

const PYTHON_HINTS: Record<string, string> = {
  EOFError: "Your program tried to read more input than the test gives it. Compare how many times you call input() with the input format.",
  ValueError: "A value had the wrong format — often int() on a line that holds several numbers. Split the line first: map(int, input().split()).",
  IndexError: "You used a list or string position that doesn't exist. Check your loop bounds and how many items the input line really has.",
  KeyError: "You read a dictionary key that was never added. Check `key in d` first, or use d.get(key).",
  ZeroDivisionError: "You divided (or used %) by zero. Handle the case where the divisor can be 0.",
  TypeError: "An operation got a value of the wrong type — e.g. adding a str and an int. Convert input with int() before doing math.",
  NameError: "You used a name that isn't defined — check for a typo, or a variable used before it's assigned.",
  UnboundLocalError: "A variable was read inside a function before it was assigned there.",
  AttributeError: "You used a method or attribute that doesn't exist on that value (for example a list method on a str).",
  RecursionError: "Recursion went too deep. Add or fix the base case, or rewrite the recursion as a loop.",
  SyntaxError: "Python couldn't understand this line. Look for a missing bracket, colon, comma or quote on or just before it.",
  IndentationError: "The indentation doesn't line up. Use the same number of spaces for every line in a block.",
  TabError: "Tabs and spaces are mixed in the indentation. Use spaces only.",
  MemoryError: "Your program ran out of memory. Avoid building huge lists or strings.",
  ModuleNotFoundError: "That module isn't installed on the judge — only the Python standard library is available.",
  ImportError: "That import isn't available on the judge — only the Python standard library is available.",
  StopIteration: "next() was called on an iterator that had no items left.",
  OverflowError: "A number got too large for the operation (often a float). Use integers where possible.",
};

const JS_MESSAGE_HINTS: Array<[RegExp, string]> = [
  [
    /Cannot read properties of (undefined|null)|undefined is not|is not iterable|of undefined/,
    "You used a value that is undefined — very often an input line that doesn't exist. Check how you split the input and which line index you read.",
  ],
  [/Maximum call stack size exceeded/, "Recursion went too deep. Add or fix the base case, or use a loop instead."],
  [/is not a function/, "You called something that isn't a function — check the method name and what type the value really is."],
  [/is not defined/, "You used a name that isn't declared — check for a typo or a missing const/let."],
  [/before initialization/, "A let/const variable was used before the line that declares it ran."],
  [/Assignment to constant variable/, "You reassigned a const. Declare it with let if it needs to change."],
  [/Invalid array length/, "An array was created with a negative or enormous length."],
];

const JS_NAME_HINTS: Record<string, string> = {
  SyntaxError: "JavaScript couldn't parse your code. Look for a missing bracket, parenthesis, comma or quote near the marked line.",
  ReferenceError: "You used a name that isn't declared — check for a typo or a missing const/let.",
  TypeError: "An operation got a value of the wrong type (often undefined). Check the values you read from the input.",
  RangeError: "A value was out of the allowed range — e.g. too-deep recursion or an invalid array length.",
};

const CPP_EXCEPTION_HINTS: Record<string, string> = {
  "std::out_of_range": "An index was outside the container — e.g. vector.at(i) or string.substr() with a position past the end.",
  "std::bad_alloc": "Memory allocation failed — the program tried to create a structure that is too large.",
  "std::invalid_argument": "stoi/stoll/stod got text that isn't a number. Check what you read from the input.",
  "std::length_error": "A container was resized to an impossible size (often a negative number cast to size_t).",
  "std::logic_error": "A standard-library precondition was violated — e.g. constructing a std::string from a null pointer.",
};

const parsePythonError = (stderr: string) => {
  let line: number | undefined;
  for (const match of stderr.matchAll(/File "[^"]*script\.py", line (\d+)/g)) line = Number(match[1]);
  const errorLine = stderr
    .trimEnd()
    .split("\n")
    .map((text) => text.trim())
    .reverse()
    .find((text) => /^[A-Za-z_][\w.]*(Error|Exception|Exit|Interrupt|Iteration)(:|$)/.test(text));
  if (!errorLine) return null;
  const separator = errorLine.indexOf(":");
  const name = separator === -1 ? errorLine : errorLine.slice(0, separator);
  const message = separator === -1 ? "" : errorLine.slice(separator + 1).trim();
  return { name, message, line };
};

const parseJavaScriptError = (stderr: string) => {
  const nameMatch = stderr.match(/^\s*([A-Za-z_]\w*(?:Error|Exception))(?::\s*(.*))?$/m);
  if (!nameMatch) return null;
  const location = stderr.match(/script\.js:(\d+)(?::(\d+))?/);
  return {
    name: nameMatch[1],
    message: (nameMatch[2] ?? "").trim(),
    line: location ? Number(location[1]) : undefined,
    column: location?.[2] ? Number(location[2]) : undefined,
  };
};

// Crashes reported by the OS rather than the language runtime — what C++
// programs (and anything killed by a signal) produce. Judge0 reports all of
// them as "Runtime Error (NZEC)", so the exit code and the shell's message
// are what actually tell them apart.
const diagnoseNativeCrash = (stderr: string, exitCode: number | null): Omit<RunDiagnostic, "tone"> | null => {
  const thrown = stderr.match(/terminate called after throwing an instance of '([^']+)'/);
  if (thrown) {
    const what = stderr.match(/what\(\):\s*(.+)/)?.[1]?.trim();
    return {
      title: `Runtime Error · uncaught ${thrown[1]}`,
      message: what,
      hint: CPP_EXCEPTION_HINTS[thrown[1]] ?? "An exception was thrown and never caught.",
    };
  }
  if (/Segmentation fault/.test(stderr) || exitCode === 139) {
    return {
      title: "Runtime Error · Segmentation Fault",
      hint: "Your program touched memory it doesn't own — an array/vector index out of bounds, a null or dangling pointer, or recursion that went too deep.",
    };
  }
  if (/Floating point exception/.test(stderr) || exitCode === 136) {
    return { title: "Runtime Error · Division by Zero (SIGFPE)", hint: "Almost always an integer division or modulo (%) by zero." };
  }
  if (/Aborted/.test(stderr) || exitCode === 134) {
    return { title: "Runtime Error · Aborted (SIGABRT)", hint: "The program stopped itself — usually a failed assert() or an uncaught exception." };
  }
  if (/Killed/.test(stderr) || exitCode === 137) {
    return { title: "Runtime Error · Killed", hint: "The judge stopped the program — usually because it used too much memory." };
  }
  if (exitCode !== null && exitCode !== 0 && !stderr.trim()) {
    return { title: `Runtime Error · exit code ${exitCode}`, hint: "The program ended with a non-zero exit code. Make sure main() returns 0 and you don't call exit() with an error code." };
  }
  return null;
};

const diagnoseCompilation = (language: Language, output: string): Omit<RunDiagnostic, "tone"> => {
  if (language === "cpp") {
    const match = output.match(/main\.cpp:(\d+):(\d+):\s*(?:fatal\s+)?error:\s*(.+)/);
    if (match) {
      return {
        title: "Compilation Error",
        message: match[3].trim(),
        line: Number(match[1]),
        column: Number(match[2]),
        hint: "Fix the first error first — the ones after it are often caused by it (a missing ; or } usually shows up on the next line).",
      };
    }
  }
  if (language === "typescript") {
    const match = output.match(/script\.ts\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)/);
    if (match) {
      const message = match[4].trim();
      return {
        title: "Compilation Error",
        message: `${message} (${match[3]})`,
        line: Number(match[1]),
        column: Number(match[2]),
        hint: /Cannot find module/.test(message)
          ? "import isn't supported here — read input with require('fs').readFileSync(0, 'utf8') instead."
          : "TypeScript found a type error. Fix the type on the marked line (or annotate the value) and run again.",
      };
    }
  }
  const firstLine = output.split("\n").find((text) => text.trim());
  return { title: "Compilation Error", message: firstLine?.trim(), hint: "Your code didn't compile. Read the compiler output below." };
};

const diagnoseRuntime = (language: Language, result: RunCaseResult): Omit<RunDiagnostic, "tone"> => {
  const { stderr, exitCode } = result;

  if (language === "python") {
    const error = parsePythonError(stderr);
    if (error) {
      const isSyntax = ["SyntaxError", "IndentationError", "TabError"].includes(error.name);
      return {
        title: `${isSyntax ? "Syntax Error" : "Runtime Error"} · ${error.name}`,
        message: error.message || undefined,
        line: error.line,
        hint: PYTHON_HINTS[error.name] ?? "Read the error message — it names the exact problem on the marked line.",
      };
    }
  }

  if (language === "javascript" || language === "typescript") {
    const error = parseJavaScriptError(stderr);
    if (error) {
      const messageHint = JS_MESSAGE_HINTS.find(([pattern]) => pattern.test(error.message))?.[1];
      return {
        title: `${error.name === "SyntaxError" ? "Syntax Error" : "Runtime Error"} · ${error.name}`,
        message: error.message || undefined,
        // TypeScript runs as compiled JavaScript, whose line numbers don't
        // reliably match the .ts source — only point at a line for plain JS.
        line: language === "javascript" ? error.line : undefined,
        column: language === "javascript" ? error.column : undefined,
        hint: messageHint ?? JS_NAME_HINTS[error.name] ?? "Read the error message — it names the exact problem.",
      };
    }
  }

  return (
    diagnoseNativeCrash(stderr, exitCode) ?? {
      title: "Runtime Error",
      message: stderr.split("\n").find((text) => text.trim())?.trim(),
      hint: "Your program crashed while running. Read the error output below.",
    }
  );
};

const diagnoseWrongAnswer = (result: RunCaseResult): Omit<RunDiagnostic, "tone"> => {
  const expected = normalizeOutput(result.expectedOutput ?? "");
  const actual = normalizeOutput(result.stdout);
  let hint: string;
  if (!actual) {
    hint = "Your program didn't print anything. Print the answer — and if your code is inside a function (like solve()), make sure you actually call it.";
  } else if (actual.toLowerCase() === expected.toLowerCase()) {
    hint = "Only upper/lower case differs — for example printing True/False instead of true/false.";
  } else if (actual.split(/\s+/).join(" ") === expected.split(/\s+/).join(" ")) {
    hint = "The values are right but the layout differs — check spaces vs. new lines in the output format.";
  } else {
    const difference = firstDifference(expected, actual);
    hint = difference
      ? `First difference is on output line ${difference.line}: expected ${difference.expected === null ? "no more lines" : `"${difference.expected}"`}, but your program printed ${difference.actual === null ? "nothing" : `"${difference.actual}"`}.`
      : "Your output doesn't match the expected output.";
  }
  if (result.stderr.trim()) hint += " Your program also wrote to stderr — see the full output below.";
  return { title: "Wrong Answer", hint };
};

export const diagnoseCase = (language: Language, result: RunCaseResult, limits: RunLimits): RunDiagnostic => {
  const tone = OUTCOME_TONE[result.outcome];
  switch (result.outcome) {
    case "PASSED":
      return { tone, title: "Passed" };
    case "NO_EXPECTED":
      return { tone, title: "Finished without errors" };
    case "SKIPPED":
      return { tone, title: "Not run", hint: "Skipped because the code didn't compile." };
    case "WRONG_ANSWER":
      return { tone, ...diagnoseWrongAnswer(result) };
    case "COMPILATION_ERROR":
      return { tone, ...diagnoseCompilation(language, result.compileOutput || result.stderr) };
    case "TIME_LIMIT_EXCEEDED":
      return {
        tone,
        title: "Time Limit Exceeded",
        hint: `Your code didn't finish within ${limits.timeLimitMs} ms. Look for a loop that never ends (or never reaches its exit condition), or use a faster algorithm.`,
      };
    case "MEMORY_LIMIT_EXCEEDED":
      return {
        tone,
        title: "Memory Limit Exceeded",
        hint: `Your program used more than the ${limits.memoryLimitMb} MB memory limit. Avoid huge arrays or strings, and check for recursion or loops that keep allocating.`,
      };
    case "RUNTIME_ERROR":
      return { tone, ...diagnoseRuntime(language, result) };
  }
};

/** The case whose details the panel opens on: the first failure, else the first case. */
export const primaryCaseIndex = (result: RunResult): number => {
  const failing = result.cases.findIndex((item) => isFailure(item.outcome));
  return failing === -1 ? 0 : failing;
};

/** Headline for the whole run (all samples together). */
export const summarizeRun = (language: Language, result: RunResult, limits: RunLimits): RunDiagnostic => {
  const primary = result.cases[primaryCaseIndex(result)];
  if (!primary) return { tone: "info", title: "No output" };
  if (result.outcome === "PASSED") {
    return {
      tone: "ok",
      title: result.total === 1 ? "Sample test passed" : `All ${result.total} sample tests passed`,
      hint: "Nice! Submit to run your code against the hidden tests as well.",
    };
  }
  const diagnostic = diagnoseCase(language, primary, limits);
  if (result.outcome === "NO_EXPECTED") return diagnostic;
  const onSample = result.outcome !== "COMPILATION_ERROR" && result.total > 1 ? ` on sample ${primary.index + 1}` : "";
  return { ...diagnostic, title: `${diagnostic.title}${onSample}` };
};
