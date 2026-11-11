# Sistema de Atendimento - Correção dos Reset Diários e Botões de Reset

Correção completa da rotina de zeramento automático das filas nos três turnos diários (início do expediente às 08:00, almoço às 12:00 e encerramento às 17:00) e conserto dos botões manuais de zeramento no painel de configurações para reset direto imediato, sem alertas bloqueantes e com limpeza total para o estado 00.

## User Review & Critical Decisions

> [!IMPORTANT]
> Decisões confirmadas com base nas respostas do usuário:
> - **Horários dos 3 Reset Diários**: 08:00 (início do expediente), 12:00 (intervalo do almoço) e 17:00 (encerramento do expediente/noite), sincronizados pelo fuso horário de Brasília (`America/Sao_Paulo`).
> - **Comportamento dos Botões Manuais**: Reset imediato ao clicar. Remoção completa de `window.confirm` e `window.alert` (que eram bloqueados pelas políticas de segurança do navegador em iframes), adicionando feedback visual claro e imediato de ação executada.
> - **Estado Após o Reset**: Contadores zerados em `0`, histórico de chamadas esvaziado, fila de espera limpa e exibição do painel principal ajustada para estado inicial `00`, garantindo que a próxima senha chamada seja a `01`.

---

## 1. Overview & Core Concept

- **O que faz**:
  1. **Agendamento de Reset Triplo Resiliente**: O servidor e o cliente mantêm verificação dos limites de horário (08:00, 12:00 e 17:00). Caso o servidor ou o cliente inicie em um novo período sem que o reset tenha ocorrido, ou quando o relógio atinge o minuto exato, o sistema zera automaticamente os contadores, limpa o histórico e notifica todos os terminais via WebSocket.
  2. **Botões de Reset Funcionais e Desbloqueados**: No modal de configurações (**Tecla P**), cada botão individual de zeramento de fila e o botão geral ("Zerar Todas as Filas do Dia") agora executam imediatamente via chamada direta REST e WebSocket, sem diálogos nativos bloqueados pelo navegador, exibindo animação momentânea de sucesso ("Fila Zerada!").
  3. **Sincronização Total**: Ao zerar, os contadores de categoria voltam a 0, a senha atual é redefinida para `00` e a próxima chamada incrementará diretamente para `01`, preservando a consistência em todos os monitores e guichês conectados.

- **Público-Alvo**: Atendentes, operadores e público da Secretaria de Desenvolvimento Agropecuário na recepção.
- **Benefício Chave**: Eliminação de senhas residuais entre turnos, garantia de reinício em 01 a cada expediente e operação confiável dos botões de controle sem falhas silenciosas.

---

## 2. User Experience & Visual Design

### Fluxos de Interação

1. **Reset Automático por Horário**:
   - **08:00**: O sistema detecta o início dos trabalhos matutinos, limpa o painel da noite anterior e coloca os contadores em 0 (`00 GERAL` ou `00 [Fila]`).
   - **12:00**: O painel entra no aviso de almoço e executa o reset automático das senhas da manhã.
   - **17:00**: O expediente encerra e os contadores da tarde são zerados para o próximo dia.
   - **Prevenção de Perda por Hibernação**: Se o servidor ficar ocioso entre 12:00 e 13:59 e for acessado às 14:00, ele verifica o carimbo do último reset diário (`lastResetPeriod`) e executa a limpeza retroativa instantaneamente.

2. **Reset Manual no Menu de Configurações (Tecla P)**:
   - O atendente pressiona a tecla **P**.
   - Clica em **"Zerar Fila [SIGLA]"** ou **"Zerar Todas as Filas do Dia"**.
   - O botão responde instantaneamente (ícone gira, muda momentaneamente para verde com texto "Zerado com sucesso!") e a tela da TV sincroniza para `00` no mesmo segundo.

```
┌────────────────────────────────────────────────────────┐
│  Zerar Fila CAF          [↺ Zerada!] (Verde momentâneo)│
│  Zerar Fila INCRA        [↺ Zerar]                     │
│  Zerar Todas as Filas    [↺ Zerar Todas as Filas]      │
└────────────────────────────────────────────────────────┘
```

---

## 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Remoção do `window.confirm` e Diálogos Nativos**:
  - *Abordagem*: Disparo direto e imediato via `sendAction` e `fetch` com feedback de estado local no botão.
  - *Motivo*: `window.confirm` e `window.alert` falham silenciosamente ou são estritamente bloqueados em iframes sandbox e navegadores modernos, impedindo o clique de surtir efeito.
  - *Alternativa descartada*: Modal de confirmação secundário com texto de confirmação (o usuário solicitou "reset imediato apenas").

- **Decisão 2: Controle de Turno Baseado em Período (`lastResetSessionKey`)**:
  - *Abordagem*: Gravar na persistência JSON a chave da última sessão zerada (`YYYY-MM-DD_08h`, `YYYY-MM-DD_12h`, `YYYY-MM-DD_17h`).
  - *Motivo*: O `setInterval` puro falha caso o servidor caia ou reinicie 1 minuto após o horário. Com a verificação de período, o sistema sempre garante que a limpeza foi efetivada para o turno atual.

- **Decisão 3: Estado Visual `00` após Zeramento**:
  - *Abordagem*: Ao zerar uma fila específica ou todas as filas, o `currentTicket` é atualizado para um bilhete nulo/inicial `00` e a próxima chamada incrementará para `01`.

---

## 4. Technical Architecture & Data Strategy

### Diagrama de Fluxo e Execução do Reset

```
┌─────────────────────────────────────────────────────────────────┐
│                       SISTEMA DE RESET                         │
└─────────────────────────────────────────────────────────────────┘
         │                                              │
         ▼                                              ▼
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│     RESET AUTOMÁTICO (TEMPO)     │   │     RESET MANUAL (TECLA P)      │
│  • Intervalo de 10s no Node.js  │   │  • Botões no SettingsModal.tsx  │
│  • Verificação nos 3 marcos:    │   │  • Disparo imediato (sem popup) │
│    08:00, 12:00 e 17:00 (BRT)   │   │  • Fallback HTTP + WebSocket    │
│  • Validação retroativa pós-boot│   │  • Feedback visual no botão     │
└─────────────────────────────────┘   └─────────────────────────────────┘
                 │                                      │
                 └──────────────────┬───────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    resetQueue() em server.ts                    │
│  1. Zera contadores (counters[cat] = 0)                         │
│  2. Limpa history = [] e waitingQueue = []                      │
│  3. currentTicket = null (renderiza '00' no TVDisplayPanel)     │
│  4. Grava em queue-data.json com lastResetSessionKey            │
│  5. Emite STATE_UPDATE via WebSocket para todos os clientes     │
└─────────────────────────────────────────────────────────────────┘
```

### Arquivos Envolvidos
- `server.ts`:
  - Atualização do `resetQueue` para suporte completo à limpeza de contadores, histórico e persistência imediata.
  - Expansão do agendador automático para os 3 turnos: 08:00 (início), 12:00 (almoço) e 17:00 (encerramento), com chave persistida de controle diário (`lastResetSessionKey`) imune a reinicializações.
  - Garantia de que a rota `/api/queue/reset` processe e responda com o estado atualizado.
- `src/components/SettingsModal.tsx`:
  - Remoção de `window.confirm` e `window.alert`.
  - Adição de estado de feedback instantâneo nos botões de reset ("Zerado!", ícone de check).
  - Chamada direta a `resetQueue(cat.code)` e `resetQueue()`.
- `src/hooks/useQueueSocket.ts`:
  - Disparo de `RESET_QUEUE` por WebSocket e por chamada HTTP `/api/queue/reset` para garantia absoluta de entrega.
- `src/components/TVDisplayPanel.tsx`:
  - Exibição consistente de `00` quando a fila for zerada, permitindo que o próximo avanço inicie perfeitamente no número `01`.
