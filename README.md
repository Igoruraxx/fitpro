# FitPro 💪

SaaS completo para personal trainers gerenciarem sua agenda de atendimentos, clientes, evolução dos alunos e finanças. Inclui painel admin e design mobile-first dark/azul.

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Backend | Node.js + Express + tRPC |
| Banco de Dados | PostgreSQL (Supabase) |
| ORM | Drizzle ORM |
| Autenticação | JWT (jose) |
| Armazenamento | AWS S3 (fotos) |
| Email | Nodemailer |
| Estilo | Tailwind CSS + Radix UI |

## Funcionalidades

- **Clientes** — cadastro completo com planos mensais, pacotes de sessões e consultorias
- **Agenda** — agendamentos únicos e recorrentes (diário, semanal, quinzenal, mensal)
- **Evolução** — medidas corporais e fotos de progresso ao longo do tempo
- **Bioimpedância** — laudos com mais de 25 parâmetros
- **Finanças** — receitas, despesas, cobranças automáticas e relatórios
- **Dashboard** — estatísticas em tempo real, gráficos semanais e agenda do dia
- **Admin** — painel administrativo para gestão de treinadores

## Configuração

### Pré-requisitos

- Node.js 18+
- pnpm
- Banco de dados PostgreSQL (recomendado: Supabase)

### Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha os valores:

```env
# Banco de dados
DATABASE_URL=postgresql://SEU_USUARIO:SUA_SENHA@SEU_HOST:5432/SEU_BANCO

# Autenticação — gere um segredo forte e aleatório (mínimo 32 caracteres)
# Exemplo: openssl rand -base64 32
JWT_SECRET=SUBSTITUA_POR_UM_SEGREDO_FORTE_E_ALEATORIO

# URL da aplicação (usada nos links de email)
APP_URL=https://seu-dominio.com

# Resend (envio de emails de confirmação e redefinição de senha)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# S3 (opcional — para upload de fotos de perfil e progresso)
# S3_ACCESS_KEY_ID=
# S3_SECRET_ACCESS_KEY=
# S3_REGION=us-east-1
# S3_BUCKET=
# S3_ENDPOINT=
```

### Instalação

```bash
pnpm install
```

### Banco de Dados

```bash
# Gerar e aplicar migrations
pnpm db:push
```

### Desenvolvimento

```bash
pnpm dev
```

### Build para Produção

```bash
pnpm build
pnpm start
```

## API

A API é construída com **tRPC**, acessível via `/trpc`. Todos os endpoints protegidos exigem um cookie de sessão JWT válido.

### Autenticação (`auth`)

| Endpoint | Tipo | Descrição |
|----------|------|-----------|
| `auth.register` | `mutation` | Criar nova conta de treinador |
| `auth.login` | `mutation` | Autenticar com email e senha |
| `auth.logout` | `mutation` | Encerrar sessão |
| `auth.me` | `query` | Obter dados do usuário autenticado |
| `auth.forgotPassword` | `mutation` | Solicitar redefinição de senha |
| `auth.resetPassword` | `mutation` | Concluir redefinição de senha |

### Perfil (`profile`)

| Endpoint | Tipo | Descrição |
|----------|------|-----------|
| `profile.update` | `mutation` | Atualizar perfil (nome, telefone, especialidades, bio, CREF, foto) |

### Clientes (`clients`)

| Endpoint | Tipo | Descrição |
|----------|------|-----------|
| `clients.list` | `query` | Listar todos os clientes do treinador |
| `clients.getById` | `query` | Obter cliente por ID |
| `clients.create` | `mutation` | Criar novo cliente |
| `clients.update` | `mutation` | Atualizar dados do cliente |
| `clients.delete` | `mutation` | Remover cliente |
| `clients.count` | `query` | Contagem de clientes |
| `clients.renewPackage` | `mutation` | Renovar pacote de sessões |
| `clients.generateRemainingAppointments` | `mutation` | Gerar agendamentos restantes do pacote |

### Agendamentos (`appointments`)

| Endpoint | Tipo | Descrição |
|----------|------|-----------|
| `appointments.list` | `query` | Listar agendamentos por intervalo de datas |
| `appointments.listByClient` | `query` | Agendamentos de um cliente |
| `appointments.getById` | `query` | Obter agendamento por ID |
| `appointments.create` | `mutation` | Criar agendamento único |
| `appointments.createRecurring` | `mutation` | Criar agendamentos recorrentes |
| `appointments.update` | `mutation` | Atualizar agendamento |
| `appointments.delete` | `mutation` | Remover agendamento |
| `appointments.deleteGroup` | `mutation` | Remover grupo de agendamentos recorrentes |
| `appointments.deleteFutureByClient` | `mutation` | Remover agendamentos futuros do cliente |
| `appointments.deleteAllByClient` | `mutation` | Remover todos os agendamentos do cliente |
| `appointments.pendingByClient` | `query` | Agendamentos pendentes do cliente |
| `appointments.pendingGrouped` | `query` | Agendamentos pendentes agrupados |

### Evolução — Medidas (`evolution.measurements`)

| Endpoint | Tipo | Descrição |
|----------|------|-----------|
| `evolution.measurements.list` | `query` | Listar medidas corporais do cliente |
| `evolution.measurements.create` | `mutation` | Registrar novas medidas |
| `evolution.measurements.delete` | `mutation` | Remover registro de medidas |

**Campos disponíveis:** peso, altura, peito, cintura, quadril, braços, coxas, panturrilhas, percentual de gordura corporal.

### Evolução — Fotos (`evolution.photos`)

| Endpoint | Tipo | Descrição |
|----------|------|-----------|
| `evolution.photos.list` | `query` | Listar fotos de progresso do cliente |
| `evolution.photos.create` | `mutation` | Adicionar foto de progresso |
| `evolution.photos.delete` | `mutation` | Remover foto |

**Tipos de foto:** frontal, costas, lateral esquerda, lateral direita, outro.

### Bioimpedância (`bioimpedance`)

| Endpoint | Tipo | Descrição |
|----------|------|-----------|
| `bioimpedance.list` | `query` | Listar exames do cliente |
| `bioimpedance.create` | `mutation` | Registrar exame de bioimpedância |
| `bioimpedance.update` | `mutation` | Atualizar exame |
| `bioimpedance.delete` | `mutation` | Remover exame |

**Parâmetros registrados (25+):** massa muscular, gordura corporal, gordura visceral, perimetria, dobras cutâneas e muito mais.

### Finanças (`finances`)

| Endpoint | Tipo | Descrição |
|----------|------|-----------|
| `finances.list` | `query` | Listar transações |
| `finances.listByClient` | `query` | Transações de um cliente |
| `finances.create` | `mutation` | Nova transação (receita ou despesa) |
| `finances.update` | `mutation` | Atualizar transação |
| `finances.delete` | `mutation` | Remover transação |
| `finances.markPaid` | `mutation` | Marcar como pago |
| `finances.markPending` | `mutation` | Marcar como pendente |
| `finances.overdueClients` | `query` | Clientes com pagamentos em atraso |
| `finances.generateMonthlyCharges` | `mutation` | Gerar cobranças mensais automáticas |
| `finances.summary` | `query` | Resumo financeiro por mês |
| `finances.dashboard` | `query` | Estatísticas do painel financeiro |

### Dashboard (`dashboard`)

| Endpoint | Tipo | Descrição |
|----------|------|-----------|
| `dashboard.stats` | `query` | Estatísticas gerais |
| `dashboard.weeklyChart` | `query` | Sessões por semana (gráfico) |
| `dashboard.statusChart` | `query` | Distribuição de status das sessões |
| `dashboard.todaySessions` | `query` | Agenda do dia |

### Upload de Fotos (`photos`)

| Endpoint | Tipo | Descrição |
|----------|------|-----------|
| `photos.upload` | `mutation` | Enviar foto para S3 |
| `photos.listAll` | `query` | Listar todas as fotos |
| `photos.delete` | `mutation` | Remover foto do S3 |

### Admin (`admin`)

> Requer permissão de administrador.

| Endpoint | Tipo | Descrição |
|----------|------|-----------|
| `admin.listPersonals` | `query` | Listar todos os treinadores (com filtros) |
| `admin.impersonate` | `mutation` | Fazer login como treinador |

### Planos (`users`)

| Endpoint | Tipo | Descrição |
|----------|------|-----------|
| `users.requestTrial` | `mutation` | Solicitar período de teste PRO (7 dias) |

## Planos de Assinatura

| Plano | Clientes | Recursos |
|-------|----------|----------|
| **Free** | Até 5 | Funcionalidades básicas |
| **Pro** | Ilimitados | Acesso completo a todas as funcionalidades |

## Segurança

- **Row Level Security (RLS)** em todas as tabelas — cada treinador acessa apenas seus próprios dados
- **Senhas** criptografadas com `bcryptjs`
- **Sessões** gerenciadas via JWT (cookie `HttpOnly`)
- **Validação de imagens** antes do upload (tipo MIME, nome de arquivo, buffer)

## Scripts

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Inicia servidor de desenvolvimento |
| `pnpm build` | Gera build de produção |
| `pnpm start` | Inicia em modo produção |
| `pnpm check` | Verifica tipos TypeScript |
| `pnpm test` | Executa testes com Vitest |
| `pnpm format` | Formata código com Prettier |
| `pnpm db:push` | Gera e aplica migrations |
| `pnpm db:rebuild` | Reconstrói schema do banco do zero |

## Documentação Adicional

- [`SCHEMA_REFERENCE.md`](./SCHEMA_REFERENCE.md) — Referência completa do schema do banco de dados
- [`MIGRATION_GUIDE.md`](./MIGRATION_GUIDE.md) — Guia de aplicação de migrations
- [`TESTING_GUIDE.md`](./TESTING_GUIDE.md) — Guia de testes
- [`EXPORT_GUIDE.md`](./EXPORT_GUIDE.md) — Exportação de dados
- [`PERFORMANCE_RATIONALE.md`](./PERFORMANCE_RATIONALE.md) — Decisões de performance
