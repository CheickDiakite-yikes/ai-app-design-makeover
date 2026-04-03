import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { UploadCloud, Image as ImageIcon, Sparkles, Loader2, Trash2, ChevronRight, Download, Smartphone, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type AppImage = {
  id: string;
  file: File;
  dataUrl: string;
  base64: string;
  mimeType: string;
  redesignUrls: string[];
  status: 'idle' | 'generating' | 'done' | 'error';
  errorMsg?: string;
};

const LOADING_MESSAGES = [
  "Analyzing your design...",
  "Extracting UI elements...",
  "Applying modern aesthetics...",
  "Refining typography and spacing...",
  "Cooking up 2 unique variations...",
  "Adding final polish...",
  "Almost there..."
];

function LoadingMessage() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-6 relative w-full flex justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={messageIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-medium absolute"
        >
          {LOADING_MESSAGES[messageIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [images, setImages] = useState<AppImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [platform, setPlatform] = useState<'mobile' | 'web'>('mobile');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedImage = images.find(img => img.id === selectedImageId);

  const handleFiles = (files: FileList | File[]) => {
    const newImages: AppImage[] = [];
    
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        // Extract base64 part
        const base64 = dataUrl.split(',')[1];
        
        const newImg: AppImage = {
          id: Math.random().toString(36).substring(7),
          file,
          dataUrl,
          base64,
          mimeType: file.type,
          redesignUrls: [],
          status: 'idle',
        };
        
        setImages(prev => {
          const updated = [...prev, newImg];
          if (updated.length === 1) {
            setSelectedImageId(newImg.id);
          }
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const removeImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      if (selectedImageId === id) {
        setSelectedImageId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  const generateSingleVariation = async (ai: any, promptText: string, base64: string, mimeType: string, variationIndex: number, targetPlatform: 'mobile' | 'web') => {
    const fullPrompt = `You are a world-class UI/UX designer. Redesign this ${targetPlatform === 'mobile' ? 'mobile app' : 'web application'} interface screenshot. 
Make it highly aesthetic, modern, sleek, and premium. 
Follow this specific creative direction: ${promptText || "Make it look like a top-tier, modern, and beautiful app."}
This is variation ${variationIndex}. Make it unique and distinct from other standard designs.
Output ONLY the redesigned UI image.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [
          { inlineData: { data: base64, mimeType: mimeType } },
          { text: fullPrompt }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: targetPlatform === 'mobile' ? "9:16" : "16:9",
          imageSize: "1K"
        }
      }
    });

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error(`No image generated for variation ${variationIndex}.`);
  };

  const generateRedesign = async () => {
    if (!selectedImage) return;

    setImages(prev => prev.map(img => 
      img.id === selectedImage.id ? { ...img, status: 'generating', errorMsg: undefined } : img
    ));

    try {
      // @ts-ignore - API_KEY is injected by the environment/wrapper
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const [url1, url2] = await Promise.all([
        generateSingleVariation(ai, prompt, selectedImage.base64, selectedImage.mimeType, 1, platform),
        generateSingleVariation(ai, prompt, selectedImage.base64, selectedImage.mimeType, 2, platform)
      ]);

      setImages(prev => prev.map(img => 
        img.id === selectedImage.id ? { ...img, status: 'done', redesignUrls: [url1, url2] } : img
      ));

    } catch (error: any) {
      console.error("Generation error:", error);
      setImages(prev => prev.map(img => 
        img.id === selectedImage.id ? { ...img, status: 'error', errorMsg: error.message || "Failed to generate redesign." } : img
      ));
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)] font-sans">
      
      {/* Left Sidebar - Controls */}
      <div className="w-80 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col h-full z-10 shadow-2xl">
        <div className="p-6 border-b border-[var(--color-border)]">
          <h1 className="text-xl font-bold tracking-tight font-display flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
            AI Designer
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Upload screenshots, get modern redesigns.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Upload Area */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">1. Upload Screenshots</h2>
            <div 
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${isDragging ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="w-8 h-8 text-[var(--color-text-muted)] mb-2" />
              <p className="text-sm font-medium">Drag & drop images</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">or click to browse</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                multiple 
                accept="image/*"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
            </div>
          </section>

          {/* Gallery */}
          {images.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">2. Select Image</h2>
              <div className="grid grid-cols-2 gap-3">
                <AnimatePresence>
                  {images.map((img) => (
                    <motion.div 
                      key={img.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() => setSelectedImageId(img.id)}
                      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${selectedImageId === img.id ? 'border-[var(--color-accent)] shadow-[0_0_15px_rgba(224,255,79,0.2)]' : 'border-transparent hover:border-[var(--color-border)]'}`}
                    >
                      <img src={img.dataUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                      <button 
                        onClick={(e) => removeImage(img.id, e)}
                        className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      {img.status === 'done' && (
                        <div className="absolute bottom-1 right-1 p-1 bg-[var(--color-accent)] rounded-full text-black">
                          <Sparkles className="w-3 h-3" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* Platform Toggle */}
          <section className={`transition-opacity ${!selectedImage ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">3. Target Platform</h2>
            <div className="flex bg-black rounded-xl p-1 border border-[var(--color-border)]">
              <button
                onClick={() => setPlatform('mobile')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors ${platform === 'mobile' ? 'bg-[var(--color-surface)] text-white shadow' : 'text-[var(--color-text-muted)] hover:text-white'}`}
              >
                <Smartphone className="w-4 h-4" /> Mobile
              </button>
              <button
                onClick={() => setPlatform('web')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors ${platform === 'web' ? 'bg-[var(--color-surface)] text-white shadow' : 'text-[var(--color-text-muted)] hover:text-white'}`}
              >
                <Monitor className="w-4 h-4" /> Web
              </button>
            </div>
          </section>

          {/* Prompt Area */}
          <section className={`transition-opacity ${!selectedImage ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">4. Design Direction (Optional)</h2>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Make it minimalist, use a dark theme, add glassmorphism effects..."
              className="w-full h-32 bg-black border border-[var(--color-border)] rounded-xl p-3 text-sm focus:outline-none focus:border-[var(--color-accent)] resize-none transition-colors"
            />
          </section>

        </div>

        {/* Action Footer */}
        <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          <button 
            disabled={!selectedImage || selectedImage.status === 'generating'}
            onClick={generateRedesign}
            className="w-full py-3 px-4 bg-[var(--color-accent)] text-black font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {selectedImage?.status === 'generating' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Redesign
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Main Area - Canvas */}
      <div className="flex-1 relative bg-[var(--color-bg)] overflow-y-auto">
        {!selectedImage ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--color-text-muted)]">
            <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">No image selected</p>
            <p className="text-sm mt-2">Upload and select a screenshot to begin.</p>
          </div>
        ) : (
          <div className="min-h-full p-8 flex flex-col items-center justify-center">
            
            {selectedImage.errorMsg && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/50 text-red-400 rounded-xl max-w-2xl text-center">
                <p className="font-semibold">Generation Failed</p>
                <p className="text-sm mt-1">{selectedImage.errorMsg}</p>
              </div>
            )}

            <div className={`flex ${platform === 'mobile' ? 'flex-col xl:flex-row' : 'flex-col'} items-center justify-center gap-8 xl:gap-12 w-full max-w-[1600px]`}>
              
              {/* Original Image */}
              <div className={`flex flex-col items-center w-full ${platform === 'mobile' ? 'max-w-sm' : 'max-w-3xl'}`}>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-4">Original</h3>
                <div className={`relative rounded-[2rem] overflow-hidden border-4 border-[var(--color-surface)] shadow-2xl max-h-[70vh] w-full ${platform === 'mobile' ? 'aspect-[9/16]' : 'aspect-[16/9]'}`}>
                  <img src={selectedImage.dataUrl} alt="Original" className="w-full h-full object-contain bg-black" />
                </div>
              </div>

              {/* Arrow Indicator (Desktop only) */}
              <div className={`hidden ${platform === 'mobile' ? 'xl:flex' : 'hidden'} flex-col items-center justify-center text-[var(--color-border)]`}>
                <ChevronRight className="w-12 h-12" />
              </div>

              {/* Redesign Variations */}
              <div className={`flex flex-col sm:flex-row gap-8 w-full ${platform === 'mobile' ? 'max-w-3xl' : 'max-w-full'} justify-center`}>
                {selectedImage.status === 'generating' ? (
                  <div className={`flex flex-col items-center justify-center text-[var(--color-accent)] w-full ${platform === 'mobile' ? 'h-[70vh]' : 'h-[40vh]'}`}>
                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                    <LoadingMessage />
                  </div>
                ) : selectedImage.redesignUrls && selectedImage.redesignUrls.length > 0 ? (
                  selectedImage.redesignUrls.map((url, idx) => (
                    <div key={idx} className={`flex flex-col items-center w-full ${platform === 'mobile' ? 'max-w-sm' : 'max-w-3xl'}`}>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-accent)] mb-4 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> Variation {idx + 1}
                      </h3>
                      <div className={`relative rounded-[2rem] overflow-hidden border-4 border-[var(--color-surface)] shadow-[0_0_40px_rgba(224,255,79,0.1)] max-h-[70vh] w-full ${platform === 'mobile' ? 'aspect-[9/16]' : 'aspect-[16/9]'} bg-black flex items-center justify-center group`}>
                        <img src={url} alt={`Redesign Variation ${idx + 1}`} className="w-full h-full object-contain" />
                        <a 
                          href={url} 
                          download={`redesign-${selectedImage.id}-v${idx + 1}.png`}
                          className="absolute bottom-4 right-4 p-3 bg-[var(--color-accent)] text-black rounded-full shadow-lg opacity-0 group-hover:opacity-100 hover:scale-105 transition-all"
                          title="Download Redesign"
                        >
                          <Download className="w-5 h-5" />
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={`flex flex-col items-center w-full ${platform === 'mobile' ? 'max-w-sm' : 'max-w-3xl'}`}>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-accent)] mb-4 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Redesigns
                    </h3>
                    <div className={`relative rounded-[2rem] overflow-hidden border-4 border-[var(--color-surface)] shadow-[0_0_40px_rgba(224,255,79,0.1)] max-h-[70vh] w-full ${platform === 'mobile' ? 'aspect-[9/16]' : 'aspect-[16/9]'} bg-black flex items-center justify-center`}>
                      <div className="text-[var(--color-text-muted)] flex flex-col items-center">
                        <ImageIcon className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-sm">Ready to generate</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>

    </div>
  );
}

