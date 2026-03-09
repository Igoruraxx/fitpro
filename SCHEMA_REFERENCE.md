# FITPRO - Schema de Banco de Dados Real

**Banco de Dados**: Supabase (PostgreSQL)  
**Última Atualização**: 2026-03-01  
**Status**: ✅ Sincronizado com migrations aplicadas

---

## ⚠️ IMPORTANTE

Este documento descreve o schema **REAL** do banco de dados Supabase. Use este arquivo como referência ao:
- Escrever queries SQL
- Criar procedures tRPC
- Validar tipos TypeScript
- Debugar erros de schema

**NÃO use o arquivo `drizzle/schema.ts` como fonte de verdade** - ele pode estar desatualizado. Use este documento.

---

## Tabela: `users`

Armazena dados dos personals (treinadores) e administradores.

| Campo | Tipo | Nullable | Default | Descrição |
|-------|------|----------|---------|-----------|
| `id` | serial | ❌ | - | ID único (PK) |
| `openId` | varchar(64) | ✅ | - | ID do Manus OAuth (único) |
| `email` | varchar(320) | ✅ | - | E-mail (único) |
| `passwordHash` | text | ✅ | - | Hash da senha (para auth por e-mail) |
| `emailVerified` | boolean | ❌ | false | Se e-mail foi verificado |
| `googleId` | varchar(255) | ✅ | - | ID do Google OAuth (único) |
| `name` | text | ✅ | - | Nome completo |
| `loginMethod` | varchar(64) | ✅ | - | Método de login: 'manus' \| 'email' \| 'google' |
| `role` | role enum | ❌ | 'user' | Papel: 'user' (personal) \| 'admin' (proprietário) |
| `phone` | varchar(20) | ✅ | - | Telefone |
| `photoUrl` | text | ✅ | - | URL da foto de perfil (S3) |
| `specialties` | text | ✅ | - | Especialidades (JSON ou texto) |
| `bio` | text | ✅ | - | Biografia |
| `cref` | varchar(20) | ✅ | - | Número CREF (Conselho Regional) |
| `subscriptionPlan` | subscription_plan enum | ❌ | 'free' | Plano: 'free' \| 'pro' |
| `subscriptionStatus` | subscription_status enum | ❌ | 'trial' | Status: 'active' \| 'inactive' \| 'trial' \| 'cancelled' |
| `proSource` | varchar(20) | ✅ | - | Origem do PRO: 'courtesy' \| 'trial' |
| `proExpiresAt` | timestamp | ✅ | - | Data de expiração do PRO |
| `trialRequestedAt` | timestamp | ✅ | - | Data quando trial foi solicitado |
| `planStartAt` | timestamp | ✅ | - | Data de início do plano PRO |
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
- `users_googleId_unique`: `googleId` é único

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
| 2026-03-01 | Remoção de integrações de pagamento (Abacash/AbacatePay) e campos relacionados |
| 2026-02-28 | Schema inicial criado |

