import React, { useState, useEffect } from 'react';

export function ApiKeyWrapper({ children }: { children: React.ReactNode }) {
  const [hasKey, setHasKey] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore - aistudio is injected at runtime
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        // @ts-ignore
        const keyExists = await window.aistudio.hasSelectedApiKey();
        setHasKey(keyExists);
      }
      setChecking(false);
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    // @ts-ignore
    if (window.aistudio && window.aistudio.openSelectKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      // Assume success due to race condition as per guidelines
      setHasKey(true);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="animate-pulse">Checking credentials...</div>
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white font-sans">
        <div className="max-w-md text-center space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">Premium AI Designer</h1>
          <p className="text-neutral-400">
            This application uses a premium image generation model to redesign your app interfaces. 
            You must select a paid Google Cloud project API key to continue.
          </p>
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noreferrer"
            className="text-sm text-blue-400 hover:underline block mb-8"
          >
            Learn more about billing requirements
          </a>
          <button 
            onClick={handleSelectKey} 
            className="px-8 py-4 bg-white text-black rounded-full font-semibold hover:bg-neutral-200 transition-colors"
          >
            Select API Key
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
