import { SCHOOL_NAME_SHORT } from '../config/schoolBrand';

export interface LessonPlanPrintSection {
  label: string;
  value: string | null | undefined;
}

export interface LessonPlanPrintInput {
  schoolName?: string;
  title: string;
  topicLine: string;
  lessonDate: string | null | undefined;
  status: string;
  sections: LessonPlanPrintSection[];
}

/** Opens a print-friendly window (user can “Save as PDF” from the print dialog). */
export function openLessonPlanPrint(input: LessonPlanPrintInput): void {
  const school = input.schoolName ?? SCHOOL_NAME_SHORT;
  const dateStr = input.lessonDate
    ? new Date(input.lessonDate).toLocaleDateString('en-NG', { dateStyle: 'medium' })
    : '—';
  const bodySections = input.sections
    .filter(s => s.value && String(s.value).trim())
    .map(
      s => {
        const rawVal = String(s.value).trim();
        // Escape HTML, then replace ![alt](url) with a styled img tag
        let formatted = escapeHtml(rawVal);
        formatted = formatted.replace(/!\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/gi, (_, alt, url) => {
          return `<br/><img src="${url}" alt="${alt}" style="max-width: 100%; max-height: 380px; height: auto; display: block; margin: 12px auto; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #eee; page-break-inside: avoid;" /><br/>`;
        });
        return `
        <section class="block">
          <h2>${escapeHtml(s.label)}</h2>
          <div class="pre">${formatted}</div>
        </section>`;
      }
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(input.title)}</title>
  <style>
    body { font-family: system-ui, Segoe UI, Roboto, sans-serif; color: #111; margin: 24px; line-height: 1.45; }
    h1 { font-size: 1.35rem; margin: 0 0 8px; }
    .meta { font-size: 0.85rem; color: #555; margin-bottom: 20px; }
    .block { margin-bottom: 18px; page-break-inside: avoid; }
    h2 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: #666; margin: 0 0 6px; }
    .pre { white-space: pre-wrap; font-size: 0.95rem; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(input.title)}</h1>
  <p class="meta">${escapeHtml(school)} · ${escapeHtml(input.topicLine)} · Date: ${escapeHtml(dateStr)} · Status: ${escapeHtml(input.status)}</p>
  ${bodySections}
</body>
</html>`;

  const w = window.open('', '_blank', 'noopener,noreferrer,width=880,height=960');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 250);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
