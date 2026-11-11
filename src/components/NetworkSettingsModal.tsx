import React, { useEffect, useState } from 'react';
import { QueueState } from '../types';
import { 
  Wifi, 
  Copy, 
  Check, 
  Volume2, 
  RefreshCw, 
  Building, 
  Sliders, 
  QrCode, 
  ExternalLink 
} from 'lucide-react';
import { triggerSoundAlert } from '../utils/sound';

interface NetworkSettingsModalProps {
  state: QueueState;
  resetQueue: () => void;
  updateInstitution: (name: string) => void;
}

export const NetworkSettingsModal: React.FC<NetworkSettingsModalProps> = ({
  state,
  resetQueue,
  updateInstitution
}) => {
  const [ips, setIps] = useState<string[]>([]);
  const [port, setPort] = useState<number>(3000);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [institutionName, setInstitutionName] = useState<string>(state.institution);
  const [speechEnabled, setSpeechEnabled] = useState<boolean>(state.speechEnabled ?? true);
  const [chimeEnabled, setChimeEnabled] = useState<boolean>(state.chimeEnabled ?? true);

  useEffect(() => {
    fetch('/api/ip')
      .then((res) => res.json())
      .then((data) => {
        if (data.ips) setIps(data.ips);
        if (data.port) setPort(data.port);
      })
      .catch((err) => console.warn('Failed to fetch local IP:', err));
  }, []);

  const handleCopyLink = (url: string, index: number) => {
    navigator.clipboard.writeText(url);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSoundTest = () => {
    triggerSoundAlert('01 CAF', state.currentDesk || 'Sala 1', speechEnabled, chimeEnabled);
  };

  const handleSaveInstitution = () => {
    updateInstitution(institutionName);
  };

  const updateServerAudioConfig = (speech: boolean, chime: boolean) => {
    fetch('/api/queue/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speechEnabled: speech, chimeEnabled: chime })
    }).catch(() => {});
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      
      {/* Title Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Configurações de Rede e Áudio
            </h2>
            <p className="text-xs text-slate-500">
              Gerencie a conexão da TV, transmissão por IP local e preferências de som.
            </p>
          </div>
        </div>

        <button
          onClick={handleSoundTest}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all"
        >
          <Volume2 className="w-4 h-4" />
          Testar Som de Sino
        </button>
      </div>

      {/* Section 1: IP Network Connection for TV / Reception Devices */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-blue-800 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-blue-800">
          <Wifi className="w-6 h-6 text-emerald-400" />
          <div>
            <h3 className="text-lg font-bold">Endereços de Conexão na Rede Local (IP)</h3>
            <p className="text-xs text-blue-200">
              Abra este link no navegador da sua TV Box, Smart TV ou Tablet conectado no mesmo Wi-Fi/Rede local.
            </p>
          </div>
        </div>

        {ips.length > 0 ? (
          <div className="space-y-3">
            {ips.map((ip, idx) => {
              const tvUrl = `http://${ip}:${port}/?view=tv`;
              return (
                <div 
                  key={ip}
                  className="bg-blue-950/80 p-4 rounded-2xl border border-blue-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs text-blue-300 font-mono">Endereço IP da Rede:</div>
                    <div className="text-base font-black text-white font-mono tracking-wider">
                      {tvUrl}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleCopyLink(tvUrl, idx)}
                      className="flex-1 sm:flex-initial px-3.5 py-2 bg-blue-800 hover:bg-blue-700 text-white text-xs font-bold rounded-xl border border-blue-600 flex items-center justify-center gap-1.5 transition-all"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar Link</span>
                        </>
                      )}
                    </button>

                    <a
                      href={`/?view=tv`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Abrir TV</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-blue-950/80 p-4 rounded-2xl border border-blue-700 text-xs text-blue-200">
            Link atual da aplicação: <code className="font-mono text-white font-bold">{window.location.origin}/?view=tv</code>
          </div>
        )}
      </div>

      {/* Section 2: Audio Preferences */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
        <h3 className="text-sm font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-blue-600" />
          Preferências de Alerta Sonoro
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          <label className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-blue-50/50 transition-all">
            <div>
              <div className="font-bold text-slate-900 text-sm">Toque de Sino (Chime)</div>
              <div className="text-xs text-slate-500">Toca o efeito sonoro de campainha ao chamar senha</div>
            </div>
            <input
              type="checkbox"
              checked={chimeEnabled}
              onChange={(e) => {
                setChimeEnabled(e.target.checked);
                updateServerAudioConfig(speechEnabled, e.target.checked);
              }}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>

          <label className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-blue-50/50 transition-all">
            <div>
              <div className="font-bold text-slate-900 text-sm">Voz Sintetizada (Fala em Português)</div>
              <div className="text-xs text-slate-500">Pronuncia "Senha 01 CAF, Sala 1" em áudio</div>
            </div>
            <input
              type="checkbox"
              checked={speechEnabled}
              onChange={(e) => {
                setSpeechEnabled(e.target.checked);
                updateServerAudioConfig(e.target.checked, chimeEnabled);
              }}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>

        </div>
      </div>

      {/* Section 3: Institution Name & Reset */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
        <h3 className="text-sm font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
          <Building className="w-4 h-4 text-blue-600" />
          Dados da Instituição e Fila
        </h3>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={institutionName}
            onChange={(e) => setInstitutionName(e.target.value)}
            className="flex-1 px-4 py-3 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
          />
          <button
            onClick={handleSaveInstitution}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
          >
            Salvar Nome
          </button>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-900 text-sm">Reiniciar Sequência de Senhas</div>
            <div className="text-xs text-slate-500">Zera todos os contadores do dia (CAF, Geral, Prioritário)</div>
          </div>

          <button
            onClick={() => {
              if (window.confirm('Tem certeza que deseja zerar todas as senhas da fila do dia?')) {
                resetQueue();
              }
            }}
            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            Zerar Fila do Dia
          </button>
        </div>
      </div>

    </div>
  );
};
