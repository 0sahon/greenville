import type { SubjectResult } from '../admin/ResultCard';

interface Props {
  subjects: SubjectResult[];
  title?: string;
}

function gradeBarColor(grade: string): string {
  if (grade.startsWith('A')) return '#16a34a';
  if (grade.startsWith('B')) return '#2563eb';
  if (grade.startsWith('C')) return '#d97706';
  if (grade.startsWith('D') || grade.startsWith('E')) return '#ea580c';
  return '#dc2626';
}

const LEGEND = [
  { label: 'A (75–100)', color: '#16a34a' },
  { label: 'B (65–74)',  color: '#2563eb' },
  { label: 'C (50–64)', color: '#d97706' },
  { label: 'D/E (40–49)', color: '#ea580c' },
  { label: 'F (<40)',   color: '#dc2626' },
];

export default function PerformanceChart({ subjects, title = 'Performance Overview' }: Props) {
  if (!subjects || subjects.length === 0) return null;

  const BAR_W = 38;
  const GAP = 14;
  const CHART_H = 160;
  const SIDE_W = 30;
  const PAD_TOP = 16;
  const LABEL_AREA = 46; // rotated subject name area

  const totalW = SIDE_W + subjects.length * (BAR_W + GAP) + GAP;
  const svgH = PAD_TOP + CHART_H + LABEL_AREA;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>

      <div className="overflow-x-auto">
        <svg
          width={Math.max(totalW, 320)}
          height={svgH}
          style={{ display: 'block', fontFamily: 'Arial, sans-serif' }}
        >
          {/* Y-axis grid lines */}
          {[0, 25, 50, 75, 100].map(v => {
            const y = PAD_TOP + CHART_H - (v / 100) * CHART_H;
            return (
              <g key={v}>
                <line
                  x1={SIDE_W} y1={y}
                  x2={totalW} y2={y}
                  stroke={v === 0 ? '#374151' : '#e5e7eb'}
                  strokeWidth={v === 0 ? 1.5 : 1}
                  strokeDasharray={v === 0 ? undefined : '3,3'}
                />
                <text x={SIDE_W - 4} y={y + 4} textAnchor="end" fontSize={8} fill="#9ca3af">
                  {v}
                </text>
              </g>
            );
          })}

          {/* Y-axis vertical line */}
          <line
            x1={SIDE_W} y1={PAD_TOP}
            x2={SIDE_W} y2={PAD_TOP + CHART_H}
            stroke="#374151" strokeWidth={1.5}
          />

          {/* Bars */}
          {subjects.map((s, i) => {
            const x = SIDE_W + GAP / 2 + i * (BAR_W + GAP);
            const barH = Math.max(2, (s.total / 100) * CHART_H);
            const y = PAD_TOP + CHART_H - barH;
            const color = gradeBarColor(s.grade);
            const shortName = s.subject.length > 9
              ? s.subject.substring(0, 8) + '…'
              : s.subject;
            const cx = x + BAR_W / 2;
            const labelY = PAD_TOP + CHART_H + 8;

            return (
              <g key={s.subject}>
                {/* Bar */}
                <rect x={x} y={y} width={BAR_W} height={barH} rx={3} fill={color} opacity={0.85} />

                {/* Score above bar */}
                {s.total > 0 && (
                  <text
                    x={cx} y={y - 3}
                    textAnchor="middle" fontSize={9} fontWeight="bold" fill={color}
                  >
                    {s.total}
                  </text>
                )}

                {/* Grade inside bar (only if tall enough) */}
                {barH >= 18 && (
                  <text
                    x={cx} y={y + 13}
                    textAnchor="middle" fontSize={8} fontWeight="bold" fill="#fff"
                  >
                    {s.grade}
                  </text>
                )}

                {/* Subject label rotated */}
                <text
                  x={cx} y={labelY}
                  textAnchor="end"
                  fontSize={8}
                  fill="#6b7280"
                  transform={`rotate(-38, ${cx}, ${labelY})`}
                >
                  {shortName}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Average line */}
      {subjects.length > 0 && (() => {
        const avg = subjects.reduce((s, r) => s + r.total, 0) / subjects.length;
        const avgGrade = avg >= 75 ? 'A1' : avg >= 70 ? 'B2' : avg >= 65 ? 'B3' : avg >= 60 ? 'C4' : avg >= 55 ? 'C5' : avg >= 50 ? 'C6' : avg >= 45 ? 'D7' : avg >= 40 ? 'E8' : 'F9';
        const color = gradeBarColor(avgGrade);
        return (
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
            <span className="font-semibold">Average:</span>
            <span style={{ color }} className="font-bold text-sm">{avg.toFixed(1)}</span>
            <span style={{ color }} className="font-medium">({avgGrade})</span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div style={{ width: `${avg}%`, background: color }} className="h-full rounded-full transition-all duration-700" />
            </div>
          </div>
        );
      })()}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
        {LEGEND.map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
