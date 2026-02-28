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

## Bugs Agendamento + Ícones Musculares (v4)
- [x] Bug: agendamento cria sessão em dia diferente do clicado (fix: parseISO em vez de new Date para evitar timezone UTC)
- [x] Bug: drag-and-drop não funciona na agenda (fix: DraggableApptCard em todas as views)
- [x] Ícones de grupos musculares selecionáveis na sessão de treino
- [x] Grupos: Peito, Costas, Ombros, Bíceps, Tríceps, Antebraço, Abdômen, Quadríceps, Posterior, Glúteos, Panturrilha, Cardio, Funcional
- [x] Exibir ícones selecionados visíveis no card da sessão após salvar
- [x] Persistir grupos musculares no banco de dados (campo muscleGroups na tabela appointments)

## Bug Fotos de Progresso (v5)
- [x] Fix: data enviada como string JS completa em vez de YYYY-MM-DD no upload de fotos (removido new Date() no router)
- [x] Garantir formato correto no frontend (Fotos.tsx) e no backend (router/db)

## Compressão de Imagens no Upload (v6)
- [x] Criar utilitário compressImage() com Canvas API (sem dependências)
- [x] Redimensionar para máx 1200px de largura/altura mantendo proporção
- [x] Comprimir para JPEG com qualidade 0.82 (bom equilíbrio qualidade/tamanho)
- [x] Mostrar tamanho original vs comprimido no preview de upload
- [x] Integrar no fluxo de upload (Fotos.tsx) antes de converter para base64

## Bug Drag-and-Drop Agenda (v7)
- [x] Diagnosticar por que DnD não funciona: PointerSensor conflitava com button interno; handle usava opacity-0 sem setActivatorNodeRef
- [x] Corrigir drag-and-drop: usar setActivatorNodeRef no handle, MouseSensor+TouchSensor em vez de PointerSensor
- [x] Handle visível no hover com área de clique dedicada (left-0 top-0 bottom-0 w-5)
- [x] Funciona nas views Dia, Lista e Semana

## Dashboard Financeiro + Tipo de Aluno (v8)
- [x] Adicionar campo clientType (training/consulting) na tabela clients
- [x] Adicionar campo status (active/inactive) na tabela clients (já existia)
- [x] Atualizar router clients.create/update para suportar novos campos
- [x] Atualizar Clientes.tsx: campo tipo (Treino/Consultoria) e status (Ativo/Inativo)
- [x] Consultoria: não gera sessões na agenda, não conta no financeiro de sessões
- [x] Inativo: não conta no financeiro
- [x] Criar página Financeiro.tsx com dashboard completo
- [x] Financeiro: receita mensal esperada (planos ativos)
- [x] Financeiro: receita mensal de pacotes (sessões ativas)
- [x] Financeiro: total de alunos ativos por tipo
- [x] Financeiro: inadimplência (planos com vencimento passado)
- [x] Financeiro: pacotes próximos do fim (≤3 sessões restantes)
- [x] Financeiro: projeção de receita próximo mês
- [x] Financeiro: gráfico de receita mensal (últimos 6 meses)
- [x] Adicionar rota /financas no App.tsx
- [x] Adicionar item Finanças no sidebar do AppLayout

## Correção de Lógica de Planos (v10)
- [x] Remover campo clientType da tabela clients (era tipo de aluno, não é necessário)
- [x] Adicionar "Consultoria" como opção em planType (ao lado de Mensal e Pacote)
- [x] Consultoria não deve ter campos: sessionsPerWeek, packageSessions, sessionsRemaining, scheduledDays (campos são opcionais agora)
- [x] Atualizar lógica de agendamento para não gerar sessões quando planType = "Consultoria"
- [x] Atualizar dashboard financeiro para excluir Consultoria de cálculos de sessões
- [x] Atualizar UI do cadastro de alunos (remover clientType, ajustar planType com 3 opções)
- [ ] Testar fluxo completo de Consultoria

## Módulo Bioimpedância (v9)
- [x] Tabela bioimpedanceExams no schema e banco (PostgreSQL Supabase)
- [x] Campos: peso, IMC, gorduraCorporal%, massaGorda, massaLivreGordura, massaMuscular, taxaMuscular, massaMuscularEsqueletica, massaOssea, massaProteica, proteina%, umidade, aguaCorporal%, gorduraSubcutanea%, gorduraVisceral, TMB, idadeMetabolica, WHR, pesoIdeal, nivelObesidade, tipoCorpo, imageUrl, notes
- [x] Cálculo automático: % gordura = (massaGorda / peso) * 100
- [x] Cálculo automático: massaGorda = peso - massaLivreGordura (se informado)
- [x] Cálculo automático: IMC = peso / (altura²) usando altura do aluno
- [x] Endpoints tRPC: bioimpedance.list, create, update, delete
- [x] Página /bioimpedancia com seletor de aluno
- [x] Aba "Gráficos" com evolução de peso, % gordura, massa muscular, gordura visceral
- [x] Aba "Exames" com lista de exames e botão para ver detalhes
- [x] Formulário completo com todos os campos do Fitdays
- [x] Upload de imagem do laudo (comprimida com compressImage)
- [x] Botão "Gerar Relatório PDF" (placeholder por ora)
- [x] Rota /bioimpedancia no App.tsx e sidebar (desktop + mobile)

## Reorganizacao do Modulo de Fotos (v11)
- [x] Agrupar fotos por data na aba de fotos
- [x] Criar secoes separadas para cada data
- [x] Exibir data como cabecalho de secao
- [x] Manter funcionalidade de comparativo e filtro por aluno

## Filtros Avancados + Relatorio de Planos (v12)
- [x] Adicionar filtros rapidos na listagem de alunos (status: Ativo/Inativo/Pausado)
- [x] Adicionar filtros por tipo de plano (Mensal/Pacote/Consultoria)
- [x] Combinar multiplos filtros (status + plano)
- [x] Criar pagina Relatorio de Planos (/relatorio-planos)
- [x] Dashboard com distribuicao de alunos por tipo de plano (grafico de pizza)
- [x] Dashboard com receita esperada por tipo de plano (grafico de barras)
- [x] Exibir metricas: total de alunos, receita total, receita media por tipo
- [x] Adicionar rota e menu item para Relatorio de Planos

## Integração Financeira Completa (v13)
- [x] Vincular pagamentos ao cadastro de alunos (clientId obrigatório)
- [x] Dar baixa em pagamento de aluno devedor (marcar como pago)
- [x] Botão WhatsApp para cobranças com mensagem pré-formatada
- [x] Aviso visual quando aluno está com pagamento atrasado
- [x] Marcador gráfico de sessões pendentes no relatório financeiro
- [x] Alunos inativos não geram cobrança (filtrar na geração de cobranças)
- [x] Lista de devedores com dias de atraso
- [x] Aviso de inadimplência no card do aluno na listagem
- [x] Aviso de inadimplência na página de detalhe do aluno

## Redesign Completo do Layout (v14)
- [x] Novo sistema de design: paleta neutra e profissional (slate/zinc + accent indigo)
- [x] Tipografia: Inter como fonte principal
- [x] Tokens CSS atualizados: cores, sombras, raios, espaçamentos
- [x] Sidebar redesenhada: agrupada por seções, hover suave, indicador de rota ativa
- [x] Topbar com título da página e menu de usuário
- [x] Cards com sombras suaves e bordas sutis
- [x] Dashboard redesenhado: métricas em cards elegantes, gráficos clean
- [x] Agenda redesenhada: toolbar clean, tabs de visualização refinadas
- [x] Listagem de alunos redesenhada com badges clean
- [x] Financas redesenhada: cards de métricas com ícones coloridos, gráfico clean
- [x] Mobile: bottom nav refinada com indicador de rota ativa

## Bug: Aba Clientes não carrega (v15)
- [x] Investigar erro no console/logs
- [x] Corrigir causa raiz: SelectItem com value="" causava crash do React
- [x] Corrigir lógica de filtros para usar value="all" em vez de string vazia
- [x] Testar carregamento da aba

## Correção End-to-End + Refatoração Financeiro (v16)
- [x] Sincronizar schema clients com banco (clientType removido, dueDate/paidAt adicionados)
- [x] Verificar e aplicar migração de todas as colunas faltantes
- [x] Refatorar financeiro: apenas entradas (receitas), remover saídas/despesas
- [x] Dar baixa automática por aluno de acordo com plano (Mensal/Pacote/Consultoria)
- [x] Botão "Dar baixa" individual por aluno na aba financeiro
- [x] Corrigir inconsistências visuais (dark mode, badges, mobile)
- [x] Verificação end-to-end de todas as abas

## Bug: Botões de Tipo de Plano com texto extravasando (v17)
- [x] Corrigir layout dos 3 botões (Mensalidade/Pacote/Consultoria) para comportar o texto
- [x] Garantir responsividade no mobile

## Bug: Alinhamento botões plano + erro enum consulting (v18)
- [x] Corrigir alinhamento: botões de plano com ícone centralizado acima do texto
- [x] Corrigir enum plan_type no banco: adicionar valor "consulting"
- [x] Testar update de cliente com planType=consulting
- [x] Validação de dia 31 em meses menores (clampDay) implementada em generateMonthlyCharges
- [x] Notificações automáticas ao gerar cobranças e dar baixa (notifyOwner)
- [x] Testes vitest atualizados: 71 testes passando (100%)
- [x] DialogDescription adicionado em todos os Dialogs (acessibilidade)
- [x] Gráficos corrigidos para usar tokens CSS do tema (light-mode friendly)

## Financeiro: apenas receitas automáticas dos alunos (v19)
- [x] Remover botão "Nova Receita" manual do financeiro
- [x] Remover modal de criação manual de receita
- [x] Manter apenas: Gerar Cobranças, dar baixa, WhatsApp, editar status
- [x] Financeiro mostra receitas vinculadas a alunos (geradas automaticamente)

## Campo de Dia de Vencimento (v20)
- [x] Adicionar seletor de dia (01-31) no cadastro para plano Mensalidade
- [x] Usar esse dia para gerar cobranças automáticas
- [x] Testar geração de cobranças com dia de vencimento (71 testes passando)

## Pendentes Conhecidos
- [ ] Configurar envio de e-mail (Nodemailer/Resend/SendGrid) para notificações externas
- [ ] Integração Stripe para pagamentos de assinatura
- [ ] Testar fluxo completo de Consultoria no browser

## Bug: Data inválida nas queries de transactions (v21)
- [x] Corrigir getFinancialSummary: usar último dia real do mês em vez de hardcoded "31"
- [x] Corrigir getTransactionsByTrainer: mesma correção
- [x] Corrigir getFinancialDashboard: mesma correção
- [x] Avaliação end-to-end completa de todas as abas
- [x] Corrigir todos os bugs encontrados
## Simplificação Módulo Bioimpedancia (v22)
- [x] Schema: manter apenas massaMuscular, pesoTotal, percMassaMuscular, percGordura, gorduraVisceral, perimetria, dobras
- [x] Schema: remover campos redundantes
- [x] Backend: atualizar db.ts e routers.ts para novos campos
- [x] UI: reformular formulário com apenas os campos essenciais
- [x] UI: salvar sem estar completo (todos os campos opcionais)
- [x] UI: gráficos comparativos com dados existentes (peso, % gordura, % muscular, visceral)
- [x] UI: manter upload de imagem de bioimpedancia
- [x] Migração SQL: tabela criada via runMigrations automático

## Redesign de Cores: Branco + Azul Claro (v23)
- [x] index.css: tokens CSS com fundo branco, azul claro como accent (#3B82F6 / sky-500)
- [x] AppLayout: sidebar branca com borda sutil, ícones e texto em azul/cinza
- [x] Botões primários: azul (#3B82F6) com hover mais escuro
- [x] Badges e tags: tons de azul claro (bg-blue-50, text-blue-700)
- [x] Cards: fundo branco, borda cinza-100, sombra suave
- [x] Topbar: fundo branco com borda inferior cinza-100
- [x] Inputs e selects: borda cinza-200, focus azul
- [x] Bottom nav mobile: branco com ícone ativo em azul
- [x] ThemeProvider configurado como light (App.tsx)

## Financeiro Automático Simplificado (v24)
- [ ] Backend: ao criar aluno (mensal/pacote), criar cobrança pendente automaticamente no mês corrente
- [ ] Backend: ao editar aluno (valor/dia vencimento), atualizar/recriar cobrança pendente do mês corrente
- [ ] Backend: remover função generateMonthlyCharges do router (não mais necessária)
- [ ] UI Financas.tsx: remover botão "Gerar Cobranças do Mês"
- [ ] UI Financas.tsx: mostrar cobranças pendentes com data de vencimento e valor claramente
- [ ] UI Financas.tsx: manter botão de dar baixa (marcar como pago)
- [ ] UI Financas.tsx: manter botão WhatsApp para cobranças

## Página Detalhe do Aluno (v24)
- [ ] Reescrever ClienteDetalhe.tsx com histórico completo: pagamentos, sessões, fotos, bioimpedância
- [ ] Abas: Visão Geral, Financeiro, Sessões, Evolução (fotos + bioimpedância)
- [ ] Card de perfil completo com dados do plano

## Notificação de Vencimento Próximo (v24)
- [ ] Job diário: verificar alunos com vencimento nos próximos 3 dias
- [ ] Disparar notifyOwner com lista de alunos com vencimento próximo
- [ ] Agendar job via setInterval no startup do servidor

## E-mail via Resend (v24)
- [ ] Criar server/email.ts com helper sendEmail usando Resend API
- [ ] Integrar envio no registro: e-mail de boas-vindas
- [ ] Integrar envio no forgotPassword: e-mail com link de reset
- [ ] Adicionar RESEND_API_KEY ao ENV

## Financeiro Automático + WhatsApp (v11)
- [x] Cobrança criada automaticamente ao cadastrar aluno (plano mensal ou pacote)
- [x] Cobrança atualizada ao editar dados financeiros do aluno
- [x] Sem botão "Gerar Cobranças" — tudo automático
- [x] Botão dar baixa (CheckCircle) visível em todas as cobranças pendentes
- [x] Botão WhatsApp apenas para cobranças em atraso (com telefone cadastrado)
- [x] Modal de inadimplentes com botão WhatsApp por aluno
- [x] Função upsertCurrentMonthCharge no db.ts
- [x] Endpoint finances.listByClient no router

## Página de Detalhe do Aluno (v11)
- [x] Rota /clientes/:id já existia no App.tsx
- [x] Aba Visão Geral: dados do plano, cobranças pendentes, últimas sessões
- [x] Aba Sessões: histórico completo de agendamentos com status
- [x] Aba Financeiro: histórico de cobranças com dar baixa e WhatsApp
- [x] Aba Evolução: bioimpedância e fotos de progresso
- [x] Endpoint appointments.listByClient no router
- [x] Endpoint finances.listByClient no router

## Job Diário de Vencimento (v11)
- [x] Arquivo server/jobs.ts com runDueDateReminderJob
- [x] Notifica o dono via notifyOwner sobre cobranças vencendo em até 3 dias
- [x] Agendado para rodar às 08:00 diariamente
- [x] Integrado no startServer() em server/_core/index.ts

## E-mail via Resend (v11)
- [x] Arquivo server/email.ts com sendEmail, sendWelcomeEmail, sendPasswordResetEmail
- [x] Chave RESEND_API_KEY configurada como secret
- [x] E-mail de boas-vindas enviado ao registrar personal trainer
- [x] E-mail de reset de senha enviado ao solicitar recuperação
- [x] Testes vitest para o helper de e-mail (4 testes)

## Desfazer Baixa (v12)
- [x] Função markTransactionPending no db.ts para reverter cobrança de pago para pendente
- [x] Endpoint finances.markPending no router
- [x] Botão desfazer baixa (ícone Clock, cor âmbar) em Financas.tsx para cobranças pagas
- [x] Botão desfazer baixa em ClienteDetalhe.tsx na aba Financeiro
- [x] Notificação ao dono quando baixa é desfeita

## Refatoração Módulo de Fotos (v13)
- [x] Remover upload duplo (side_left e side_right)
- [x] Atualizar PHOTO_TYPES: Frente, Lado, Costas, Outro
- [x] Upload simplificado: apenas 1 slot em vez de 3
- [x] Modo comparativo: botões de filtro por tipo (Frente, Lado, Costas, Outro) em vez de dropdown
- [x] Seletores de data lado a lado no comparativo

## Interface Visual de Pagamentos (v14)
- [x] Fundo verde com transparência (emerald-100/40) para cobranças pagas
- [x] Fundo vermelho com transparência (red-100/40) para cobranças atrasadas
- [x] Fundo amarelo com transparência (amber-100/40) para cobranças pendentes
- [x] Bordas coloridas correspondentes ao status
- [x] Atualizado em Financas.tsx e ClienteDetalhe.tsx

## Interface Visual de Pagamentos (v14)
- [x] Fundo verde com transparência para cobranças pagas
- [x] Fundo vermelho com transparência para cobranças atrasadas
- [x] Fundo amarelo com transparência para cobranças pendentes
- [x] Bordas coloridas correspondentes ao status
- [x] Atualizado em Financas.tsx e ClienteDetalhe.tsx

## Botões Editar/Excluir e Reposicionamento (v15)
- [x] Adicionar botão editar (Edit2) para exames de bioimpedância
- [x] Adicionar botão excluir (Trash2) para exames de bioimpedância
- [x] Reposicionar botão "Novo Exame" para abaixo do texto sobre perímetros e dobras
- [x] Botões com confirmação de exclusão

## Apagar Fotos em Lote (v16)
- [x] Adicionar estado de seleção de fotos (Set de IDs)
- [x] Adicionar checkboxes em cada foto da galeria
- [x] Botão "Apagar X" que aparece quando há fotos selecionadas
- [x] Confirmação antes de apagar em lote
- [x] Lógica de deleção em lote com mutação

## Apagar Fotos por Data (v17)
- [x] Adicionar estado para modal de apagar por data
- [x] Criar modal com seletor de data
- [x] Mostrar contagem de fotos que serão apagadas
- [x] Botão "Apagar por Data" no header
- [x] Confirmação antes de apagar em lote por data
- [x] Lógica de deleção de fotos anteriores à data selecionada

## Confirmação de Apagar por Data (v18)
- [x] Adicionar estado para AlertDialog de confirmação
- [x] Criar AlertDialog com detalhes da exclusão
- [x] Mostrar quantidade de fotos e data de corte
- [x] Botão de confirmação vermelho com aviso
- [x] Toast de sucesso após apagar

## Apagar Exames em Lote (v19)
- [x] Adicionar estado de seleção de exames
- [x] Adicionar checkboxes em cada exame da lista
- [x] Botão "Apagar X" que aparece quando há exames selecionados
- [x] AlertDialog de confirmação dupla
- [x] Lógica de deleção em lote com mutação
- [x] Toast de sucesso após apagar

## Reorganização e Apagar Exames por Data (v20)
- [x] Reorganizar layout do Bioimpedancia
- [x] Colocar botão "Apagar Exames por Data" abaixo da seleção de aluno
- [x] Modal com seletor de data para apagar por data
- [x] AlertDialog de confirmação dupla
- [x] Lógica de deleção de exames anteriores à data

## Reorganização do Layout Fotos (v21)
- [x] Reorganizar layout do Fotos.tsx
- [x] Colocar botão "Apagar Fotos por Data" abaixo da seleção de aluno
- [x] Consistência visual com Bioimpedancia.tsx

## Apagar por Data com Seleção Específica (v22)
- [x] Modificar Fotos.tsx para listar datas específicas com fotos
- [x] Modificar Bioimpedancia.tsx para listar datas específicas com exames
- [x] Mostrar contagem de fotos/exames por data
- [x] Apagar apenas fotos/exames da data selecionada (não anteriores)
- [x] Atualizar mensagens de confirmação

## Correção Bioimpedância (v23)
- [x] Identificar colunas faltantes na tabela bioimpedanceExams no banco
- [x] Adicionar colunas musclePct, perimetria, dobras via ALTER TABLE
- [x] Atualizar schema Drizzle para incluir colunas legadas do banco
- [x] Atualizar runMigrations para garantir colunas novas com ADD COLUMN IF NOT EXISTS

## Layout Mobile Fotos (v24)
- [x] Remover botões redundantes do header (Apagar por Data, Comparar, Apagar Selecionadas)
- [x] Manter apenas botão "Adicionar" no header
- [x] Seletor de aluno ocupa toda a largura no mobile (flex-1)
- [x] Botões de ação (Comparar, Apagar Selecionadas, Apagar por Data) em coluna abaixo do seletor
- [x] Layout mobile-first sem botões horizontais


## Perimetria Comparativa (v25)
- [x] Adicionar campos de perimetria ao schema (cintura, braço, panturrilha, tórax)
- [x] Migrar banco de dados com novos campos
- [x] Atualizar formulário de bioimpedância com novos campos
- [x] Criar visualização comparativa lado a lado com cards e gráfico
- [x] Exibir evolução de medidas entre exames com diferença em cm


## Consolidação de Abas (v26)
- [x] Renomear Bioimpedancia.tsx para Evolucao.tsx
- [x] Atualizar rotas no App.tsx (remover /bioimpedancia, manter /evolucao)
- [x] Remover aba Evolução antiga
- [x] Atualizar sidebar e navegação
- [x] Testar navegação e rotas


## Correção de Layout (v27)
- [x] Ajustar CSS das cards de perimetria para evitar extravasamento de texto
- [x] Adicionar truncate e min-w-0 para controle de overflow


## Correção de Extravasamento em ClienteDetalhe (v28)
- [x] Ajustar layout de Bioimpedância no ClienteDetalhe
- [x] Adicionar truncate e min-w-0 para evitar overflow de texto
- [x] Melhorar espaçamento entre elementos


## Reorganização de Layout Bioimpedância (v29)
- [x] Data pequena no topo, dados abaixo em coluna
- [x] Remover botão de excluir, manter apenas editar
- [x] Layout vertical mais limpo e organizado


## Remoção de Botão de Edição (v30)
- [x] Remover botão de edição (lapisinho) da aba de Bioimpedância
- [x] Manter apenas exibição dos dados


## Melhorias no Financeiro (v31)
- [x] Mostrar nome do aluno em evidência nas cobranças
- [x] Adicionar barra de progresso para pacotes de sessões
- [x] Remover vencimento para pacotes (pago previamente)
- [ ] Implementar ciclo automático ao finalizar pacote
- [x] Rastrear sessões completadas em pacotes


## Correção de Erros de Query (v32)
- [x] Sincronizar schema Drizzle com colunas packageSessionsTotal e packageSessionsCompleted
- [x] Verificar se as colunas estão sendo reconhecidas nas queries
- [x] Limpar cache e reinstalar dependências
- [x] Reiniciar servidor
- [x] Remover colunas que causavam conflito
- [x] Remover referências no Financas.tsx
- [x] Testar e confirmar que erros foram resolvidos
