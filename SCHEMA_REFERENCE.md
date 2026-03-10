# FITPRO - Schema de Banco de Dados (v2.0)

**Banco de Dados**: Supabase (PostgreSQL)  
**Última Atualização**: 2026-03-10  
**Status**: ✅ Reconstruído do zero com RLS policies

---

## ⚠️ IMPORTANTE

Este documento descreve o schema **REAL** do banco de dados Supabase após a reconstrução completa. Use este arquivo como referência ao:
- Escrever queries SQL
- Criar procedures tRPC
- Validar tipos TypeScript
- Debugar erros de schema

**O arquivo `drizzle/schema.ts` está sincronizado com este documento.**

---

## 🔒 SEGURANÇA: ROW LEVEL SECURITY (RLS)

Todas as tabelas agora possuem políticas RLS ativadas para garantir isolamento de dados:

- **Multi-tenancy**: Cada personal só pode acessar seus próprios dados
- **Admin Access**: Admins têm acesso completo para gerenciar usuários
- **Auth Tokens**: Usuários só acessam seus próprios tokens
- **Client Data**: Trainers só acessam clientes que pertencem a eles

**Políticas implementadas:**
- `SELECT`: Acesso somente aos próprios registros (ou todos para admins)
- `INSERT`: Criação somente com o próprio `trainerId`
- `UPDATE`: Modificação somente dos próprios registros
- `DELETE`: Remoção somente dos próprios registros

---

## Tabela: `users`

Armazena dados dos personals (treinadores) e administradores.

| Campo | Tipo | Nullable | Default | Descrição |
|-------|------|----------|---------|-----------|
| `id` | serial | ❌ | - | ID único (PK) |
| `openId` | varchar(64) | ✅ | - | ID único para compatibilidade (único) |
| `email` | varchar(320) | ✅ | - | E-mail (único) |
| `passwordHash` | text | ✅ | - | Hash da senha (para auth por e-mail) |
| `emailVerified` | boolean | ❌ | false | Se e-mail foi verificado |
| `name` | text | ✅ | - | Nome completo |
| `loginMethod` | varchar(64) | ✅ | - | Método de login: 'email' |
| `role` | role enum | ❌ | 'user' | Papel: 'user' (personal) \| 'admin' (proprietário) |
| `phone` | varchar(20) | ✅ | - | Telefone |
| `photoUrl` | text | ✅ | - | URL da foto de perfil (S3) |
| `specialties` | text | ✅ | - | Especialidades (JSON ou texto) |
| `bio` | text | ✅ | - | Biografia |
| `cref` | varchar(20) | ✅ | - | Número CREF (Conselho Regional) |
| `subscriptionPlan` | subscription_plan enum | ❌ | 'free' | Plano: 'free' \| 'basic' \| 'pro' \| 'premium' |
| `subscriptionStatus` | subscription_status enum | ❌ | 'trial' | Status: 'active' \| 'inactive' \| 'trial' \| 'cancelled' |
| `subscriptionExpiresAt` | timestamp | ✅ | - | Data de expiração da assinatura |
| `proSource` | varchar(20) | ✅ | - | Origem do PRO: 'payment' \| 'courtesy' \| 'trial' |
| `proExpiresAt` | timestamp | ✅ | - | Data de expiração do PRO |
| `trialRequestedAt` | timestamp | ✅ | - | Data quando trial foi solicitado |
| `planStartAt` | timestamp | ✅ | - | Data de início do plano PRO |
| `planExpiresAt` | timestamp | ✅ | - | Data de expiração do plano PRO |
| `planGrantedBy` | integer | ✅ | - | ID do admin que concedeu o plano (FK → users.id) |
| `lastPaymentId` | varchar(255) | ✅ | - | ID do último pagamento |
| `lastPaymentDate` | timestamp | ✅ | - | Data do último pagamento |
| `lastPaymentAmount` | numeric(10, 2) | ✅ | - | Valor do último pagamento |
| `maxClients` | integer | ❌ | 5 | Limite de clientes (5 para FREE, ilimitado para PRO) |
| `createdAt` | timestamp | ❌ | now() | Data de criação |
| `updatedAt` | timestamp | ❌ | now() | Data da última atualização |
| `lastSignedIn` | timestamp | ❌ | now() | Data do último login |

### Enums da tabela `users`

```sql
-- role
CREATE TYPE "role" AS ENUM('user', 'admin');

-- subscription_plan
CREATE TYPE "subscription_plan" AS ENUM('free', 'basic', 'pro', 'premium');

-- subscription_status
CREATE TYPE "subscription_status" AS ENUM('active', 'inactive', 'trial', 'cancelled');
```

### Constraints

- `users_openId_unique`: `openId` é único
- `users_email_unique`: `email` é único
- `users_planGrantedBy_users_id_fk`: FK para `users.id` (ON DELETE SET NULL)

---

## Tabela: `clients`

Armazena dados dos clientes (alunos) de cada personal.

| Campo | Tipo | Nullable | Default | Descrição |
|-------|------|----------|---------|-----------|
| `id` | serial | ❌ | - | ID único (PK) |
| `trainerId` | integer | ❌ | - | ID do personal (FK → users.id) |
| `name` | varchar(255) | ❌ | - | Nome do cliente |
| `phone` | varchar(20) | ✅ | - | Telefone |
| `birthDate` | date | ✅ | - | Data de nascimento |
| `gender` | gender enum | ✅ | - | Gênero: 'male' \| 'female' \| 'other' |
| `photoUrl` | text | ✅ | - | URL da foto (S3) |
| `status` | client_status enum | ❌ | 'active' | Status: 'active' \| 'inactive' \| 'trial' |
| `planType` | plan_type enum | ❌ | 'monthly' | Tipo de plano: 'monthly' \| 'package' \| 'consulting' |
| `monthlyFee` | numeric(10, 2) | ✅ | - | Valor mensal (plano mensal) |
| `paymentDay` | integer | ✅ | - | Dia do mês para cobrança (1-31) |
| `packageSessions` | integer | ✅ | - | Total de sessões do pacote |
| `sessionsRemaining` | integer | ✅ | - | Sessões restantes (decrementado ao concluir) |
| `packageValue` | numeric(10, 2) | ✅ | - | Valor total do pacote |
| `sessionsPerWeek` | integer | ✅ | - | Sessões por semana |
| `sessionDays` | varchar(20) | ✅ | - | Dias da semana (ex: "1,3,5" para seg, qua, sex) |
| `sessionTime` | varchar(5) | ✅ | - | Horário padrão (HH:MM) |
| `sessionTimesPerDay` | text | ✅ | - | JSON: horários por dia (ex: {"1":"07:00","3":"08:00"}) |
| `sessionDuration` | integer | ❌ | 60 | Duração da sessão em minutos |
| `advancedPayment` | numeric(10, 2) | ✅ | - | Valor pago antecipadamente |
| `nextPaymentDate` | date | ✅ | - | Próxima data de cobrança |
| `createdAt` | timestamp | ❌ | now() | Data de criação |
| `updatedAt` | timestamp | ❌ | now() | Data da última atualização |

---

## Tabela: `appointments`

Armazena agendamentos de sessões de treino.

| Campo | Tipo | Nullable | Default | Descrição |
|-------|------|----------|---------|-----------|
| `id` | serial | ❌ | - | ID único (PK) |
| `trainerId` | integer | ❌ | - | ID do personal (FK → users.id) |
| `clientId` | integer | ✅ | - | ID do cliente (FK → clients.id) |
| `guestName` | varchar(255) | ✅ | - | Nome do convidado (se não for cliente) |
| `date` | date | ❌ | - | Data da sessão |
| `startTime` | varchar(5) | ❌ | - | Hora de início (HH:MM) |
| `duration` | integer | ❌ | 60 | Duração em minutos |
| `status` | appointment_status enum | ❌ | 'scheduled' | Status: 'scheduled' \| 'completed' \| 'cancelled' \| 'no_show' |
| `notes` | text | ✅ | - | Notas da sessão |
| `muscleGroups` | text | ✅ | - | Grupos musculares (JSON) |
| `recurrenceGroupId` | varchar(36) | ✅ | - | ID do grupo de recorrência (UUID) |
| `recurrenceType` | recurrence_type enum | ❌ | 'none' | Tipo: 'none' \| 'daily' \| 'weekly' \| 'biweekly' \| 'monthly' |
| `recurrenceDays` | varchar(20) | ✅ | - | Dias da semana para recorrência |
| `createdAt` | timestamp | ❌ | now() | Data de criação |
| `updatedAt` | timestamp | ❌ | now() | Data da última atualização |

---

## Tabela: `progressPhotos`

Armazena fotos de progresso dos clientes.

| Campo | Tipo | Nullable | Default | Descrição |
|-------|------|----------|---------|-----------|
| `id` | serial | ❌ | - | ID único (PK) |
| `clientId` | integer | ❌ | - | ID do cliente (FK → clients.id) |
| `trainerId` | integer | ❌ | - | ID do personal (FK → users.id) |
| `photoType` | photo_type enum | ❌ | - | Tipo: 'front' \| 'back' \| 'side_left' \| 'side_right' \| 'other' |
| `photoUrl` | text | ❌ | - | URL da foto (S3) |
| `date` | date | ❌ | - | Data da foto |
| `notes` | text | ✅ | - | Notas |
| `createdAt` | timestamp | ❌ | now() | Data de criação |

---

## Tabela: `bodyMeasurements`

Armazena medidas corporais dos clientes.

| Campo | Tipo | Nullable | Default | Descrição |
|-------|------|----------|---------|-----------|
| `id` | serial | ❌ | - | ID único (PK) |
| `trainerId` | integer | ❌ | - | ID do personal |
| `clientId` | integer | ❌ | - | ID do cliente |
| `date` | date | ❌ | - | Data da medição |
| `weight` | numeric(5, 2) | ✅ | - | Peso (kg) |
| `height` | numeric(5, 2) | ✅ | - | Altura (cm) |
| `bodyFat` | numeric(5, 2) | ✅ | - | Percentual de gordura |
| `chest` | numeric(5, 2) | ✅ | - | Peito (cm) |
| `waist` | numeric(5, 2) | ✅ | - | Cintura (cm) |
| `hips` | numeric(5, 2) | ✅ | - | Quadril (cm) |
| `leftArm` | numeric(5, 2) | ✅ | - | Braço esquerdo (cm) |
| `rightArm` | numeric(5, 2) | ✅ | - | Braço direito (cm) |
| `leftThigh` | numeric(5, 2) | ✅ | - | Coxa esquerda (cm) |
| `rightThigh` | numeric(5, 2) | ✅ | - | Coxa direita (cm) |
| `leftCalf` | numeric(5, 2) | ✅ | - | Panturrilha esquerda (cm) |
| `rightCalf` | numeric(5, 2) | ✅ | - | Panturrilha direita (cm) |
| `notes` | text | ✅ | - | Notas |
| `createdAt` | timestamp | ❌ | now() | Data de criação |

---

## Tabela: `transactions`

Armazena transações financeiras (receitas e despesas).

| Campo | Tipo | Nullable | Default | Descrição |
|-------|------|----------|---------|-----------|
| `id` | serial | ❌ | - | ID único (PK) |
| `trainerId` | integer | ❌ | - | ID do personal |
| `clientId` | integer | ✅ | - | ID do cliente (se aplicável) |
| `type` | transaction_type enum | ❌ | - | Tipo: 'income' \| 'expense' |
| `category` | varchar(100) | ✅ | - | Categoria |
| `description` | text | ✅ | - | Descrição |
| `amount` | numeric(10, 2) | ❌ | - | Valor |
| `status` | transaction_status enum | ❌ | 'pending' | Status: 'pending' \| 'paid' \| 'overdue' \| 'cancelled' |
| `dueDate` | date | ✅ | - | Data de vencimento |
| `paidDate` | date | ✅ | - | Data do pagamento |
| `notes` | text | ✅ | - | Notas |
| `createdAt` | timestamp | ❌ | now() | Data de criação |
| `updatedAt` | timestamp | ❌ | now() | Data da última atualização |

---

## Tabela: `authTokens`

Armazena tokens de autenticação (confirmação de e-mail, reset de senha).

| Campo | Tipo | Nullable | Default | Descrição |
|-------|------|----------|---------|-----------|
| `id` | serial | ❌ | - | ID único (PK) |
| `userId` | integer | ❌ | - | ID do usuário (FK → users.id, ON DELETE CASCADE) |
| `token` | varchar(255) | ❌ | - | Token (único) |
| `type` | varchar(50) | ❌ | - | Tipo: 'email_confirmation' \| 'password_reset' |
| `expiresAt` | timestamp | ❌ | - | Data de expiração |
| `createdAt` | timestamp | ❌ | now() | Data de criação |

---

## Queries Úteis

### Listar todos os personals com plano PRO
```sql
SELECT id, name, email, subscriptionPlan, proSource, proExpiresAt
FROM users
WHERE subscriptionPlan = 'pro'
ORDER BY name;
```

### Listar trials expirados
```sql
SELECT id, name, email, proExpiresAt
FROM users
WHERE subscriptionPlan = 'pro'
  AND proSource = 'trial'
  AND proExpiresAt <= NOW()
ORDER BY proExpiresAt;
```

### Contar clientes por personal
```sql
SELECT u.id, u.name, COUNT(c.id) as client_count
FROM users u
LEFT JOIN clients c ON u.id = c.trainerId
WHERE u.role = 'user'
GROUP BY u.id, u.name
ORDER BY client_count DESC;
```

### Listar próximas sessões agendadas
```sql
SELECT a.id, a.date, a.startTime, c.name, u.name as trainer
FROM appointments a
JOIN clients c ON a.clientId = c.id
JOIN users u ON a.trainerId = u.id
WHERE a.date >= CURRENT_DATE
  AND a.status = 'scheduled'
ORDER BY a.date, a.startTime;
```

---

## 🔒 Row Level Security (RLS) Policies

Todas as tabelas estão protegidas por políticas RLS:

### Tabela: `users`
- **SELECT**: Usuários podem ver seu próprio perfil; admins veem todos
- **UPDATE**: Usuários podem atualizar seu próprio perfil; admins podem atualizar todos
- **INSERT**: Qualquer pessoa pode se registrar (necessário para signup)

### Tabelas de dados multi-tenant
Para `clients`, `appointments`, `bodyMeasurements`, `progressPhotos`, `transactions`, `bioimpedanceExams`:
- **SELECT/INSERT/UPDATE/DELETE**: Apenas registros onde `trainerId = auth.uid()`

### Tabela: `authTokens`
- **SELECT/INSERT/DELETE**: Apenas tokens onde `userId = auth.uid()`

**Importante**: As políticas RLS garantem que mesmo queries SQL diretas respeitam o isolamento de dados. Não é possível acessar dados de outros trainers, mesmo com acesso direto ao banco.

---

## 📊 Índices de Performance

Os seguintes índices foram criados para otimizar queries comuns:

### Índices em `users`:
- `idx_users_email`, `idx_users_openId`, `idx_users_googleId` (login)
- `idx_users_role`, `idx_users_subscriptionPlan` (filtros)

### Índices em `clients`:
- `idx_clients_trainerId`, `idx_clients_status`
- `idx_clients_trainerId_status` (composto)

### Índices em `appointments`:
- `idx_appointments_trainerId`, `idx_appointments_clientId`
- `idx_appointments_date`, `idx_appointments_status`
- `idx_appointments_trainerId_date` (composto - agenda por dia)
- `idx_appointments_recurrenceGroupId` (recorrências)

### Índices em `bodyMeasurements`:
- `idx_bodyMeasurements_clientId_date` (histórico de evolução)

### Índices em `progressPhotos`:
- `idx_progressPhotos_clientId_date` (galeria de fotos)

### Índices em `transactions`:
- `idx_transactions_trainerId_date` (relatórios financeiros)

### Índices em `bioimpedanceExams`:
- `idx_bioimpedanceExams_clientId_date` (evolução corporal)

---

## ✅ CHECK Constraints

Validações de negócio implementadas no banco:

### Tabela `users`:
- Pelo menos um método de autenticação (`email`, `openId` ou `googleId`)
- `maxClients` deve ser positivo
- `proSource` deve ser 'trial', 'payment' ou 'courtesy'

### Tabela `clients`:
- `paymentDay` entre 1 e 31 (dia do mês)
- `sessionsRemaining` não pode ser negativo
- `sessionDuration` deve ser positivo

### Tabela `appointments`:
- Deve ter `clientId` OU `guestName` (não ambos vazios)
- `duration` deve ser positivo

### Tabela `bodyMeasurements`:
- `weight` e `height` devem ser positivos quando preenchidos
- `bodyFat` deve estar entre 0 e 100%

### Tabela `transactions`:
- `amount` deve ser positivo

### Tabela `bioimpedanceExams`:
- `weight` deve ser positivo
- `bodyFatPct` e `musclePct` devem estar entre 0 e 100%

---

## 🔄 Triggers Automáticos

### Atualização de `updatedAt`
Trigger `update_updated_at_column()` aplicado às tabelas:
- `users`
- `clients`
- `appointments`
- `transactions`

Atualiza automaticamente o campo `updatedAt` sempre que o registro é modificado.

---

## Notas Importantes

1. **Timestamps**: Todos os timestamps são em UTC (timezone-aware)
2. **Datas**: Use o formato ISO 8601 (YYYY-MM-DD)
3. **Enums**: Não use valores fora dos enums definidos
4. **Foreign Keys**: Respeite as relações entre tabelas
5. **Unique Constraints**: Não tente inserir valores duplicados em campos únicos
6. **Defaults**: Campos com DEFAULT são opcionais ao inserir

---

## Histórico de Mudanças

| Data | Mudança |
|------|---------|
| 2026-03-10 | **REBUILD COMPLETO**: Schema reconstruído do zero com RLS policies, índices otimizados, CHECK constraints, triggers automáticos. Removidos Google OAuth, Manus OAuth, e integrações com payment providers (AbacatePay, Abacash) |
| 2026-02-28 | Schema inicial criado |

---

## 🚀 Como Aplicar o Schema

Para aplicar este schema em um banco de dados novo ou reconstruir completamente:

```bash
# Certifique-se de ter o DATABASE_URL configurado no .env
npm run db:rebuild
```

**⚠️ AVISO**: Este comando irá DELETAR TODOS OS DADOS existentes e reconstruir o schema do zero!

---

## 📝 Melhorias Implementadas na v2.0

1. ✅ **Row Level Security (RLS)** - Proteção nativa do banco para multi-tenancy
2. ✅ **Índices Otimizados** - Performance melhorada em queries comuns
3. ✅ **CHECK Constraints** - Validação de dados no nível do banco
4. ✅ **Triggers Automáticos** - `updatedAt` atualizado automaticamente
5. ✅ **Foreign Keys Consistentes** - Todas as relações definidas corretamente
6. ✅ **Documentação Completa** - Todas as tabelas, políticas e índices documentados
7. ✅ **Migration Limpa** - Um único arquivo de migration que reconstrói tudo
8. ✅ **Sem Artefatos** - Código de migration automática removido de `db.ts`
