import React from "react";

interface Props {
  content?: string;
}

export const MarkdownRenderer: React.FC<Props> = ({ content = "" }) => {
  // Simple markdown renderer for preview
  const renderFormatted = (text: string) => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];

    lines.forEach((line, index) => {
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${index}`}>
              <code>{codeBuffer.join("\n")}</code>
            </pre>
          );
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      if (line.startsWith("# ")) {
        elements.push(<h1 key={index}>{line.slice(2)}</h1>);
      } else if (line.startsWith("## ")) {
        elements.push(<h2 key={index}>{line.slice(3)}</h2>);
      } else if (line.startsWith("### ")) {
        elements.push(<h3 key={index}>{line.slice(4)}</h3>);
      } else if (line.startsWith("> ")) {
        elements.push(
          <blockquote
            key={index}
            style={{
              borderLeft: "3px solid var(--green)",
              paddingLeft: "12px",
              margin: "12px 0",
              color: "var(--muted)",
            }}
          >
            {line.slice(2)}
          </blockquote>
        );
      } else if (line.startsWith("- ")) {
        elements.push(
          <li key={index} style={{ marginLeft: "20px" }}>
            {line.slice(2)}
          </li>
        );
      } else if (line.trim() === "") {
        elements.push(<br key={index} />);
      } else {
        elements.push(<p key={index}>{line}</p>);
      }
    });

    if (inCodeBlock && codeBuffer.length > 0) {
      elements.push(
        <pre key="code-last">
          <code>{codeBuffer.join("\n")}</code>
        </pre>
      );
    }

    return elements;
  };

  return <div className="rich-markdown">{renderFormatted(content)}</div>;
};
