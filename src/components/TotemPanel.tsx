import React, { useState } from 'react';
import { QueueState, Ticket } from '../types';
import { Ticket as TicketIcon, CheckCircle2, ShieldCheck, Printer, ArrowRight } from 'lucide-react';

interface TotemPanelProps {
  state: QueueState;
  addTicket: (category: string) => void;
}

export const TotemPanel: React.FC<TotemPanelProps> = ({ state, addTicket }) => {
  const [issuedTicket, setIssuedTicket] = useState<Ticket | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);

  const handleIssueTicket = (categoryCode: string) => {
    addTicket(categoryCode);

    // Prepare ticket preview for citizen
    const currentNum = (state.counters[categoryCode] || 0) + 1;
    const formatted = currentNum < 10 ? `0${currentNum}` : `${currentNum}`;
    
    const newTicket: Ticket = {
      id: `totem-${Date.now()}`,
      number: currentNum,
      formattedNumber: formatted,
      category: categoryCode,
      code: `${formatted} ${categoryCode}`,
      desk: 'Aguardando',
      status: 'waiting',
      createdAt: new Date().toISOString()
    };

    setIssuedTicket(newTicket);
    setShowModal(true);

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      setShowModal(false);
    }, 6000);
  };

  const categories = [
    {
      code: 'CAF',
      title: 'CAF - Agricultura Familiar',
      desc: 'Cadastro Nacional da Agricultura Familiar e emissão de Declaração de Aptidão ao PRONAF.',
      color: 'bg-[#003A70] hover:bg-[#00274d] text-white border-blue-900',
      badge: 'Atendimento Especializado'
    },
    {
      code: 'GERAL',
      title: 'Atendimento Geral',
      desc: 'Informações, requerimentos gerais e atendimento administrativo da Secretaria.',
      color: 'bg-[#0056b3] hover:bg-blue-700 text-white border-blue-600',
      badge: 'Atendimento Convencional'
    },
    {
      code: 'LICENCIAMENTO',
      title: 'Licenciamento e Assistência',
      desc: 'Laudos técnicos, licenciamento ambiental simplificado e assistência a produtores.',
      color: 'bg-[#0056b3] hover:bg-blue-700 text-white border-blue-600',
      badge: 'Suporte Técnico'
    },
    {
      code: 'INCRA',
      title: 'Atendimento INCRA',
      desc: 'Regularização fundiária, assentamentos e serviços do Instituto Nacional de Colonização e Reforma Agrária.',
      color: 'bg-emerald-800 hover:bg-emerald-900 text-white border-emerald-900',
      badge: 'Atendimento Sala 5'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      
      {/* Kiosk Header */}
      <div className="text-center space-y-3 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#003A70] font-extrabold text-xs tracking-wider uppercase">
          <ShieldCheck className="w-4 h-4 text-[#003A70]" />
          Totem de Autoatendimento
        </div>
        <h2 className="text-3xl font-black text-slate-900">
          Retire sua Senha de Atendimento
        </h2>
        <p className="text-slate-600 text-sm max-w-xl mx-auto">
          Selecione abaixo o serviço desejado. Sua senha será chamada no painel principal da recepção.
        </p>
      </div>

      {/* Category Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat) => (
          <button
            key={cat.code}
            onClick={() => handleIssueTicket(cat.code)}
            className={`${cat.color} p-6 sm:p-8 rounded-3xl shadow-lg border-2 hover:scale-[1.02] active:scale-95 transition-all text-left flex flex-col justify-between relative overflow-hidden group`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs font-bold tracking-wide">
                  {cat.badge}
                </span>
                <TicketIcon className="w-8 h-8 text-white/80 group-hover:scale-110 transition-transform" />
              </div>

              <h3 className="text-2xl font-black text-white tracking-tight mb-2">
                {cat.title}
              </h3>
              <p className="text-xs text-white/90 leading-relaxed font-medium">
                {cat.desc}
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-white/20 flex items-center justify-between font-bold text-sm text-white">
              <span>Toque para emitir senha {cat.code}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}
      </div>

      {/* Modal Ticket Confirmation */}
      {showModal && issuedTicket && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border-4 border-[#003A70] text-center space-y-6">
            
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                Sua Senha Foi Emitida
              </span>
              
              <div className="text-5xl font-black text-[#003A70] mt-2 py-4 bg-slate-50 rounded-2xl border border-slate-200">
                {issuedTicket.code}
              </div>

              <p className="text-xs font-bold text-[#003A70] uppercase mt-3">
                {state.institution}
              </p>
            </div>

            <div className="text-xs text-slate-600 bg-blue-50/80 p-3 rounded-xl border border-blue-100 font-medium">
              Aguarde a chamada do seu número no painel de TV da recepção.
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full py-3 bg-[#003A70] hover:bg-[#00274d] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Concluir
            </button>

          </div>
        </div>
      )}

    </div>
  );
};
