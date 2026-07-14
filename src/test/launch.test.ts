import { describe, it, expect, afterEach, vi } from "vitest";

// launch.ts lê VITE_LAUNCH_DATE em `const RAW` no momento em que o módulo é
// avaliado. Para testar valores diferentes precisamos stubar a env ANTES de
// importar e resetar o cache de módulos entre os casos.
async function loadLaunch(launchDate?: string) {
  vi.resetModules();
  if (launchDate === undefined) {
    vi.stubEnv("VITE_LAUNCH_DATE", "");
  } else {
    vi.stubEnv("VITE_LAUNCH_DATE", launchDate);
  }
  return import("@/lib/launch");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

const LAUNCH = "2026-07-25T00:00:00-03:00";
const before = new Date("2026-07-24T12:00:00-03:00"); // 12h antes do lançamento
const after = new Date("2026-07-25T00:00:01-03:00"); // 1s depois

describe("getLaunchDate", () => {
  it("retorna a Date configurada quando a env é uma ISO válida", async () => {
    const { getLaunchDate } = await loadLaunch(LAUNCH);
    const d = getLaunchDate();
    expect(d).not.toBeNull();
    expect(d!.getTime()).toBe(new Date(LAUNCH).getTime());
  });

  it("retorna null quando a env está ausente", async () => {
    const { getLaunchDate } = await loadLaunch(undefined);
    expect(getLaunchDate()).toBeNull();
  });

  it("retorna null quando a env é uma data inválida", async () => {
    const { getLaunchDate } = await loadLaunch("não-é-data");
    expect(getLaunchDate()).toBeNull();
  });
});

describe("hasLaunched", () => {
  it("é false antes da data-alvo", async () => {
    const { hasLaunched } = await loadLaunch(LAUNCH);
    expect(hasLaunched(before)).toBe(false);
  });

  it("é true exatamente na data-alvo", async () => {
    const { hasLaunched } = await loadLaunch(LAUNCH);
    expect(hasLaunched(new Date(LAUNCH))).toBe(true);
  });

  it("é true depois da data-alvo", async () => {
    const { hasLaunched } = await loadLaunch(LAUNCH);
    expect(hasLaunched(after)).toBe(true);
  });

  it("é true (dev-safe) quando não há data configurada", async () => {
    const { hasLaunched } = await loadLaunch(undefined);
    expect(hasLaunched(before)).toBe(true);
  });

  it("é true (dev-safe) quando a data é inválida", async () => {
    const { hasLaunched } = await loadLaunch("xyz");
    expect(hasLaunched(before)).toBe(true);
  });
});

describe("getCountdown", () => {
  it("decompõe corretamente o tempo restante", async () => {
    const { getCountdown } = await loadLaunch(LAUNCH);
    // 1 dia, 2h, 3min, 4s antes do lançamento
    const now = new Date("2026-07-23T21:56:56-03:00");
    const c = getCountdown(now);
    expect(c.days).toBe(1);
    expect(c.hours).toBe(2);
    expect(c.minutes).toBe(3);
    expect(c.seconds).toBe(4);
    expect(c.totalMs).toBeGreaterThan(0);
  });

  it("nunca fica negativo depois do lançamento", async () => {
    const { getCountdown } = await loadLaunch(LAUNCH);
    const c = getCountdown(after);
    expect(c.totalMs).toBe(0);
    expect(c.days).toBe(0);
    expect(c.hours).toBe(0);
    expect(c.minutes).toBe(0);
    expect(c.seconds).toBe(0);
  });

  it("zera quando não há data configurada", async () => {
    const { getCountdown } = await loadLaunch(undefined);
    const c = getCountdown(before);
    expect(c.totalMs).toBe(0);
  });
});
