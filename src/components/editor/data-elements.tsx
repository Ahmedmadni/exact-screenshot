import type { ChartElement, DiagramElement, TableElement } from "@/lib/editor/model";
import { resolveColor, resolveFont, type SlideTheme } from "@/lib/editor/themes";

const PALETTE_KEYS = ["accent", "primary", "secondary", "accentSoft"] as const;

function chartColors(theme: SlideTheme, accent: string, count: number) {
  const first = resolveColor(accent, theme);
  const rest = PALETTE_KEYS.map((k) => theme.colors[k]).filter((c) => c !== first);
  return Array.from({ length: count }, (_, i) => (i === 0 ? first : rest[(i - 1) % rest.length] ?? first));
}

export function ChartBody({ el, theme }: { el: ChartElement; theme: SlideTheme }) {
  const p = el.properties;
  const cats = p.categories.length ? p.categories : ["A", "B", "C"];
  const series = p.series.length ? p.series : [{ name: "Series", values: [1, 2, 3] }];
  const width = Math.max(10, el.width);
  const height = Math.max(10, el.height);
  const pad = { l: p.chartType === "bar" ? 110 : 72, r: 28, t: p.label ? (p.showLegend ? 88 : 58) : (p.showLegend ? 58 : 30), b: 58 };
  const cw = Math.max(10, width - pad.l - pad.r);
  const ch = Math.max(10, height - pad.t - pad.b);
  const values = series.flatMap((s) => s.values).filter(Number.isFinite);
  const max = Math.max(1, ...values.map((v) => Math.abs(v)));
  const colors = chartColors(theme, p.accent, p.chartType === "pie" || p.chartType === "doughnut" ? cats.length : series.length);
  const font = resolveFont("theme:body", theme);
  const axis = theme.colors.line;
  const text = theme.colors.secondary;

  if (p.chartType === "pie" || p.chartType === "doughnut") {
    const vals = series[0]?.values.slice(0, cats.length).map((v) => Math.max(0, v)) ?? [];
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    const cx = width * 0.46;
    const cy = height * 0.52;
    const r = Math.min(width, height) * 0.3;
    let start = -Math.PI / 2;
    const segments = vals.map((v, i) => {
      const sweep = (v / total) * Math.PI * 2;
      const end = start + sweep;
      const large = sweep > Math.PI ? 1 : 0;
      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      const d = p.chartType === "doughnut"
        ? `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${cx} ${cy} Z`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
      start = end;
      return <path key={i} d={d} fill={colors[i % colors.length]} opacity={0.95} />;
    });
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        {segments}
        {p.chartType === "doughnut" && <circle cx={cx} cy={cy} r={r * 0.52} fill={theme.colors.background} />}
        {cats.slice(0, vals.length).map((c, i) => (
          <g key={c} transform={`translate(${width * 0.78} ${height * 0.28 + i * 34})`}>
            <rect x={0} y={-12} width={16} height={16} rx={4} fill={colors[i % colors.length]} />
            <text x={26} y={1} fontFamily={font} fontSize={18} fill={text}>{c}</text>
          </g>
        ))}
      </svg>
    );
  }

  const xStep = cw / Math.max(1, cats.length);
  const y = (v: number) => pad.t + ch - (Math.max(0, v) / max) * ch;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {p.showGrid && [0, 0.25, 0.5, 0.75, 1].map((n) => {
        const gy = pad.t + ch * (1 - n);
        return <line key={n} x1={pad.l} x2={width - pad.r} y1={gy} y2={gy} stroke={axis} strokeWidth={1} />;
      })}
      <line x1={pad.l} x2={pad.l} y1={pad.t} y2={pad.t + ch} stroke={axis} strokeWidth={1.5} />
      <line x1={pad.l} x2={width - pad.r} y1={pad.t + ch} y2={pad.t + ch} stroke={axis} strokeWidth={1.5} />

      {p.chartType === "bar" ? cats.map((cat, ci) => {
        const rowH = ch / Math.max(1, cats.length);
        const groupH = rowH * 0.68;
        const barH = groupH / Math.max(1, series.length);
        return (
          <g key={cat}>
            <text x={pad.l - 12} y={pad.t + ci * rowH + rowH / 2 + 5} textAnchor="end" fontFamily={font} fontSize={16} fill={text}>{cat}</text>
            {series.map((ser, si) => {
              const value = Math.max(0, ser.values[ci] ?? 0);
              const bw = (value / max) * cw;
              const by = pad.t + ci * rowH + (rowH - groupH) / 2 + si * barH;
              return (
                <g key={ser.name}>
                  <rect x={pad.l} y={by} width={bw} height={Math.max(3, barH - 4)} rx={4} fill={colors[si % colors.length]} />
                  {p.showValues && <text x={pad.l + bw + 8} y={by + barH / 2 + 5} fontFamily={font} fontSize={15} fill={text}>{value}</text>}
                </g>
              );
            })}
          </g>
        );
      }) : p.chartType === "line" || p.chartType === "area" ? series.map((s, si) => {
        const pts = cats.map((_, i) => [pad.l + xStep * (i + 0.5), y(s.values[i] ?? 0)] as const);
        const points = pts.map(([xv, yv]) => `${xv},${yv}`).join(" ");
        return (
          <g key={s.name}>
            {p.chartType === "area" && (
              <polygon
                points={`${pad.l + xStep * 0.5},${pad.t + ch} ${points} ${pad.l + xStep * (cats.length - 0.5)},${pad.t + ch}`}
                fill={colors[si % colors.length]}
                opacity={0.18}
              />
            )}
            <polyline points={points} fill="none" stroke={colors[si % colors.length]} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
            {pts.map(([xv, yv], i) => <circle key={i} cx={xv} cy={yv} r={5} fill={colors[si % colors.length]} />)}
          </g>
        );
      }) : cats.map((_, ci) => {
        const groupW = xStep * 0.72;
        const barW = groupW / Math.max(1, series.length);
        return series.map((ser, si) => {
          const value = Math.max(0, ser.values[ci] ?? 0);
          const bh = (value / max) * ch;
          const x = pad.l + ci * xStep + (xStep - groupW) / 2 + si * barW;
          return (
            <g key={`${ci}-${si}`}>
              <rect x={x} y={pad.t + ch - bh} width={Math.max(3, barW - 5)} height={bh} rx={4} fill={colors[si % colors.length]} />
              {p.showValues && <text x={x + barW / 2} y={pad.t + ch - bh - 9} textAnchor="middle" fontFamily={font} fontSize={16} fill={text}>{value}</text>}
            </g>
          );
        });
      })}

      {p.chartType !== "bar" && cats.map((c, i) => (
        <text key={c} x={pad.l + xStep * (i + 0.5)} y={height - 20} textAnchor="middle" fontFamily={font} fontSize={17} fill={text}>{c}</text>
      ))}

      {p.label && <text x={pad.l} y={26} fontFamily={font} fontSize={22} fontWeight={650} fill={theme.colors.primary}>{p.label}</text>}
      {p.showLegend && series.map((ser, i) => (
        <g key={ser.name} transform={`translate(${pad.l + i * 180} ${p.label ? 50 : 25})`}>
          <rect width={18} height={18} rx={4} fill={colors[i % colors.length]} />
          <text x={28} y={15} fontFamily={font} fontSize={17} fill={text}>{ser.name}</text>
        </g>
      ))}
    </svg>
  );
}

export function TableBody({ el, theme }: { el: TableElement; theme: SlideTheme }) {
  const p = el.properties;
  const rows = p.rows.length ? p.rows : [["Column 1", "Column 2"], ["Value", "Value"]];
  const cols = Math.max(...rows.map((r) => r.length), 1);
  return (
    <div style={{ width: "100%", height: "100%", display: "grid", gridTemplateRows: `repeat(${rows.length}, minmax(0, 1fr))`, border: `1px solid ${theme.colors.line}`, overflow: "hidden", fontFamily: resolveFont("theme:body", theme) }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, background: ri === 0 && p.headerRow ? resolveColor(p.headerFill, theme) : p.bandedRows && ri % 2 === 0 ? theme.colors.surface : "transparent" }}>
          {Array.from({ length: cols }, (_, ci) => (
            <div key={ci} style={{ minWidth: 0, display: "flex", alignItems: "center", padding: "10px 14px", borderInlineEnd: ci < cols - 1 ? `1px solid ${theme.colors.line}` : undefined, borderBottom: ri < rows.length - 1 ? `1px solid ${theme.colors.line}` : undefined, fontSize: 18, fontWeight: ri === 0 && p.headerRow ? 650 : 400, color: ri === 0 && p.headerRow ? theme.colors.onAccent : theme.colors.primary }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row[ci] ?? ""}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function DiagramBody({ el, theme }: { el: DiagramElement; theme: SlideTheme }) {
  const p = el.properties;
  const nodes = p.nodes.length ? p.nodes : [{ title: "Step 1", text: "Add detail" }];
  const accent = resolveColor(p.accent, theme);
  const font = resolveFont("theme:body", theme);

  if (p.diagramType === "matrix") {
    const count = Math.min(4, nodes.length);
    return (
      <div style={{ width: "100%", height: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 14, fontFamily: font }}>
        {Array.from({ length: 4 }, (_, i) => {
          const node = nodes[i];
          return <div key={i} style={{ border: `1px solid ${theme.colors.line}`, borderRadius: 16, background: i === 0 ? theme.colors.accentSoft : theme.colors.surface, padding: 22, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ color: theme.colors.primary, fontSize: 24, fontWeight: 650 }}>{node?.title ?? `Quadrant ${i + 1}`}</div>
            <div style={{ color: theme.colors.secondary, fontSize: 17, marginTop: 8 }}>{node?.text ?? ""}</div>
          </div>;
        }).slice(0, Math.max(4, count))}
      </div>
    );
  }

  const horizontal = true;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: 12, fontFamily: font }}>
      {nodes.map((node, i) => (
        <div key={i} style={{ display: "contents" }}>
          <div style={{ flex: 1, minWidth: 0, borderRadius: 18, border: `1px solid ${theme.colors.line}`, background: theme.colors.surface, padding: 20, position: "relative" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center", background: accent, color: theme.colors.onAccent, fontWeight: 700, marginBottom: 14 }}>{i + 1}</div>
            <div style={{ color: theme.colors.primary, fontSize: 23, fontWeight: 650 }}>{node.title}</div>
            <div style={{ color: theme.colors.secondary, fontSize: 16, marginTop: 7, lineHeight: 1.35 }}>{node.text}</div>
          </div>
          {horizontal && i < nodes.length - 1 && (
            <div style={{ width: 32, height: 2, background: p.diagramType === "timeline" ? theme.colors.line : accent, position: "relative", flex: "0 0 32px" }}>
              <div style={{ position: "absolute", right: -1, top: -4, width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderLeft: `8px solid ${p.diagramType === "timeline" ? theme.colors.line : accent}` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
