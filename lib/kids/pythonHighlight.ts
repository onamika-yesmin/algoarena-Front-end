// A tiny, forgiving Python tokenizer for the kids' code editor colours.
// It works line by line and never throws — half-typed code (an unclosed
// quote, a stray bracket) still gets sensible colours.

export type TokenKind = "keyword" | "builtin" | "string" | "number" | "comment" | "operator" | "plain";

export interface Token {
  kind: TokenKind;
  text: string;
}

const KEYWORDS = new Set([
  "and", "as", "break", "continue", "def", "elif", "else", "False", "for", "from",
  "if", "import", "in", "is", "None", "not", "or", "pass", "return", "True", "while",
]);

const BUILTINS = new Set(["abs", "float", "input", "int", "len", "max", "min", "print", "range", "round", "str"]);

// Every character matches exactly one group, so nothing is ever dropped.
const TOKEN_PATTERN = /(#.*$)|("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?)|(\d+(?:\.\d+)?)|([A-Za-z_]\w*)|([^\sA-Za-z_\d"'#]+)|(\s+)/g;

export function tokenizePythonLine(line: string): Token[] {
  const tokens: Token[] = [];
  for (const match of line.matchAll(TOKEN_PATTERN)) {
    const [text, comment, string, number, word, operator] = match;
    let kind: TokenKind = "plain";
    if (comment) kind = "comment";
    else if (string) kind = "string";
    else if (number) kind = "number";
    else if (word) kind = KEYWORDS.has(word) ? "keyword" : BUILTINS.has(word) ? "builtin" : "plain";
    else if (operator) kind = "operator";

    const previous = tokens[tokens.length - 1];
    if (previous && previous.kind === kind && kind === "plain") previous.text += text;
    else tokens.push({ kind, text });
  }
  return tokens;
}
