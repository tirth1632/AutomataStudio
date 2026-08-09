import React, { useState } from 'react';
import {
  Video,
  X,
  Sparkles,
  Download,
  Loader2,
  Image as ImageIcon,
  Key,
  Film,
} from 'lucide-react';
import { generateAIVideo } from '../../services/aiVideoService';

interface AIVideoGeneratorModalProps {
  initialPrompt?: string;
  canvasImageBase64?: string;
  onClose: () => void;
}

export const AIVideoGeneratorModal: React.FC<AIVideoGeneratorModalProps> = ({
  initialPrompt = '2D motion graphics animation of a deterministic finite automaton state machine with glowing neon transitions',
  canvasImageBase64,
  onClose,
}) => {
  const [mode, setMode] = useState<'text-to-video' | 'image-to-video'>(canvasImageBase64 ? 'image-to-video' : 'text-to-video');
  const [prompt, setPrompt] = useState<string>(initialPrompt);
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('hf_api_key') || '';
  });
  const [isSaved, setIsSaved] = useState<boolean>(!!localStorage.getItem('hf_api_key'));
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('hf_api_key', apiKey.trim());
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } else {
      localStorage.removeItem('hf_api_key');
      setIsSaved(false);
    }
  };

  const presetPrompts = [
    '2D motion graphics animation of a deterministic finite automaton with glowing cyan state nodes',
    'Animated state machine showing lockstep state transitions and glowing particle flow',
    'Cartesian product construction animation merging two state graphs into a product automaton',
    'Hopcroft partition split animation collapsing equivalent state groups',
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const url = await generateAIVideo({
        mode,
        prompt,
        imageBase64: mode === 'image-to-video' ? canvasImageBase64 : undefined,
        apiKey: apiKey.trim() || undefined,
      });
      setVideoUrl(url);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to generate video. Please check your API key.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `automaton_ai_video_${Date.now()}.mp4`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-700/80 text-slate-100 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-xl transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-3 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-2xl text-white shadow-lg">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-base text-white flex items-center gap-2">
              AI Automaton Video Generator
              <span className="text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded">
                Hugging Face Powered
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Generate motion videos using <strong className="text-indigo-300">Wan 2.1</strong> (Text-to-Video) & <strong className="text-sky-300">LTX-Video</strong> (Image-to-Video).
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 gap-1 font-bold text-xs">
          <button
            onClick={() => setMode('text-to-video')}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              mode === 'text-to-video'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-4 h-4" /> Wan 2.1 Text-to-Video
          </button>
          <button
            onClick={() => setMode('image-to-video')}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              mode === 'image-to-video'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" /> LTX-Video Image-to-Video
          </button>
        </div>

        {/* Input Controls */}
        <div className="space-y-3">
          {/* Custom API Key Input with Save Option */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" /> Hugging Face API Key:
              </label>
              {isSaved && (
                <span className="text-[10px] text-emerald-400 font-bold font-mono animate-fade-in flex items-center gap-1">
                  ✓ Saved to Browser
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setIsSaved(false);
                }}
                placeholder="hf_..."
                className="flex-1 py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm shrink-0 flex items-center gap-1"
              >
                Save Key
              </button>
            </div>
          </div>

          {/* Prompt Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
              Animation Prompt:
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the desired video animation..."
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-medium focus:outline-none focus:border-indigo-500 transition resize-none"
            />
          </div>

          {/* Preset Prompt Pills */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Preset Animation Prompts:</span>
            <div className="flex flex-wrap gap-1.5">
              {presetPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(p)}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-indigo-950/80 border border-slate-800 hover:border-indigo-500/50 rounded-lg text-[11px] text-slate-300 hover:text-indigo-200 transition cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Generating Video with {mode === 'text-to-video' ? 'Wan 2.1' : 'LTX-Video'}...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Generate AI Video ({mode === 'text-to-video' ? 'Wan 2.1' : 'LTX-Video'})
            </>
          )}
        </button>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-rose-950/80 border border-rose-500/50 text-rose-200 rounded-2xl text-xs font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Video Player Output */}
        {videoUrl && (
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Video Generated Successfully!
              </span>
              <button
                onClick={handleDownload}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Download className="w-3.5 h-3.5" /> Download MP4
              </button>
            </div>

            <video
              src={videoUrl}
              controls
              autoPlay
              loop
              className="w-full max-h-[320px] rounded-xl border border-slate-800 object-cover shadow-2xl"
            />
          </div>
        )}
      </div>
    </div>
  );
};
