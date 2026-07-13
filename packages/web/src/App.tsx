import { useEffect, useState } from 'react';
import { api } from './api';
import { FlowCanvas } from './FlowCanvas';

type View = 'overview' | 'tokens' | 'components' | 'patterns' | 'ia' | 'flows' | 'screens' | 'docs' | 'assets' | 'build';
const NAV: { id: View; label: string; color: string }[] = [
  { id: 'overview', label: 'Overview', color: 'var(--accent)' },
  { id: 'tokens', label: 'Design tokens', color: 'var(--k-token)' },
  { id: 'components', label: 'Components', color: 'var(--k-comp)' },
  { id: 'patterns', label: 'Patterns & rules', color: 'var(--accent)' },
  { id: 'ia', label: 'Information architecture', color: 'var(--k-ia)' },
  { id: 'flows', label: 'User flows', color: 'var(--k-flow)' },
  { id: 'screens', label: 'Screens', color: 'var(--k-screen)' },
  { id: 'docs', label: 'Docs & data', color: 'var(--k-doc)' },
  { id: 'assets', label: 'Assets', color: 'var(--k-screen)' },
  { id: 'build', label: 'Build a feature', color: 'var(--accent)' },
];

// The single design system — the server serves the folder it was started in, so
// there is no project to select. `P` is passed to the view components purely to
// keep their signatures stable.
const P = '';

export function App() {
  const [view, setView] = useState<View>('overview');
  const [meta, setMeta] = useState<any>(null);
  useEffect(() => { api.overview(P).then(setMeta); }, []);

  return (
    <div className="app">
      <aside className="nav">
        <div className="nav-top">
          <div className="brand"><span className="dot" />{meta?.name ?? 'design system'}</div>
        </div>
        <div className="nav-scroll">
          <div className="nav-group">
            <div className="nav-group-h">design system</div>
            {NAV.map((n) => (
              <button key={n.id} className={`nav-item ${view === n.id ? 'on' : ''}`} onClick={() => setView(n.id)}>
                <span className="k" style={{ background: n.color }} />{n.label}
              </button>
            ))}
          </div>
        </div>
        <div className="nav-foot">{meta?.counts ? `${meta.counts.components} components · ${meta.counts.tokens} tokens` : 'design-system memory'}</div>
      </aside>
      <main className="main">
        <div className="wrap">
          {view === 'overview' && <Overview project={P} />}
          {view === 'tokens' && <Tokens project={P} />}
          {view === 'components' && <Components project={P} />}
          {view === 'patterns' && <Patterns project={P} />}
          {view === 'ia' && <IA project={P} />}
          {view === 'flows' && <Flows project={P} />}
          {view === 'screens' && <Screens project={P} />}
          {view === 'docs' && <Docs project={P} />}
          {view === 'assets' && <Assets project={P} />}
          {view === 'build' && <Build project={P} />}
        </div>
      </main>
    </div>
  );
}

const Loading = () => <p className="muted">Loading…</p>;

function Overview({ project }: { project: string }) {
  const [o, setO] = useState<any>(null);
  useEffect(() => { api.overview(project).then(setO); }, [project]);
  if (!o) return <Loading />;
  const items: [string, number, string][] = [
    ['Tokens', o.counts.tokens, 'var(--k-token)'],
    ['Components', o.counts.components, 'var(--k-comp)'],
    ['Patterns', o.counts.patterns, 'var(--accent)'],
    ['Guidelines', o.counts.guidelines, 'var(--accent)'],
    ['IA maps', o.counts.ia ?? 0, 'var(--k-ia)'],
    ['Flows', o.counts.flows, 'var(--k-flow)'],
    ['Screens', o.counts.screens, 'var(--k-screen)'],
    ['Docs', o.counts.docs ?? 0, 'var(--k-doc)'],
    ['Assets', o.counts.assets ?? 0, 'var(--k-screen)'],
  ];
  return (
    <>
      <h1>{o.name}</h1>
      <p className="sub">The design-system memory — stored as {o.storage === 'file' ? 'a human-readable file repo' : 'a local database'}.</p>
      <div className="stats">
        {items.map(([l, n, c]) => (
          <div className="stat" key={l} style={{ ['--k-c' as any]: c }}><div className="n">{n}</div><div className="l">{l}</div></div>
        ))}
      </div>
    </>
  );
}

function Tokens({ project }: { project: string }) {
  const [tokens, setTokens] = useState<any[]>([]);
  useEffect(() => { api.tokens(project).then(setTokens); }, [project]);
  const groups: Record<string, any[]> = {};
  for (const t of tokens) (groups[t.token.group ?? t.path.split('.')[0]] ??= []).push(t);
  const px = (v: string) => Math.min(parseFloat(v) || 0, 320);
  return (
    <>
      <h1>Design tokens</h1>
      <p className="sub">The token set, read from <span className="mono">tokens.md</span>. <AuthoredVia what="set" cmd="dsk token set color.brand.primary '#1F6FEB'" /></p>
      {Object.entries(groups).sort().map(([g, items]) => (
        <div key={g}>
          <h2 className="sect">{g}</h2>
          {g === 'color' ? (
            <div className="tok-swatches">
              {items.map((t) => (
                <div className="tok-color" key={t.path}>
                  <div className="tok-color-chip" style={{ background: String(t.token.$value).startsWith('{') ? 'var(--paper-2)' : t.token.$value }} />
                  <div className="tok-color-name">{t.path.split('.').slice(1).join('.')}</div>
                  <div className="tok-color-val mono">{String(t.token.$value)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="tok-list">
              {items.map((t) => (
                <div className="tok-row" key={t.path}>
                  {g === 'radius' && <span className="tok-radius-box" style={{ borderRadius: String(t.token.$value) }} />}
                  {(g === 'space' || g === 'spacing') && <span className="tok-bar" style={{ width: px(String(t.token.$value)) }} />}
                  <span className="tok-name">{t.path}</span>
                  <span className="tok-val mono">{String(t.token.$value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

/** The design-system content is authored by Claude Code (MCP) or the CLI — the
    visualizer shows it. This little hint makes the authoring path discoverable. */
function AuthoredVia({ what, cmd }: { what: string; cmd: string }) {
  return (
    <span className="authored" title={cmd}>
      <span className="lock">◆</span> read-only — author via Claude Code (MCP) or <span className="mono">{cmd.split(' ').slice(0, 2).join(' ')}…</span>
    </span>
  );
}

const LEVELS = ['atom', 'molecule', 'organism', 'template'];
const LEVEL_LABELS: Record<string, string> = { atom: 'Atoms', molecule: 'Molecules', organism: 'Organisms', template: 'Templates' };
const csv = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

function Components({ project }: { project: string }) {
  const [comps, setComps] = useState<any[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => { api.components(project).then((cs) => { setComps(cs); setSel((s) => s ?? (cs[0]?.name ?? null)); }); }, [project]);
  const groups = LEVELS.map((lvl) => ({ lvl, items: comps.filter((c) => (c.level ?? 'atom') === lvl) })).filter((g) => g.items.length);
  const other = comps.filter((c) => !LEVELS.includes(c.level));
  return (
    <div className="split">
      <div>
        <h1 style={{ fontSize: 15, margin: '0 0 2px' }}>Components</h1>
        <p className="sub" style={{ fontSize: 11, margin: '0 0 14px' }}>atoms → molecules → organisms → templates</p>
        <div className="atomic">
          {groups.map((g) => (
            <div className="atomic-group" key={g.lvl}>
              <div className="atomic-h"><span className={`atomic-dot lvl-${g.lvl}`} />{LEVEL_LABELS[g.lvl]}<span className="atomic-n">{g.items.length}</span></div>
              <div className="list">
                {g.items.map((c) => (
                  <button key={c.name} className={`list-row ${sel === c.name ? 'on' : ''}`} onClick={() => setSel(c.name)}><span>{c.name}</span></button>
                ))}
              </div>
            </div>
          ))}
          {other.length > 0 && (
            <div className="atomic-group">
              <div className="atomic-h"><span className="atomic-dot" />Unclassified<span className="atomic-n">{other.length}</span></div>
              <div className="list">{other.map((c) => (<button key={c.name} className={`list-row ${sel === c.name ? 'on' : ''}`} onClick={() => setSel(c.name)}><span>{c.name}</span></button>))}</div>
            </div>
          )}
        </div>
      </div>
      {sel ? <ComponentCard key={sel} project={project} name={sel} /> : <p className="muted">Select a component.</p>}
    </div>
  );
}

function ComponentCard({ project, name }: { project: string; name: string }) {
  const [c, setC] = useState<any>(null);
  useEffect(() => { api.component(project, name).then(setC); }, [project, name]);
  if (!c) return <Loading />;
  const d = c.data ?? {};
  const u = d.usage ?? {};
  const Row = ({ label, children }: { label: string; children?: any }) => children ? (<div className="cc-row"><div className="cc-l">{label}</div><div className="cc-v">{children}</div></div>) : null;
  const list = (arr?: string[]) => arr?.length ? <ul className="cc-ul">{arr.map((x, i) => <li key={i}>{x}</li>)}</ul> : null;
  return (
    <div className="cc">
      <div className="editor-hd">
        <div className="name">{name} <span className="chip">{c.level ?? '—'}</span></div>
        <AuthoredVia what="component" cmd="via create_component (MCP)" />
      </div>
      <Row label="Intents">{d.intents?.length ? <div className="chips">{d.intents.map((x: string) => <span className="pchip static" key={x}>{x}</span>)}</div> : null}</Row>
      <Row label="Use when">{u.when}</Row>
      <Row label="Don't use when">{u.whenNot}</Row>
      <Row label="Instead use">{u.alternatives?.length ? <ul className="cc-ul">{u.alternatives.map((a: any, i: number) => <li key={i}><b>{a.use}</b>{a.when ? ` — ${a.when}` : ''}</li>)}</ul> : null}</Row>
      <Row label="Pairs with">{u.pairsWith?.length ? u.pairsWith.join(', ') : null}</Row>
      <Row label="Do">{list(u.do)}</Row>
      <Row label="Don't">{list(u.dont)}</Row>
      <Row label="Accessibility">{u.a11y}</Row>
      <Row label="Variants">{d.variants?.length ? d.variants.map((v: any) => v.when ? `${v.name} (${v.when})` : v.name).join('; ') : null}</Row>
      <Row label="Tokens used">{d.tokensUsed?.length ? <span className="mono" style={{ fontSize: 12 }}>{d.tokensUsed.join('  ·  ')}</span> : null}</Row>
      {c.body && <div className="cc-prose"><div className="cc-l">Exact use-cases on this project</div><div className="cc-body">{c.body}</div></div>}
    </div>
  );
}

function Patterns({ project }: { project: string }) {
  const [patterns, setPatterns] = useState<any[]>([]);
  const [guides, setGuides] = useState<any[]>([]);
  useEffect(() => { api.patterns(project).then(setPatterns); api.guidelines(project).then(setGuides); }, [project]);
  return (
    <>
      <h1>Patterns &amp; rules</h1>
      <p className="sub">Recurring solutions and the cross-cutting rules that govern components. <AuthoredVia what="pattern" cmd="dsk pattern / dsk guideline" /></p>
      <h2 className="sect">patterns</h2>
      {patterns.length === 0 && <p className="muted">No patterns yet.</p>}
      {patterns.map((p) => (
        <div className="card" key={p.name} style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
          <div className="cc-row"><div className="cc-l">Problem</div><div className="cc-v">{p.data.problem}</div></div>
          {p.data.solution && <div className="cc-row"><div className="cc-l">Solution</div><div className="cc-v">{p.data.solution}</div></div>}
          {p.data.componentsUsed?.length > 0 && <div className="cc-row"><div className="cc-l">Uses</div><div className="cc-v">{p.data.componentsUsed.join(', ')}</div></div>}
          {p.data.rationale && <div className="cc-row"><div className="cc-l">Why</div><div className="cc-v">{p.data.rationale}</div></div>}
        </div>
      ))}
      <h2 className="sect">guidelines</h2>
      {guides.length === 0 && <p className="muted">No guidelines yet.</p>}
      {guides.map((g) => (
        <div className="card" key={g.name} style={{ padding: '12px 16px', marginBottom: 8 }}>
          <div style={{ fontWeight: 500 }}>{g.name}{g.data.scope && <span className="chip" style={{ marginLeft: 8 }}>{g.data.scope}</span>}</div>
          <div className="muted" style={{ marginTop: 4 }}>{g.data.rule}</div>
          {g.data.governs?.length > 0 && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>governs: {g.data.governs.join(', ')}</div>}
        </div>
      ))}
    </>
  );
}

function Screens({ project }: { project: string }) {
  const [screens, setScreens] = useState<any[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [nName, setNName] = useState('');
  const load = (pick?: string) => api.screens(project).then((ss) => { setScreens(ss); if (pick) setSel(pick); });
  useEffect(() => { load(); }, [project]);
  const add = async () => {
    const name = nName.trim();
    if (!name) return;
    await api.saveScreen(project, name, { purpose: '', states: [], components: [], uiElements: [] });
    setNName(''); setAdding(false); load(name);
  };
  const remove = async (name: string) => {
    if (!confirm(`Delete screen "${name}"?`)) return;
    await api.deleteScreen(project, name);
    setSel(null); load();
  };
  return (
    <>
      <div className="hd-row">
        <div>
          <h1>Information architecture</h1>
          <p className="sub">Screens as structure — purpose, states, and the components each uses. Stored in <span className="mono">ia/</span>.</p>
        </div>
        <button className="btn accent" onClick={() => setAdding((a) => !a)}>{adding ? 'cancel' : '+ new screen'}</button>
      </div>
      {adding && (
        <div className="new-row">
          <input className="field" placeholder="Screen name — e.g. Settings" value={nName} onChange={(e) => setNName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} autoFocus />
          <button className="btn cta" onClick={add}>create</button>
        </div>
      )}
      <div className="split" style={{ marginTop: 18 }}>
        <div className="list">
          {screens.length === 0 && <p className="muted">No screens yet.</p>}
          {screens.map((s) => (
            <button key={s.name} className={`list-row ${sel === s.name ? 'on' : ''}`} onClick={() => setSel(s.name)}>
              <span>{s.name}</span><span className="lvl">{s.data.components?.length ?? 0} comp</span>
            </button>
          ))}
        </div>
        {sel ? <ScreenEditor key={sel} project={project} name={sel} onSaved={() => load(sel)} onDelete={() => remove(sel)} /> : <p className="muted">Select a screen, or create one.</p>}
      </div>
    </>
  );
}

function ScreenEditor({ project, name, onSaved, onDelete }: { project: string; name: string; onSaved: () => void; onDelete: () => void }) {
  const [s, setS] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { api.screen(project, name).then(setS); }, [project, name]);
  if (!s) return <Loading />;
  const val = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement).value;
  const save = async () => {
    await api.saveScreen(project, name, {
      purpose: val('s-purpose'),
      states: csv(val('s-states')),
      components: csv(val('s-components')),
      uiElements: lines(val('s-ui')),
    });
    setSaved(true); onSaved();
  };
  return (
    <div>
      <div className="editor-hd">
        <div className="name">{name}</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {saved && <span className="saved">saved ✓</span>}
          <button className="btn danger" onClick={onDelete}>delete</button>
          <button className="btn cta" onClick={save}>save</button>
        </div>
      </div>
      <label className="f"><span className="l">purpose</span><textarea id="s-purpose" className="field" rows={2} defaultValue={s.data.purpose ?? ''} /></label>
      <label className="f"><span className="l">states (comma-separated)</span><input id="s-states" className="field" defaultValue={(s.data.states ?? []).join(', ')} placeholder="empty, loading, error…" /></label>
      <label className="f"><span className="l">components used (comma-separated)</span><input id="s-components" className="field" defaultValue={(s.data.components ?? []).join(', ')} /></label>
      <label className="f"><span className="l">UI elements (one per line)</span><textarea id="s-ui" className="field" rows={4} defaultValue={(s.data.uiElements ?? []).join('\n')} /></label>
    </div>
  );
}

const Flows = ({ project }: { project: string }) => (
  <GraphBoard project={project} annotated title="User flows" noun="flow" folder="flows"
    sub="Drag blocks, connect steps, annotate edges. Autosaves to"
    list={api.flows} save={api.saveFlow} del={api.deleteFlow} />
);
const IA = ({ project }: { project: string }) => (
  <GraphBoard project={project} annotated={false} title="Information architecture" noun="map" folder="ia"
    sub="App-map of screens and sections — draggable nodes, plain connectors. Autosaves to"
    list={api.ia} save={api.saveIA} del={api.deleteIA} />
);

function GraphBoard({ project, annotated, title, sub, noun, folder, list, save, del }: {
  project: string; annotated: boolean; title: string; sub: string; noun: string; folder: string;
  list: (p: string) => Promise<any[]>; save: (p: string, name: string, data: unknown) => Promise<any>; del: (p: string, name: string) => Promise<any>;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const load = (pick?: string) => list(project).then((xs) => { setItems(xs); if (pick) setSel(pick); else if (xs[0] && !sel) setSel(xs[0].name); });
  useEffect(() => { load(); }, [project]);
  const add = async () => {
    const name = window.prompt(`${noun[0].toUpperCase() + noun.slice(1)} name?`);
    if (!name) return;
    await save(project, name, { nodes: [], edges: [], sections: [] });
    load(name);
  };
  const remove = async (name: string) => {
    if (!confirm(`Delete ${noun} "${name}"?`)) return;
    await del(project, name);
    setSel(null); load();
  };
  const current = items.find((f) => f.name === sel);
  return (
    <>
      <div className="hd-row">
        <div>
          <h1>{title}</h1>
          <p className="sub">{sub} <span className="mono">{folder}/</span>.</p>
        </div>
        <button className="btn accent" onClick={add}>+ new {noun}</button>
      </div>
      <div className="chips" style={{ margin: '4px 0 16px' }}>
        {items.map((f) => (
          <button key={f.name} className={`pchip ${sel === f.name ? 'on' : ''}`} onClick={() => setSel(f.name)}
            onDoubleClick={() => remove(f.name)} title="double-click to delete">{f.name}</button>
        ))}
      </div>
      {current
        ? <FlowCanvas key={current.name} item={current} annotated={annotated} save={(data) => save(project, current.name, data)} onSaved={() => load(sel ?? undefined)} />
        : <p className="muted">No {noun}s yet — create one.</p>}
    </>
  );
}

function Docs({ project }: { project: string }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [nName, setNName] = useState('');
  const load = (pick?: string) => api.docs(project).then((ds) => { setDocs(ds); if (pick) setSel(pick); });
  useEffect(() => { load(); }, [project]);
  const add = async () => {
    const name = nName.trim();
    if (!name) return;
    await api.saveDoc(project, name, { type: 'note', tags: [], body: '' });
    setNName(''); setAdding(false); load(name);
  };
  const remove = async (name: string) => {
    if (!confirm(`Delete doc "${name}"?`)) return;
    await api.deleteDoc(project, name);
    setSel(null); load();
  };
  return (
    <>
      <div className="hd-row">
        <div>
          <h1>Docs &amp; data</h1>
          <p className="sub">Grounding the agents read — PRDs, brand refs, research. Stored in <span className="mono">docs/</span>.</p>
        </div>
        <button className="btn accent" onClick={() => setAdding((a) => !a)}>{adding ? 'cancel' : '+ new doc'}</button>
      </div>
      {adding && (
        <div className="new-row">
          <input className="field" placeholder="Doc title — e.g. Brand voice" value={nName} onChange={(e) => setNName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} autoFocus />
          <button className="btn cta" onClick={add}>create</button>
        </div>
      )}
      <div className="split" style={{ marginTop: 18 }}>
        <div className="list">
          {docs.length === 0 && <p className="muted">No docs yet.</p>}
          {docs.map((d) => (
            <button key={d.name} className={`list-row ${sel === d.name ? 'on' : ''}`} onClick={() => setSel(d.name)}>
              <span>{d.name}</span><span className="lvl">{d.data?.type ?? 'note'}</span>
            </button>
          ))}
        </div>
        {sel ? <DocEditor key={sel} project={project} name={sel} onSaved={() => load(sel)} onDelete={() => remove(sel)} /> : <p className="muted">Select a doc, or create one.</p>}
      </div>
    </>
  );
}

const DOC_TYPES = ['note', 'prd', 'brand', 'research', 'spec'];

function DocEditor({ project, name, onSaved, onDelete }: { project: string; name: string; onSaved: () => void; onDelete: () => void }) {
  const [d, setD] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { api.doc(project, name).then(setD); }, [project, name]);
  if (!d) return <Loading />;
  const val = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement).value;
  const save = async () => {
    await api.saveDoc(project, name, {
      type: (document.getElementById('d-type') as HTMLSelectElement).value,
      tags: csv(val('d-tags')),
      body: val('d-body'),
    });
    setSaved(true); onSaved();
  };
  return (
    <div>
      <div className="editor-hd">
        <div className="name">{name} <span className="chip">{d.data?.type ?? 'note'}</span></div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {saved && <span className="saved">saved ✓</span>}
          <button className="btn danger" onClick={onDelete}>delete</button>
          <button className="btn cta" onClick={save}>save</button>
        </div>
      </div>
      <label className="f"><span className="l">type</span>
        <select id="d-type" className="field" defaultValue={d.data?.type ?? 'note'}>{DOC_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
      </label>
      <label className="f"><span className="l">tags (comma-separated)</span><input id="d-tags" className="field" defaultValue={(d.data?.tags ?? []).join(', ')} /></label>
      <label className="f"><span className="l">content (markdown / text)</span><textarea id="d-body" className="field mono" rows={16} defaultValue={d.body ?? ''} placeholder="Paste the PRD, brand notes, research…" /></label>
    </div>
  );
}

function Assets({ project }: { project: string }) {
  const [assets, setAssets] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const load = () => api.assets(project).then(setAssets);
  useEffect(() => { load(); }, [project]);
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    for (const file of Array.from(files)) {
      const data: string = await new Promise((res) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(',')[1] ?? '');
        r.readAsDataURL(file);
      });
      await api.uploadAsset(project, file.name, data);
    }
    setBusy(false); load();
  };
  const remove = async (name: string) => { if (confirm(`Delete ${name}?`)) { await api.deleteAsset(project, name); load(); } };
  const isImg = (ext: string) => ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif', '.ico'].includes(ext);
  const kb = (n: number) => n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`;
  return (
    <>
      <div className="hd-row">
        <div>
          <h1>Assets</h1>
          <p className="sub">Icons, logos, images. Stored in <span className="mono">assets/</span> alongside the repo.</p>
        </div>
        <label className="btn accent" style={{ cursor: 'pointer' }}>
          {busy ? 'uploading…' : '+ upload'}
          <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={(e) => upload(e.target.files)} />
        </label>
      </div>
      {assets.length === 0 ? (
        <p className="muted" style={{ marginTop: 24 }}>No assets yet. Upload icons or images to keep them beside the design system.</p>
      ) : (
        <div className="asset-grid">
          {assets.map((a) => (
            <div className="asset" key={a.name}>
              <div className="asset-thumb">
                {isImg(a.ext) ? <img src={api.assetUrl(project, a.name)} alt={a.name} /> : <span className="asset-ext">{a.ext.replace('.', '') || 'file'}</span>}
                <button className="tok-del" title="delete" onClick={() => remove(a.name)}>×</button>
              </div>
              <div className="asset-name" title={a.name}>{a.name}</div>
              <div className="asset-size">{kb(a.size)}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Build({ project }: { project: string }) {
  const [comps, setComps] = useState<any[]>([]);
  const [flows, setFlows] = useState<any[]>([]);
  const [intent, setIntent] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [flow, setFlow] = useState('');
  const [prompt, setPrompt] = useState('');
  useEffect(() => { api.components(project).then(setComps); api.flows(project).then(setFlows); }, [project]);
  const toggle = (n: string) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));
  const gen = () => api.feature(project, { intent, components: picked.length ? picked : undefined, flow: flow || undefined }).then((r) => setPrompt(r.prompt));
  return (
    <>
      <h1>Build a feature</h1>
      <p className="sub">Assemble a scoped spec to hand to Claude Code.</p>
      <label className="f"><span className="l">intent</span><input className="field" value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="e.g. delete account" /></label>
      <label className="f"><span className="l">components</span>
        <div className="chips">{comps.map((c) => <button key={c.name} className={`pchip ${picked.includes(c.name) ? 'on' : ''}`} onClick={() => toggle(c.name)}>{c.name}</button>)}</div>
      </label>
      <label className="f"><span className="l">flow</span>
        <select className="field" value={flow} onChange={(e) => setFlow(e.target.value)}><option value="">(none)</option>{flows.map((f) => <option key={f.name}>{f.name}</option>)}</select>
      </label>
      <button className="btn cta" onClick={gen}>generate spec</button>
      {prompt && <pre className="prompt">{prompt}</pre>}
    </>
  );
}
