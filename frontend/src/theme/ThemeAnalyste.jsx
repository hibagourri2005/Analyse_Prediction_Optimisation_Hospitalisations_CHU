import { createContext, useContext, useState, useEffect, useRef } from "react";

/**
 * Système de design partagé pour l'espace Analyste.
 * Palette "océan" identique à la page de connexion, déclinée en clair/sombre.
 * Un seul point de vérité pour que Sidebar, Layout et toutes les pages
 * restent visuellement cohérents et changent de thème ensemble.
 */

export const PALETTES = {
  sombre: {
    fond: "#001a33",
    fondProfond: "#00101f",
    panneau: "rgba(255,255,255,0.07)",
    panneauSolide: "#0e2c50",
    bordure: "rgba(79,195,255,0.22)",
    bordureForte: "rgba(79,195,255,0.4)",
    texte: "#f2f8ff",
    texteSecondaire: "rgba(232,244,255,0.72)",
    texteAtténué: "rgba(232,244,255,0.46)",
    accent: "#4fc3ff",
    accentVif: "#00c8ff",
    accentProfond: "#0090ff",
    degradeAccent: "linear-gradient(135deg,#0050a0 0%,#0090ff 100%)",
    succes: "#55efc4",
    alerte: "#fdcb6e",
    danger: "#ff7675",
    ombre: "0 20px 40px rgba(0,0,0,0.35)",
  },
  clair: {
    fond: "#eef5ff",
    fondProfond: "#dcebfd",
    panneau: "rgba(255,255,255,0.72)",
    panneauSolide: "#ffffff",
    bordure: "rgba(0,90,180,0.12)",
    bordureForte: "rgba(0,120,220,0.28)",
    texte: "#00294f",
    texteSecondaire: "#3d6a94",
    texteAtténué: "#7d9dbd",
    accent: "#0090ff",
    accentVif: "#00b8f0",
    accentProfond: "#0060c0",
    degradeAccent: "linear-gradient(135deg,#0060c0 0%,#0090ff 100%)",
    succes: "#0ca678",
    alerte: "#c98a1f",
    danger: "#c0392b",
    ombre: "0 20px 40px rgba(0,90,180,0.12)",
  },
};

const ThemeCtx = createContext(null);

export function ThemeAnalysteProvider({ children }) {
  const [modeSombre, setModeSombre] = useState(() => {
    try {
      const stocke = localStorage.getItem("hospidecision-theme");
      return stocke ? stocke === "sombre" : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("hospidecision-theme", modeSombre ? "sombre" : "clair");
    } catch {
      /* stockage indisponible, on ignore */
    }
  }, [modeSombre]);

  const c = PALETTES[modeSombre ? "sombre" : "clair"];
  const toggleTheme = () => setModeSombre((v) => !v);

  return (
    <ThemeCtx.Provider value={{ modeSombre, toggleTheme, c }}>
      <StylesGlobales />
      {children}
    </ThemeCtx.Provider>
  );
}

export function useThemeAnalyste() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useThemeAnalyste doit être utilisé dans ThemeAnalysteProvider");
  return ctx;
}

/** Injecte une seule fois la police et les keyframes utilisées par tout l'espace Analyste. */
function StylesGlobales() {
  useEffect(() => {
    if (document.getElementById("hd-styles-globales")) return;
    const style = document.createElement("style");
    style.id = "hd-styles-globales";
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');

      @keyframes hd-derive {
        0%   { transform: translate(0, 0) scale(1); }
        50%  { transform: translate(-20px, 24px) scale(1.06); }
        100% { transform: translate(0, 0) scale(1); }
      }
      @keyframes hd-entree {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes hd-lueur {
        0%, 100% { opacity: 0.55; }
        50%      { opacity: 1; }
      }
      @keyframes hd-pulse {
        0%, 100% { opacity: 0.5; }
        50%      { opacity: 0.15; }
      }
      @keyframes hd-balayage {
        0%   { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes hd-rebond {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
        40%           { transform: translateY(-5px); opacity: 1; }
      }
      .hd-carte-glass { transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease; }
      .hd-carte-glass:hover { transform: translateY(-3px); }
      .hd-ligne-hover:hover { filter: brightness(1.08); }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(79,195,255,0.35); border-radius: 10px; }
      @media (prefers-reduced-motion: reduce) {
        * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }
      }
    `;
    document.head.appendChild(style);
  }, []);
  return null;
}

/**
 * Fond d'ambiance discret : quelques halos flous qui dérivent lentement.
 * Signature visuelle de l'espace Analyste — calme et professionnelle,
 * contrairement à l'explosion de bulles de l'écran de connexion.
 */
export function FondAmbiance() {
  const { c } = useThemeAnalyste();
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true">
      <div style={{
        position: "absolute", width: "620px", height: "620px", borderRadius: "50%",
        top: "-15%", left: "-10%", filter: "blur(90px)",
        background: `radial-gradient(circle, ${c.accentProfond}22, transparent 70%)`,
        animation: "hd-derive 26s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", width: "520px", height: "520px", borderRadius: "50%",
        bottom: "-15%", right: "-8%", filter: "blur(90px)",
        background: `radial-gradient(circle, ${c.accentVif}1c, transparent 70%)`,
        animation: "hd-derive 32s ease-in-out infinite reverse",
      }} />
    </div>
  );
}

/** Nombre qui s'anime en comptant du départ jusqu'à sa valeur cible. */
export function NombreAnime({ valeur, duree = 900, suffixe = "" }) {
  const [affiche, setAffiche] = useState(0);
  const depart = useRef(null);
  const brut = Number(valeur) || 0;

  useEffect(() => {
    depart.current = null;
    let frame;
    function etape(t) {
      if (depart.current === null) depart.current = t;
      const progres = Math.min((t - depart.current) / duree, 1);
      const facilite = 1 - Math.pow(1 - progres, 3);
      setAffiche(Math.round(brut * facilite));
      if (progres < 1) frame = requestAnimationFrame(etape);
    }
    frame = requestAnimationFrame(etape);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brut, duree]);

  return <>{affiche.toLocaleString("fr-FR")}{suffixe}</>;
}