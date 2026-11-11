import React from 'react';
import { Monitor, Tv, Ticket, Settings, Wifi, Volume2, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  activeTab: 'operator' | 'tv' | 'totem' | 'settings';
  setActiveTab: (tab: 'operator' | 'tv' | 'totem' | 'settings') => void;
  institution: string;
  isConnected: boolean;
  onSoundTest: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  institution,
  isConnected,
  onSoundTest
}) => {
  return (
    <header className="bg-[#003A70] text-white shadow-xl border-b-[6px] border-[#0056b3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Institution Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-[#003A70] font-black text-xl shadow-md border border-blue-100">
              SB
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                {institution}
              </h1>
              <p className="text-xs text-blue-100/90 font-medium tracking-wide uppercase">
                Prefeitura de Senhor do Bonfim
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex items-center bg-[#00274d] p-1.5 rounded-xl border border-blue-900/60 shadow-inner">
              <button
                onClick={() => setActiveTab('operator')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'operator'
                    ? 'bg-[#0056b3] text-white shadow-md'
                    : 'text-blue-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Monitor className="w-4 h-4" />
                Painel Operador
              </button>

              <button
                onClick={() => setActiveTab('tv')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'tv'
                    ? 'bg-[#0056b3] text-white shadow-md'
                    : 'text-blue-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Tv className="w-4 h-4" />
                Painel TV (Recepção)
              </button>

              <button
                onClick={() => setActiveTab('totem')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'totem'
                    ? 'bg-[#0056b3] text-white shadow-md'
                    : 'text-blue-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Ticket className="w-4 h-4" />
                Emissor de Senhas
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'settings'
                    ? 'bg-[#0056b3] text-white shadow-md'
                    : 'text-blue-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Settings className="w-4 h-4" />
                Rede & Configs
              </button>
            </nav>

            <button
              onClick={onSoundTest}
              title="Testar som de sino"
              className="p-2.5 rounded-xl bg-[#00274d] hover:bg-[#0056b3] text-blue-100 hover:text-white border border-blue-800 transition-all flex items-center gap-1.5 text-xs font-semibold"
            >
              <Volume2 className="w-4 h-4 text-blue-300" />
              <span className="hidden sm:inline">Testar Som</span>
            </button>

            {/* Connection Status Badge */}
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border ${
              isConnected 
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' 
                : 'bg-amber-950/80 text-amber-300 border-amber-800'
            }`}>
              <Wifi className={`w-3.5 h-3.5 ${isConnected ? 'animate-pulse text-emerald-400' : 'text-amber-400'}`} />
              <span>{isConnected ? 'Rede Local Conectada' : 'Modo Polling'}</span>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
