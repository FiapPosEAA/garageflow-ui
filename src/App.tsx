import { FormEvent, useState } from "react";

type WorkOrder = {
  id: string;
  customerId: string;
  vehicleId: string;
  status: string;
  createdAt: string;
};

type Quote = {
  id: string;
  workOrderId: string;
  amount: number;
  status: string;
  createdAt: string;
};

type Execution = {
  id: string;
  workOrderId: string;
  status: string;
  createdAt: string;
};

const api = {
  auth: import.meta.env.VITE_AUTH_API_URL ?? "",
  os: import.meta.env.VITE_OS_API_URL ?? "http://localhost:5001",
  billing: import.meta.env.VITE_BILLING_API_URL ?? "http://localhost:5002",
  execution: import.meta.env.VITE_EXECUTION_API_URL ?? "http://localhost:5003",
};

async function request<T>(url: string, token: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(await response.text() || `Erro HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

export default function App() {
  const [token, setToken] = useState("");
  const [cpf, setCpf] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [amount, setAmount] = useState("250");
  const [order, setOrder] = useState<WorkOrder>();
  const [quote, setQuote] = useState<Quote>();
  const [paymentApproved, setPaymentApproved] = useState(false);
  const [execution, setExecution] = useState<Execution>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(event: FormEvent) {
    event.preventDefault();
    if (!api.auth) {
      setMessage("Configure VITE_AUTH_API_URL com a URL do API Gateway.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const response = await request<{ token: string; customer: { id: string; name: string } }>(
        `${api.auth}/auth`,
        "",
        "POST",
        { cpf },
      );
      setToken(response.token);
      setCustomerId(response.customer.id);
      setCustomerName(response.customer.name);
      setMessage("Atendimento autenticado. A oficina está pronta.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível autenticar o cliente.");
    } finally {
      setBusy(false);
    }
  }

  async function createOrder(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const created = await request<WorkOrder>(`${api.os}/work-orders`, token, "POST", { customerId, vehicleId });
      setOrder(created);
      setQuote(undefined);
      setPaymentApproved(false);
      setExecution(undefined);
      setMessage("OS criada e aguardando orçamento.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar a OS.");
    } finally {
      setBusy(false);
    }
  }

  async function createQuote() {
    if (!order) return;
    setBusy(true);
    try {
      const created = await request<Quote>(`${api.billing}/quotes`, token, "POST", {
        workOrderId: order.id,
        amount: Number(amount),
      });
      setQuote(created);
      setMessage("Orçamento gerado para aprovação.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível gerar o orçamento.");
    } finally {
      setBusy(false);
    }
  }

  async function approvePayment() {
    if (!quote) return;
    setBusy(true);
    try {
      const approved = await request<Quote>(`${api.billing}/quotes/${quote.id}/approve`, token, "POST");
      setQuote(approved);
      setPaymentApproved(true);
      setMessage("Pagamento aprovado. A OS foi liberada para execução.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível aprovar o pagamento.");
    } finally {
      setBusy(false);
    }
  }

  async function enqueueExecution() {
    if (!order || !paymentApproved) return;
    setBusy(true);
    try {
      const created = await request<Execution>(`${api.execution}/executions`, token, "POST", { workOrderId: order.id });
      setExecution(created);
      setMessage("OS enviada para a fila de execução.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível iniciar a execução.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">G</span><div><strong>GarageFlow</strong><small>Operação distribuída</small></div></div>
      </header>
      <section className="hero">
        <div><p className="eyebrow">GarageFlow · box de serviços</p><h1>Seu carro em boas mãos.</h1><p className="subtitle">Do primeiro diagnóstico à entrega, acompanhe cada etapa do serviço.</p></div>
        <div className="hero-stat"><span>STATUS DA OFICINA</span><strong>ABERTA <i>●</i></strong></div>
      </section>

      {!token ? (
        <section className="login-card">
          <div className="login-badge">RECEPÇÃO</div>
          <h2>Identifique o cliente</h2>
          <p>Informe o CPF para abrir o atendimento com segurança.</p>
          <form onSubmit={login}>
            <label>CPF do cliente <input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" inputMode="numeric" required /></label>
            <button disabled={busy}>{busy ? "Validando cadastro..." : "Entrar no atendimento"} <span>→</span></button>
          </form>
          {message && <div className="notice">{message}</div>}
        </section>
      ) : <section className="content">
        <div className="customer-bar"><span>CLIENTE AUTENTICADO</span><strong>{customerName}</strong><button type="button" onClick={() => { setToken(""); setCustomerName(""); }}>Trocar cliente</button></div>
        <div className="panel setup">
          <div className="panel-title"><span className="number">01</span><div><h2>Abrir ficha do veículo</h2><p>Registre a entrada no box</p></div></div>
          <form onSubmit={createOrder}>
            <div className="fields"><label>ID do cliente <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} required /></label><label>Placa / veículo <input value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required /></label></div>
            <button disabled={busy}>{busy ? "Abrindo ficha..." : "Dar entrada no veículo"} <span>→</span></button>
          </form>
        </div>
        <div className="panel timeline">
          <div className="panel-title"><span className="number">02</span><div><h2>Painel do serviço</h2><p>Acompanhe o carro em cada estação</p></div></div>
          <div className="steps">
            <Step label="Recepção" active={!!order} detail={order?.id.slice(0, 8) ?? "Aguardando veículo"} />
            <Step label="Orçamento" active={!!quote} detail={quote ? `R$ ${quote.amount.toFixed(2)}` : "Aguardando diagnóstico"} />
            <Step label="Aprovação" active={paymentApproved} detail={paymentApproved ? "Pagamento confirmado" : "Pagamento online"} />
            <Step label="Box de reparo" active={!!execution} detail={execution?.status ?? "Aguardando aprovação"} />
          </div>
        </div>
        <div className="actions">
          <div className={`action-card ${order ? "ready" : ""}`}><div className="action-icon">R$</div><div><span>BALCÃO · BILLING</span><h3>Montar orçamento</h3></div><button onClick={createQuote} disabled={!order || busy}>Montar <b>→</b></button></div>
          <div className={`action-card ${quote ? "ready" : ""}`}><div className="action-icon payment">✓</div><div><span>CHECKOUT · MERCADO PAGO</span><h3>Aprovar pagamento</h3></div><button onClick={approvePayment} disabled={!quote || paymentApproved || busy}>Aprovar <b>→</b></button></div>
          <div className={`action-card ${paymentApproved ? "ready" : ""}`}><div className="action-icon wrench">⚙</div><div><span>BOX · EXECUTION</span><h3>Liberar para o mecânico</h3></div><button onClick={enqueueExecution} disabled={!paymentApproved || busy}>Liberar <b>→</b></button></div>
        </div>
        {message && <div className="notice">{message}</div>}
      </section>}
      <footer><span>GARAGEFLOW PLATFORM</span><span>OS · BILLING · EXECUTION</span></footer>
    </main>
  );
}

function Step({ label, detail, active }: { label: string; detail?: string; active: boolean }) {
  return <div className={`step ${active ? "active" : ""}`}><div className="step-dot">{active ? "✓" : "·"}</div><div><strong>{label}</strong><small>{detail}</small></div></div>;
}
