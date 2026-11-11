import React, { useState, useEffect, useRef } from 'react';
import { QueueState, TicketCategory } from '../types';
import { Megaphone, X, Volume2, Building2, Check, ArrowRight, Layers } from 'lucide-react';
import { triggerSoundAlert } from '../utils/sound';

interface DirectCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: QueueState;
  callDirect: (category: string, number: number | string, desk?: string) => void;
}

export const DirectCallModal: React.FC<DirectCallModalProps> = ({
  isOpen,
  onClose,
  state,
  callDirect,
}) => {
  const categories: TicketCategory[] = state.categories && state.categories.length > 0
    ? state.categories
    : [
        { id: 'cat-caf', name: 'Atendimento CAF', code: 'CAF', speechText: 'kaf', defaultDesk: 'Sala 1' },
        { id: 'cat-incra', name: 'Atendimento INCRA', code: 'INCRA', speechText: 'incra', defaultDesk: 'Sala 5' }
      ];

  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string>('CAF');
  const [ticketNumberInput, setTicketNumberInput] = useState<string>('');
  const [selectedDesk, setSelectedDesk] = useState<string>('Sala 1');
  const [isCustomDesk, setIsCustomDesk] = useState<boolean>(false);
  const [customDeskInput, setCustomDeskInput] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize form whenever modal opens
  useEffect(() => {
    if (isOpen) {
      // Pick first active category or currently active category
      const initialCat = (state.activeCategory && state.activeCategory !== 'TODAS')
        ? state.activeCategory
        : (categories[0]?.code || 'CAF');
      
      setSelectedCategoryCode(initialCat);

      const matched = categories.find(c => c.code.toUpperCase() === initialCat.toUpperCase());
      const defDesk = matched?.defaultDesk || state.currentDesk || 'Sala 1';
      setSelectedDesk(defDesk);
      setIsCustomDesk(false);
      setCustomDeskInput('');

      // Suggest next number based on counter, or blank for operator to type
      const currentCount = state.counters[initialCat] || 0;
      const nextNum = currentCount + 1;
      setTicketNumberInput(String(nextNum));

      // Auto-focus and select input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, state.activeCategory, state.currentDesk, state.counters]);

  // Update desk when category changes
  const handleSelectCategory = (code: string) => {
    setSelectedCategoryCode(code);
    const matched = categories.find(c => c.code.toUpperCase() === code.toUpperCase());
    if (matched?.defaultDesk) {
      setSelectedDesk(matched.defaultDesk);
      setIsCustomDesk(false);
    }
    const currentCount = state.counters[code] || 0;
    setTicketNumberInput(String(currentCount + 1));
    inputRef.current?.focus();
    inputRef.current?.select();
  };

  if (!isOpen) return null;

  const currentCategory = categories.find(c => c.code.toUpperCase() === selectedCategoryCode.toUpperCase()) || {
    id: 'unknown',
    name: selectedCategoryCode,
    code: selectedCategoryCode,
    speechText: selectedCategoryCode.toLowerCase(),
    defaultDesk: 'Sala 1'
  };

  const parsedNum = parseInt(ticketNumberInput.replace(/\D/g, ''), 10) || 1;
  const formattedDisplayNum = parsedNum < 10 ? `0${parsedNum}` : `${parsedNum}`;
  const displayCode = `${formattedDisplayNum} ${selectedCategoryCode}`;
  const finalDesk = isCustomDesk && customDeskInput.trim() ? customDeskInput.trim() : selectedDesk;

  // Speech pronunciation preview text
  const speechPronounce = currentCategory.speechText || currentCategory.name || selectedCategoryCode.toLowerCase();

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ticketNumberInput.trim()) return;

    callDirect(selectedCategoryCode, parsedNum, finalDesk);

    // Also trigger sound on local client immediately for snappy feedback
    triggerSoundAlert(
      displayCode,
      finalDesk,
      state.speechEnabled,
      state.chimeEnabled,
      categories
    );

    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="relative w-full max-w-lg bg-slate-50 text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-[#003A70] text-white p-5 px-6 flex items-center justify-between border-b-4 border-[#0056b3] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#00274d] rounded-xl border border-blue-800 text-blue-200">
              <Megaphone className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Chamada Direta de Senha
                <span className="px-2 py-0.5 text-[11px] bg-amber-400 text-slate-950 rounded-full font-black uppercase tracking-wider">
                  Atalho: Tecla D
                </span>
              </h2>
              <p className="text-xs text-blue-100/90 mt-0.5">
                Digite o número da senha e chame imediatamente no painel e no áudio.
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Step 1: Category Selection */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                1. Selecione a Fila / Categoria
              </span>
              <span className="text-[11px] font-normal text-slate-400">
                {categories.length} filas cadastradas
              </span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => {
                const isSelected = selectedCategoryCode.toUpperCase() === cat.code.toUpperCase();
                const counter = state.counters[cat.code] || 0;
                return (
                  <button
                    type="button"
                    key={cat.id || cat.code}
                    onClick={() => handleSelectCategory(cat.code)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#003A70] text-white border-[#003A70] shadow-md ring-2 ring-blue-400/40'
                        : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-black text-sm">{cat.code}</span>
                      {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <span className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                      {cat.name}
                    </span>
                    <span className={`text-[9px] font-mono mt-1 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                      Atual: #{counter} {cat.defaultDesk ? `• ${cat.defaultDesk}` : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Ticket Number Input */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                Digite o Número da Senha
              </span>
              <span className="text-[11px] font-normal text-slate-400">
                Ex: 05, 12, 104
              </span>
            </label>

            <div className="flex items-center justify-center gap-3 my-2">
              <button
                type="button"
                onClick={() => setTicketNumberInput(String(Math.max(1, parsedNum - 1)))}
                className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xl flex items-center justify-center border border-slate-300 transition-all active:scale-95"
                title="Diminuir"
              >
                -
              </button>

              <div className="relative flex-1 max-w-[200px]">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={ticketNumberInput}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    setTicketNumberInput(clean);
                  }}
                  placeholder="00"
                  className="w-full text-center text-4xl sm:text-5xl font-black text-[#003A70] py-2 px-3 border-2 border-blue-400 rounded-2xl bg-blue-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 tracking-wider shadow-inner"
                />
              </div>

              <button
                type="button"
                onClick={() => setTicketNumberInput(String(parsedNum + 1))}
                className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xl flex items-center justify-center border border-slate-300 transition-all active:scale-95"
                title="Aumentar"
              >
                +
              </button>
            </div>
          </div>

          {/* Step 3: Desk / Sala Selection */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                3. Sala / Guichê do Atendimento
              </span>
              <button
                type="button"
                onClick={() => setIsCustomDesk(!isCustomDesk)}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
              >
                {isCustomDesk ? 'Escolher da lista' : 'Digitar outra sala...'}
              </button>
            </label>

            {isCustomDesk ? (
              <input
                type="text"
                value={customDeskInput}
                onChange={(e) => setCustomDeskInput(e.target.value)}
                placeholder="Ex: Sala 3 ou Gabinete"
                className="w-full px-3.5 py-2.5 bg-white border border-blue-400 rounded-xl text-slate-800 font-bold text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            ) : (
              <select
                value={selectedDesk}
                onChange={(e) => setSelectedDesk(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 font-bold text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            )}
          </div>

          {/* Visual Preview Box */}
          <div className="p-4 bg-gradient-to-r from-blue-900 to-[#003A70] rounded-2xl text-white shadow-md flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-blue-200 mb-0.5">
                Como aparecerá na TV:
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {displayCode}
              </div>
              <div className="text-xs text-blue-200 font-medium mt-0.5">
                Local: <strong className="text-white">{finalDesk}</strong>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block bg-blue-800/90 text-blue-100 border border-blue-700 text-[10px] font-semibold px-2.5 py-1 rounded-full mb-1">
                Áudio de voz
              </span>
              <p className="text-[11px] text-blue-200 italic max-w-[150px]">
                "Senha {parsedNum} {speechPronounce}, {finalDesk}"
              </p>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-lg rounded-2xl shadow-xl border border-emerald-400/50 transition-all active:scale-[0.98] flex items-center justify-center gap-2 ring-4 ring-emerald-200/50"
          >
            <Volume2 className="w-5 h-5 text-white animate-pulse" />
            <span>CHAMAR SENHA AGORA (ENTER)</span>
            <ArrowRight className="w-5 h-5 text-white/80" />
          </button>

          <p className="text-center text-[11px] text-slate-400 font-medium">
            Pressione <strong>Enter</strong> para chamar ou <strong>Esc</strong> para fechar
          </p>

        </form>

      </div>
    </div>
  );
};
