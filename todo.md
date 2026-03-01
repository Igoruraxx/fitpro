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
- [x] Planos: Free (até 5 alunos), Pro (ilimitados)
- [ ] Integração Stripe para pagamentos (placeholder - em breve)
- [x] Controle de limites por plano
- [x] Página /upgrade com comparativo Free vs Pro

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


## Correção da Aba de Visualização Semanal (v34)
- [ ] Mostrar todos os horários disponíveis da semana
- [ ] Remover botão WhatsApp da aba semanal
- [ ] Remover botão alterar status da aba semanal
- [ ] Deixar aba semanal apenas para leitura/visualização

## Alertas de Pacote Próximo de Finalizar (v34)
- [x] Implementar notificação quando pacote atingir 80% de conclusão
- [x] Adicionar indicador visual em Últimas Sessões com fundo amarelo
- [x] Exibir ícone de alerta mostrando quantas sessões faltam
- [x] Integrar com sistema de notificações push do Manus

## Botão de Concluir Sessão no Perfil (v35)
- [x] Adicionar botão de concluir sessão na aba Sessões do ClienteDetalhe
- [x] Mostrar botão apenas para sessões agendadas (status = scheduled)
- [x] Ao clicar, marcar sessão como concluída e decrementar sessionsRemaining
- [x] Exibir confirmação antes de concluir
- [x] Atualizar UI após conclusão

## Barra de Progresso de Sessões na Aba Financeira (v36)
- [x] Exibir barra de progresso para clientes com plano de pacote
- [x] Mostrar sessões concluídas vs total de sessões do pacote
- [x] Atualizar barra em tempo real quando sessão é concluída
- [x] Exibir percentual de conclusão
- [x] Cor verde quando pacote está completo

## Opção de Excluir Agendamentos Futuros (v37)
- [x] Adicionar botão para excluir todos os agendamentos futuros no perfil do cliente
- [x] Mostrar confirmação com lista de agendamentos que serão deletados
- [x] Excluir apenas agendamentos com data futura (não concluídos)
- [x] Exibir mensagem de sucesso após exclusão
- [x] Atualizar UI após exclusão em massa

## Botão Excluir Todos os Agendamentos (v38)
- [x] Adicionar botão "Excluir Todos" ao lado de "Excluir Futuros"
- [x] Deletar todos os agendamentos (passados, presentes e futuros)
- [x] Exibir confirmação com aviso de ação irreversível
- [x] Mostrar quantidade de agendamentos que serão deletados
- [x] Atualizar UI após exclusão em massa

## Botão Excluir Pagamentos no Financeiro (v39)
- [x] Adicionar botão de excluir ao lado de cada pagamento
- [x] Exibir confirmação antes de deletar
- [x] Deletar pagamento do banco de dados
- [x] Atualizar UI após exclusão
- [x] Mostrar mensagem de sucesso

## Sistema de Desfazer Exclusão de Pagamentos (v40)
- [ ] Criar tabela deletedTransactions no banco de dados
- [ ] Modificar mutation delete para arquivar ao invés de deletar
- [ ] Implementar mutation restore para restaurar pagamentos
- [ ] Adicionar UI de histórico de exclusões
- [ ] Mostrar opção de restaurar com data de exclusão
- [ ] Limpar histórico após 30 dias

## Logo Personalizada (v41)
- [x] Upload da logo para CDN
- [x] Aplicar logo na tela de login
- [x] Aplicar logo no header/navbar
- [x] Aplicar logo no favicon
- [x] Aplicar logo em todas as telas que exibem a marca

## Identidade Visual Avançada (v42)
- [x] Splash screen com logo animada ao carregar o app
- [x] Tema de cores verde-petóleo e laranja baseado na logo
- [x] Logo na barra de navegação mobile inferior

## Horários Diferentes por Dia da Semana (v43)
- [ ] Atualizar schema para suportar horários individuais por dia
- [ ] Atualizar UI para mostrar seletor de horário por dia selecionado
- [ ] Adicionar botão "Replicar horário" para igualar todos os dias
- [ ] Atualizar lógica de geração de agendamentos recorrentes por dia
- [ ] Compatibilidade com dados existentes

## Sessões Pendentes e Correção de Pacotes (v44)
- [x] Remover data de vencimento de pacotes no Financeiro (pacotes não têm vencimento)
- [x] Criar barra/seção de sessões pendentes no Financeiro (sessões agendadas não concluídas)
- [x] Criar barra/seção de sessões pendentes no painel do aluno (ClienteDetalhe)
- [x] Mostrar quantidade de sessões pendentes por aluno

## Trocar Dashboard por Evolução na Barra Mobile (v45)
- [x] Remover Dashboard da barra de navegação mobile
- [x] Adicionar Evolução na barra de navegação mobile
- [x] Manter Dashboard apenas na sidebar desktop

## Melhorias na Visualização da Agenda (v46)
- [x] Remover visualização semanal da agenda
- [x] Adicionar linha laranja divisória na visualização por horários
- [x] Manter visualizações de dia e mês

## Correção de Bugs da Varredura (v47)
- [x] Bug 1: Exibir horários por dia no perfil do aluno (ClienteDetalhe)
- [x] Bug 2: Remover campo "Horário padrão" redundante do formulário
- [x] Bug 3: Remover código morto de renderWeekView na Agenda
- [x] Bug 4: Excluir pacotes da query de inadimplentes (já estava correto via dueDate IS NOT NULL)
- [ ] Bug 5: Implementar desfazer exclusão de pagamentos (lixeira) — pendente por decisão do usuário
- [x] Bug 6: Colorir sessões pendentes quando pacote atingir 80% (sem notificação)
- [x] Bug 7: Carregar sessionTimesPerDay no formulário de edição de aluno

## Melhorias no Financeiro e Renovação de Pacotes (v48)
- [x] Mostrar nome do cliente nos recebimentos de pacote no Financeiro
- [x] Exibir quantas sessões faltam para concluir o pacote no Financeiro
- [x] Adicionar botão "Renovar Pacote" no perfil do aluno (ClienteDetalhe)
- [x] Implementar lógica de renovação: criar novo pacote com mesma quantidade de sessões
- [x] Criar nova transação para novo pacote ao renovar


## Agendamento Automático Inteligente (v49)
- [x] Criar função para gerar agendamentos respeitando dias da semana e frequência
- [x] Gerar agendamentos ao criar cliente com plano de pacote
- [x] Gerar agendamentos ao renovar pacote
- [x] Respeitar quantidade de sessões do pacote (não necessariamente 4 semanas)
- [x] Usar dias marcados (sessionDays) e horários (sessionTime ou sessionTimesPerDay)

## Histórico de Renovações (v50)
- [x] Adicionar campo renovationHistory na tabela clients (JSON array)
- [x] Registrar data e detalhes de cada renovação
- [x] Exibir timeline/badges no perfil do aluno mostrando renovações
- [x] Mostrar quantas sessões foram usadas entre renovações

## Relatório de Pacotes Esgotados (v51)
- [x] Criar seção no Financeiro destacando clientes com pacotes esgotados
- [x] Mostrar cliente, valor do pacote e data de esgotamento
- [x] Botão rápido para renovar direto do relatório
- [x] Indicador visual (badge vermelha ou laranja)

## Exames Fictícios para Testes (v52)
- [x] Criar 2 exames completos para cada cliente
- [x] Variar entre hipertrofia (ganho de massa) e emagrecimento
- [x] Incluir dados de perimetria e dobras cutâneas
- [x] Permitir testar aba de Evolução com dados reais

## Sessões Restantes e Recebimentos (v53)
- [x] Botão "Criar Sessões Restantes" no perfil do aluno com plano de pacote
- [x] Lançar recebimento automaticamente ao criar aluno com plano mensal ou pacote
- [x] Renovação de plano lança entrada no financeiro
- [x] Verificar e corrigir fluxo completo de renovação (removida restrição de sessões=0)
- [x] Perimetria fictícia adicionada nos 2 exames de cada aluno (16 exames atualizados)


## Varredura UX/Responsividade (v54)
- [x] Reduzir intensidade da linha laranja da agenda (bg-orange-500/60 → bg-orange-500/30)
- [ ] Testar responsividade completa em mobile, tablet e desktop
- [ ] Verificar espaçamento e overflow em todas as páginas
- [ ] Validar contraste de cores e legibilidade

## Escalabilidade: Planos Free/Pro + Admin (v55)
- [x] Campo plan (free/pro) na tabela users (já existia subscriptionPlan)
- [x] Campo impersonatingUserId na sessão JWT para modo admin
- [x] Guard de limite: Free = máx 5 alunos ativos (backend + frontend)
- [x] Guard de acesso: Free sem gráficos e relatórios (bloqueio no AppLayout)
- [x] Procedure admin.trainers: listar todos os personais com plano e métricas
- [x] Procedure admin.impersonate: gerar token temporário como outro usuário
- [x] Procedure admin.stopImpersonating: restaurar sessão do admin
- [x] Procedure admin.impersonationStatus: verificar estado de impersonação
- [x] Procedure admin.updatePlan: alterar plano de um personal (toggle Free/Pro)
- [x] Painel Admin (/admin): lista de personais com plano, alunos ativos, data de cadastro
- [x] Botão "Ver como Personal" no painel admin
- [x] Banner de impersonação visível ao navegar como outro personal
- [x] Botão "Voltar para Admin" no banner de impersonação
- [x] Bloqueio frontend: itens bloqueados com ícone de cadeado para usuários Free
- [x] Bloqueio frontend: toast de aviso ao clicar em recurso bloqueado
- [x] Promover usuário admin (ID 16 - semap.igor@gmail.com) no banco de dados
- [x] Comparativo Free vs Pro no painel admin


## Sistema de Trial e Pro (v56)
- [ ] Adicionar campos: trialRequestedAt, proSource (paid/trial/courtesy), proExpiresAt na tabela users
- [ ] Procedure users.requestTrial: validar se já solicitou, criar trial de 7 dias
- [ ] Procedure admin.grantPro: conceder dias Pro com origem (paid/trial/courtesy)
- [ ] Modal de solicita


## Página de Upgrade (v56)
- [x] Criar página /upgrade com comparativo Free vs Pro
- [x] Adicionar rota /upgrade no App.tsx
- [x] Integrar botão "Ver Planos" no modal de trial
- [x] Exibir FAQ e seção de CTA
- [x] Corrigir erro de hooks no Admin.tsx


## Bloqueios de Funcionalidades Pro (v51)
- [x] Travar aba Fotos para usuários Free (mostrar card bloqueado)
- [x] Modal de trial ao clicar em função Pro pela primeira vez
- [x] Notificação de expiração de trial (quando trial acabar)
- [x] Exibir data de expiração Pro/trial no painel admin

## Correção de Planos e Admins (v52)
- [x] Adicionar colunas proSource, proExpiresAt, trialRequestedAt ao schema
- [x] Corrigir todos os personals para subscriptionPlan = 'free'
- [x] Limpar proSource, proExpiresAt, trialRequestedAt de todos os Free
- [x] Remover role admin de todos exceto semap.igor@gmail.com

## Concessão de Cortesia no Admin (v53)
- [x] Criar procedure tRPC admin.grantCourtesy para conceder Pro como cortesia
- [x] Adicionar modal no Admin para selecionar personal e definir dias
- [x] Exibir feedback de sucesso/erro ao conceder cortesia


## Correcao de Tags no Admin (v54)
- [x] Mostrar tag "Trial" apenas quando proSource = 'trial'
- [x] Exibir "Expira: DD/MM/YY" para todos os Pro
- [x] Remover status badge redundante

## Melhorias de UX e Admin (v55)
- [x] Desabilitar Fotos e Evolução na barra inferior para Free
- [x] Abrir modal de trial ao clicar em Fotos/Evolução desabilitados
- [x] Adicionar filtro de plano (Free/Pro) no Admin
- [x] Remover texto sobre downgrade de planos
- [x] Remover menção de acesso ao painel admin

## Corre\u00e7\u00e3o de Erros (v56)
- [x] Corrigir erro de permiss\u00e3o na p\u00e1gina / com User: null
- [x] Adicionar enabled: !!user em queries de Agenda.tsx


## PWA e Mobile-First (v57)
- [x] Configurar manifest.json com ícones e metadados
- [x] Implementar service worker para offline
- [x] Adicionar meta tags viewport e PWA
- [x] Auditar layout mobile em todas as páginas
- [x] Otimizar layout Admin para mobile (botões hidden)
- [x] Otimizar espaçamento para mobile
- [x] Registrar service worker em main.tsx


## Cache Offline (v58)
- [x] Criar hook useOfflineCache para gerenciar dados em IndexedDB
- [x] Criar hook useOfflineData para integrar com tRPC
- [x] Adicionar indicador de modo offline (OfflineIndicator)
- [x] Sincronizar dados quando voltar online com toast
- [x] Corrigir erro React #185 removendo hooks condicionais

## PWA Aprimorado iOS/Android (v59)
- [x] Gerar ícones PWA em todos os tamanhos (72, 96, 128, 144, 152, 192, 384, 512, maskable)
- [x] Gerar splash screens para iOS (9 tamanhos, iPhone SE a iPad Pro)
- [x] Aprimorar manifest.json com display_override, shortcuts, screenshots
- [x] Adicionar apple-touch-icon para todos os tamanhos
- [x] Adicionar apple-touch-startup-image para todos os iPhones
- [x] Adicionar meta tags Android/Chrome (mobile-web-app-capable)
- [x] Implementar InstallPrompt (Android: BeforeInstallPrompt, iOS: instruções)
- [x] Aprimorar service worker com cache-first para assets e network-first para API
- [x] Adicionar safe-area-inset para iOS notch/home indicator


## Otimização de Sessões Pendentes (v60)
- [x] Implementar invalidação de cache tRPC após criar/agendar/cancelar sessões
- [x] Atualizar ClienteDetalhe.tsx para recalcular em tempo real
- [x] Adicionar loading state "Recalculando sessões pendentes..." durante refresh
- [x] Invalidar pendingByClient em todas as mutations relevantes


## Correção de Lógica de Sessões (v61)
- [x] Corrigir procedure pendingByClient para contar apenas agendamentos futuros (data >= hoje)
- [x] Corrigir pendingGrouped para filtrar agendamentos futuros
- [x] Atualizar ClienteDetalhe.tsx para contar apenas agendamentos futuros
- [x] Alterar label de "Sessões" para "Concluídas" para clareza


## Verificação de Sessões Criadas (v62)
- [x] Calcular quantas sessões já foram criadas (agendadas) vs sessões restantes
- [x] Mostrar botão "Criar" apenas se houver sessões não criadas (totalSessions < totalPackageSessions)
- [x] Adicionar indicador de status "Todas as X sessões já foram criadas" em verde
- [x] Botão desabilitado automaticamente quando todas as sessões já foram criadas


## Correção de Invalidação de Cache (v63)
- [x] Adicionar refetch explícito após invalidar appointments.list
- [x] Garantir que UI atualiza imediatamente após criar sessões


## Limite de Criação de Sessões (v64)
- [x] Criar helper calculateMaxSessionsToCreate() no db.ts
- [x] Refatorar generateRemainingAppointments para respeitar limite do plano
- [x] Adicionar validação no frontend com mensagem de progresso (X/Y sessões)
- [x] Todos os 75 testes passando


- [x] Esconder botão "Criar X Sessões Restantes" quando sessionsCreated >= totalPackageSessions


## Auditoria Admin Mobile (v66)
- [x] Remover hidden sm:flex dos botões de ação (Cortesia, Ver, Toggle)
- [x] Corrigir layout dos filtros para ser responsivo em mobile
- [x] Remover whitespace-nowrap para permitir quebra de linha
- [x] Todos os 75 testes passando

## Refatorar Admin Mobile com Menu Dropdown (v67)
- [x] Criar menu dropdown para ações em mobile
- [x] Manter botões vistos em desktop (sm:)
- [x] Garantir layout compacto em mobile
- [x] Todos os 75 testes passando

## Comparador de Fotos com Slider Arrastável (v68)
- [x] Criar componente ImageComparator com slider tipo before/after
- [x] Implementar arrastar com mouse/touch para revelar foto
- [x] Integrar na página de Fotos
- [x] Testar em mobile e desktop
- [x] Todos os 75 testes passando

## Integração Abacash para Pagamentos (v69)
- [ ] Configurar secret key Abacash
- [ ] Criar helpers para API Abacash (criar subscription, webhook)
- [ ] Definir preços dos planos: Mensal 24,90, Trimestral 69,72 (5%), Semestral 130,42 (10%), Anual 239,04 (20%)
- [ ] Criar routers tRPC: createSubscription, cancelSubscription, getSubscriptionStatus
- [ ] Implementar UI de seleção de planos com preços e descontos
- [ ] Integrar fluxo de checkout (redirect para Abacash)
- [ ] Implementar webhook para confirmar pagamento e ativar Pro
- [ ] Testar fluxo completo de pagamento


## Integração Abacash para Pagamentos (v69)
- [x] Configurar secret ABACASH_SK_LIVE
- [x] Criar helpers Abacash com planos (mensal 24,90, trimestral 70,97 com 5%, semestral 134,46 com 10%, anual 239,04 com 20%)
- [x] Criar 11 testes para validação de preços e descontos
- [x] Criar routers tRPC para pagamentos (getPlans, createCheckout, confirmPayment, getSubscriptionStatus, cancelSubscription)
- [x] Criar componente PlanSelector com UI de seleção de planos
- [x] Integrar modal de pagamento na página Upgrade
- [x] Criar webhook handler para eventos Abacash (subscription.activated, subscription.cancelled, subscription.expired)
- [x] Registrar rota POST /api/webhooks/abacash
- [x] Todos os 86 testes passando


## Bug: Erro ao Criar Agendamentos para Pacotes (v70)
- [x] Investigar erro: "Todas as 6 sessoes do pacote ja foram criadas"
- [x] Permitir recriar agendamentos sem erro quando pacote já tem sessões
- [x] Remover validação restritiva que impedia recriar agendamentos
- [x] Simplificar retorno para apenas informar quantas sessões foram criadas


## Painel Admin de Personals (v71)
- [x] Criar routers tRPC admin: listPersonals, convertToProCourtesy, cancelProSubscription, impersonatePersonal
- [x] Criar componente AdminPersonalsTable com colunas: nome, clientes, plano, origem, expiração, status
- [x] Implementar filtros: por plano (free/pro), por origem (pagamento/cortesia/trial)
- [x] Implementar busca por nome de personal
- [x] Ação: converter free→pro (cortesia)
- [x] Ação: cancelar assinatura pro
- [x] Ação: impersonar personal (admin vira personal temporariamente)
- [x] Integrar ao painel admin existente (/admin)
- [x] Refatorar Admin.tsx com novo painel completo
- [x] Todos os 86 testes passando


## Bug: Erro ao Criar Checkout (v72)
- [x] Investigar erro ao clicar em "Assinar Agora" na página /upgrade
- [x] Verificar router createCheckout
- [x] Adicionar modo mock para testes (development mode)
- [x] Todos os 86 testes passando


## Refatoração Painel Admin com AbacatePay (v73)
- [ ] Atualizar schema: plan_type, plan_origin, abacatepay_customer_id, plan_expires_at, plan_granted_by
- [ ] Criar helpers AbacatePay (checkout, status, webhook verification)
- [ ] Criar routers tRPC: listPersonals avançado, updatePlanManual, getPaymentHistory
- [ ] Implementar webhook handler /api/webhooks/abacatepay
- [ ] Criar tabela com colunas: nome, email, clientes, plano, origem, expiração, ações
- [ ] Implementar filtros: plano, origem, busca, ordenação
- [ ] Badges com cores: verde (FREE), azul (PRO-Pagamento), roxo (PRO-Cortesia), laranja (PRO-Trial)
- [ ] Ações: ver detalhes, editar plano, cancelar trial, histórico de pagamentos
- [ ] Cron job para expiração automática de trials
- [ ] Logging de mudanças de plano
- [ ] Testes e validação


## Refatoração Painel Admin com AbacatePay (v73)
- [x] Atualizar schema com campos abacatepay_customer_id, abacatepay_subscription_id, plan_start_at, plan_expires_at
- [x] Criar skill reutilizável abacatepay-saas-integration com documentação completa
- [x] Implementar helper AbacatePay (checkout, webhook verification, status queries)
- [x] Integrar webhook handler AbacatePay no servidor (/api/webhooks/abacatepay)
- [x] Criar componente PersonalsTable com filtros, busca, badges coloridas
- [x] Criar página AdminAbacatepay com ações (cortesia, cancelar, trial)
- [ ] Criar routers tRPC admin avançados (listPersonals, convertToProCourtesy, etc)
- [ ] Implementar cron job para expiração automática de trials
- [ ] Criar testes para webhooks e routers admin
- [ ] Integrar logging de mudanças de plano


## Cron Job: Downgrade de Trials Expirados (v74)
- [x] Criar job que roda diariamente (00:00 UTC)
- [x] Buscar todos os usuários com plano PRO, origem TRIAL e data expiração <= hoje
- [x] Fazer downgrade para FREE (limpar proSource, proExpiresAt, etc)
- [x] Registrar log de downgrade automático
- [x] Criar testes para o job (5 testes criados)
- [x] Job integrado no sistema de jobs existente


## Bug: Erro de Query SQL no Login (v75)
- [x] Investigar erro: campo subscriptionStatus não existe no schema
- [x] Remover subscriptionStatus: "trial" do createUser em db.ts
- [x] Login deve funcionar agora com apenas subscriptionPlan: "free"
- [x] Todos os 86 testes passando
