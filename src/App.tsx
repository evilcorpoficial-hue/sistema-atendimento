import React from 'react';
import { useQueueSocket } from './hooks/useQueueSocket';
import { TVDisplayPanel } from './components/TVDisplayPanel';

export default function App() {
  const {
    state,
    callNext,
    callPrev,
    callDirect,
    recallCurrent,
    resetQueue,
    updateInstitution,
    updateCategories,
    updateResetAllShortcut
  } = useQueueSocket();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <TVDisplayPanel 
        state={state}
        callNext={callNext}
        callPrev={callPrev}
        callDirect={callDirect}
        recallCurrent={recallCurrent}
        resetQueue={resetQueue}
        updateInstitution={updateInstitution}
        updateCategories={updateCategories}
        updateResetAllShortcut={updateResetAllShortcut}
      />
    </div>
  );
}

