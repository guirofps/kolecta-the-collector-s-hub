import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { LaunchGateState } from "@/hooks/use-launch-gate";

// ── Mock do hook para controlar o estado do gate por teste ──────────────────

const mockState = vi.fn<[], LaunchGateState>();

vi.mock("@/hooks/use-launch-gate", () => ({
  useLaunchGate: () => mockState(),
}));

import LaunchGate from "@/components/LaunchGate";

// ── Helpers ─────────────────────────────────────────────────────────────────

function setGate(partial: Partial<LaunchGateState>) {
  mockState.mockReturnValue({
    isLoading: false,
    isPreLaunch: true,
    isAdmin: false,
    gateActive: true,
    ...partial,
  });
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LaunchGate>
        <Routes>
          <Route path="/" element={<div>HOME</div>} />
          <Route path="*" element={<div>CONTENT:{path}</div>} />
        </Routes>
      </LaunchGate>
    </MemoryRouter>,
  );
}

describe("LaunchGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra spinner enquanto o auth carrega", () => {
    setGate({ isLoading: true });
    const { container } = renderAt("/busca");
    expect(container.querySelector(".animate-spin")).toBeTruthy();
    expect(screen.queryByText(/CONTENT/)).toBeNull();
  });

  it("com gate ativo, redireciona rota fechada para a home", () => {
    setGate({ gateActive: true });
    renderAt("/busca");
    // Navigate to "/" → renderiza a HOME, não o conteúdo da rota fechada
    expect(screen.getByText("HOME")).toBeInTheDocument();
    expect(screen.queryByText(/CONTENT/)).toBeNull();
  });

  it("com gate ativo, deixa passar rotas da allowlist (/conta)", () => {
    setGate({ gateActive: true });
    renderAt("/conta");
    expect(screen.getByText(/CONTENT/)).toBeInTheDocument();
  });

  it("com gate ativo, deixa passar sub-rotas da allowlist (/conta/pedidos)", () => {
    setGate({ gateActive: true });
    renderAt("/conta/pedidos");
    expect(screen.getByText(/CONTENT/)).toBeInTheDocument();
  });

  it("com gate ativo, deixa passar rotas de auth (/criar-conta)", () => {
    setGate({ gateActive: true });
    renderAt("/criar-conta");
    expect(screen.getByText(/CONTENT/)).toBeInTheDocument();
  });

  it("com gate ativo, deixa a home renderizar (decide via Index)", () => {
    setGate({ gateActive: true });
    renderAt("/");
    expect(screen.getByText("HOME")).toBeInTheDocument();
  });

  it("com gate INATIVO (admin ou pós-lançamento), tudo passa", () => {
    setGate({ gateActive: false, isPreLaunch: false });
    renderAt("/busca");
    expect(screen.getByText(/CONTENT/)).toBeInTheDocument();
  });

  it("não deixa passar rota fechada parecida com allowlist (/contato)", () => {
    setGate({ gateActive: true });
    renderAt("/contato");
    // /contato NÃO é /conta nem /conta/... → deve ser bloqueada
    expect(screen.getByText("HOME")).toBeInTheDocument();
    expect(screen.queryByText(/CONTENT/)).toBeNull();
  });
});
