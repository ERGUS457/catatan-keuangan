import React from "react";

/**
 * Renderer markdown sangat ringan untuk jawaban AI:
 * heading (##), bullet (- / *), numbering (1.), dan **bold**.
 * Sengaja tanpa library agar bundle tetap kecil.
 */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    parts.push(
      <strong key={`${keyPrefix}-b${i}`} className="text-white font-semibold">
        {match[1]}
      </strong>
    );
    last = match.index + match[0].length;
    i++;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function SimpleMarkdown({ text }: { text: string }) {
  const lines = (text || "").split("\n");
  const nodes: React.ReactNode[] = [];
  let bullets: React.ReactNode[] = [];
  let ordered: React.ReactNode[] = [];

  const flush = (key: string) => {
    if (bullets.length > 0) {
      nodes.push(
        <ul key={`${key}-ul`} className="list-disc pl-5 space-y-1 my-1.5">
          {bullets}
        </ul>
      );
      bullets = [];
    }
    if (ordered.length > 0) {
      nodes.push(
        <ol key={`${key}-ol`} className="list-decimal pl-5 space-y-1 my-1.5">
          {ordered}
        </ol>
      );
      ordered = [];
    }
  };

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    const key = `l${idx}`;

    if (!line) {
      flush(key);
      return;
    }

    if (line.startsWith("### ")) {
      flush(key);
      nodes.push(
        <h4 key={key} className="text-sm font-bold text-white mt-3 mb-1">
          {renderInline(line.slice(4), key)}
        </h4>
      );
      return;
    }
    if (line.startsWith("## ") || line.startsWith("# ")) {
      flush(key);
      nodes.push(
        <h3 key={key} className="text-sm font-bold text-blue-300 mt-3 mb-1">
          {renderInline(line.replace(/^#+\s*/, ""), key)}
        </h3>
      );
      return;
    }
    const bullet = line.match(/^[-*]\s+(.*)/);
    if (bullet) {
      bullets.push(
        <li key={key} className="text-xs text-slate-300 leading-relaxed">
          {renderInline(bullet[1], key)}
        </li>
      );
      return;
    }
    const orderedItem = line.match(/^\d+[.)]\s+(.*)/);
    if (orderedItem) {
      ordered.push(
        <li key={key} className="text-xs text-slate-300 leading-relaxed">
          {renderInline(orderedItem[1], key)}
        </li>
      );
      return;
    }

    flush(key);
    nodes.push(
      <p key={key} className="text-xs text-slate-300 leading-relaxed my-1">
        {renderInline(line, key)}
      </p>
    );
  });

  flush("end");

  return <div className="space-y-0.5">{nodes}</div>;
}
