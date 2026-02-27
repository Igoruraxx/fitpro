# FITPRO - Agenda Personal TODO

## Infraestrutura
- [x] Configurar tema dark/azul (#0A0E27, #3B82F6, #1E40AF)
- [x] Schema do banco de dados (clientes, agendamentos, evolução, finanças, assinaturas)
- [x] Migrations SQL aplicadas
- [x] Routers tRPC para todos os módulos
- [x] DB helpers para queries

## Autenticação & Multi-tenancy
- [x] Autenticação com Manus OAuth
- [x] Isolamento de dados por personal (multi-tenancy)
- [x] Roles: user (personal) e admin (proprietário)

## Sistema de Assinaturas
- [x] Planos: Básico, Pro, Premium
- [ ] Integração Stripe para pagamentos (placeholder - em breve)
- [x] Controle de limites por plano

## Módulo de Agenda
- [x] Visualização Dia
- [x] Visualização Semana
- [x] Visualização Lista
- [x] Visualização Mês
- [x] Criar agendamento (modal)
- [x] Editar agendamento
- [x] Excluir agendamento
- [x] Agendar para convidado (experimental)

## Módulo de Clientes
- [x] Listagem de clientes
- [x] Cadastro completo com foto
- [x] Edição de cliente
- [x] Contato e dados pessoais
- [x] Histórico de treinos

## Módulo de Evolução
- [x] Registro de medidas corporais
- [x] Fotos de progresso (estrutura pronta)
- [x] Gráficos de acompanhamento

## Módulo Financeiro
- [x] Controle de receitas
- [x] Controle de despesas
- [x] Pagamentos de clientes
- [x] Relatórios mensais

## Perfil do Personal
- [x] Edição de dados pessoais
- [x] Foto de perfil (avatar)
- [x] Especialidades
- [x] Configurações da conta

## Painel Admin
- [x] Dashboard com métricas gerais
- [x] Gerenciar personals cadastrados
- [x] Visualizar assinaturas ativas
- [x] Receita total e métricas de uso

## Notificações
- [ ] Notificação de novo personal cadastrado (a implementar no backend)
- [ ] Notificação de assinatura criada/cancelada (a implementar no backend)

## Layout & Design
- [x] Layout dashboard mobile-first
- [x] Bottom navigation mobile (Agenda, Clientes, Evolução, Finanças, Perfil)
- [x] Design responsivo
- [x] Header com logo FITPRO
## Testes
- [x] Testes vitest para routers (16 testes passando)
- [x] Testes de autenticação e autorização
- [x] Testes de validação de input
- [x] Testes de acesso admin

## Funcionalidades Adicionais (FitTrainer spec)

### Dashboard
- [x] Saudação personalizada com nome do treinador
- [x] 4 cards de estatísticas animados (Alunos ativos, Sessões de hoje, Taxa de presença, Próxima sessão)
- [x] Gráfico de barras: sessões por semana nas últimas 8 semanas
- [x] Gráfico de pizza: distribuição de status das sessões
- [x] Lista de sessões do dia com badge de status

### Gestão de Alunos (melhorias)
- [x] Busca por nome em tempo real
- [x] Badge de status: Ativo, Inativo, Pausado
- [x] Loading skeleton enquanto carrega
- [x] Confirmação de exclusão via AlertDialog
- [x] Cards com objetivo, e-mail, telefone, frequência semanal

### Agenda (melhorias)
- [x] Atualização de status inline por sessão (Agendado/Concluído/Cancelado/Faltou)
- [x] Destaque visual do dia atual
- [x] Cards de sessão compactos dentro de cada dia

### Fotos de Progresso (melhorias)
- [x] Upload real de fotos para storage S3
- [x] Galeria em grid com cards (aspect ratio 3:4)
- [x] Hover overlay com nome do aluno, tipo e data
- [x] Filtro por aluno na galeria
- [x] Área de upload com drag-style
- [x] Exclusão de fotos com confirmação

### Layout & Navegação (melhorias)
- [x] Sidebar com Dashboard como item principal
- [x] Nome e cargo do treinador no rodapé da sidebar
- [x] Ícone de haltere no branding
- [x] Header com título da página atual

## Melhorias na Agenda (v3)
- [x] View Dia como padrão inicial
- [x] Reordenar views: Dia → Lista → Semana → Mês
- [x] Drag and drop para arrastar agendamentos entre horários (view Dia)
- [x] Drag and drop na view Lista
- [x] Drag and drop na view Semana
- [x] Modal de edição ao clicar no agendamento
- [x] Botão "Concluir sessão" no modal de edição
- [x] Card verde para agendamentos concluídos
- [x] Botão WhatsApp visível nos agendamentos não concluídos
- [x] Endpoint updateAppointment no router tRPC (já existia)

## Recorrência de Agendamentos
- [x] Campo recurrenceGroupId na tabela appointments (agrupa sessões recorrentes)
- [x] Endpoint createRecurring no router tRPC
- [x] Lógica de geração de datas (diária, semanal, quinzenal, mensal)
- [x] Seleção de dias da semana para recorrência semanal
- [x] Configuração de data de término ou número de ocorrências
- [x] UI no modal: toggle "Repetir sessão" com opções de frequência
- [x] Ao excluir: opção de excluir só esta ou todas as recorrentes
- [x] Badge visual indicando que o agendamento é recorrente

## Reformulação Cadastro de Alunos (v2)
- [x] Remover campo email do cadastro de aluno
- [x] Remover campos objetivo e observações
- [x] Plano mensal: campo dia de vencimento (1-31)
- [x] Plano por pacote: campo quantidade de aulas
- [x] Contador de sessões restantes (decrementar ao concluir sessão)
- [x] Ao definir sessões/semana: abrir seletor de dias e horários
- [x] Agendamento automático das 4 próximas semanas ao salvar aluno
- [x] Campo pagamento antecipado: valor e próxima data de vencimento
- [x] Exibir contador de sessões restantes no card do aluno
- [x] Exibir alerta quando pacote estiver próximo do fim
- [x] Atualizar router: decrementar sessionsRemaining ao marcar sessão como concluída
- [x] Atualizar router: createClient com novos campos
- [x] Migration SQL para novos campos em clients (já existia no schema)

## Melhorias Módulo de Fotos (v2)
- [x] Upload múltiplo: 3 fotos de uma vez (Frente, Costas, Lateral)
- [x] Galeria vazia até selecionar um aluno
- [x] Modo comparativo: selecionar 2 datas e ver fotos lado a lado
- [x] Comparativo por tipo de foto (frente vs frente, costas vs costas)
- [x] Indicador de p## Autenticação Própria (E-mail/Senha)
- [x] Tabela auth_tokens no Supabase (confirmação de e-mail e reset de senha)
- [x] Campo passwordHash na tabela users
- [x] Campo emailVerified na tabela users
- [x] Campo googleId na tabela users (para Google OAuth futuro)
- [x] Endpoint register (cadastro com e-mail/senha)
- [x] Endpoint login (autenticação com e-mail/senha)
- [x] Endpoint confirmEmail (confirmação via token)
- [x] Endpoint forgotPassword (envio de e-mail de recuperação)
- [x] Endpoint resetPassword (nova senha via token)
- [x] Preparação para Google OAuth (campo googleId + endpoint)de Cadastro (/register)
- [x] Página de Login (/login)
- [x] Página de Confirmação de E-mail (/confirm-email)
- [x] Página de Recuperação de Conta (/forgot-password)
- [x] Página de Nova Senha (/reset-password)
- [x] Integração de rotas de autenticação no App.tsx
- [x] Testes para páginas de autenticação (38 testes)
- [ ] Configurar envio de e-mail (Nodemailer/Resend/SendGrid)
- [x] Remover dependência do Manus OAuth das rotas protegidas
- [x] Atualizar AppLayout para usar novo sistema de auth

## Remoção do Manus OAuth (v4)
- [x] Remover botão "Entrar com Manus" da Home
- [x] Substituir Home por redirect para /login
- [x] Remover Manus OAuth do server/_core/oauth.ts (manter estrutura, desativar fluxo)
- [x] Criar AuthContext próprio com login/logout/me via tRPC
- [x] Atualizar AppLayout para usar AuthContext próprio
- [x] Atualizar protectedProcedure para usar JWT próprio (não Manus session)
- [x] Redirecionar para /login se não autenticado
- [x] Redirecionar para / após login bem-sucedido
- [x] Logout limpa cookie JWT e redireciona para /login

## Validações de Cadastro de Alunos (v3)
- [x] Limitar dias selecionáveis pela quantidade de sessões/semana (ex: 3 sessões = máx 3 dias)
- [x] Mostrar mensagem de erro se tentar selecionar mais dias que sessões
- [x] Desabilitar visualmente botões de dias após atingir o limite
