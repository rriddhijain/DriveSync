import React from "react";
import { Sparkles, Volume2 } from "lucide-react";

export default function SmartSummary({ text }) {
  if (!text) return null;

  const speakSummary = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="animate-fade-up bg-gradient-to-r from-purple-950/50 to-indigo-950/30 border border-purple-800/30 rounded-xl p-3.5 mb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-purple-500/20 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-purple-400" />
          </div>
          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">AI Summary</span>
        </div>
        <button
          onClick={speakSummary}
          className="flex items-center gap-1 text-[10px] text-purple-400/60 hover:text-purple-300 transition-colors px-2 py-1 rounded-md hover:bg-purple-500/10"
        >
          <Volume2 className="w-3 h-3" />
          Replay
        </button>
      </div>
      <p className="text-gray-300 text-xs leading-relaxed">{text}</p>
    </div>
  );
}