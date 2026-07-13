import { useEffect, useRef, useState } from 'react';

// Ported from Second Brain's work-mode flow/IA editor. One engine, two faces:
// `annotated` flows carry `trigger [condition] → outcome` connection labels;
// IA app-maps use the same bands + graph with plain connectors.

type FNode = { id: string; title: string; subtitle?: string; type?: string; shape?: string; details?: string; section?: string; x?: number; y?: number };
type FEdge = { id?: string; from: string; to: string; type?: string; triggerType?: string; trigger?: string; condition?: string; label?: string };
type Section = { id: string; label: string };
type FlowData = { nodes: FNode[]; edges: FEdge[]; sections?: (Section | string)[] };

const GUTTER = 132, CARD_W = 196, CARD_H = 60, BAND_HEAD = 30;

const FLOW_TYPES: Record<string, { label: string; stroke: string }> = {
  main: { label: 'main flow', stroke: '#7b86c4' },
  normal: { label: 'step', stroke: '#9aa0a6' },
  error: { label: 'error / edge-case', stroke: '#dc2626' },
  retry: { label: 'retry / fallback', stroke: '#d97706' },
};
const FLOW_SHAPES = ['rectangle', 'pill', 'parallelogram', 'diamond', 'triangle', 'hexagon', 'oval', 'square', 'circle'];
// Legacy flows may carry old node types (screen/start/decision/end); fall back safely.
const ftOf = (t?: string) => FLOW_TYPES[t ?? ''] || FLOW_TYPES.normal;
const normType = (t?: string) => (t && FLOW_TYPES[t]) ? t : 'normal';
const normNodes = (ns: FNode[]) => (ns ?? []).map((n) => ({ ...n, type: normType(n.type) }));

const TRIGGER_TYPES = [
  { id: 'gesture', label: 'gesture', glyph: '⊙' },
  { id: 'system', label: 'system', glyph: '⟳' },
  { id: 'condition', label: 'condition', glyph: '◇' },
];
const TRIGGER_PRESETS: Record<string, { id: string; label: string; glyph: string }[]> = {
  gesture: [
    { id: 'tap', label: 'tap', glyph: '⊙' }, { id: 'double-tap', label: 'double tap', glyph: '⊙⊙' },
    { id: 'long-press', label: 'long press', glyph: '⊚' }, { id: 'swipe-up', label: 'swipe up', glyph: '↑' },
    { id: 'swipe-down', label: 'swipe down', glyph: '↓' }, { id: 'swipe-left', label: 'swipe left', glyph: '←' },
    { id: 'swipe-right', label: 'swipe right', glyph: '→' }, { id: 'scroll', label: 'scroll', glyph: '↕' },
    { id: 'drag', label: 'drag', glyph: '⤧' }, { id: 'back', label: 'back', glyph: '↩' },
  ],
  system: [
    { id: 'on-load', label: 'on load', glyph: '⟳' }, { id: 'api-response', label: 'after response', glyph: '⇄' },
    { id: 'timeout', label: 'timeout', glyph: '◷' }, { id: 'success', label: 'success', glyph: '✓' },
    { id: 'failure', label: 'failure', glyph: '✕' }, { id: 'redirect', label: 'auto redirect', glyph: '⤳' },
  ],
  condition: [
    { id: 'if-valid', label: 'if valid', glyph: '◇' }, { id: 'if-invalid', label: 'if invalid', glyph: '◇' },
    { id: 'if-empty', label: 'if empty', glyph: '◇' }, { id: 'if-auth', label: 'if signed in', glyph: '◇' },
    { id: 'otherwise', label: 'otherwise', glyph: '◇' },
  ],
};
const ALL_TRIGGERS = [...TRIGGER_PRESETS.gesture, ...TRIGGER_PRESETS.system, ...TRIGGER_PRESETS.condition];
const edgeTT = (e: FEdge) => e.triggerType || 'gesture';
const triggerPreset = (e: FEdge) => ALL_TRIGGERS.find((p) => p.id === e.trigger);
const edgeTriggerText = (e: FEdge) => { const p = triggerPreset(e); return p ? p.label : (e.trigger || ''); };
const edgeGlyph = (e: FEdge) => { const p = triggerPreset(e); if (p) return p.glyph; const t = TRIGGER_TYPES.find((x) => x.id === edgeTT(e)); return t ? t.glyph : '⊙'; };
const edgeHasAnno = (e: FEdge) => !!(e.trigger || e.condition || e.label);
const edgeType = (t?: string) => (t === 'error' || t === 'retry') ? t : 'main';

let counter = 0;
const uid = (p: string) => `${p}${Date.now().toString(36)}${(counter++).toString(36)}`;
const normSections = (raw: any): Section[] => (raw ?? []).map((s: any, i: number) => typeof s === 'string' ? { id: `s${i}`, label: s } : { id: s.id ?? `s${i}`, label: s.label ?? `Section ${i + 1}` });

function ShapeSVG({ shape }: { shape: string }) {
  const fit = shape === 'square' || shape === 'circle';
  const p = { fill: 'var(--node-fill)', stroke: 'var(--ft)', strokeWidth: 1.6, strokeLinejoin: 'round' as const, vectorEffect: 'non-scaling-stroke' as const };
  const box = (rx: number) => <rect x={1.5} y={1.5} width={97} height={97} rx={rx} {...p} />;
  let el;
  switch (shape) {
    case 'pill': el = box(50); break;
    case 'square': el = box(5); break;
    case 'parallelogram': el = <polygon points="22,3 99,3 78,97 1,97" {...p} />; break;
    case 'triangle': el = <polygon points="50,3 98,97 2,97" {...p} />; break;
    case 'diamond': el = <polygon points="50,2 98,50 50,98 2,50" {...p} />; break;
    case 'hexagon': el = <polygon points="26,3 74,3 98,50 74,97 26,97 2,50" {...p} />; break;
    case 'oval': el = <ellipse cx={50} cy={50} rx={48.5} ry={48.5} {...p} />; break;
    case 'circle': el = <circle cx={50} cy={50} r={48} {...p} />; break;
    default: el = box(8);
  }
  return <svg className="flow-node-shape" viewBox="0 0 100 100" preserveAspectRatio={fit ? 'xMidYMid meet' : 'none'}>{el}</svg>;
}

export function FlowCanvas({ item, annotated, save, onSaved }: { item: { name: string; data: FlowData }; annotated: boolean; save: (data: FlowData) => Promise<any>; onSaved?: () => void }) {
  const [nodes, setNodes] = useState<FNode[]>(() => normNodes(item.data.nodes ?? []));
  const [edges, setEdges] = useState<FEdge[]>(() => (item.data.edges ?? []).map((e) => ({ id: e.id ?? uid('e'), ...e })));
  const [sections, setSections] = useState<Section[]>(() => normSections(item.data.sections));
  const [sel, setSel] = useState<{ kind: 'node' | 'edge'; id: string } | null>(null);
  const [connect, setConnect] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const canvasRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<any>(null);
  const stateRef = useRef({ nodes, edges, sections });
  const connectRef = useRef<{ on: boolean; from: string | null }>({ on: false, from: null });
  const dragRef = useRef<{ id: string; ox: number; oy: number; px: number; py: number; moved: boolean } | null>(null);

  useEffect(() => { stateRef.current = { nodes, edges, sections }; }, [nodes, edges, sections]);
  useEffect(() => {
    setNodes(normNodes(item.data.nodes ?? []));
    setEdges((item.data.edges ?? []).map((e) => ({ id: e.id ?? uid('e'), ...e })));
    setSections(normSections(item.data.sections));
    setSel(null); setConnect(false); setConnectFrom(null); connectRef.current = { on: false, from: null };
  }, [item.name]);

  const queueSave = () => {
    setStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const s = stateRef.current;
      await save({ nodes: s.nodes, edges: s.edges, sections: s.sections });
      setStatus('saved'); onSaved?.();
      setTimeout(() => setStatus('idle'), 1200);
    }, 500);
  };

  const byId: Record<string, FNode> = {};
  nodes.forEach((n) => { byId[n.id] = n; });
  const secs: Section[] = sections.length ? sections : [{ id: '_d', label: 'Flow' }];
  const secIds = new Set(secs.map((s) => s.id));
  const sectionOf = (n: FNode) => (n.section && secIds.has(n.section)) ? n.section : secs[0].id;

  // layout: bands stacked vertically, nodes positioned relative to their band
  const offsets: Record<string, number> = {}, heights: Record<string, number> = {};
  let run = 0, maxRight = GUTTER + 360;
  secs.forEach((s) => {
    offsets[s.id] = run;
    let contentH = 96;
    nodes.filter((n) => sectionOf(n) === s.id).forEach((n) => {
      contentH = Math.max(contentH, (n.y || 0) + CARD_H + 26);
      maxRight = Math.max(maxRight, GUTTER + (n.x || 0) + CARD_W + 48);
    });
    heights[s.id] = BAND_HEAD + contentH; run += heights[s.id];
  });
  const totalH = Math.max(run, 300), totalW = maxRight;

  const rectOf = (n: FNode) => {
    const top = (offsets[sectionOf(n)] || 0) + BAND_HEAD + (n.y || 0);
    const left = GUTTER + (n.x || 0);
    return { left, top, cx: left + CARD_W / 2, cy: top + CARD_H / 2, right: left + CARD_W, bottom: top + CARD_H };
  };
  const edgeGeom = (s: ReturnType<typeof rectOf>, t: ReturnType<typeof rectOf>) => {
    const dx = t.cx - s.cx, dy = t.cy - s.cy;
    let sx, sy, tx, ty, d;
    if (Math.abs(dy) >= Math.abs(dx)) {
      if (dy >= 0) { sx = s.cx; sy = s.bottom; tx = t.cx; ty = t.top; } else { sx = s.cx; sy = s.top; tx = t.cx; ty = t.bottom; }
      const mid = (sy + ty) / 2; d = `M ${sx} ${sy} C ${sx} ${mid}, ${tx} ${mid}, ${tx} ${ty}`;
    } else {
      if (dx >= 0) { sx = s.right; sy = s.cy; tx = t.left; ty = t.cy; } else { sx = s.left; sy = s.cy; tx = t.right; ty = t.cy; }
      const mid = (sx + tx) / 2; d = `M ${sx} ${sy} C ${mid} ${sy}, ${mid} ${ty}, ${tx} ${ty}`;
    }
    return { d, mx: (sx + tx) / 2, my: (sy + ty) / 2 };
  };

  // mutations
  const commitNodes = (n: FNode[]) => { setNodes(n); queueSave(); };
  const updateNode = (id: string, patch: Partial<FNode>) => { setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch } : n))); queueSave(); };
  const updateEdge = (id: string, patch: Partial<FEdge>) => { setEdges((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e))); queueSave(); };
  const removeNode = (id: string) => { setNodes((ns) => ns.filter((n) => n.id !== id)); setEdges((es) => es.filter((e) => e.from !== id && e.to !== id)); setSel(null); queueSave(); };
  const removeEdge = (id: string) => { setEdges((es) => es.filter((e) => e.id !== id)); setSel(null); queueSave(); };

  const ensureSection = (): string => {
    if (sections.length) return sections[0].id;
    const s = { id: uid('s'), label: 'Section 1' };
    setSections([s]); return s.id;
  };
  const addSection = () => {
    const label = window.prompt('Section name:', `Section ${sections.length + 1}`);
    if (label == null) return;
    setSections((ss) => [...ss, { id: uid('s'), label: label.trim() || `Section ${ss.length + 1}` }]); queueSave();
  };
  const addNode = () => {
    const secId = ensureSection();
    const count = nodes.filter((n) => (n.section ?? secId) === secId).length;
    const n: FNode = { id: uid('n'), section: secId, x: 40 + (count % 3) * (CARD_W + 44), y: 24 + Math.floor(count / 3) * (CARD_H + 44), title: 'New step', type: 'normal', shape: 'rectangle' };
    setNodes((ns) => [...ns, n]); setSel({ kind: 'node', id: n.id }); queueSave();
  };
  const toggleConnect = () => { const on = !connect; setConnect(on); setConnectFrom(null); connectRef.current = { on, from: null }; };
  const onNodeClick = (n: FNode) => {
    const cs = connectRef.current;
    if (cs.on) {
      if (!cs.from) { cs.from = n.id; setConnectFrom(n.id); return; }
      if (cs.from !== n.id) {
        const src = byId[cs.from];
        const e: FEdge = { id: uid('e'), from: cs.from, to: n.id, type: edgeType(src?.type), triggerType: 'gesture', trigger: '', condition: '', label: '' };
        setEdges((es) => [...es, e]); queueSave();
        connectRef.current = { on: false, from: null }; setConnect(false); setConnectFrom(null);
        if (annotated) setSel({ kind: 'edge', id: e.id! }); else setSel(null);
        return;
      }
    }
    setSel({ kind: 'node', id: n.id });
  };

  // drag (relative x/y within band)
  const onDown = (ev: React.PointerEvent, n: FNode) => {
    if (ev.button !== 0 || (ev.target as HTMLElement).closest('button')) return;
    try { (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId); } catch { /* best-effort */ }
    dragRef.current = { id: n.id, ox: n.x || 0, oy: n.y || 0, px: ev.clientX, py: ev.clientY, moved: false };
  };
  const onMove = (ev: React.PointerEvent) => {
    const d = dragRef.current; if (!d) return;
    const dx = ev.clientX - d.px, dy = ev.clientY - d.py;
    if (!d.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) d.moved = true;
    if (!d.moved) return;
    setNodes((ns) => ns.map((m) => (m.id === d.id ? { ...m, x: Math.max(0, d.ox + dx), y: Math.max(0, d.oy + dy) } : m)));
  };
  const onUp = (ev: React.PointerEvent, n: FNode) => {
    const d = dragRef.current; dragRef.current = null; if (!d) return;
    try { (ev.currentTarget as HTMLElement).releasePointerCapture?.(ev.pointerId); } catch { /* noop */ }
    if (d.moved) queueSave(); else onNodeClick(n);
  };

  const selNode = sel?.kind === 'node' ? byId[sel.id] : undefined;
  const selEdge = sel?.kind === 'edge' ? edges.find((e) => e.id === sel.id) : undefined;

  return (
    <div className="flow-wrap">
      <div className="flow-main">
        <div className="flow-toolbar">
          <button className="flow-tb-btn" onClick={addSection}>+ Section</button>
          <button className="flow-tb-btn primary" onClick={addNode}>+ Block</button>
          <button className={`flow-tb-btn ${connect ? 'on' : ''}`} onClick={toggleConnect}>⤳ Connect</button>
          <span className="flow-hint">{connect ? (connectFrom ? 'now click the target block' : 'click a block, then the one to connect it to') : ''}</span>
          <span className="flow-legend">
            {['main', 'error', 'retry'].map((t) => (
              <span className="flow-leg" key={t}><span className="flow-leg-line" style={{ background: FLOW_TYPES[t].stroke }} />{FLOW_TYPES[t].label}</span>
            ))}
            <span className={`flow-status ${status}`}>{status === 'saving' ? 'saving…' : status === 'saved' ? 'saved ✓' : ''}</span>
          </span>
        </div>
        <div className="flow-scroll">
          <div ref={canvasRef} className={`flow-canvas ${connect ? 'connecting' : ''}`} style={{ width: totalW, height: totalH }} onPointerMove={onMove} onClick={() => { if (!connectRef.current.on) setSel(null); }}>
            {secs.map((s, i) => (
              <div key={s.id} className={`flow-band ${i % 2 ? 'alt' : ''}`} style={{ top: offsets[s.id], height: heights[s.id] }}>
                <div className="flow-band-label">
                  <span className="flow-band-i">SECTION {String(i + 1).padStart(2, '0')}</span>
                  <span className="flow-band-name">{s.label || '—'}</span>
                </div>
              </div>
            ))}

            <svg className="flow-edges" width={totalW} height={totalH}>
              <defs>
                {['main', 'error', 'retry'].map((t) => (
                  <marker key={t} id={`fa-${t}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M2 1L8 5L2 9" fill="none" stroke={FLOW_TYPES[t].stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </marker>
                ))}
              </defs>
              {edges.map((e) => {
                const a = byId[e.from], b = byId[e.to]; if (!a || !b) return null;
                const g = edgeGeom(rectOf(a), rectOf(b));
                const et = edgeType(e.type);
                return <path key={e.id} d={g.d} fill="none" stroke={FLOW_TYPES[et].stroke} strokeWidth={sel?.kind === 'edge' && sel.id === e.id ? 2.6 : 1.6} markerEnd={`url(#fa-${et})`} />;
              })}
            </svg>

            {annotated && edges.map((e) => {
              const a = byId[e.from], b = byId[e.to]; if (!a || !b) return null;
              const g = edgeGeom(rectOf(a), rectOf(b));
              const has = edgeHasAnno(e);
              return (
                <div key={`l-${e.id}`} className={`flow-elabel ${sel?.kind === 'edge' && sel.id === e.id ? 'sel' : ''} ${has ? '' : 'empty'}`}
                  style={{ left: g.mx, top: g.my, ['--ft' as any]: FLOW_TYPES[edgeType(e.type)].stroke }}
                  onClick={(ev) => { ev.stopPropagation(); setSel({ kind: 'edge', id: e.id! }); }}>
                  {has ? (<>
                    <div className="flow-elabel-top"><span className="flow-elabel-g">{edgeGlyph(e)}</span><span>{(edgeTriggerText(e) || 'edge') + (e.condition ? ` [${e.condition}]` : '')}</span></div>
                    {e.label && <div className="flow-elabel-int">→ {e.label}</div>}
                  </>) : <span className="flow-elabel-add">+ label</span>}
                </div>
              );
            })}

            {nodes.map((n) => {
              const r = rectOf(n);
              const shape = annotated ? (n.shape || 'rectangle') : 'rectangle';
              const ft = ftOf(n.type);
              return (
                <div key={n.id} data-shape={shape}
                  className={`flow-node ${sel?.kind === 'node' && sel.id === n.id ? 'sel' : ''} ${connectFrom === n.id ? 'edge-src' : ''}`}
                  style={{ left: r.left, top: r.top, width: CARD_W, ['--ft' as any]: ft.stroke }}
                  onPointerDown={(ev) => onDown(ev, n)} onPointerUp={(ev) => onUp(ev, n)}>
                  <ShapeSVG shape={shape} />
                  <div className="flow-node-main">
                    <div className="flow-node-title">{n.title || 'untitled'}</div>
                    {n.subtitle && <div className="flow-node-sub">{n.subtitle}</div>}
                  </div>
                </div>
              );
            })}

            {nodes.length === 0 && (
              <div className="flow-empty"><div>Empty {annotated ? 'flow' : 'map'}.</div><button className="flow-tb-btn primary" onClick={addNode}>+ Add first block</button></div>
            )}
          </div>
        </div>
      </div>

      {selNode && (
        <div className="flow-inspector">
          <div className="flow-insp-hd"><b>Block</b><button className="flow-insp-x" onClick={() => setSel(null)}>✕</button></div>
          <div className="flow-f"><label className="flow-f-l">Title</label><input className="flow-in flow-in-title" value={selNode.title} onChange={(e) => updateNode(selNode.id, { title: e.target.value })} /></div>
          <div className="flow-f"><label className="flow-f-l">Subtext</label><input className="flow-in" value={selNode.subtitle ?? ''} placeholder="subtext…" onChange={(e) => updateNode(selNode.id, { subtitle: e.target.value })} /></div>
          {annotated && (
            <div className="flow-f"><label className="flow-f-l">Shape</label>
              <div className="flow-shapes">{FLOW_SHAPES.map((sh) => (
                <button key={sh} title={sh} className={`flow-shape-btn ${(selNode.shape || 'rectangle') === sh ? 'on' : ''}`} style={{ ['--ft' as any]: ftOf(selNode.type).stroke }} onClick={() => updateNode(selNode.id, { shape: sh })}><ShapeSVG shape={sh} /></button>
              ))}</div>
            </div>
          )}
          <div className="flow-f"><label className="flow-f-l">Type</label>
            <div className="flow-types">{['main', 'normal', 'error', 'retry'].map((t) => (
              <button key={t} className={`flow-type ${(selNode.type || 'normal') === t ? 'on' : ''}`} style={{ ['--ft' as any]: FLOW_TYPES[t].stroke }} onClick={() => updateNode(selNode.id, { type: t })}>{t}</button>
            ))}</div>
          </div>
          <div className="flow-f"><label className="flow-f-l">Details</label><textarea className="flow-in flow-ta" rows={5} value={selNode.details ?? ''} placeholder="more details, decisions, notes…" onChange={(e) => updateNode(selNode.id, { details: e.target.value })} /></div>
          <div className="flow-f"><label className="flow-f-l">Connections</label>
            <div className="flow-conn">
              {edges.filter((e) => e.from === selNode.id || e.to === selNode.id).map((e) => {
                const other = byId[e.from === selNode.id ? e.to : e.from];
                const note = edgeTriggerText(e);
                return (
                  <span key={e.id} className={`flow-chip ${annotated ? 'flow-chip-edge' : ''}`}>
                    <span className="flow-chip-g" style={{ color: FLOW_TYPES[edgeType(e.type)].stroke }}>{e.from === selNode.id ? '→' : '←'}</span>
                    <span className="flow-chip-l" onClick={annotated ? () => setSel({ kind: 'edge', id: e.id! }) : undefined}>{other?.title || 'block'}{note ? <span className="flow-chip-note"> · {note}</span> : null}</span>
                    <button className="flow-chip-x" onClick={() => removeEdge(e.id!)}>×</button>
                  </span>
                );
              })}
              {edges.filter((e) => e.from === selNode.id || e.to === selNode.id).length === 0 && <span className="flow-hint">no connections yet — use Connect in the toolbar</span>}
            </div>
          </div>
          <button className="flow-del" onClick={() => removeNode(selNode.id)}>Delete block</button>
        </div>
      )}

      {selEdge && (
        <div className="flow-inspector">
          <div className="flow-insp-hd"><b>Connection</b><button className="flow-insp-x" onClick={() => setSel(null)}>✕</button></div>
          <div className="flow-edge-ends">{byId[selEdge.from]?.title || '?'} <span className="flow-hint">→</span> {byId[selEdge.to]?.title || '?'}</div>
          <div className="flow-f"><label className="flow-f-l">Trigger kind</label>
            <div className="flow-types">{TRIGGER_TYPES.map((tt) => (
              <button key={tt.id} className={`flow-type ${edgeTT(selEdge) === tt.id ? 'on' : ''}`} onClick={() => updateEdge(selEdge.id!, { triggerType: tt.id })}>{tt.glyph} {tt.label}</button>
            ))}</div>
          </div>
          <div className="flow-f"><label className="flow-f-l">Trigger</label>
            <div className="flow-presets">{(TRIGGER_PRESETS[edgeTT(selEdge)] || []).map((p) => (
              <button key={p.id} className={`flow-preset ${selEdge.trigger === p.id ? 'on' : ''}`} onClick={() => updateEdge(selEdge.id!, { trigger: selEdge.trigger === p.id ? '' : p.id })}><span className="flow-preset-g">{p.glyph}</span>{p.label}</button>
            ))}</div>
            <input className="flow-in" value={selEdge.trigger ?? ''} placeholder="…or type a custom trigger" onChange={(e) => updateEdge(selEdge.id!, { trigger: e.target.value })} />
          </div>
          <div className="flow-f"><label className="flow-f-l">Condition (guard)</label><input className="flow-in" value={selEdge.condition ?? ''} placeholder="if-valid, if-empty…" onChange={(e) => updateEdge(selEdge.id!, { condition: e.target.value })} /></div>
          <div className="flow-f"><label className="flow-f-l">Outcome (label)</label><input className="flow-in" value={selEdge.label ?? ''} placeholder="what happens…" onChange={(e) => updateEdge(selEdge.id!, { label: e.target.value })} /></div>
          <div className="flow-f"><label className="flow-f-l">Line type</label>
            <div className="flow-types">{['main', 'normal', 'error', 'retry'].map((t) => (
              <button key={t} className={`flow-type ${(selEdge.type || 'main') === t ? 'on' : ''}`} style={{ ['--ft' as any]: FLOW_TYPES[t].stroke }} onClick={() => updateEdge(selEdge.id!, { type: t })}>{t}</button>
            ))}</div>
          </div>
          <p className="flow-grammar">{[edgeTriggerText(selEdge), selEdge.condition ? `[${selEdge.condition}]` : '', selEdge.label ? `→ ${selEdge.label}` : ''].filter(Boolean).join(' ') || 'trigger [condition] → outcome'}</p>
          <button className="flow-del" onClick={() => removeEdge(selEdge.id!)}>Delete connection</button>
        </div>
      )}
    </div>
  );
}
