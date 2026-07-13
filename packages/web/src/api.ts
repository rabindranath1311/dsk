const enc = encodeURIComponent;
const j = (r: Response) => r.json();
const send = (method: string) => (url: string, body?: unknown) =>
  fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) }).then(j);
const post = send('POST');
const put = send('PUT');
const del = send('DELETE');

// One design system — the server serves the folder it was started in, so no
// project is passed. (`_p` is kept in the signatures so the view components read
// the same whether or not a project id is ever reintroduced.)
const q = (_p: string, extra = '') => (extra ? `?${extra.replace(/^&/, '')}` : '');

export const api = {
  // the single design system
  overview: (p: string) => fetch(`/api/project/overview${q(p)}`).then(j),
  tokens: (p: string) => fetch(`/api/project/tokens${q(p)}`).then(j),
  setToken: (p: string, path: string, value: string) => put(`/api/project/tokens/${enc(path)}${q(p)}`, { value }),
  setTokenTyped: (p: string, path: string, value: string, type?: string) => put(`/api/project/tokens/${enc(path)}${q(p)}`, { value, type }),
  deleteToken: (p: string, path: string) => del(`/api/project/tokens/${enc(path)}${q(p)}`),
  components: (p: string) => fetch(`/api/project/components${q(p)}`).then(j),
  component: (p: string, name: string) => fetch(`/api/project/components/${enc(name)}${q(p)}`).then(j),
  saveComponent: (p: string, name: string, data: unknown) => put(`/api/project/components/${enc(name)}${q(p)}`, data),
  deleteComponent: (p: string, name: string) => del(`/api/project/components/${enc(name)}${q(p)}`),
  screens: (p: string) => fetch(`/api/project/screens${q(p)}`).then(j),
  screen: (p: string, name: string) => fetch(`/api/project/screens/${enc(name)}${q(p)}`).then(j),
  saveScreen: (p: string, name: string, data: unknown) => put(`/api/project/screens/${enc(name)}${q(p)}`, data),
  deleteScreen: (p: string, name: string) => del(`/api/project/screens/${enc(name)}${q(p)}`),
  flows: (p: string) => fetch(`/api/project/flows${q(p)}`).then(j),
  saveFlow: (p: string, name: string, data: unknown) => put(`/api/project/flows/${enc(name)}${q(p)}`, data),
  deleteFlow: (p: string, name: string) => del(`/api/project/flows/${enc(name)}${q(p)}`),
  ia: (p: string) => fetch(`/api/project/ia${q(p)}`).then(j),
  saveIA: (p: string, name: string, data: unknown) => put(`/api/project/ia/${enc(name)}${q(p)}`, data),
  deleteIA: (p: string, name: string) => del(`/api/project/ia/${enc(name)}${q(p)}`),
  patterns: (p: string) => fetch(`/api/project/patterns${q(p)}`).then(j),
  guidelines: (p: string) => fetch(`/api/project/guidelines${q(p)}`).then(j),

  // docs (data layer)
  docs: (p: string) => fetch(`/api/project/docs${q(p)}`).then(j),
  doc: (p: string, name: string) => fetch(`/api/project/docs/${enc(name)}${q(p)}`).then(j),
  saveDoc: (p: string, name: string, data: unknown) => put(`/api/project/docs/${enc(name)}${q(p)}`, data),
  deleteDoc: (p: string, name: string) => del(`/api/project/docs/${enc(name)}${q(p)}`),

  // assets
  assets: (p: string) => fetch(`/api/project/assets${q(p)}`).then(j),
  assetUrl: (p: string, name: string) => `/api/project/asset/${enc(name)}${q(p)}`,
  uploadAsset: (p: string, name: string, data: string) => post(`/api/project/assets${q(p)}`, { name, data }),
  deleteAsset: (p: string, name: string) => del(`/api/project/assets/${enc(name)}${q(p)}`),

  recommend: (p: string, query: string) => fetch(`/api/project/recommend${q(p, `&q=${enc(query)}`)}`).then(j),
  feature: (p: string, req: unknown) => post(`/api/project/feature${q(p)}`, req),
};
