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
