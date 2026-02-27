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
