import type { DecisionBrief } from "../decisionBrief";

export function BriefPreview({ document }: { document: DecisionBrief }) {
  return (
    <article
      className="brief-document"
      aria-label="Investigation brief document"
      tabIndex={0}
    >
      <header className="brief-document-header">
        <span className="eyebrow">{document.title}</span>
        <p className="brief-summary">{document.summary}</p>
        <p className="brief-scope">{document.scope}</p>
        <p className="brief-question">{document.question}</p>
      </header>
      {document.sections.map((section) => (
        <section className="brief-section" key={section.title}>
          <h3>{section.title}</h3>
          {!!section.points?.length &&
            (section.ordered ? (
              <ol>
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ol>
            ) : (
              <ul>
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            ))}
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
      <details className="brief-sources">
        <summary>Supporting evidence · {document.sources.length} links</summary>
        <ul>
          {document.sources.map((source, i) => (
            <li key={`${source.url}-${i}`}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
        <p>{document.participants.join(" · ")}</p>
      </details>
      <p className="brief-disclosure">{document.disclosure}</p>
    </article>
  );
}
