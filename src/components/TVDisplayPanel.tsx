import React, { useEffect, useState, useRef } from 'react';
import { QueueState, TicketCategory } from '../types';
import { Maximize2, Minimize2, Volume2, Shield, Clock, VolumeX, Moon, RefreshCw } from 'lucide-react';
import { triggerSoundAlert } from '../utils/sound';
import { SettingsModal } from './SettingsModal';
import { DirectCallModal } from './DirectCallModal';

interface TVDisplayPanelProps {
  state: QueueState;
  callNext?: (desk?: string, category?: string) => void;
  callPrev?: (desk?: string, category?: string) => void;
  callDirect?: (category: string, number: number | string, desk?: string) => void;
  recallCurrent?: () => void;
  resetQueue?: (category?: string) => void;
  updateInstitution?: (name: string) => void;
  updateCategories?: (categories: TicketCategory[]) => void;
  updateResetAllShortcut?: (shortcut: string) => void;
  onSwitchView?: () => void;
}

export const TVDisplayPanel: React.FC<TVDisplayPanelProps> = ({ 
  state,
  callNext,
  callPrev,
  callDirect,
  recallCurrent,
  resetQueue,
  updateInstitution,
  updateCategories,
  updateResetAllShortcut,
  onSwitchView
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [audioActivated, setAudioActivated] = useState<boolean>(true);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showDirectCallModal, setShowDirectCallModal] = useState<boolean>(false);
  const [timeString, setTimeString] = useState<string>('');
  const [dateString, setDateString] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [showControls, setShowControls] = useState<boolean>(false);
  const [resetToast, setResetToast] = useState<string | null>(null);
  const toastTimerRef = useRef<any>(null);

  const showToastNotification = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setResetToast(msg);
    toastTimerRef.current = setTimeout(() => {
      setResetToast(null);
    }, 3500);
  };

  const lastTokenRef = useRef<number>(state.soundAlertToken);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastActionTimeRef = useRef<number>(0);

  // Synchronized refs to guarantee zero stale closures when new queues are added
  const stateRef = useRef(state);
  const categoriesRef = useRef(state.categories);
  const callNextRef = useRef(callNext);
  const callPrevRef = useRef(callPrev);
  const recallCurrentRef = useRef(recallCurrent);
  const resetQueueRef = useRef(resetQueue);

  useEffect(() => {
    stateRef.current = state;
    categoriesRef.current = state.categories;
    callNextRef.current = callNext;
    callPrevRef.current = callPrev;
    recallCurrentRef.current = recallCurrent;
    resetQueueRef.current = resetQueue;
  });

  // Live Clock update (Brasilia Time)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDate(now);
      setTimeString(now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateString(now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute Brasilia hours and minutes for accurate shift transitions
  const getBrasiliaTime = (date: Date) => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      });
      const parts = formatter.formatToParts(date);
      let h = date.getHours();
      let m = date.getMinutes();
      parts.forEach(p => {
        if (p.type === 'hour') h = parseInt(p.value, 10) % 24;
        if (p.type === 'minute') m = parseInt(p.value, 10);
      });
      return { hours: h, minutes: m };
    } catch {
      return { hours: date.getHours(), minutes: date.getMinutes() };
    }
  };

  const { hours, minutes } = getBrasiliaTime(currentDate);
  const totalMin = hours * 60 + minutes;

  // Active operating period flags (Brasilia Time)
  const isLunchPeriod = totalMin >= 720 && totalMin <= 839; // 12:00 PM to 13:59 PM
  const isClosedPeriod = totalMin >= 1020 || totalMin < 480; // 17:00 PM to 07:59 AM
  const hasActiveCalledTicket = Boolean(state.currentTicket && state.currentTicket.number > 0);

  // Dynamic time-based status for clock widget
  const getClockStatus = () => {
    if (isLunchPeriod) {
      return {
        bgClass: 'bg-slate-700 border-slate-500 text-slate-100 shadow-md',
        iconClass: 'text-amber-300',
        subText: 'Reabertura às 14:00',
        subClass: 'text-amber-300 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider bg-slate-900/80 px-2 py-0.5 rounded-md mt-1 inline-block'
      };
    }

    if (isClosedPeriod) {
      return {
        bgClass: 'bg-slate-800 border-slate-600 text-slate-100 shadow-md',
        iconClass: 'text-amber-400',
        subText: 'Reabertura às 08:00',
        subClass: 'text-amber-400 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider bg-slate-950/80 px-2 py-0.5 rounded-md mt-1 inline-block'
      };
    }

    // 11:35 AM (695 min) to 11:59 AM (719 min) -> Limite de atendimento (RED)
    if (totalMin >= 695 && totalMin <= 719) {
      return {
        bgClass: 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-950/50 animate-pulse',
        iconClass: 'text-white animate-bounce',
        subText: 'Limite de atendimento',
        subClass: 'text-white font-black text-[10px] sm:text-[11px] uppercase tracking-wider bg-red-800/80 px-2 py-0.5 rounded-md mt-1 inline-block'
      };
    }

    // Near 5:00 PM (16:35 PM / 995 min to 16:59 PM / 1019 min) -> Limite de atendimento (RED)
    if (totalMin >= 995 && totalMin <= 1019) {
      return {
        bgClass: 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-950/50 animate-pulse',
        iconClass: 'text-white animate-bounce',
        subText: 'Limite de atendimento',
        subClass: 'text-white font-black text-[10px] sm:text-[11px] uppercase tracking-wider bg-red-800/80 px-2 py-0.5 rounded-md mt-1 inline-block'
      };
    }

    // Normal operating hours
    return {
      bgClass: 'bg-[#00274d] border-blue-800 text-white shadow-inner',
      iconClass: 'text-blue-300',
      subText: dateString,
      subClass: 'text-blue-300 font-semibold text-[10px] sm:text-[11px] capitalize truncate mt-0.5'
    };
  };

  const clockStatus = getClockStatus();

  // Robust shortcut matcher (handles key, code, numpad, case-insensitivity, space)
  const matchShortcut = (shortcut: string | undefined, e: KeyboardEvent): boolean => {
    if (!shortcut) return false;
    const s = shortcut.trim();
    if (!s) return false;

    // Direct match
    if (e.key === s || e.code === s) return true;

    const sLower = s.toLowerCase();
    const keyLower = e.key.toLowerCase();
    const codeLower = e.code.toLowerCase();

    if (sLower === keyLower || sLower === codeLower) return true;

    // Spacebar match
    if (sLower === 'space' && (e.key === ' ' || e.code === 'Space')) return true;

    // Number matching (e.g. shortcut "1" matches "1", "Digit1" or "Numpad1")
    if (/^\d$/.test(s)) {
      if (e.key === s || e.code === `Digit${s}` || e.code === `Numpad${s}`) return true;
    }

    return false;
  };

  // Global Keyboard Shortcuts Listener (All menus are hidden and accessed via key shortcuts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key repeats from holding down a key (prevents skipping numbers / calling multiple times)
      if (e.repeat) {
        return;
      }

      // Ignore shortcut keys when typing inside an input field, select or textarea
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement || 
        target instanceof HTMLTextAreaElement || 
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        if (e.key === 'Escape') {
          setShowSettingsModal(false);
          setShowDirectCallModal(false);
        }
        return;
      }

      // Auto enable audio context on any key press
      if (!audioActivated) {
        setAudioActivated(true);
      }

      // Hidden Menu 1: Settings ('P' or 'p')
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setShowSettingsModal((prev) => !prev);
        return;
      } 
      
      // Hidden Menu 2: Direct Call ('D' or 'd' or 'C' or 'c')
      if (e.key === 'd' || e.key === 'D' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setShowDirectCallModal((prev) => !prev);
        return;
      } 
      
      // Close open modals on Escape
      if (e.key === 'Escape') {
        setShowSettingsModal(false);
        setShowDirectCallModal(false);
        return;
      }

      // Don't trigger queue shortcuts if a modal is currently open
      if (showSettingsModal || showDirectCallModal) return;

      // Spacebar to repeat current ticket call
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        const now = Date.now();
        if (now - lastActionTimeRef.current < 450) return;
        lastActionTimeRef.current = now;

        if (recallCurrentRef.current) {
          recallCurrentRef.current();
        } else if (
          stateRef.current.currentTicket && 
          stateRef.current.currentTicket.number > 0 && 
          !stateRef.current.currentTicket.code.startsWith('00')
        ) {
          triggerSoundAlert(
            stateRef.current.currentTicket.code,
            stateRef.current.currentTicket.desk || stateRef.current.currentDesk || 'Sala 1',
            stateRef.current.speechEnabled,
            stateRef.current.chimeEnabled,
            categoriesRef.current || stateRef.current.categories
          );
        }
        return;
      }

      // Dynamic Shortcuts from live configured categories
      // Read immediately from categoriesRef.current so newly created queues work instantly!
      let activeCategories = categoriesRef.current;
      if (!activeCategories || activeCategories.length === 0) {
        activeCategories = stateRef.current.categories;
      }
      if (!activeCategories || activeCategories.length === 0) {
        try {
          const cached = localStorage.getItem('queue_categories');
          if (cached) activeCategories = JSON.parse(cached);
        } catch {}
      }
      if (!activeCategories || activeCategories.length === 0) {
        activeCategories = [
          { id: 'cat-caf', name: 'Atendimento CAF', code: 'CAF', defaultDesk: 'Sala 1', nextShortcut: 'ArrowUp', prevShortcut: 'ArrowDown' },
          { id: 'cat-incra', name: 'Atendimento INCRA', code: 'INCRA', defaultDesk: 'Sala 5', nextShortcut: 'ArrowRight', prevShortcut: 'ArrowLeft' }
        ];
      }

      // Check General Reset Keyboard Shortcut (Zerar Todas as Filas)
      const resetAllKey = stateRef.current.resetAllShortcut;
      if (resetAllKey && matchShortcut(resetAllKey, e)) {
        e.preventDefault();
        const now = Date.now();
        if (now - lastActionTimeRef.current < 450) return;
        lastActionTimeRef.current = now;

        if (resetQueueRef.current) {
          resetQueueRef.current();
          showToastNotification('Todas as filas foram zeradas com sucesso (Painel em 00)!');
        }
        return;
      }

      for (const cat of activeCategories) {
        if (cat.nextShortcut && matchShortcut(cat.nextShortcut, e)) {
          e.preventDefault();
          const now = Date.now();
          if (now - lastActionTimeRef.current < 450) return;
          lastActionTimeRef.current = now;

          if (callNextRef.current) {
            const cleanCode = (cat.code || '').trim().toUpperCase();
            callNextRef.current(cat.defaultDesk || stateRef.current.currentDesk || 'Sala 1', cleanCode);
          }
          return;
        }
        if (cat.prevShortcut && matchShortcut(cat.prevShortcut, e)) {
          e.preventDefault();
          const now = Date.now();
          if (now - lastActionTimeRef.current < 450) return;
          lastActionTimeRef.current = now;

          if (callPrevRef.current) {
            const cleanCode = (cat.code || '').trim().toUpperCase();
            callPrevRef.current(cat.defaultDesk || stateRef.current.currentDesk || 'Sala 1', cleanCode);
          }
          return;
        }
        if (cat.resetShortcut && matchShortcut(cat.resetShortcut, e)) {
          e.preventDefault();
          const now = Date.now();
          if (now - lastActionTimeRef.current < 450) return;
          lastActionTimeRef.current = now;

          if (resetQueueRef.current) {
            const cleanCode = (cat.code || '').trim().toUpperCase();
            resetQueueRef.current(cleanCode);
            showToastNotification(`Fila ${cleanCode} foi zerada para 00!`);
          }
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audioActivated, showSettingsModal, showDirectCallModal, state.categories, state.resetAllShortcut]);


  // Trigger sound when soundAlertToken increments
  useEffect(() => {
    if (state.soundAlertToken > lastTokenRef.current) {
      lastTokenRef.current = state.soundAlertToken;
      if (
        state.currentTicket && 
        state.currentTicket.number > 0 && 
        !state.currentTicket.code.startsWith('00')
      ) {
        triggerSoundAlert(
          state.currentTicket.code, 
          state.currentTicket.desk || state.currentDesk || 'Sala 1',
          state.speechEnabled,
          state.chimeEnabled,
          state.categories
        );
      }
    }
  }, [state.soundAlertToken, state.currentTicket, state.currentDesk, state.speechEnabled, state.chimeEnabled, state.categories]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleActivateAudio = () => {
    setAudioActivated(true);
    triggerSoundAlert(state.currentTicket?.code || '01 CAF', state.currentTicket?.desk || 'Sala 1', false, true);
  };

  return (
    <div 
      ref={containerRef}
      className={`min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between font-sans selection:bg-blue-200 overflow-hidden ${
        isFullscreen ? 'p-4 sm:p-8 bg-[#f8fafc]' : 'p-4 sm:p-6'
      }`}
    >
      
      {/* Sleek Header Bar */}
      <header className="bg-[#003A70] text-white rounded-2xl p-5 sm:p-6 shadow-xl border-b-[8px] border-[#0056b3] flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white flex items-center justify-center font-black text-[#003A70] text-xl sm:text-2xl shadow-md border border-blue-100 shrink-0">
            SB
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white uppercase leading-tight">
              Secretaria de Desenvolvimento Agropecuário
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-blue-100 tracking-wider uppercase mt-0.5">
              Prefeitura de Senhor do Bonfim
            </p>
          </div>
        </div>

        {/* Date, Time & Controls */}
        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
          
          {/* Live Clock Display - Fits cleanly inside with dynamic status indicators */}
          <div className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl border text-center sm:text-right transition-all duration-300 shrink-0 min-w-[130px] sm:min-w-[170px] ${clockStatus.bgClass}`}>
            <div className="text-lg sm:text-2xl lg:text-3xl font-black font-mono text-white tracking-wider flex items-center justify-center sm:justify-end gap-1.5 sm:gap-2 whitespace-nowrap">
              <Clock className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${clockStatus.iconClass}`} />
              <span>{timeString}</span>
            </div>
            <div className={clockStatus.subClass}>
              {clockStatus.subText}
            </div>
          </div>

          {/* Audio State Toggle Button */}
          <button
            onClick={handleActivateAudio}
            className={`px-3.5 sm:px-4 py-2 sm:py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shrink-0 ${
              audioActivated 
                ? 'bg-emerald-600 text-white border border-emerald-400' 
                : 'bg-amber-400 hover:bg-amber-500 text-slate-950 font-black animate-bounce'
            }`}
          >
            {audioActivated ? (
              <>
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-100" />
                <span className="hidden xs:inline">Som Ativo 🔔</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
                <span>Ativar Som 🔊</span>
              </>
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 sm:p-3 bg-[#00274d] hover:bg-[#0056b3] text-white rounded-xl border border-blue-800 transition-all shadow-md shrink-0"
            title="Tela Cheia (Fullscreen)"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <Maximize2 className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

        </div>

      </header>

      {/* Main Display Area (Sleek Interface Ticket Card) */}
      <main className="my-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1">
        
        {/* Main Current Password Display Card (8 cols) */}
        {isLunchPeriod && !hasActiveCalledTicket ? (
          <div className="lg:col-span-8 bg-slate-100/90 rounded-[40px] p-8 sm:p-12 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.12)] border-2 border-slate-300 flex flex-col items-center justify-center text-center relative overflow-hidden transition-all duration-300">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-200 border border-slate-300 flex items-center justify-center mb-6 shadow-inner">
              <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600 animate-pulse" />
            </div>

            <span className="px-5 py-2 bg-slate-200 text-slate-700 font-extrabold text-xs sm:text-sm rounded-full uppercase tracking-widest mb-4 border border-slate-300 shadow-2xs">
              Intervalo de Almoço
            </span>

            <div className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-800 tracking-tight my-2 uppercase drop-shadow-xs">
              Reabertura às 14:00
            </div>

            <p className="text-sm sm:text-base lg:text-lg font-medium text-slate-600 max-w-lg mt-4 leading-relaxed">
              Atendimentos suspensos para o horário de almoço. Retornaremos com as chamadas a partir das 14:00.
            </p>
          </div>
        ) : isClosedPeriod && !hasActiveCalledTicket ? (
          <div className="lg:col-span-8 bg-slate-100/90 rounded-[40px] p-8 sm:p-12 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.12)] border-2 border-slate-300 flex flex-col items-center justify-center text-center relative overflow-hidden transition-all duration-300">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-200 border border-slate-300 flex items-center justify-center mb-6 shadow-inner">
              <Moon className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600" />
            </div>

            <span className="px-5 py-2 bg-slate-200 text-slate-700 font-extrabold text-xs sm:text-sm rounded-full uppercase tracking-widest mb-4 border border-slate-300 shadow-2xs">
              Expediente Encerrado
            </span>

            <div className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-800 tracking-tight my-2 uppercase drop-shadow-xs">
              Reabertura às 08:00
            </div>

            <p className="text-sm sm:text-base lg:text-lg font-medium text-slate-600 max-w-lg mt-4 leading-relaxed">
              Atendimento encerrado por hoje. O painel e a chamada de senhas retornarão no próximo expediente às 08:00.
            </p>
          </div>
        ) : (
          <div className="lg:col-span-8 bg-white rounded-[40px] p-8 sm:p-12 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] border border-[#edf2f7] flex flex-col items-center justify-center text-center relative overflow-hidden">
            
            <div className="text-xl sm:text-2xl font-semibold uppercase tracking-[4px] text-[#003A70] mb-1">
              Senha
            </div>

            {state.currentTicket ? (
              <div className="w-full flex flex-col items-center justify-center my-2">
                
                {/* Huge Ticket Number */}
                <div className="text-7xl sm:text-9xl lg:text-[160px] font-extrabold text-[#003A70] leading-none tracking-tight my-2 drop-shadow-xs">
                  {state.currentTicket.code}
                </div>

                {/* Category & Desk Badge */}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                  <div className="bg-[#003A70] text-white px-8 py-3.5 rounded-full text-2xl sm:text-3xl font-bold shadow-lg">
                    {state.currentTicket.category}
                  </div>

                  <div className="bg-[#0056b3] text-white px-8 py-3.5 rounded-full text-2xl sm:text-3xl font-bold shadow-lg">
                    {state.currentTicket.desk || state.currentDesk}
                  </div>
                </div>

              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-center my-2">
                <div className="text-7xl sm:text-9xl lg:text-[160px] font-extrabold text-[#003A70] leading-none tracking-tight my-2 drop-shadow-xs font-mono">
                  00
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                  <div className="bg-[#003A70] text-white px-8 py-3.5 rounded-full text-2xl sm:text-3xl font-bold shadow-lg">
                    FILAS ZERADAS
                  </div>
                  <div className="bg-[#0056b3] text-white px-8 py-3.5 rounded-full text-2xl sm:text-3xl font-bold shadow-lg">
                    {state.currentDesk || 'Sala 1'}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* History Sidebar (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-[32px] p-6 sm:p-8 shadow-lg border border-[#edf2f7] flex flex-col justify-between">
          
          <div>
            <div className="pb-4 mb-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-extrabold uppercase tracking-wider text-[#003A70]">
                Últimas Senhas
              </h3>
              <span className="px-3 py-1 bg-[#003A70] text-white rounded-full text-xs font-mono font-bold">
                Histórico
              </span>
            </div>

            {state.history.length > 0 ? (
              <div className="space-y-3">
                {state.history.slice(0, 4).map((ticket, idx) => (
                  <div 
                    key={ticket.id}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                      idx === 0 
                        ? 'bg-blue-50/80 border-[#0056b3]/30 shadow-xs' 
                        : 'bg-slate-50 border-slate-200 opacity-90'
                    }`}
                  >
                    <div>
                      <div className="text-2xl font-black tracking-tight text-[#003A70]">
                        {ticket.code}
                      </div>
                      <div className="text-xs font-semibold text-slate-500 mt-0.5">
                        {ticket.category}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-block bg-[#003A70] text-white text-xs font-bold px-3 py-1 rounded-lg">
                        {ticket.desk}
                      </span>
                      <div className="text-[10px] font-mono text-slate-400 mt-1">
                        {ticket.calledAt ? new Date(ticket.calledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm italic">
                Nenhuma senha anterior registrada.
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 text-center text-xs text-slate-500 font-medium">
            Secretaria de Desenvolvimento Agropecuário • Prefeitura de Senhor do Bonfim
          </div>

        </div>

      </main>

      {/* Sleek Reception Footer */}
      <footer className="bg-white p-4 sm:px-8 rounded-2xl border border-[#edf2f7] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-600 text-sm">
        <div className="flex items-center gap-2.5 font-bold text-[#003A70]">
          <div className="w-3 h-3 bg-[#10b981] rounded-full animate-pulse"></div>
          <span className="text-xs sm:text-sm uppercase tracking-wide">Painel de Atendimento • Secretaria de Desenvolvimento Agropecuário</span>
        </div>

        <div className="text-slate-500 font-medium text-xs sm:text-sm">
          Por favor, aguarde ser chamado pelo número da sua senha
        </div>
      </footer>

      {/* Settings Modal (Accessed exclusively via 'P' key) */}
      <SettingsModal 
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        state={state}
        resetQueue={resetQueue}
        updateInstitution={updateInstitution}
        updateCategories={updateCategories}
        updateResetAllShortcut={updateResetAllShortcut}
      />

      {/* Direct Call Modal (Accessed via 'D' key or Header button) */}
      <DirectCallModal
        isOpen={showDirectCallModal}
        onClose={() => setShowDirectCallModal(false)}
        state={state}
        callDirect={callDirect || (() => {})}
      />

      {/* Floating Visual Feedback when a Reset Shortcut is Pressed */}
      {resetToast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900/95 text-white border-2 border-emerald-500 shadow-2xl rounded-2xl px-5 py-3.5 flex items-center gap-3.5 animate-bounce backdrop-blur-md">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase text-emerald-400 tracking-wider">
              Atalho de Reset Executado
            </div>
            <div className="text-sm font-extrabold text-white">
              {resetToast}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
