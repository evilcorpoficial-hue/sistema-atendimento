import React, { useEffect, useState } from 'react';
import { QueueState, TicketCategory } from '../types';
import { 
  ArrowRight, 
  ArrowLeft, 
  Volume2, 
  Plus, 
  UserCheck, 
  Clock, 
  RefreshCw, 
  RotateCcw,
  Layers, 
  Building2, 
  ListOrdered,
  Sparkles,
  Keyboard,
  Megaphone
} from 'lucide-react';
import { triggerSoundAlert } from '../utils/sound';
import { SettingsModal } from './SettingsModal';
import { DirectCallModal } from './DirectCallModal';

interface OperatorPanelProps {
  state: QueueState;
  callNext: (desk?: string, category?: string) => void;
  callPrev: (desk?: string, category?: string) => void;
  callDirect?: (category: string, number: number | string, desk?: string) => void;
  recallCurrent: () => void;
  addTicket: (category: string) => void;
  resetQueue: (category?: string) => void;
  updateDesk: (desk: string) => void;
  updateInstitution?: (name: string) => void;
  updateCategories?: (categories: TicketCategory[]) => void;
  onSwitchView?: () => void;
}

export const OperatorPanel: React.FC<OperatorPanelProps> = ({
  state,
  callNext,
  callPrev,
  callDirect,
  recallCurrent,
  addTicket,
  resetQueue,
  updateDesk,
  updateInstitution,
  updateCategories,
  onSwitchView,
}) => {
  const [selectedDesk, setSelectedDesk] = useState<string>(state.currentDesk || 'Guichê 01');
  const [selectedCategory, setSelectedCategory] = useState<string>(state.activeCategory || 'TODAS');
  const [customDeskInput, setCustomDeskInput] = useState<string>('');
  const [isEditingDesk, setIsEditingDesk] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showDirectCallModal, setShowDirectCallModal] = useState<boolean>(false);

  // Sync selectedDesk if state changes
  useEffect(() => {
    if (state.currentDesk) {
      setSelectedDesk(state.currentDesk);
    }
  }, [state.currentDesk]);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keypresses if typing in an input field or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        if (e.key === 'Escape') {
          setShowSettingsModal(false);
        }
        return;
      }

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setShowSettingsModal((prev) => !prev);
        return;
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setShowDirectCallModal((prev) => !prev);
        return;
      } else if (e.key === 'Escape') {
        setShowSettingsModal(false);
        setShowDirectCallModal(false);
        return;
      }

      if (showSettingsModal || showDirectCallModal) return;

      if (e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space') {
        e.preventDefault();
        recallCurrent();
        if (state.currentTicket) {
          triggerSoundAlert(state.currentTicket.code, selectedDesk, state.speechEnabled, state.chimeEnabled, state.categories);
        }
        return;
      }

      // Dynamic Shortcuts from configured categories
      const activeCategories = state.categories && state.categories.length > 0
        ? state.categories
        : [
            { id: 'cat-caf', name: 'Atendimento CAF', code: 'CAF', defaultDesk: 'Sala 1', nextShortcut: 'ArrowUp', prevShortcut: 'ArrowDown' },
            { id: 'cat-incra', name: 'Atendimento INCRA', code: 'INCRA', defaultDesk: 'Sala 5', nextShortcut: 'ArrowRight', prevShortcut: 'ArrowLeft' }
          ];

      const pressedKey = e.key;
      const keyLower = pressedKey.toLowerCase();

      for (const cat of activeCategories) {
        if (cat.nextShortcut && (pressedKey === cat.nextShortcut || keyLower === cat.nextShortcut.toLowerCase() || (cat.nextShortcut === 'Space' && pressedKey === ' '))) {
          e.preventDefault();
          callNext(cat.defaultDesk || selectedDesk, cat.code);
          return;
        }
        if (cat.prevShortcut && (pressedKey === cat.prevShortcut || keyLower === cat.prevShortcut.toLowerCase() || (cat.prevShortcut === 'Space' && pressedKey === ' '))) {
          e.preventDefault();
          callPrev(cat.defaultDesk || selectedDesk, cat.code);
          return;
        }
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        resetQueue('CAF');
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        resetQueue('INCRA');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [callNext, callPrev, recallCurrent, resetQueue, selectedDesk, selectedCategory, state.currentTicket, state.speechEnabled, state.chimeEnabled]);

  const handleNextClick = () => {
    callNext(selectedDesk, selectedCategory);
  };

  const handlePrevClick = () => {
    callPrev(selectedDesk);
  };

  const handleRecallClick = () => {
    recallCurrent();
    if (state.currentTicket) {
      triggerSoundAlert(state.currentTicket.code, selectedDesk, state.speechEnabled, state.chimeEnabled);
    }
  };

  const handleDeskChange = (newDesk: string) => {
    setSelectedDesk(newDesk);
    updateDesk(newDesk);
  };

  const categoriesList: TicketCategory[] = state.categories && state.categories.length > 0
    ? state.categories
    : [
        { id: 'cat-caf', name: 'Atendimento CAF', code: 'CAF', defaultDesk: 'Sala 1', nextShortcut: 'ArrowUp', prevShortcut: 'ArrowDown', color: 'blue' },
        { id: 'cat-incra', name: 'Atendimento INCRA', code: 'INCRA', defaultDesk: 'Sala 5', nextShortcut: 'ArrowRight', prevShortcut: 'ArrowLeft', color: 'emerald' }
      ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Keyboard Shortcuts Alert Banner */}
      <div className="bg-[#003A70] text-white p-4.5 rounded-2xl shadow-md border-b-4 border-[#0056b3] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#00274d] rounded-xl border border-blue-800 text-blue-200">
            <Keyboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              Atalhos de Teclado Ativos
              <span className="px-2 py-0.5 text-xs bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-full font-semibold">
                Pronto para uso
              </span>
            </h2>
            <p className="text-xs text-blue-100/90 mt-0.5">
              Controle as chamadas via teclado sem precisar do mouse.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <button
            onClick={() => setShowDirectCallModal(true)}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-1.5 rounded-lg border border-amber-300 flex items-center gap-1.5 shadow-sm font-bold transition-all active:scale-95 cursor-pointer"
            title="Abrir menu de chamada direta"
          >
            <kbd className="px-1.5 py-0.5 bg-slate-950 text-white rounded font-mono text-xs">D</kbd>
            <span>Digitar Senha Direta</span>
          </button>
          <div className="bg-blue-900/80 px-2.5 py-1.5 rounded-lg border border-blue-600 text-blue-100 flex items-center gap-1.5 shadow-xs">
            <kbd className="px-1.5 py-0.5 bg-blue-600 rounded border border-blue-400 font-bold text-white">⬆</kbd>
            <span>Seta Cima: Avançar CAF</span>
          </div>
          <div className="bg-blue-900/80 px-2.5 py-1.5 rounded-lg border border-blue-600 text-blue-100 flex items-center gap-1.5 shadow-xs">
            <kbd className="px-1.5 py-0.5 bg-blue-600 rounded border border-blue-400 font-bold text-white">⬇</kbd>
            <span>Seta Baixo: Voltar CAF</span>
          </div>
          <div className="bg-emerald-900/80 px-2.5 py-1.5 rounded-lg border border-emerald-600 text-emerald-100 flex items-center gap-1.5 shadow-xs">
            <kbd className="px-1.5 py-0.5 bg-emerald-600 rounded border border-emerald-400 font-bold text-white">➔</kbd>
            <span>Seta Direita: Avançar INCRA</span>
          </div>
          <div className="bg-[#00274d] px-2.5 py-1.5 rounded-lg border border-blue-800 text-blue-100 flex items-center gap-1.5 shadow-xs">
            <kbd className="px-1.5 py-0.5 bg-[#0056b3] rounded border border-blue-400 font-bold text-white">Espaço</kbd>
            <span>Repetir</span>
          </div>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="bg-[#00274d] hover:bg-blue-900 px-2.5 py-1.5 rounded-lg border border-blue-700 text-blue-100 flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <kbd className="px-1.5 py-0.5 bg-[#0056b3] rounded border border-blue-400 font-bold text-white">P</kbd>
            <span>Configurações</span>
          </button>
        </div>
      </div>

      {/* Main Control Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Guichê, Main Buttons & Call Stage (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Desk & Category Configuration */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            {/* Sala / Local Selection */}
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Sala / Local do Atendimento
              </label>
              
              {isEditingDesk ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customDeskInput}
                    onChange={(e) => setCustomDeskInput(e.target.value)}
                    placeholder="Ex: Sala 1"
                    className="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => {
                      if (customDeskInput.trim()) {
                        handleDeskChange(customDeskInput.trim());
                      }
                      setIsEditingDesk(false);
                    }}
                    className="px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"
                  >
                    Salvar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedDesk}
                    onChange={(e) => handleDeskChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-bold text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Sala 1">Sala 1</option>
                    <option value="Sala 2">Sala 2</option>
                    <option value="Sala 3">Sala 3</option>
                    <option value="Sala 4">Sala 4</option>
                    <option value="Sala 5">Sala 5 (INCRA)</option>
                    <option value="Sala CAF 1">Sala CAF 1</option>
                    <option value="Sala Atendimento Geral">Sala Atendimento Geral</option>
                    <option value="Sala Assistência Técnica">Sala Assistência Técnica</option>
                  </select>
                  <button
                    onClick={() => {
                      setCustomDeskInput(selectedDesk);
                      setIsEditingDesk(true);
                    }}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl border border-slate-200 whitespace-nowrap"
                  >
                    Outro...
                  </button>
                </div>
              )}
            </div>

            {/* Category Filter */}
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Filtro de Categoria
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-bold text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="TODAS">TODAS AS FILAS</option>
                {categoriesList.map(cat => (
                  <option key={cat.id || cat.code} value={cat.code}>
                    {cat.code} - {cat.name} {cat.defaultDesk ? `(${cat.defaultDesk})` : ''}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Current Ticket Call Card */}
          <div className="bg-gradient-to-br from-blue-900 via-blue-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-blue-800">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center justify-between mb-4 pb-4 border-b border-blue-800/80">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-300 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                Senha Atual em Atendimento
              </span>
              <span className="bg-blue-800/80 text-blue-200 border border-blue-700/80 text-xs font-mono font-semibold px-3 py-1 rounded-full">
                {selectedDesk}
              </span>
            </div>

            {state.currentTicket ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-xs font-bold uppercase text-blue-200 tracking-wider">
                  {state.currentTicket.category}
                </p>
                
                {/* Main Big Ticket Number */}
                <div className="text-6xl sm:text-7xl font-black tracking-tight text-white drop-shadow-md">
                  {state.currentTicket.code}
                </div>

                <div className="flex items-center justify-center gap-3 pt-2 text-xs text-blue-200 font-medium">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-300" />
                    Chamado às {new Date(state.currentTicket.calledAt || Date.now()).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-blue-200">
                <p className="text-lg font-semibold">Nenhuma senha chamada no momento.</p>
                <p className="text-xs text-blue-300 mt-1">Pressione "Avançar Próxima Senha" para iniciar o atendimento.</p>
              </div>
            )}

            {/* Repeat Call Action inside card */}
            <div className="mt-6 pt-4 border-t border-blue-800/80 flex justify-center">
              <button
                onClick={handleRecallClick}
                disabled={!state.currentTicket}
                className="w-full sm:w-auto px-6 py-3 bg-blue-800/80 hover:bg-blue-700/90 border border-blue-600/80 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Volume2 className="w-4 h-4 text-emerald-300 animate-pulse" />
                Repetir Chamada com Som (Espaço)
              </button>
            </div>
          </div>

          {/* Primary Action Buttons (Próxima / Voltar) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Advance / Next Button */}
            <button
              onClick={handleNextClick}
              className="group relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xl py-6 px-6 rounded-2xl shadow-xl ring-4 ring-blue-200/80 transition-all transform active:scale-95 flex items-center justify-between"
            >
              <div className="text-left">
                <div className="text-2xl font-black tracking-wide">AVANÇAR SENHA</div>
                <div className="text-xs text-blue-100 font-medium opacity-90 mt-0.5">Próximo Atendimento (➔)</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/20 group-hover:bg-white/30 flex items-center justify-center transition-all">
                <ArrowRight className="w-7 h-7 text-white" />
              </div>
            </button>

            {/* Previous / Voltar Button */}
            <button
              onClick={handlePrevClick}
              disabled={state.history.length === 0}
              className="bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 hover:border-blue-600 font-bold text-lg py-6 px-6 rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-between disabled:opacity-50 disabled:pointer-events-none"
            >
              <div className="text-left">
                <div className="text-lg font-bold text-slate-800">VOLTAR SENHA</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">Senha Anterior (⬅)</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <ArrowLeft className="w-6 h-6" />
              </div>
            </button>

          </div>

          {/* Direct Call Button (Tecla D) */}
          <button
            onClick={() => setShowDirectCallModal(true)}
            className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-lg py-4 px-6 rounded-2xl shadow-lg border border-emerald-400/50 transition-all transform active:scale-[0.99] flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="text-left">
                <div className="text-base sm:text-lg font-black tracking-wide">DIGITAR E CHAMAR SENHA DIRETAMENTE</div>
                <div className="text-xs text-emerald-100 font-medium">Digite qualquer número para chamar no painel imediatamente</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs text-emerald-100 font-semibold">Atalho</span>
              <kbd className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-mono font-bold text-white border border-white/30">
                Tecla D
              </kbd>
            </div>
          </button>

          {/* Quick Ticket Generator Buttons */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-600" />
              Emitir Nova Senha Manualmente para a Fila
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {categoriesList.map((cat) => (
                <button
                  key={cat.id || cat.code}
                  onClick={() => addTicket(cat.code)}
                  className="px-3.5 py-3 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs rounded-xl border border-blue-200 transition-all flex flex-col items-center justify-center gap-1 shadow-xs active:scale-95"
                >
                  <span className="text-blue-600 font-black text-sm">+ {cat.code}</span>
                  <span className="text-[10px] text-slate-500 font-normal truncate max-w-full">
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Individual Queue Reset Section */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                Resetar / Zerar Filas Separadamente
              </h3>

              <button
                onClick={() => {
                  if (confirm('Tem certeza que deseja zerar TODAS as filas e contadores?')) {
                    resetQueue();
                  }
                }}
                className="text-[11px] text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100/90 border border-rose-200 font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 shadow-2xs"
                title="Resetar todas as filas juntas"
              >
                <RefreshCw className="w-3 h-3 text-rose-600" />
                Zerar Todas
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Clique no botão da fila correspondente para zerar a contagem e limpar a espera somente daquela categoria:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {categoriesList.map((cat) => (
                <button
                  key={`reset-${cat.id || cat.code}`}
                  onClick={() => {
                    if (confirm(`Deseja zerar a fila e o contador da categoria ${cat.code}?`)) {
                      resetQueue(cat.code);
                    }
                  }}
                  className="px-3 py-3 bg-rose-50/70 hover:bg-rose-100 text-rose-900 font-bold text-xs rounded-xl border border-rose-200/90 transition-all flex flex-col items-center justify-center gap-1 shadow-2xs active:scale-95 group hover:border-rose-400"
                >
                  <span className="flex items-center gap-1 font-black text-rose-700 text-xs">
                    <RotateCcw className="w-3.5 h-3.5 text-rose-600 group-hover:-rotate-90 transition-transform duration-200" />
                    Zerar {cat.code}
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Contador atual: #{state.counters[cat.code] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Waiting Queue & Called History (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Waiting Queue List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  {state.waitingQueue.length}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Fila de Espera</h3>
                  <p className="text-[11px] text-slate-500">Senhas aguardando atendimento</p>
                </div>
              </div>

              {state.waitingQueue.length > 0 && (
                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[11px] font-semibold">
                  Aguardando
                </span>
              )}
            </div>

            {state.waitingQueue.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {state.waitingQueue.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 w-5">
                        #{index + 1}
                      </span>
                      <div>
                        <div className="font-black text-slate-900 text-sm">
                          {ticket.code}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {ticket.category}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => callNext(selectedDesk, ticket.category)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all"
                    >
                      Chamar
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Nenhuma senha aguardando na fila.
              </div>
            )}
          </div>

          {/* History List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Histórico Recente</h3>
                  <p className="text-[11px] text-slate-500">Últimas senhas chamadas</p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (confirm('Deseja zerar todas as filas?')) {
                    resetQueue();
                  }
                }}
                title="Reiniciar Todas as Filas"
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Zerar Filas
              </button>
            </div>

            {state.history.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {state.history.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800 text-sm">
                        {ticket.code}
                      </div>
                      <div className="text-slate-500">
                        {ticket.desk}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {ticket.calledAt ? new Date(ticket.calledAt).toLocaleTimeString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                Sem histórico de chamadas recentes.
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Settings Modal (Accessed exclusively via 'P' key) */}
      <SettingsModal 
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        state={state}
        resetQueue={resetQueue}
        updateInstitution={updateInstitution}
        updateCategories={updateCategories}
      />

      {/* Direct Call Modal (Accessed via 'D' key or button) */}
      <DirectCallModal
        isOpen={showDirectCallModal}
        onClose={() => setShowDirectCallModal(false)}
        state={state}
        callDirect={callDirect || (() => {})}
      />

    </div>
  );
};
