import { useState, useEffect, useRef, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Download,
  RefreshCw,
  X,
  Image as ImageIcon,
  Smartphone,
  Heart,
  Trash2,
  Sliders,
  Compass,
  Check,
  Info
} from "lucide-react";

interface Wallpaper {
  url: string;
  prompt: string;
}

interface SavedWallpaper {
  id: string;
  url: string;
  prompt: string;
  preset: string;
  timestamp: number;
}

const PRESET_STYLES = [
  { name: "Retro Anime", emoji: "🌸", desc: "Classic VHS 90s anime aesthetic, hand-drawn look" },
  { name: "Cyberpunk Noir", emoji: "🌃", desc: "Rainy neon-drenched futuristic megacity streets" },
  { name: "Minimal Vector", emoji: "🍃", desc: "Clean shapes, calming gradients, beautiful flat art" },
  { name: "3D Claymation", emoji: "🧸", desc: "Soft matte clay textures, playful cute character feel" },
  { name: "Synthwave Glow", emoji: "🌅", desc: "Retro-futurist purple neon grids and sunsets" },
  { name: "Moody Cinematic", emoji: "🎬", desc: "Deep rich film tones, 35mm grain, beautiful shadows" },
  { name: "Liquid Glass", emoji: "🧬", desc: "Iridescent reflective blobs and holograms" },
  { name: "Solarpunkn", emoji: "🌤️", desc: "Eco-friendly cities blended with detailed lush greenery" }
];

const SUGGESTED_MODIFIERS = [
  "Rainy Night", "Golden Hour", "Vaporwave", "Cozy Cabin", "Ethereal", 
  "Cyberpunk", "Aesthetic", "Surreal", "Line Art", "Retro Pastel", "Mist"
];

const LOADING_PHRASES = [
  "Structuring vertical wallpaper format...",
  "Running style analysis of theme vibe...",
  "Invoking design coordinate grids...",
  "Applying beautiful light reflections...",
  "Drafting negative space for phone clock...",
  "Generating final high-quality pixels...",
  "Polishing variation aesthetics..."
];

export default function App() {
  const [vibe, setVibe] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("Retro Anime");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<"create" | "vault">("create");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const [currentWallpapers, setCurrentWallpapers] = useState<Wallpaper[] | null>(null);
  const [savedWallpapers, setSavedWallpapers] = useState<SavedWallpaper[]>([]);
  const [activePreview, setActivePreview] = useState<Wallpaper | null>(null);
  const [showDownloadHint, setShowDownloadHint] = useState(false);

  const formSectionRef = useRef<HTMLDivElement>(null);

  // Load saved vault items from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("saved_wallpapers");
      if (stored) {
        setSavedWallpapers(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load local vault items:", e);
    }
  }, []);

  // Save vault updates to local storage
  const saveToLocalVault = (items: SavedWallpaper[]) => {
    try {
      localStorage.setItem("saved_wallpapers", JSON.stringify(items));
      setSavedWallpapers(items);
    } catch (e) {
      console.error("Failed saving to local storage:", e);
    }
  };

  // Loading animation cycle
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_PHRASES.length);
      }, 3000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleAddModifier = (mod: string) => {
    if (!vibe.toLowerCase().includes(mod.toLowerCase())) {
      setVibe((prev) => (prev ? `${prev}, ${mod.toLowerCase()}` : mod.toLowerCase()));
    }
  };

  const handleGenerate = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!vibe.trim()) {
      setError("Please describe your wallpaper vibe first!");
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentWallpapers(null);

    try {
      const res = await fetch("/api/generate-wallpapers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vibe,
          preset: selectedPreset,
          referenceImage,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Generation unsuccessful. Please try again.");
      }

      setCurrentWallpapers(data.images);
    } catch (err: any) {
      setError(err.message || "Something went wrong during generation.");
    } finally {
      setLoading(false);
    }
  };

  // Add items into Vault
  const handleToggleFavorite = (wp: Wallpaper) => {
    const exists = savedWallpapers.find((item) => item.url === wp.url);
    if (exists) {
      // remove
      const updated = savedWallpapers.filter((item) => item.url !== wp.url);
      saveToLocalVault(updated);
    } else {
      // add
      const newItem: SavedWallpaper = {
        id: Math.random().toString(36).substr(2, 9),
        url: wp.url,
        prompt: wp.prompt,
        preset: selectedPreset,
        timestamp: Date.now(),
      };
      const updated = [newItem, ...savedWallpapers];
      saveToLocalVault(updated);
    }
  };

  // Remix from existing wallpaper
  const handleRemix = (wp: Wallpaper) => {
    setReferenceImage(wp.url);
    setActivePreview(null);
    setActiveTab("create");
    
    // Smoothly scroll back to the design form
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  };

  // Download client logic
  const handleDownload = (wp: Wallpaper) => {
    try {
      const cleanName = wp.prompt
        ? wp.prompt.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 30)
        : "vibe-wallpaper";
      const filename = `wallpaper-${cleanName}.png`;

      if (wp.url.startsWith("data:")) {
        const link = document.createElement("a");
        link.href = wp.url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(wp.url, "_blank");
      }
      
      // Show mobile toast helper just in case downloads can be sandboxed
      setShowDownloadHint(true);
      setTimeout(() => setShowDownloadHint(false), 4000);
    } catch (err) {
      console.error("Download failed:", err);
      window.open(wp.url, "_blank");
    }
  };

  const clearReferenceImage = () => {
    setReferenceImage(null);
  };

  return (
    <div className="min-h-screen bg-[#05060f] text-white/90 font-sans antialiased flex flex-col justify-start items-center p-0 sm:p-6 md:p-10 select-none relative overflow-hidden">
      
      {/* Background ambient glowing blobs from design theme rules */}
      <div className="absolute w-[800px] h-[800px] bg-purple-900/15 rounded-full blur-[120px] -top-96 -left-96 pointer-events-none" />
      <div className="absolute w-[600px] h-[600px] bg-indigo-900/15 rounded-full blur-[100px] -bottom-48 -right-48 pointer-events-none" />

      {/* Outer frame structure simulating a premium responsive smartphone preview on wider screens */}
      <div className="w-full max-w-md bg-black/40 border border-white/10 sm:rounded-[44px] p-2 relative shadow-2xl backdrop-blur-3xl flex flex-col sm:min-h-[85vh] sm:max-h-[92vh] overflow-hidden z-10">
        
        {/* Inner glass layer container to create premium double bevel glow of glass mockups */}
        <div className="w-full h-full border border-white/5 sm:rounded-[36px] overflow-hidden flex flex-col bg-white/[0.02]">
        
          {/* Virtual Top Notch Status bar decoration */}
          <div className="hidden sm:flex justify-between items-center px-8 pt-4 pb-2 text-[10px] font-mono tracking-widest text-white/30 border-b border-white/5 bg-white/[0.01]">
            <span>WALLPAPER VIBE LAB</span>
            <div className="w-16 h-4 bg-white/[0.03] rounded-full border border-white/10 flex justify-center items-center text-[8px] font-semibold text-white/60 scale-95 uppercase">
              ACTIVE
            </div>
            <span>UTC {new Date().toISOString().substring(11, 16)}</span>
          </div>

          {/* Global Nav Bar */}
          <header className="px-6 py-4 flex flex-col gap-1 border-b border-white/10 bg-white/[0.02] z-10 shrink-0 backdrop-blur-md">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex justify-center items-center shadow-[0_4px_12px_rgba(99,102,241,0.25)]">
                  <Sparkles className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-display font-bold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-fuchsia-200 bg-clip-text text-transparent">
                    Aura
                  </h1>
                  <p className="text-[10px] text-white/40 -mt-1 font-medium font-mono uppercase tracking-widest">9:16 Vibe Lab</p>
                </div>
              </div>

              {/* Nav Switch */}
              <div className="flex bg-white/[0.04] p-0.5 rounded-lg border border-white/10">
                <button
                  onClick={() => setActiveTab("create")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold tracking-wide transition-all ${
                    activeTab === "create"
                      ? "bg-white/10 border border-white/15 text-white shadow-sm"
                      : "text-white/40 hover:text-white/80"
                  }`}
                >
                  Create
                </button>
                <button
                  onClick={() => setActiveTab("vault")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold tracking-wide transition-all relative ${
                    activeTab === "vault"
                      ? "bg-white/10 border border-white/15 text-white shadow-sm"
                      : "text-white/40 hover:text-white/80"
                  }`}
                >
                  Vault
                  {savedWallpapers.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-[8px] font-bold flex justify-center items-center text-white scale-90">
                      {savedWallpapers.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </header>

          {/* Core Scrolling Content Area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 flex flex-col gap-6 scrollbar-none">
          <AnimatePresence mode="wait">
            {activeTab === "create" ? (
              <motion.div
                key="create-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
                ref={formSectionRef}
              >
                {/* Active Remix Indicator */}
                <AnimatePresence>
                  {referenceImage && (
                     <motion.div
                      initial={{ scale: 0.9, opacity: 0, y: -10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: -10 }}
                      className="p-3.5 bg-white/[0.04] border border-white/10 rounded-2xl flex items-center justify-between gap-3 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="relative w-12 h-16 rounded-lg overflow-hidden border border-white/20 bg-black/40 shrink-0">
                          <img
                            src={referenceImage}
                            alt="Remix Target"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-white/5 animate-pulse" />
                        </div>
                        <div className="flex-1">
                          <span className="text-[10px] font-bold text-indigo-300 tracking-wider flex items-center gap-1 uppercase font-mono">
                            <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" /> Remix Mode Enabled
                          </span>
                          <h4 className="text-xs font-semibold text-white/95 mt-0.5">Reference Image Active</h4>
                          <p className="text-[9px] text-white/50 leading-snug">
                            Next batch will intelligently adopt style attributes & colors.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={clearReferenceImage}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex justify-center items-center text-white/60 hover:text-white transition-colors"
                        title="Clear Remix Reference"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Vibe input panel */}
                <section className="bg-white/[0.03] backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)] flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-white/70" />
                    <h3 className="text-xs font-bold text-white/90 uppercase tracking-widest">
                      1. Describe the Vibe
                    </h3>
                  </div>

                  <div className="relative">
                    <textarea
                      value={vibe}
                      onChange={(e) => setVibe(e.target.value)}
                      placeholder="e.g. vintage lo-fi cozy study corner, rainy window, soft neon glow, cinematic tones..."
                      rows={3}
                      className="w-full bg-black/40 border border-white/10 focus:border-white/25 focus:ring-1 focus:ring-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 outline-none resize-none transition-all leading-relaxed"
                    />
                    <button
                      onClick={() => setVibe("")}
                      className={`absolute right-2.5 bottom-3.5 text-[10px] font-mono font-semibold px-2 py-0.5 bg-white/10 border border-white/10 rounded text-white/60 hover:text-white transition-all ${
                        vibe ? "opacity-100" : "opacity-0 pointer-events-none"
                      }`}
                    >
                      Clear
                    </button>
                  </div>

                  {/* Smart Pill Suggestion */}
                  <div className="flex flex-col gap-1.5 font-sans">
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider font-mono">
                      Quick Vibe Sparks
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-[76px] overflow-y-auto pb-1">
                      {SUGGESTED_MODIFIERS.map((mod) => (
                        <button
                          key={mod}
                          onClick={() => handleAddModifier(mod)}
                          className="px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/5 hover:border-white/20 text-[10px] font-medium text-white/60 hover:text-white transition-all select-none cursor-pointer"
                        >
                          + {mod}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Aesthetic presets section */}
                <section className="bg-white/[0.03] backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)] flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-white/70" />
                    <h3 className="text-xs font-bold text-white/95 uppercase tracking-widest flex-1">
                      2. Aesthetic Preset
                    </h3>
                    <span className="text-[9px] font-mono font-medium text-white/80 bg-white/10 px-2 py-0.5 rounded border border-white/10">
                      {selectedPreset}
                    </span>
                  </div>

                  {/* Grid of presets */}
                  <div className="grid grid-cols-2 gap-2 mt-1 font-sans">
                    {PRESET_STYLES.map((pr) => (
                      <button
                        key={pr.name}
                        onClick={() => setSelectedPreset(pr.name)}
                        className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all select-none cursor-pointer ${
                          selectedPreset === pr.name
                            ? "bg-white/10 border-white/30 shadow-[0_4px_15px_rgba(255,255,255,0.08)]"
                            : "bg-black/30 border-white/5 hover:border-white/15"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{pr.emoji}</span>
                          <span className="text-xs font-bold text-white/90">{pr.name}</span>
                        </div>
                        <p className="text-[9px] text-white/40 line-clamp-1 mt-0.5 leading-snug">
                          {pr.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Generation triggers & error notices */}
                <div className="flex flex-col gap-3 font-sans">
                  {error && (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-3.5 bg-red-950/20 border border-red-500/25 rounded-xl text-xs text-red-200/90 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center gap-2 font-bold text-red-400">
                        <Info className="w-4 h-4 shrink-0" />
                        <span>Generation Notice</span>
                      </div>
                      <p className="font-medium text-[11px] leading-relaxed">{error}</p>
                    </motion.div>
                  )}

                  <button
                    onClick={() => handleGenerate()}
                    disabled={loading || !vibe.trim()}
                    className={`w-full py-4 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-widest flex justify-center items-center gap-2.5 shadow-xl select-none transition-all cursor-pointer ${
                      loading || !vibe.trim()
                        ? "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
                        : "bg-white text-black hover:bg-white/95 active:scale-[0.99] shadow-[0_10px_35px_rgba(255,255,255,0.15)]"
                    }`}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4.5 h-4.5 animate-spin text-black" />
                        <span>GENERATING VARIATIONS...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4.5 h-4.5 fill-current text-black" />
                        <span>GENERATE 4 VARIATIONS</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Main wallpaper grid display */}
                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-10 flex flex-col items-center justify-center gap-5 text-center bg-white/[0.02] backdrop-blur-md rounded-2xl border border-white/10 p-4 shadow-xl font-sans"
                  >
                    {/* Simulated pulse outline */}
                    <div className="relative w-20 h-32 rounded-2xl border-2 border-dashed border-white/20 bg-white/[0.02] flex justify-center items-center overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent w-full h-[200%] animate-scroll-vertical" style={{ animationDuration: '3s', animationIterationCount: 'infinite', animationTimingFunction: 'linear' }} />
                      <Smartphone className="w-6 h-6 text-white/40 animate-pulse mt-0.5" />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <h4 className="text-xs font-bold text-white/80 uppercase tracking-widest font-mono">
                        Creating Wallpapers
                      </h4>
                      <div className="h-6 overflow-hidden">
                        <AnimatePresence mode="wait">
                          <motion.p
                            key={loadingStep}
                            initial={{ y: 15, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -15, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-[11px] text-white/50 font-medium italic"
                          >
                            {LOADING_PHRASES[loadingStep]}
                          </motion.p>
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentWallpapers && !loading && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col gap-4 font-sans"
                  >
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <h2 className="text-xs font-bold text-white/70 uppercase tracking-widest font-mono">
                        Generated Masterpieces
                      </h2>
                    </div>

                    {/* 2x2 Portrait grid */}
                    <div className="grid grid-cols-2 gap-3.5">
                      {currentWallpapers.map((wp, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ scale: 1.02, y: -2 }}
                          onClick={() => setActivePreview(wp)}
                          className="aspect-[9/16] bg-[#05060f]/60 rounded-2xl border border-white/10 overflow-hidden relative group cursor-pointer shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                        >
                          <img
                            src={wp.url}
                            alt={`Wallpaper variation ${index + 1}`}
                            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-80 group-hover:opacity-100 transition-opacity" />
                          
                          {/* Floating indicators inside card */}
                          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center z-10">
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-black/40 backdrop-blur-md rounded text-white/80">
                              #{(index + 1)}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleFavorite(wp);
                                }}
                                className="w-6 h-6 rounded bg-black/40 backdrop-blur-md border border-white/10 flex justify-center items-center text-white/70 hover:text-rose-400 transition-colors"
                              >
                                <Heart
                                  className={`w-3.5 h-3.5 ${
                                    savedWallpapers.find((item) => item.url === wp.url)
                                      ? "fill-rose-500 text-rose-500"
                                      : ""
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Empty Default State */}
                {!currentWallpapers && !loading && (
                  <div className="py-12 flex flex-col items-center justify-center text-center gap-3 border border-dashed border-white/10 rounded-2xl bg-white/[0.01] backdrop-blur-sm px-4 font-sans">
                    <Smartphone className="w-10 h-10 text-white/20" />
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-bold text-white/80 uppercase tracking-widest font-mono">No Wallpapers Generated Yet</p>
                      <p className="text-[10px] text-white/40 max-w-xs leading-relaxed">
                        Input a custom atmospheric vibe coordinates in step 1, select your favorite preset, and launch the generation engine!
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              /* Saved Vault List */
              <motion.div
                key="vault-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4 font-sans"
              >
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h2 className="text-xs font-bold text-white/80 uppercase tracking-widest flex items-center gap-2 font-mono">
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" /> Personal Vault
                  </h2>
                  <span className="text-[9px] font-mono text-white/60 bg-white/10 px-2 py-0.5 rounded border border-white/10">
                    {savedWallpapers.length} Saved
                  </span>
                </div>

                {savedWallpapers.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3.5">
                    {savedWallpapers.map((wp) => (
                      <motion.div
                        key={wp.id}
                        layoutId={`vault-card-${wp.id}`}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setActivePreview({ url: wp.url, prompt: wp.prompt })}
                        className="aspect-[9/16] bg-[#05060f]/60 rounded-2xl border border-white/10 overflow-hidden relative group cursor-pointer shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                      >
                        <img
                          src={wp.url}
                          alt="Saved wallpaper"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-80 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Quick controls in vault cards */}
                        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center z-10">
                          <span className="text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-black/40 backdrop-blur-md border border-white/5 rounded text-white/80">
                            {wp.preset}
                          </span>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                const refreshed = savedWallpapers.filter((item) => item.id !== wp.id);
                                saveToLocalVault(refreshed);
                              }}
                              className="w-6 h-6 rounded bg-black/40 hover:bg-red-950/40 backdrop-blur-md flex justify-center items-center text-white/60 hover:text-red-400 transition-colors border border-white/10"
                              title="Delete from Vault"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center gap-3 border border-dashed border-white/10 rounded-2xl bg-white/[0.01] backdrop-blur-sm px-4">
                    <Heart className="w-10 h-10 text-white/10" />
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-bold text-white/80 uppercase tracking-widest font-mono">Your Vault is Empty</p>
                      <p className="text-[10px] text-white/40 max-w-xs leading-relaxed">
                        Explore, generate stunning phone styles under custom moods, and click the Heart icon on any preview card to store them in your permanent local vault.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer info banner */}
        <footer className="px-6 py-4 border-t border-white/5 bg-white/[0.01] text-[10px] text-white/40 text-center select-none shrink-0 flex flex-col gap-2 font-mono">
          <p className="leading-normal">
            Tip: Long-press or right-click files to download directly if the click download is blocked on some devices.
          </p>
        </footer>

        {/* Full Screen Showcase Modal */}
        <AnimatePresence>
          {activePreview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#05060f]/90 backdrop-blur-3xl z-50 flex flex-col justify-between p-6 select-none font-sans"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-white/50" />
                  <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Lockscreen Preview</span>
                </div>
                <button
                  onClick={() => setActivePreview(null)}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex justify-center items-center text-white/60 hover:text-white transition-all active:scale-95 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* simulated phone mockup container */}
              <div className="my-auto flex justify-center items-center py-2 h-[60vh]">
                <div className="h-full aspect-[9/16] rounded-[28px] border-4 border-white/15 shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden relative bg-[#05060f]/20">
                  <img
                    src={activePreview.url}
                    alt="Wallpaper HD Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Floating simulated widgets overlay to show context */}
                  <div className="absolute top-10 left-0 right-0 text-center text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] font-display">
                    <p className="text-3xl font-light tracking-wide font-display">09:41</p>
                    <p className="text-[9px] uppercase tracking-widest font-mono text-white/65 mt-1">Tuesday, May 26</p>
                  </div>
                  
                  {/* prompt quote drawer inside mockup bottom overlay */}
                  <div className="absolute bottom-4 left-4 right-4 p-2.5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md text-white/95">
                    <p className="text-[8px] text-white/40 font-bold uppercase tracking-wider font-mono">Prompt Formula</p>
                    <p className="text-[10px] text-white/80 font-medium line-clamp-2 mt-0.5 italic leading-snug">
                      "{activePreview.prompt}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Action items sheet */}
              <div className="flex flex-col gap-3 font-sans">
                {showDownloadHint && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="p-2 bg-emerald-950/20 border border-emerald-500/25 text-emerald-300 text-[10px] text-center rounded-lg"
                  >
                    🚀 Triggered Download successfully! On Mobile, you can also long-press/deep-tap the wallpaper to save manually.
                  </motion.div>
                )}

                <div className="flex flex-col gap-2.5 font-sans">
                  {/* Primary Download Button */}
                  <button
                    onClick={() => handleDownload(activePreview)}
                    className="w-full py-3.5 bg-white hover:bg-white/90 text-black font-semibold rounded-2xl text-[11px] uppercase tracking-widest shadow-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4 text-black" />
                    <span>Download Wallpaper</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Favorite/Vault */}
                    <button
                      onClick={() => handleToggleFavorite(activePreview)}
                      className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-white/80 hover:text-white transition-all cursor-pointer font-medium text-xs"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          savedWallpapers.find((item) => item.url === activePreview.url)
                            ? "fill-rose-500 text-rose-500"
                            : "text-white/60"
                        }`}
                      />
                      <span>{savedWallpapers.find((item) => item.url === activePreview.url) ? 'Saved to Vault' : 'Save to Vault'}</span>
                    </button>

                    {/* Remix Button */}
                    <button
                      onClick={() => handleRemix(activePreview)}
                      className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-white/80 hover:text-white transition-all cursor-pointer font-medium text-xs"
                      title="Remix style"
                    >
                      <RefreshCw className="w-4 h-4 text-white/60" />
                      <span>Remix design</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div> {/* closing of inner glass layer */}
      </div>   {/* closing of outer frame */}

      {/* Styled inline animation helper for infinite background vertical scroll */}
      <style>{`
        @keyframes scroll-vertical {
          0% { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }
        .animate-scroll-vertical {
          animation: scroll-vertical 4s infinite linear;
        }
      `}</style>
    </div>
  );
}
