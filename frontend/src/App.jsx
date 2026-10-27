import { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { json } from "@codemirror/lang-json";
import { sql } from "@codemirror/lang-sql";
import {
  Activity,
  Bug,
  CheckCircle2,
  ChevronDown,
  Code2,
  FileCode2,
  Folder,
  Gauge,
  GitBranch,
  History,
  LayoutDashboard,
  Play,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
  AlertTriangle,
  CheckCircle,
  Info,
  Wrench,
} from "lucide-react";
import "./App.css";

const samples = {
  python: `def find_duplicates(items):
    duplicates = []
    for item in items:
        if items.count(item) > 1:
            duplicates.append(item)
    return duplicates

numbers = [1, 2, 3, 2, 4, 1]
print(find_duplicates(numbers))`,
  javascript: `function findDuplicates(items) {
  const duplicates = [];
  for (const item of items) {
    if (items.filter(x => x === item).length > 1) {
      duplicates.push(item);
    }
  }
  return duplicates;
}

console.log(findDuplicates([1, 2, 3, 2, 4, 1]));`,
  cpp: `#include <iostream>
#include <vector>
using namespace std;

int findSum(vector<int> values) {
    int sum = 0;
    for (int value : values) {
        sum += value;
    }
    return sum;
}

int main() {
    cout << findSum({1, 2, 3, 4});
    return 0;
}`,
  java: `import java.util.*;

public class Main {
    static int findSum(int[] values) {
        int sum = 0;
        for (int value : values) {
            sum += value;
        }
        return sum;
    }

    public static void main(String[] args) {
        System.out.println(findSum(new int[]{1, 2, 3, 4}));
    }
}`,
  json: `{
  "project": "Code Review Studio",
  "language": "Python",
  "features": [
    "Security analysis",
    "Complexity analysis",
    "AI suggestions"
  ]
}`,
  sql: `SELECT *
FROM users
WHERE name = 'example';`,
};

const languageExtensions = {
  python: python(),
  javascript: javascript(),
  cpp: cpp(),
  java: java(),
  json: json(),
  sql: sql(),
};

function parseAIReview(raw) {
  if (raw && typeof raw === "object") return raw;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      return null;
    }
  }

  return null;
}

function getReviewIssues(report) {
  if (!Array.isArray(report?.sections)) return [];

  return report.sections.flatMap((section, sectionIndex) =>
    (Array.isArray(section.issues) ? section.issues : []).map(
      (issue, issueIndex) => ({
        ...issue,
        sectionName: section.name || "General",
        id: `${sectionIndex}-${issueIndex}-${issue.line ?? "unknown"}`,
      })
    )
  );
}

function getSeverity(severity) {
  const value = String(severity || "info").toLowerCase();

  if (value.includes("critical")) return "Critical";
  if (value.includes("high")) return "High";
  if (value.includes("medium")) return "Medium";
  if (value.includes("low")) return "Low";
  return "Info";
}

function SeverityIcon({ severity }) {
  const value = getSeverity(severity);

  if (value === "Critical" || value === "High") {
    return <AlertTriangle size={15} />;
  }

  if (value === "Medium") {
    return <Bug size={15} />;
  }

  if (value === "Low") {
    return <Info size={15} />;
  }

  return <CheckCircle size={15} />;
}

function FindingCard({ issue }) {
  const severity = getSeverity(issue.severity);

  return (
    <article className="finding-card">
      <div className="finding-header">
        <div className="finding-title-group">
          <div className="finding-icon">
            <SeverityIcon severity={severity} />
          </div>
          <div>
            <h4>{issue.title || "Code improvement suggestion"}</h4>
            <span className="finding-category">
              {issue.sectionName}
              {issue.line != null ? ` · Line ${issue.line}` : ""}
            </span>
          </div>
        </div>

        <span className={`severity-badge severity-${severity.toLowerCase()}`}>
          {severity}
        </span>
      </div>

      {issue.confidence != null && (
        <p className="finding-confidence">
          Confidence:{" "}
          {typeof issue.confidence === "number"
            ? `${Math.round(
                issue.confidence <= 1
                  ? issue.confidence * 100
                  : issue.confidence
              )}%`
            : issue.confidence}
        </p>
      )}

      {issue.evidence && (
        <div className="finding-detail">
          <strong>Evidence</strong>
          <p>{issue.evidence}</p>
        </div>
      )}

      {issue.impact && (
        <div className="finding-detail">
          <strong>Impact</strong>
          <p>{issue.impact}</p>
        </div>
      )}

      {issue.recommendation && (
        <div className="finding-detail">
          <strong>
            <Wrench size={14} /> Recommended fix
          </strong>
          <p>{issue.recommendation}</p>
        </div>
      )}

      {issue.example_fix && (
        <div className="finding-detail">
          <strong>Example fix</strong>
          <pre className="finding-code">
            {typeof issue.example_fix === "string"
              ? issue.example_fix
              : JSON.stringify(issue.example_fix, null, 2)}
          </pre>
        </div>
      )}
    </article>
  );
}

function FindingsList({ findings, emptyMessage }) {
  if (findings.length === 0) {
    return (
      <div className="empty-results">
        <div className="empty-icon">
          <CheckCircle2 size={24} />
        </div>
        <strong>No findings in this section</strong>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="findings-list">
      {findings.map((issue) => (
        <FindingCard key={issue.id} issue={issue} />
      ))}
    </div>
  );
}

function App() {
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(samples.python);
  const [activeTab, setActiveTab] = useState("overview");
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runReview() {
    setLoading(true);
    setError("");
    setReview(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/review/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : Array.isArray(result.detail)
              ? result.detail.map((item) => item.msg).join(", ")
              : "The review request failed."
        );
      }

      setReview(result);
      setActiveTab("overview");
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot reach the backend. Start FastAPI and check its CORS settings."
          : err.message || "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  const analysis = review?.static_analysis;
  const report = parseAIReview(review?.ai_review);
  const findings = getReviewIssues(report);

  const securityFindings = findings.filter((issue) =>
    /security|vulnerabilit|injection|authentication|authori[sz]ation/i.test(
      issue.sectionName
    )
  );

  const performanceFindings = findings.filter((issue) =>
    /performance|complexity|efficiency|optimization/i.test(issue.sectionName)
  );

  const qualityFindings = findings.filter((issue) =>
    /quality|maintainability|style|readability|general/i.test(issue.sectionName)
  );

  const legacyReview =
    typeof review?.ai_review === "string" && !report
      ? review.ai_review
      : "";

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <Code2 size={21} />
          </div>
          <span>
            Code<span className="brand-accent">Studio</span>
          </span>
          <span className="brand-version">AI</span>
        </div>

        <div className="topbar-center">
          <span className="breadcrumb-muted">workspace</span>
          <span className="breadcrumb-slash">/</span>
          <span>code-review</span>
          <ChevronDown size={14} />
        </div>

        <div className="topbar-actions">
          <span className="connection">
            <span /> API workspace
          </span>
          <button className="icon-button" title="Settings">
            <Settings size={17} />
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="activity-bar">
          <button className="activity-item active" title="Explorer">
            <FilesIcon />
          </button>
          <button className="activity-item" title="Search">
            <Search size={21} />
          </button>
          <button className="activity-item" title="Review history">
            <History size={21} />
          </button>
          <div className="activity-spacer" />
          <button className="activity-item" title="Settings">
            <Settings size={20} />
          </button>
        </aside>

        <aside className="explorer">
          <div className="explorer-heading">EXPLORER</div>
          <div className="folder-heading">
            <ChevronDown size={14} />
            <Folder size={15} /> WORKSPACE
          </div>

          <button
            className={`file-row ${language === "python" ? "selected" : ""}`}
            onClick={() => {
              setLanguage("python");
              setCode(samples.python);
              setReview(null);
              setError("");
            }}
          >
            <FileCode2 size={16} className="python-color" /> main.py
          </button>

          <button
            className={`file-row ${language === "javascript" ? "selected" : ""}`}
            onClick={() => {
              setLanguage("javascript");
              setCode(samples.javascript);
              setReview(null);
              setError("");
            }}
          >
            <FileCode2 size={16} className="js-color" /> example.js
          </button>

          <button
            className={`file-row ${language === "cpp" ? "selected" : ""}`}
            onClick={() => {
              setLanguage("cpp");
              setCode(samples.cpp);
              setReview(null);
              setError("");
            }}
          >
            <FileCode2 size={16} className="cpp-color" /> example.cpp
          </button>

          <div className="explorer-note">
            <Sparkles size={16} />
            <p>Ready to improve your code?</p>
            <span>
              Run an AI review to discover bugs, security risks and performance
              opportunities.
            </span>
          </div>

          <div className="explorer-bottom">
            <GitBranch size={14} /> main <span>•</span> Workspace
          </div>
        </aside>

        <main className="main-workspace">
          <div className="editor-tabs">
            <div className="editor-tab">
              <FileCode2 size={15} className="python-color" />
              main.
              {language === "javascript"
                ? "js"
                : language === "cpp"
                  ? "cpp"
                  : language === "java"
                    ? "java"
                    : language === "json"
                      ? "json"
                      : language === "sql"
                        ? "sql"
                        : "py"}
              <span className="tab-close">×</span>
            </div>

            <button className="new-tab" title="New tab">
              <Plus size={15} />
            </button>
            <div className="editor-tab-spacer" />
            <span className="editor-language">{language.toUpperCase()}</span>
          </div>

          <section className="editor-heading">
            <div>
              <h1>Code Review Workspace</h1>
              <p>Write code. Find issues. Ship with confidence.</p>
            </div>

            <button
              className="review-button"
              onClick={runReview}
              disabled={loading || !code.trim()}
            >
              {loading ? (
                <span className="spinner" />
              ) : (
                <Play size={15} fill="currentColor" />
              )}
              {loading ? "Analyzing..." : "Review Code"}
            </button>
          </section>

          <div className="editor-toolbar">
            <div className="toolbar-language">
              <Code2 size={15} />
              <select
                value={language}
                onChange={(event) => {
                  const next = event.target.value;
                  setLanguage(next);
                  setCode(samples[next]);
                  setReview(null);
                  setError("");
                }}
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="cpp">C++</option>
                <option value="java">Java</option>
                <option value="json">JSON</option>
                <option value="sql">SQL</option>
              </select>
              <ChevronDown size={13} />
            </div>

            <span className="toolbar-hint">
              Try editing the sample or paste your own code
            </span>

            <button
              className="clear-button"
              onClick={() => {
                setCode("");
                setReview(null);
                setError("");
              }}
            >
              Clear
            </button>
          </div>

          <div className="code-editor">
            <CodeMirror
              value={code}
              height="100%"
              extensions={[languageExtensions[language]]}
              onChange={(value) => setCode(value)}
              theme="dark"
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                highlightActiveLine: true,
                autocompletion: true,
              }}
            />
          </div>

          <div className="editor-status">
            <span>
              <GitBranch size={13} /> main
            </span>
            <span>
              <CheckCircle2 size={13} /> Editor ready
            </span>
            <span>Ln {code.split("\n").length}</span>
            <span>{language.toUpperCase()}</span>
          </div>

          <section className="results-section">
            <div className="results-heading">
              <div className="results-title">
                <Terminal size={16} />
                <h2>Analysis results</h2>
              </div>
              <span className="results-subtitle">
                {review ? "Latest review" : "Results will appear here"}
              </span>
            </div>

            <div className="results-tabs">
              {[
                ["overview", "Overview", LayoutDashboard],
                ["security", "Security", ShieldCheck],
                ["performance", "Performance", Gauge],
                ["quality", "Code quality", Bug],
              ].map(([id, label, Icon]) => (
                <button
                  key={id}
                  className={`result-tab ${activeTab === id ? "active" : ""}`}
                  onClick={() => setActiveTab(id)}
                >
                  <Icon size={14} /> {label}
                  {id === "overview" && review && (
                    <span className="tab-count">{findings.length}</span>
                  )}
                </button>
              ))}
            </div>

            {error && (
              <div className="error-panel">
                <Bug size={18} />
                <div>
                  <strong>Review couldn't run</strong>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {!review && !error && (
              <div className="empty-results">
                <div className="empty-icon">
                  <Activity size={24} />
                </div>
                <strong>Your code insights will appear here</strong>
                <p>
                  Click <b>Review Code</b> to get AI feedback, complexity
                  metrics, security observations and actionable fixes.
                </p>
              </div>
            )}

            {review && (
              <div className="result-content">
                {activeTab === "overview" && (
                  <>
                    <div className="metric-grid">
                      <Metric
                        label="Lines of code"
                        value={analysis?.lines_of_code ?? "—"}
                        icon={Code2}
                      />
                      <Metric
                        label="Functions"
                        value={analysis?.function_count ?? "—"}
                        icon={Zap}
                      />
                      <Metric
                        label="Maintainability"
                        value={analysis?.maintainability_index ?? "—"}
                        icon={Gauge}
                      />
                      <Metric
                        label="Findings"
                        value={findings.length}
                        icon={ShieldCheck}
                      />
                    </div>

                    <h3 className="review-output-title">
                      <Sparkles size={16} /> AI Code Review
                    </h3>

                    {report ? (
                      <>
                        
                        {report.summary && (
                          <div className="review-summary">
                            <h4>Executive summary</h4>
                            <p>
                              {typeof report.summary === "string"
                                ? report.summary
                                : report.summary.overview ||
                                report.summary.title ||
                                JSON.stringify(report.summary)}
                            </p>
                          </div>
                        )}
                         




                        {report.metrics &&
                          Object.keys(report.metrics).length > 0 && (
                            <div className="review-summary">
                              <h4>Review metrics</h4>
                              <ul>
                                {Object.entries(report.metrics).map(
                                  ([key, value]) => (
                                    <li key={key}>
                                      <strong>
                                        {key
                                          .replace(/_/g, " ")
                                          .replace(/\b\w/g, (char) =>
                                            char.toUpperCase()
                                          )}
                                        :
                                      </strong>{" "}
                                      {typeof value === "object"
                                        ? JSON.stringify(value)
                                        : String(value)}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}

                        <FindingsList
                          findings={findings}
                          emptyMessage="The AI did not return any individual issues. Review the summary and verify the code before relying on it."
                        />

                        {Array.isArray(report.recommended_fixes) &&
                          report.recommended_fixes.length > 0 && (
                            <div className="review-summary">
                              <h4>Additional recommended fixes</h4>
                              <ul>
                                {report.recommended_fixes.map((fix, index) => (
                                  <li key={index}>
                                    {typeof fix === "string"
                                      ? fix
                                      : JSON.stringify(fix)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {Array.isArray(report.limitations) &&
                          report.limitations.length > 0 && (
                            <div className="review-summary">
                              <h4>Limitations</h4>
                              <ul>
                                {report.limitations.map((item, index) => (
                                  <li key={index}>
                                    {typeof item === "string"
                                      ? item
                                      : JSON.stringify(item)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </>
                    ) : (
                      <pre className="review-text">
                        {legacyReview || "No review text was returned."}
                      </pre>
                    )}

                    <h3 className="review-output-title">
                      Cyclomatic complexity
                    </h3>

                    {(analysis?.functions || []).length === 0 ? (
                      <p className="muted-copy">
                        No function or class complexity blocks were reported.
                      </p>
                    ) : (
                      analysis.functions.map((fn, index) => (
                        <div
                          className="function-row"
                          key={`${fn.name}-${index}`}
                        >
                          <div>
                            <Code2 size={15} />
                            <span>{fn.name}</span>
                            <small>Line {fn.line}</small>
                          </div>
                          <span className="complexity-value">
                            {fn.complexity} · Rank {fn.rank}
                          </span>
                        </div>
                      ))
                    )}
                  </>
                )}

                {activeTab === "security" && (
                  report ? (
                    <FindingsList
                      findings={securityFindings}
                      emptyMessage="No security-specific findings were returned. This does not guarantee that the code is secure."
                    />
                  ) : (
                    <ReviewText
                      text={review.ai_review}
                      section="Security"
                    />
                  )
                )}

                {activeTab === "performance" && (
                  <>
                    {report ? (
                      <FindingsList
                        findings={performanceFindings}
                        emptyMessage="No performance-specific findings were returned. This does not mean the code has been fully performance-tested."
                      />
                    ) : (
                      <ReviewText
                        text={review.ai_review}
                        section="Performance"
                      />
                    )}
                    <p className="muted-copy">
                      Cyclomatic complexity measures branching complexity; it
                      is not the same as Big-O time or space complexity.
                    </p>
                  </>
                )}

                {activeTab === "quality" && (
                  report ? (
                    <FindingsList
                      findings={qualityFindings}
                      emptyMessage="No code-quality findings were returned."
                    />
                  ) : (
                    <ReviewText
                      text={review.ai_review}
                      section="Code quality"
                    />
                  )
                )}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function FilesIcon() {
  return <Folder size={21} />;
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="metric-card">
      <div className="metric-icon">
        <Icon size={16} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ReviewText({ text, section }) {
  const content = typeof text === "string" ? text : "";
  const lowerContent = content.toLowerCase();
  const start = lowerContent.indexOf(section.toLowerCase());

  if (start < 0) {
    return (
      <pre className="review-text">
        {content || "No information was returned."}
      </pre>
    );
  }

  const nextHeading = content.indexOf("\n", start);

  return (
    <pre className="review-text">
      {content.slice(start, nextHeading < 0 ? undefined : nextHeading)}
    </pre>
  );
}

export default App;
