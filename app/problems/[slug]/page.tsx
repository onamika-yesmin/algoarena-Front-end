"use client";
import { useState } from "react";
import { appConfig } from "@/lib/config";

const apiUrl = appConfig.apiUrl;
const starter = { javascript: 'const input = require("fs").readFileSync(0, "utf8").trim();\nconsole.log(input);', typescript: 'const input = require("fs").readFileSync(0, "utf8").trim();\nconsole.log(input);', python: 'import sys\nprint(sys.stdin.read().strip())' };

export default function ProblemDetailPage() {
  const [language, setLanguage] = useState<keyof typeof starter>("javascript");
  const [source, setSource] = useState(starter.javascript); const [stdin, setStdin] = useState("Hello AlgoArena");
  const [output, setOutput] = useState("Sign in, then run your code to see output here."); const [running, setRunning] = useState(false);
  const runCode = async () => { setRunning(true); setOutput("Running…"); try { const response = await fetch(`${apiUrl}/api/submissions/execute`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ language, source, stdin }) }); const result = await response.json(); if (!response.ok) throw new Error(result.message ?? "Execution failed."); const stage = result.data.run ?? result.data.compile; setOutput(stage.output || stage.stderr || "Finished with no output."); } catch (error) { setOutput(error instanceof Error ? error.message : "Execution failed."); } finally { setRunning(false); } };
  return <main className="workspace section-shell"><section><p className="eyebrow"><b />CODE WORKSPACE</p><h1>Test your solution.</h1><p>Sign in to execute JavaScript, TypeScript, or Python in a constrained remote runner.</p></section><div className="runner-grid"><section className="runner-panel"><div className="runner-bar"><select value={language} onChange={(event) => { const next = event.target.value as keyof typeof starter; setLanguage(next); setSource(starter[next]); }}><option value="javascript">JavaScript</option><option value="typescript">TypeScript</option><option value="python">Python</option></select><button className="button button-small" onClick={runCode} disabled={running}>{running ? "Running…" : "Run code"}</button></div><textarea aria-label="Code editor" value={source} onChange={(event) => setSource(event.target.value)} /></section><section className="runner-panel"><label>Standard input<textarea value={stdin} onChange={(event) => setStdin(event.target.value)} /></label><label>Output<pre>{output}</pre></label></section></div></main>;
}
