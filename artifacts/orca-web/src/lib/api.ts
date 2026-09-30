// Same-origin API client. Cookies carry the session; errors carry the server's message.
export const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const API = `${basePath}/api`;

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? 'GET',
    credentials: 'include',
    headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(typeof data?.error === 'string' ? data.error : `Request failed (${res.status})`, res.status);
  return data as T;
}

export type LonLat = [number, number];
export type User = { id: number; email: string; name: string; role: string; language: string };
export type SavedLocation = { id: number; name: string; lat: number; lon: number; kind: string };
export type TraceStep = { agent: string; tool: string; args?: unknown; status: 'running' | 'ok' | 'failed'; ms?: number; detail?: string; output?: string };
export type Evidence = { id: string; source: string; product: string; url: string; status: string; observedAt?: string; validFrom?: string; validTo?: string; retrievedAt: string; resolution?: string; note?: string };
export type Block = { type: string; title: string; [k: string]: any };
export type Answer = {
  text: string; blocks: Block[]; map: { fit?: [number, number, number, number]; layers: Record<string, any> };
  evidence: Evidence[]; trace: TraceStep[]; model: string; totalMs: number; grounding: { checked: number; ungrounded: string[] };
};

/** POST /chat and read the server-sent event stream. */
export async function streamChat(body: { message: string; conversationId?: number; lonlat?: LonLat }, on: { conversation?: (id: number) => void; step?: (s: TraceStep) => void; signal?: AbortSignal }): Promise<Answer> {
  const res = await fetch(`${API}/chat`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: on.signal });
  if (!res.ok || !res.body) {
    const d = await res.json().catch(() => ({}));
    throw new ApiError(d?.error ?? `Request failed (${res.status})`, res.status);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let answer: Answer | undefined;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const event = /^event: (.*)$/m.exec(chunk)?.[1];
      const data = /^data: (.*)$/m.exec(chunk)?.[1];
      if (!event || !data) continue;
      const parsed = JSON.parse(data);
      if (event === 'conversation') on.conversation?.(parsed.id);
      else if (event === 'step') on.step?.(parsed);
      else if (event === 'answer') answer = parsed;
      else if (event === 'error') throw new ApiError(parsed.message, 502);
    }
  }
  if (!answer) throw new ApiError('The connection closed before ORCA answered.', 502);
  return answer;
}
