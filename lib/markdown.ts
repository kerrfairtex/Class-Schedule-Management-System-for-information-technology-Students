export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(text: string): string {
  let t = escapeHtml(text);
  t = t.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => {
    const safe = href.startsWith("http") ? href : href;
    return `<a href="${safe}">${label}</a>`;
  });
  return t;
}

function renderTable(headerLine: string, rows: string[]): string {
  const splitRow = (line: string) =>
    line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => inline(c.trim()));
  const headers = splitRow(headerLine);
  let html = '<div class="table-wrap"><table><thead><tr>';
  for (const h of headers) html += `<th>${h}</th>`;
  html += "</tr></thead><tbody>";
  for (const row of rows) {
    html += "<tr>";
    for (const cell of splitRow(row)) html += `<td>${cell}</td>`;
    html += "</tr>";
  }
  html += "</tbody></table></div>";
  return html;
}

export function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let i = 0;
  let inCode = false;
  let codeLang = "";
  const codeBuf: string[] = [];

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCode) {
        out.push(`<pre><code class="lang-${codeLang || "text"}">${codeBuf.join("\n")}</code></pre>`);
        codeBuf.length = 0;
        inCode = false;
      } else {
        inCode = true;
        codeLang = trimmed.slice(3).trim();
      }
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(escapeHtml(line));
      i++;
      continue;
    }

    if (trimmed.startsWith("|")) {
      const next = lines[i + 1]?.trim() ?? "";
      if (/^\|[\s\-:|]+\|$/.test(next)) {
        const header = trimmed;
        const rows: string[] = [];
        i += 2;
        while (i < lines.length && lines[i].trim().startsWith("|")) {
          rows.push(lines[i].trim());
          i++;
        }
        out.push(renderTable(header, rows));
        continue;
      }
    }

    const h3 = trimmed.match(/^###\s+(.+)/);
    if (h3) {
      out.push(`<h3>${inline(h3[1])}</h3>`);
      i++;
      continue;
    }
    const h4 = trimmed.match(/^####\s+(.+)/);
    if (h4) {
      out.push(`<h4>${inline(h4[1])}</h4>`);
      i++;
      continue;
    }
    if (/^-{3,}$/.test(trimmed)) {
      out.push("<hr />");
      i++;
      continue;
    }
    if (trimmed.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(`<li>${inline(lines[i].trim().slice(2))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    const numMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (numMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(/^\d+\.\s+(.+)/);
        if (m) {
          items.push(`<li>${inline(m[1])}</li>`);
          i++;
        } else break;
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{2,4}\s|- )/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith("|") &&
      !lines[i].trim().startsWith("```")
    ) {
      para.push(lines[i].trim());
      i++;
    }
    if (para.length) {
      out.push(`<p>${inline(para.join(" "))}</p>`);
    } else {
      i++;
    }
  }
  return out.join("\n");
}
