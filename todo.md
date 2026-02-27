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
