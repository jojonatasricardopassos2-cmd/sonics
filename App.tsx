import React from 'react';
import SonicGame from './components/SonicGame';

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-900 text-white overflow-hidden">
      <SonicGame />
      
      <div className="absolute bottom-4 right-4 text-xs text-zinc-500 font-mono text-right opacity-50 pointer-events-none">
        <p>EMERALD COAST 2D ENGINE v1.0</p>
        <p>React + Canvas + Tailwind</p>
      </div>
    </div>
  );
};

export default App;
