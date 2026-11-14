# GarageFlow UI

Interface React + TypeScript para demonstrar o fluxo da OS entre OS Service,
Billing Service e Execution Service.

## Executar

Instale Node.js 20 ou superior e execute:

```powershell
npm install
npm run dev
```

Abra `http://localhost:5173`.

O login da tela chama `POST /auth` no API Gateway da Lambda Auth. Configure as
URLs com:

```text
VITE_AUTH_API_URL
VITE_OS_API_URL
VITE_BILLING_API_URL
VITE_EXECUTION_API_URL
```


A tela solicita o CPF, chama o API Gateway e usa o JWT retornado
automaticamente. A API precisa permitir a origem `http://localhost:5173` via
CORS.
