function sections(md) {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let cur = null;
  for (const line of lines) {
    const h = /^##\s+(.*?)\s*$/.exec(line);
    if (h && !line.startsWith("###")) {
      cur = { head: h[1], body: [] };
      out.push(cur);
    } else if (cur) {
      cur.body.push(line);
    }
  }
  return out;
}

function bulletsOf(body) {
  return body
    .filter((l) => /^\s*[-*]\s+/.test(l))
    .map((l) => l.replace(/^\s*[-*]\s+/, "").trim())
    .filter(Boolean);
}

export function parseChangelog(md) {
  const result = [];
  for (const s of sections(md)) {
    const m = /^\[?(\d+\.\d+\.\d+[^\s\])]*)\]?\s*\((\d{4}-\d{2}-\d{2})\)$/.exec(s.head);
    if (!m) continue;
    const summary = s.body
      .filter((l) => l.trim() && !/^\s*[-*]\s+/.test(l))
      .map((l) => l.trim())
      .join(" ");
    result.push({ v: m[1], date: m[2], summary, bullets: bulletsOf(s.body) });
  }
  return result;
}

export function unreleased(md) {
  const s = sections(md).find((x) => /^unreleased$/i.test(x.head));
  return s ? bulletsOf(s.body) : [];
}
