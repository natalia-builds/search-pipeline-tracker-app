import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openServerStore } from "./serverStore";
import { STORAGE_KEY } from "./storage";

/** A stand-in for the local server that remembers the library and its revision. */
function fakeServer(initial: { rev: number; library: unknown } = { rev: 0, library: null }) {
  const state = { ...initial, down: false, puts: [] as { baseRev: number; library: unknown }[], aside: [] as string[] };
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
  const fetchFn = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    if (state.down) throw new TypeError("Failed to fetch");
    const method = init?.method ?? "GET";
    if (String(url) === "/api/aside") {
      state.aside.push(JSON.parse(String(init?.body)).text);
      return json(200, { ok: true });
    }
    if (method === "GET") return json(200, { rev: state.rev, library: state.library });
    const body = JSON.parse(String(init?.body));
    if (body.baseRev !== state.rev) return json(409, { error: "This was changed in another window." });
    state.puts.push(body);
    state.rev += 1;
    state.library = body.library;
    return json(200, { rev: state.rev });
  });
  return { state, fetchFn: fetchFn as unknown as typeof fetch };
}
const events = () => ({ onSaveError: vi.fn(), onSaved: vi.fn() });
const flushPromises = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("server store", () => {
  it("reports a clear error when the server can't be reached", async () => {
    const s = fakeServer();
    s.state.down = true;
    const r = await openServerStore(events(), s.fetchFn);
    expect(r.store).toBeNull();
    expect(r.error).toMatch(/local server/);
  });

  it("loads what the server has, and nothing for other keys", async () => {
    const s = fakeServer({ rev: 3, library: { schema: 1, note: "hi" } });
    const { store } = await openServerStore(events(), s.fetchFn);
    expect(JSON.parse(store!.getItem(STORAGE_KEY)!)).toEqual({ schema: 1, note: "hi" });
    expect(store!.getItem("something.else")).toBeNull();
  });

  it("starts empty when the server has no library yet", async () => {
    const { store } = await openServerStore(events(), fakeServer().fetchFn);
    expect(store!.getItem(STORAGE_KEY)).toBeNull();
  });

  it("returns the new value straight away and sends saves one at a time, in order", async () => {
    const s = fakeServer();
    const { store } = await openServerStore(events(), s.fetchFn);
    store!.setItem(STORAGE_KEY, JSON.stringify({ schema: 1, n: 1 }));
    store!.setItem(STORAGE_KEY, JSON.stringify({ schema: 1, n: 2 }));
    store!.setItem(STORAGE_KEY, JSON.stringify({ schema: 1, n: 3 }));
    expect(JSON.parse(store!.getItem(STORAGE_KEY)!).n).toBe(3);
    expect(store!.hasUnsaved()).toBe(true);
    await flushPromises();
    await flushPromises();
    expect(store!.hasUnsaved()).toBe(false);
    // Every save used the revision the previous one produced, and the last change won.
    expect(s.state.puts.map((p) => p.baseRev)).toEqual([...s.state.puts.map((_, i) => i)]);
    expect((s.state.library as { n: number }).n).toBe(3);
  });

  it("stops saving after a conflict so an old window can't overwrite newer work", async () => {
    const s = fakeServer();
    const ev = events();
    const { store } = await openServerStore(ev, s.fetchFn);
    s.state.rev = 5; // another window saved in the meantime
    store!.setItem(STORAGE_KEY, JSON.stringify({ schema: 1, n: 1 }));
    await flushPromises();
    expect(ev.onSaveError).toHaveBeenCalledWith(expect.stringMatching(/another window/));
    const calls = (s.fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls.length;
    store!.setItem(STORAGE_KEY, JSON.stringify({ schema: 1, n: 2 }));
    await flushPromises();
    expect((s.fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(calls);
    expect(s.state.puts).toHaveLength(0);
  });

  it("keeps the change, tells the person, and retries when the server is down, then clears the warning", async () => {
    const s = fakeServer();
    const ev = events();
    const { store } = await openServerStore(ev, s.fetchFn);
    s.state.down = true;
    store!.setItem(STORAGE_KEY, JSON.stringify({ schema: 1, n: 1 }));
    await flushPromises();
    expect(ev.onSaveError).toHaveBeenCalledWith(expect.stringMatching(/server isn't responding/));
    expect(store!.hasUnsaved()).toBe(true);
    s.state.down = false;
    await vi.advanceTimersByTimeAsync(5000);
    expect(store!.hasUnsaved()).toBe(false);
    expect(ev.onSaved).toHaveBeenCalledTimes(1);
    expect((s.state.library as { n: number }).n).toBe(1);
  });

  it("picks up changes made in another window, but not while its own save is waiting", async () => {
    const s = fakeServer({ rev: 1, library: { schema: 1, n: 1 } });
    const { store } = await openServerStore(events(), s.fetchFn);
    expect(await store!.refresh()).toBe(false);
    s.state.rev = 2;
    s.state.library = { schema: 1, n: 2 };
    expect(await store!.refresh()).toBe(true);
    expect(JSON.parse(store!.getItem(STORAGE_KEY)!).n).toBe(2);
    s.state.down = true;
    store!.setItem(STORAGE_KEY, JSON.stringify({ schema: 1, n: 3 }));
    await flushPromises();
    s.state.down = false;
    s.state.rev = 9;
    expect(await store!.refresh()).toBe(false);
    expect(JSON.parse(store!.getItem(STORAGE_KEY)!).n).toBe(3);
  });

  it("sets aside data that couldn't be read", async () => {
    const s = fakeServer();
    const { store } = await openServerStore(events(), s.fetchFn);
    store!.setItem(STORAGE_KEY + ".unreadable", "{broken");
    await flushPromises();
    expect(s.state.aside).toEqual(["{broken"]);
  });
});
