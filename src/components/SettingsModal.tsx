import React, { useEffect, useState } from 'react';
import { QueueState, TicketCategory } from '../types';
import { 
  X, 
  Volume2, 
  Wifi, 
  Building, 
  RefreshCw, 
  Sliders, 
  Copy, 
  Check, 
  ExternalLink,
  Keyboard,
  Clock,
  Plus,
  Trash2,
  ListPlus,
  Radio
} from 'lucide-react';
import { triggerSoundAlert } from '../utils/sound';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: QueueState;
  resetQueue?: (category?: string) => void;
  updateInstitution?: (name: string) => void;
  updateCategories?: (categories: TicketCategory[]) => void;
  updateResetAllShortcut?: (shortcut: string) => void;
}

export function formatKeyLabel(key: string | undefined): string {
  if (!key) return 'Nenhum';
  if (key === 'ArrowUp') return '⬆ Seta Cima';
  if (key === 'ArrowDown') return '⬇ Seta Baixo';
  if (key === 'ArrowRight') return '➔ Seta Direita';
  if (key === 'ArrowLeft') return '⬅ Seta Esquerda';
  if (key === ' ' || key === 'Space') return 'Espaço';
  if (key === 'Backspace') return 'Backspace';
  if (key === 'Delete') return 'Delete';
  if (key.length === 1) return `Tecla ${key.toUpperCase()}`;
  return key;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  state,
  resetQueue,
  updateInstitution,
  updateCategories,
  updateResetAllShortcut
}) => {
  const [ips, setIps] = useState<string[]>([]);
  const [port, setPort] = useState<number>(3000);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [institutionName, setInstitutionName] = useState<string>(state.institution || '');
  const [speechEnabled, setSpeechEnabled] = useState<boolean>(state.speechEnabled ?? false);
  const [chimeEnabled, setChimeEnabled] = useState<boolean>(state.chimeEnabled ?? true);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [resetCategoryStatus, setResetCategoryStatus] = useState<Record<string, boolean>>({});
  const [resetAllSuccess, setResetAllSuccess] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New queue form state
  const [newQueueName, setNewQueueName] = useState<string>('');
  const [newQueueCode, setNewQueueCode] = useState<string>('');
  const [newQueueDesk, setNewQueueDesk] = useState<string>('');
  const [newQueueSpeechText, setNewQueueSpeechText] = useState<string>('');
  const [newNextShortcut, setNewNextShortcut] = useState<string>('');
  const [newPrevShortcut, setNewPrevShortcut] = useState<string>('');
  const [newResetShortcut, setNewResetShortcut] = useState<string>('');

  // Key capture state: target can be 'newNext' | 'newPrev' | 'newReset' | 'existing' | 'resetAll'
  const [capturingTarget, setCapturingTarget] = useState<{
    type: 'newNext' | 'newPrev' | 'newReset' | 'existing' | 'resetAll';
    catId?: string;
    field?: 'next' | 'prev' | 'reset';
  } | null>(null);

  const categories: TicketCategory[] = state.categories && state.categories.length > 0
    ? state.categories
    : [
        { id: 'cat-caf', name: 'Atendimento CAF', code: 'CAF', speechText: 'kaf', defaultDesk: 'Sala 1', nextShortcut: 'ArrowUp', prevShortcut: 'ArrowDown', color: 'blue' },
        { id: 'cat-incra', name: 'Atendimento INCRA', code: 'INCRA', speechText: 'incra', defaultDesk: 'Sala 5', nextShortcut: 'ArrowRight', prevShortcut: 'ArrowLeft', color: 'emerald' }
      ];

  useEffect(() => {
    setInstitutionName(state.institution || '');
    setSpeechEnabled(state.speechEnabled ?? true);
    setChimeEnabled(state.chimeEnabled ?? true);
  }, [state.institution, state.speechEnabled, state.chimeEnabled]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/ip')
        .then((res) => res.json())
        .then((data) => {
          if (data.ips) setIps(data.ips);
          if (data.port) setPort(data.port);
        })
        .catch((err) => console.warn('Failed to fetch local IP:', err));
    }
  }, [isOpen]);

  // Keypress listener for capturing custom shortcuts inside modal
  useEffect(() => {
    if (!capturingTarget) return;

    const handleKeyCapture = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setCapturingTarget(null);
        return;
      }

      const capturedKey = e.key === ' ' ? 'Space' : e.key;

      if (capturingTarget.type === 'newNext') {
        setNewNextShortcut(capturedKey);
      } else if (capturingTarget.type === 'newPrev') {
        setNewPrevShortcut(capturedKey);
      } else if (capturingTarget.type === 'newReset') {
        setNewResetShortcut(capturedKey);
      } else if (capturingTarget.type === 'resetAll') {
        if (updateResetAllShortcut) {
          updateResetAllShortcut(capturedKey);
        }
      } else if (capturingTarget.type === 'existing' && capturingTarget.catId && capturingTarget.field) {
        const fieldKey = capturingTarget.field === 'next' ? 'nextShortcut' : capturingTarget.field === 'prev' ? 'prevShortcut' : 'resetShortcut';
        const updatedList = categories.map((cat) => {
          if (cat.id === capturingTarget.catId) {
            return {
              ...cat,
              [fieldKey]: capturedKey
            };
          }
          return cat;
        });
        if (updateCategories) {
          updateCategories(updatedList);
        }
      }

      setCapturingTarget(null);
    };

    window.addEventListener('keydown', handleKeyCapture, true);
    return () => {
      window.removeEventListener('keydown', handleKeyCapture, true);
    };
  }, [capturingTarget, categories, updateCategories, updateResetAllShortcut]);

  if (!isOpen) return null;

  const handleCopyLink = (url: string, index: number) => {
    navigator.clipboard.writeText(url);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSoundTest = () => {
    triggerSoundAlert(state.currentTicket?.code || '01 CAF', state.currentDesk || 'Sala 1', speechEnabled, chimeEnabled, categories);
  };

  const handleUpdateCategorySpeechText = (catId: string, speechText: string) => {
    const updatedList = categories.map((cat) => {
      if (cat.id === catId) {
        return {
          ...cat,
          speechText
        };
      }
      return cat;
    });
    if (updateCategories) {
      updateCategories(updatedList);
    }
    try {
      localStorage.setItem('queue_categories', JSON.stringify(updatedList));
      fetch('/api/queue/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: updatedList })
      }).catch(() => {});
    } catch {}
  };

  const handleSaveInstitution = () => {
    if (updateInstitution) {
      updateInstitution(institutionName);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const updateServerAudioConfig = (speech: boolean, chime: boolean) => {
    fetch('/api/queue/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speechEnabled: speech, chimeEnabled: chime })
    }).catch(() => {});
  };

  const handleCreateQueue = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!newQueueName.trim() || !newQueueCode.trim()) {
      setFormError('Por favor, informe o nome e o código (sigla) da nova fila.');
      return;
    }

    const codeUpper = newQueueCode.trim().toUpperCase();

    // Check if code already exists
    if (categories.some((c) => c.code.toUpperCase() === codeUpper)) {
      setFormError(`Já existe uma fila com o código "${codeUpper}". Escolha outro código.`);
      return;
    }

    const newCat: TicketCategory = {
      id: `cat-${Date.now()}`,
      name: newQueueName.trim(),
      code: codeUpper,
      speechText: newQueueSpeechText.trim() || undefined,
      defaultDesk: newQueueDesk.trim() || 'Sala 1',
      nextShortcut: newNextShortcut || undefined,
      prevShortcut: newPrevShortcut || undefined,
      resetShortcut: newResetShortcut || undefined,
      color: 'indigo'
    };

    const updatedCategories = [...categories, newCat];
    if (updateCategories) {
      updateCategories(updatedCategories);
    }

    try {
      localStorage.setItem('queue_categories', JSON.stringify(updatedCategories));
      fetch('/api/queue/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: updatedCategories })
      }).catch(() => {});
    } catch {}

    // Reset form
    setNewQueueName('');
    setNewQueueCode('');
    setNewQueueDesk('');
    setNewQueueSpeechText('');
    setNewNextShortcut('');
    setNewPrevShortcut('');
    setNewResetShortcut('');
    setFormError(null);
  };

  const handleClearCategoryShortcut = (catId: string, field: 'next' | 'prev' | 'reset') => {
    const fieldKey = field === 'next' ? 'nextShortcut' : field === 'prev' ? 'prevShortcut' : 'resetShortcut';
    const updatedList = categories.map((cat) => {
      if (cat.id === catId) {
        const copy = { ...cat };
        delete copy[fieldKey];
        return copy;
      }
      return cat;
    });
    if (updateCategories) {
      updateCategories(updatedList);
    }
    try {
      localStorage.setItem('queue_categories', JSON.stringify(updatedList));
      fetch('/api/queue/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: updatedList })
      }).catch(() => {});
    } catch {}
  };

  const handleClearResetAllShortcut = () => {
    if (updateResetAllShortcut) {
      updateResetAllShortcut('');
    }
  };

  const handleDeleteCategory = (catId: string) => {
    const updated = categories.filter((c) => c.id !== catId);
    if (updateCategories) {
      updateCategories(updated);
    }
    try {
      localStorage.setItem('queue_categories', JSON.stringify(updated));
      fetch('/api/queue/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: updated })
      }).catch(() => {});
    } catch {}
  };

  const handleResetSingleQueue = (catCode: string) => {
    if (resetQueue) {
      resetQueue(catCode);
      setResetCategoryStatus(prev => ({ ...prev, [catCode]: true }));
      setTimeout(() => {
        setResetCategoryStatus(prev => ({ ...prev, [catCode]: false }));
      }, 2500);
    }
  };

  const handleResetAllQueues = () => {
    if (resetQueue) {
      resetQueue();
      setResetAllSuccess(true);
      setTimeout(() => {
        setResetAllSuccess(false);
      }, 3000);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-slate-50 text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-[#003A70] text-white p-5 px-6 flex items-center justify-between border-b-4 border-[#0056b3] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#00274d] rounded-xl border border-blue-800 text-blue-200">
              <Sliders className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Painel de Configurações do Sistema
                <span className="text-[11px] font-mono bg-blue-900/80 text-blue-200 border border-blue-700 px-2 py-0.5 rounded-md font-normal">
                  Atalho [P]
                </span>
              </h2>
              <p className="text-xs text-blue-200">
                Gerencie filas de atendimento, atalhos do teclado, áudio e rede local.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-blue-900/50 hover:bg-rose-600 text-blue-100 hover:text-white border border-blue-700 hover:border-rose-500 transition-all cursor-pointer"
            title="Fechar Janela (P ou Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">

          {/* Section 1: Create Queue & Key Shortcut Config (Nova Fila e Atalhos) */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                <ListPlus className="w-4.5 h-4.5 text-blue-600" />
                Criar Nova Fila e Configurar Atalhos de Teclado
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Pressione qualquer tecla para definir o atalho
              </span>
            </div>

            {/* List of Existing Queues & Shortcuts */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Filas Ativas no Sistema:</h4>
              <div className="grid grid-cols-1 gap-3">
                {categories.map((cat) => {
                  const isCapturingNext = capturingTarget?.type === 'existing' && capturingTarget.catId === cat.id && capturingTarget.field === 'next';
                  const isCapturingPrev = capturingTarget?.type === 'existing' && capturingTarget.catId === cat.id && capturingTarget.field === 'prev';
                  const isCapturingReset = capturingTarget?.type === 'existing' && capturingTarget.catId === cat.id && capturingTarget.field === 'reset';

                  return (
                    <div 
                      key={cat.id}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 flex flex-col gap-3 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 bg-blue-600 text-white font-black text-xs rounded-lg font-mono shadow-xs">
                            {cat.code}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{cat.name}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-2">
                              <span>Sala/Guichê padrão: <strong>{cat.defaultDesk || 'Sala 1'}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                          {/* Next Shortcut Button */}
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => setCapturingTarget({ type: 'existing', catId: cat.id, field: 'next' })}
                              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                isCapturingNext 
                                  ? 'bg-amber-500 text-white border-amber-600 animate-pulse ring-2 ring-amber-300' 
                                  : 'bg-white hover:bg-blue-50 text-slate-700 border-slate-300'
                              }`}
                              title={`Configurar tecla para chamar próximo da fila ${cat.code}`}
                            >
                              <Radio className="w-3.5 h-3.5 text-blue-600" />
                              <span>Próximo:</span>
                              <kbd className="px-1.5 py-0.5 bg-slate-100 text-slate-900 border border-slate-300 rounded font-mono text-[11px]">
                                {isCapturingNext ? 'Aguardando...' : formatKeyLabel(cat.nextShortcut)}
                              </kbd>
                            </button>
                            {cat.nextShortcut && (
                              <button
                                type="button"
                                onClick={() => handleClearCategoryShortcut(cat.id, 'next')}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                                title="Remover atalho"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Prev Shortcut Button */}
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => setCapturingTarget({ type: 'existing', catId: cat.id, field: 'prev' })}
                              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                isCapturingPrev 
                                  ? 'bg-amber-500 text-white border-amber-600 animate-pulse ring-2 ring-amber-300' 
                                  : 'bg-white hover:bg-blue-50 text-slate-700 border-slate-300'
                              }`}
                              title={`Configurar tecla para voltar senha da fila ${cat.code}`}
                            >
                              <span>Voltar:</span>
                              <kbd className="px-1.5 py-0.5 bg-slate-100 text-slate-900 border border-slate-300 rounded font-mono text-[11px]">
                                {isCapturingPrev ? 'Aguardando...' : formatKeyLabel(cat.prevShortcut)}
                              </kbd>
                            </button>
                            {cat.prevShortcut && (
                              <button
                                type="button"
                                onClick={() => handleClearCategoryShortcut(cat.id, 'prev')}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                                title="Remover atalho"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Reset Queue Shortcut Button */}
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => setCapturingTarget({ type: 'existing', catId: cat.id, field: 'reset' })}
                              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                isCapturingReset 
                                  ? 'bg-rose-600 text-white border-rose-700 animate-pulse ring-2 ring-rose-300' 
                                  : cat.resetShortcut
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                                    : 'bg-white hover:bg-rose-50/70 text-slate-700 border-slate-300'
                              }`}
                              title={`Configurar tecla de atalho para zerar a fila ${cat.code} (ex: F8, Del, 0)`}
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-rose-600" />
                              <span>Zerar:</span>
                              <kbd className={`px-1.5 py-0.5 border rounded font-mono text-[11px] ${
                                cat.resetShortcut 
                                  ? 'bg-rose-100 text-rose-900 border-rose-300 font-bold' 
                                  : 'bg-slate-100 text-slate-900 border-slate-300'
                              }`}>
                                {isCapturingReset ? 'Aguardando...' : formatKeyLabel(cat.resetShortcut)}
                              </kbd>
                            </button>
                            {cat.resetShortcut && (
                              <button
                                type="button"
                                onClick={() => handleClearCategoryShortcut(cat.id, 'reset')}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                                title="Remover atalho de zeramento"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Delete Custom Queue Button */}
                          {categories.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="Excluir esta fila"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Custom Speech Pronunciation Field */}
                      <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                          <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Como a voz deve falar a fila:</span>
                        </label>
                        <input
                          type="text"
                          value={cat.speechText ?? (cat.code === 'CAF' ? 'kaf' : cat.name)}
                          onChange={(e) => handleUpdateCategorySpeechText(cat.id, e.target.value)}
                          placeholder="Ex: kaf (para falar kaf ao invés de C-A-F)"
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form to Add New Queue */}
            <form onSubmit={handleCreateQueue} className="p-4 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-3">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-600" />
                Cadastrar Nova Fila de Atendimento
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nome da Fila:</label>
                  <input
                    type="text"
                    value={newQueueName}
                    onChange={(e) => setNewQueueName(e.target.value)}
                    placeholder="Ex: Licenciamento Ambiental"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Código / Sigla (Ex: LIC):</label>
                  <input
                    type="text"
                    value={newQueueCode}
                    onChange={(e) => setNewQueueCode(e.target.value)}
                    placeholder="Ex: LIC"
                    maxLength={6}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono text-slate-800 uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Pronúncia da Voz (Como Falar):</label>
                  <input
                    type="text"
                    value={newQueueSpeechText}
                    onChange={(e) => setNewQueueSpeechText(e.target.value)}
                    placeholder="Ex: caf, incra, licenciamento"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Guichê / Sala Padrão:</label>
                  <input
                    type="text"
                    value={newQueueDesk}
                    onChange={(e) => setNewQueueDesk(e.target.value)}
                    placeholder="Ex: Sala 3"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Shortcut Config for New Queue */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Atalho Teclado - Próximo:</label>
                  <button
                    type="button"
                    onClick={() => setCapturingTarget({ type: 'newNext' })}
                    className={`w-full py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                      capturingTarget?.type === 'newNext'
                        ? 'bg-amber-500 text-white border-amber-600 animate-pulse'
                        : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <span>{capturingTarget?.type === 'newNext' ? 'Aguardando tecla...' : 'Capturar Tecla'}</span>
                    <kbd className="px-2 py-0.5 bg-slate-100 text-slate-900 border border-slate-300 rounded font-mono text-[11px]">
                      {newNextShortcut ? formatKeyLabel(newNextShortcut) : 'Nenhum'}
                    </kbd>
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Atalho Teclado - Voltar:</label>
                  <button
                    type="button"
                    onClick={() => setCapturingTarget({ type: 'newPrev' })}
                    className={`w-full py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                      capturingTarget?.type === 'newPrev'
                        ? 'bg-amber-500 text-white border-amber-600 animate-pulse'
                        : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <span>{capturingTarget?.type === 'newPrev' ? 'Aguardando tecla...' : 'Capturar Tecla'}</span>
                    <kbd className="px-2 py-0.5 bg-slate-100 text-slate-900 border border-slate-300 rounded font-mono text-[11px]">
                      {newPrevShortcut ? formatKeyLabel(newPrevShortcut) : 'Nenhum'}
                    </kbd>
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-rose-700 mb-1">Atalho Teclado - Zerar Fila:</label>
                  <button
                    type="button"
                    onClick={() => setCapturingTarget({ type: 'newReset' })}
                    className={`w-full py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                      capturingTarget?.type === 'newReset'
                        ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                        : 'bg-white border-rose-200 text-rose-800 hover:bg-rose-50'
                    }`}
                  >
                    <span>{capturingTarget?.type === 'newReset' ? 'Aguardando tecla...' : 'Capturar Tecla'}</span>
                    <kbd className="px-2 py-0.5 bg-rose-50 text-rose-900 border border-rose-300 rounded font-mono text-[11px]">
                      {newResetShortcut ? formatKeyLabel(newResetShortcut) : 'Nenhum'}
                    </kbd>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar Nova Fila</span>
                </button>
              </div>
            </form>
          </div>
          
          {/* Section 2: Audio Settings */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-blue-600" />
                Preferências de Alerta Sonoro
              </h3>

              <button
                onClick={handleSoundTest}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Testar Som
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-blue-50/50 transition-all">
                <div>
                  <div className="font-bold text-slate-900 text-sm">Toque de Sino (Chime)</div>
                  <div className="text-xs text-slate-500">Toca efeito sonoro de campainha ao chamar senha</div>
                </div>
                <input
                  type="checkbox"
                  checked={chimeEnabled}
                  onChange={(e) => {
                    setChimeEnabled(e.target.checked);
                    updateServerAudioConfig(speechEnabled, e.target.checked);
                  }}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
              </label>

              <label className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-blue-50/50 transition-all">
                <div>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <span>Voz Sintetizada Feminina (PT-BR)</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Chamada por voz feminina em português (ex: "Senha 01 caf, Sala 1") respeitando a pronúncia configurada.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={speechEnabled}
                  onChange={(e) => {
                    setSpeechEnabled(e.target.checked);
                    updateServerAudioConfig(e.target.checked, chimeEnabled);
                  }}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Section 3: Institution Data */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              Nome da Instituição / Órgão
            </h3>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="Ex: Secretaria de Desenvolvimento Agropecuário"
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
              <button
                onClick={handleSaveInstitution}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Salvo!</span>
                  </>
                ) : (
                  <span>Salvar Nome</span>
                )}
              </button>
            </div>
          </div>

          {/* Section 4: Queue Resets, Shortcuts & Schedule */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-600" />
                Zeramento de Filas e Botão de Reset Geral
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Zere contadores para 00 e configure as teclas de reset
              </span>
            </div>

            {/* General Reset Keyboard Shortcut Config Box */}
            <div className="p-3.5 bg-rose-50/70 border border-rose-200/90 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                  <Keyboard className="w-4 h-4 text-rose-600" />
                  <span>Configurar Tecla para Reset Geral de Todas as Filas:</span>
                </div>
                <div className="text-[11px] text-rose-800">
                  Ao pressionar esta tecla no teclado (fora de formulários), todas as filas serão zeradas para 00 instantaneamente.
                </div>
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setCapturingTarget({ type: 'resetAll' })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    capturingTarget?.type === 'resetAll'
                      ? 'bg-rose-600 text-white border-rose-700 animate-pulse ring-2 ring-rose-300'
                      : state.resetAllShortcut
                        ? 'bg-white text-rose-900 border-rose-300 hover:bg-rose-100'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                  title="Clique para capturar a tecla de reset geral (ex: F12, Delete, R)"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-rose-600" />
                  <span>{capturingTarget?.type === 'resetAll' ? 'Pressione a tecla...' : 'Tecla de Reset Geral:'}</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 text-slate-900 border border-slate-300 rounded font-mono text-[11px] font-bold">
                    {capturingTarget?.type === 'resetAll' ? '...' : formatKeyLabel(state.resetAllShortcut)}
                  </kbd>
                </button>
                {state.resetAllShortcut && (
                  <button
                    type="button"
                    onClick={handleClearResetAllShortcut}
                    className="p-1.5 text-rose-600 hover:bg-rose-200/80 rounded-lg transition-all cursor-pointer"
                    title="Remover tecla de reset geral"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Reset Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {categories.map((cat) => {
                const isSuccess = resetCategoryStatus[cat.code];
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleResetSingleQueue(cat.code)}
                    className={`p-3.5 rounded-xl font-bold text-xs flex flex-col gap-1.5 transition-all cursor-pointer border text-left ${
                      isSuccess
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-200'
                        : 'bg-rose-50 hover:bg-rose-100/90 text-rose-800 border-rose-200 active:scale-[0.98]'
                    }`}
                    title={`Zerar contador da fila ${cat.code} para 0`}
                  >
                    <div className="flex items-center justify-between w-full">
                      {isSuccess ? (
                        <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                          <Check className="w-4 h-4 text-emerald-600" />
                          Fila {cat.code} Zerada!
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 text-rose-500" />
                          <span>Zerar Fila {cat.code}</span>
                        </span>
                      )}
                      <span className="font-mono text-[10px] bg-rose-200/80 text-rose-900 px-1.5 py-0.5 rounded font-black">00</span>
                    </div>

                    <div className="text-[10px] text-slate-500 font-normal flex items-center justify-between pt-1 border-t border-rose-100/80">
                      <span>Atalho teclado:</span>
                      <kbd className="px-1.5 py-0.2 bg-white text-slate-700 border border-slate-200 rounded font-mono text-[10px]">
                        {formatKeyLabel(cat.resetShortcut)}
                      </kbd>
                    </div>
                  </button>
                );
              })}

              {/* Prominent General Reset Button */}
              <button
                type="button"
                onClick={handleResetAllQueues}
                className={`p-4 rounded-xl font-bold text-xs flex flex-col sm:flex-row items-center justify-between gap-3 transition-all shadow-xs cursor-pointer col-span-1 sm:col-span-3 active:scale-[0.99] border ${
                  resetAllSuccess
                    ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-300'
                    : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700'
                }`}
                title="Botão para reset geral: Zerar todos os contadores para 0, limpar histórico e exibir 00 no painel"
              >
                <div className="flex items-center gap-2.5">
                  {resetAllSuccess ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <RefreshCw className="w-5 h-5 text-white" />
                  )}
                  <div className="text-left">
                    <div className="text-sm font-extrabold">
                      {resetAllSuccess 
                        ? 'Todas as Filas Foram Zeradas com Sucesso!' 
                        : 'Botão de Reset Geral: Zerar Todas as Filas do Dia'}
                    </div>
                    <div className="text-[11px] text-rose-100 font-normal">
                      {resetAllSuccess 
                        ? 'Contadores reiniciados em 00 e histórico limpo.' 
                        : 'Zera todas as filas imediatamente, limpa o histórico de chamadas e exibe 00.'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] bg-rose-800/80 text-rose-100 px-2.5 py-1 rounded-lg border border-rose-500/50 font-mono">
                    Tecla: {formatKeyLabel(state.resetAllShortcut)}
                  </span>
                  <span className="px-3 py-1 bg-white text-rose-700 font-black rounded-lg text-xs shadow-xs">
                    Zerar Tudo (00)
                  </span>
                </div>
              </button>
            </div>

            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 text-xs flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600 shrink-0" />
              <div className="space-y-0.5">
                <div>
                  <strong>Reset Automático Configurado (Brasília):</strong> As filas são zeradas automaticamente pelo sistema todos os dias em 3 horários:
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-blue-900 pt-0.5 font-medium">
                  <span>• <strong>08:00h</strong> (Início do expediente)</span>
                  <span>• <strong>12:00h</strong> (Intervalo de almoço)</span>
                  <span>• <strong>17:00h</strong> (Encerramento do expediente / noite)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Local Network Connection Links */}
          <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-5 rounded-2xl shadow-md border border-blue-800 space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-blue-800/80">
              <Wifi className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold">Endereço de Conexão em Rede Local (TV & Dispositivos)</h3>
                <p className="text-[11px] text-blue-200">
                  Acesse este IP para conectar a TV da Recepção ou outros computadores na mesma rede.
                </p>
              </div>
            </div>

            {ips.length > 0 ? (
              <div className="space-y-2">
                {ips.map((ip, idx) => {
                  const tvUrl = `http://${ip}:${port}/?view=tv`;
                  return (
                    <div 
                      key={ip}
                      className="bg-blue-950/80 p-3 rounded-xl border border-blue-700/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                    >
                      <div className="font-mono text-xs text-white font-bold">
                        {tvUrl}
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleCopyLink(tvUrl, idx)}
                          className="px-3 py-1.5 bg-blue-800 hover:bg-blue-700 text-white text-xs font-bold rounded-lg border border-blue-600 flex items-center gap-1 transition-all cursor-pointer"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Link</span>
                            </>
                          )}
                        </button>

                        <a
                          href={`/?view=tv`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Abrir TV</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-blue-950/80 p-3 rounded-xl border border-blue-700 text-xs text-blue-200">
                Link da TV: <code className="font-mono text-white font-bold">{window.location.origin}/?view=tv</code>
              </div>
            )}
          </div>

          {/* Section 6: Keyboard Shortcuts Reference */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-blue-600" />
              Guia de Atalhos Rápidos do Teclado
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {categories.map((cat) => (
                <React.Fragment key={cat.id}>
                  {cat.nextShortcut && (
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-700 font-medium">Chamar Próxima {cat.code} ({cat.defaultDesk || 'Sala 1'})</span>
                      <kbd className="px-2 py-0.5 bg-blue-600 text-white font-bold rounded border border-blue-400">
                        {formatKeyLabel(cat.nextShortcut)}
                      </kbd>
                    </div>
                  )}

                  {cat.prevShortcut && (
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-700 font-medium">Voltar Senha {cat.code}</span>
                      <kbd className="px-2 py-0.5 bg-blue-600 text-white font-bold rounded border border-blue-400">
                        {formatKeyLabel(cat.prevShortcut)}
                      </kbd>
                    </div>
                  )}
                </React.Fragment>
              ))}

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700 font-medium">Repetir Chamada</span>
                <kbd className="px-2 py-0.5 bg-blue-600 text-white font-bold rounded border border-blue-400">Espaço</kbd>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700 font-medium">Abrir / Fechar Configurações</span>
                <kbd className="px-2 py-0.5 bg-indigo-600 text-white font-bold rounded border border-indigo-400">Tecla P</kbd>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2 font-mono">
            <kbd className="px-2 py-0.5 bg-white border border-slate-300 rounded shadow-xs font-bold text-slate-700">P</kbd>
            <span>ou</span>
            <kbd className="px-2 py-0.5 bg-white border border-slate-300 rounded shadow-xs font-bold text-slate-700">Esc</kbd>
            <span>para fechar</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Fechar Janela
          </button>
        </div>

      </div>
    </div>
  );
};
