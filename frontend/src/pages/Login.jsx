import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// IMPORT DES LOGOS LOCAUX (Même dossier que ce fichier)
import logoHopital from "../assets/logo_lieu_stage.png";
import logoApp from "../assets/images.jpg";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [modeClair, setModeClair] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setErreur("Identifiants invalides. Veuillez réessayer.");
    } finally {
      setChargement(false);
    }
  }

  // Bascule entre mode clair et sombre
  const toggleMode = () => {
    setModeClair(!modeClair);
    document.body.classList.toggle('light-mode');
  };

  // Injection des animations CSS au montage
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');

      /* Animation des petites particules */
      @keyframes explode {
        0% { 
          transform: scale(0.5) translate(calc(-50% + 0px), calc(-50% + 0px)); 
          opacity: 0.1;
        }
        100% { 
          transform: scale(1.8) translate(calc(-50% + 0px), calc(-50% + 0px)); 
          opacity: 1;
        }
      }

      /* Animation des BOULLES - Chute élégante du haut */
      @keyframes fallBubble {
        0% { 
          transform: translateY(-100vh) scale(0.3) rotate(0deg); 
          opacity: 0;
        }
        10% {
          opacity: 0.7;
        }
        50% {
          transform: translateY(0vh) scale(1) rotate(180deg);
          opacity: 0.9;
        }
        80% {
          opacity: 0.6;
        }
        100% { 
          transform: translateY(100vh) scale(0.8) rotate(360deg); 
          opacity: 0;
        }
      }

      /* Effet Focus des inputs */
      input:focus {
        border-color: #00c8ff !important; /* Cyan électrique */
        background: #e8f7ff !important;
        box-shadow: 0 0 0 4px rgba(0, 200, 255, 0.15) !important;
      }

      /* Hover Bouton */
      button:hover:not(:disabled) {
        transform: translateY(-3px);
        box-shadow: 0 8px 30px rgba(0, 150, 255, 0.4) !important;
      }
      button:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none;
      }

      a:hover {
        color: #00c8ff !important;
        text-decoration: underline;
      }

      /* MODE CLAIR (Adapté à la nouvelle palette) */
      body.light-mode .pageContainer {
        background: radial-gradient(circle at center, #a0d0ff 0%, #5a9aff 100%) !important;
      }
      body.light-mode .mainCard {
        background: rgba(255, 255, 255, 0.4) !important;
        border: 1px solid rgba(255, 255, 255, 0.6) !important;
      }
      body.light-mode .leftPanel {
        background: linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(0, 180, 255, 0.1) 100%) !important;
      }
      body.light-mode .leftTitle {
        color: #002b5e !important;
        text-shadow: 0 2px 10px rgba(255,255,255,0.4) !important;
      }
      body.light-mode .leftSubtitle {
        color: #003a6a !important;
      }
      body.light-mode .badge {
        background: rgba(255, 255, 255, 0.6) !important;
        color: #004a8a !important;
        border-color: rgba(255, 255, 255, 0.6) !important;
      }
      body.light-mode .rightPanel {
        background: rgba(255, 255, 255, 0.95) !important;
      }
      body.light-mode .rightTitle {
        color: #002b5e !important;
      }
      body.light-mode .rightSubtitle {
        color: #005a9a !important;
      }
      body.light-mode .label {
        color: #004a7a !important;
      }
      body.light-mode .input {
        background: white !important;
        border-color: #b0d0f0 !important;
        color: #002b5e !important;
      }
      body.light-mode .forgotLink {
        color: #005a9a !important;
      }
      body.light-mode .erreur {
        color: #b71c1c !important;
        background: rgba(183, 28, 28, 0.08) !important;
      }
      body.light-mode .bouton {
        background: linear-gradient(135deg, #0060c0 0%, #0090ff 100%) !important;
      }
      body.light-mode .toggle-btn {
        background: rgba(255,255,255,0.3) !important;
        color: #002b5e !important;
        border-color: rgba(255,255,255,0.4) !important;
      }
      body.light-mode .toggle-btn:hover {
        background: rgba(255,255,255,0.5) !important;
      }
      body.light-mode .logoImgLeft {
        filter: brightness(0) !important;
      }
      body.light-mode .logoContainerLeft {
        background: rgba(255,255,255,0.5) !important;
        border-color: rgba(0, 150, 255, 0.2) !important;
      }
      body.light-mode .particle {
        opacity: 0.3 !important;
      }
      body.light-mode .giantBubble {
        background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.95), rgba(150, 210, 255, 0.3) 70%) !important;
        border: 1px solid rgba(255, 255, 255, 0.6) !important;
      }

      @media (max-width: 768px) {
        .mainCard {
          flex-direction: column;
          height: auto;
          width: 95%;
        }
        .leftPanel {
          width: 100%;
          padding: 2rem;
          border-right: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .rightPanel {
          width: 100%;
          padding: 2rem;
        }
        .logoContainerLeft {
          position: relative !important;
          bottom: auto !important;
          left: auto !important;
          margin-top: 0.5rem;
        }
      }
    `;
    document.head.appendChild(styleSheet);

    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  return (
    <div style={styles.pageContainer} className="pageContainer">
      
      {/* BOUTON MODE CLAIR/SOMBRE */}
      <button 
        onClick={toggleMode} 
        style={styles.toggleBtn} 
        className="toggle-btn"
      >
        {modeClair ? "🌙 Mode sombre" : "☀️ Mode clair"}
      </button>

      {/* --- ANIMATION DE L'EXPLOSION DE PARTICULES --- */}
      <div style={styles.explosionContainer}>
        {[...Array(50)].map((_, i) => {
          const angle = (i / 50) * Math.PI * 2;
          const radius = 30 + Math.random() * 70;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const size = 2 + Math.random() * 5;

          return (
            <div
              key={i}
              className="particle"
              style={{
                ...styles.particle,
                width: `${size}px`,
                height: `${size}px`,
                animation: `explode ${8 + Math.random() * 12}s infinite alternate ease-in-out`,
                animationDelay: `${Math.random() * 3}s`,
                left: "50%",
                top: "50%",
                transform: `translate(calc(-50% + ${x}vw), calc(-50% + ${y}vh))`,
                background: i % 3 === 0 ? "#4fc3ff" : (i % 3 === 1 ? "#2196f3" : "#e0f7fa"), // Cyan, Bleu, Blanc/Bleuté
              }}
            />
          );
        })}
      </div>

      {/* --- BOULLES QUI TOMBENT DU HAUT - PLUS CLAIRES --- */}
      <div style={styles.giantBubbleContainer}>
        {[...Array(15)].map((_, i) => {
          const size = 30 + Math.random() * 50;
          const leftPos = Math.random() * 100;
          const delay = Math.random() * 8;
          const duration = 12 + Math.random() * 10;
          
          return (
            <div
              key={i}
              className="giantBubble"
              style={{
                ...styles.giantBubble,
                width: `${size}px`,
                height: `${size}px`,
                left: `${leftPos}%`,
                top: `-${size}px`,
                animation: `fallBubble ${duration}s infinite ease-in-out`,
                animationDelay: `${delay}s`,
                background: "radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.95), rgba(0, 180, 255, 0.3) 70%)", // Blanc et bleu océan
                border: "1px solid rgba(255, 255, 255, 0.6)",
                boxShadow: "0 0 40px rgba(255, 255, 255, 0.15), inset -5px -5px 15px rgba(0, 50, 100, 0.05)",
                backdropFilter: "blur(1px)",
              }}
            />
          );
        })}
      </div>

      {/* Formes de fond floues (Nébuleuses) */}
      <div style={{...styles.nebula, width: '500px', height: '500px', top: '-20%', left: '-20%', background: 'radial-gradient(circle, rgba(0, 150, 255, 0.15), transparent 70%)'}}></div>
      <div style={{...styles.nebula, width: '400px', height: '400px', bottom: '-20%', right: '-20%', background: 'radial-gradient(circle, rgba(0, 200, 255, 0.10), transparent 70%)'}}></div>

      {/* --- CARTE PRINCIPALE DIVISÉE --- */}
      <div style={styles.mainCard} className="mainCard">
        
        {/* PARTIE GAUCHE : Branding & Mission + LOGO APP */}
        <div style={styles.leftPanel} className="leftPanel">
          <div style={styles.badge} className="badge">CHU Mohammed VI - Agadir</div>
          <h1 style={styles.leftTitle} className="leftTitle">HospiDecision AI</h1>
          <p style={styles.leftSubtitle} className="leftSubtitle">
            L'intelligence des données au service de la décision hospitalière.
          </p>
          <div style={styles.logoContainerLeft} className="logoContainerLeft">
            <img
              src={logoApp}
              alt="Logo HospiDecision AI"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </div>
        </div>

        {/* PARTIE DROITE : Formulaire de connexion + LOGO CHU */}
        <div style={styles.rightPanel} className="rightPanel">
          
          <div style={styles.logoContainerRight}>
            <img 
              src={logoHopital} 
              alt="Logo CHU" 
              style={styles.logoImgRight}
              onError={(e) => {
                console.error("logo-chu-agadir.png introuvable");
                e.target.style.display = 'none';
              }}
            />
          </div>

          <h2 style={styles.rightTitle} className="rightTitle">Connexion</h2>
          <p style={styles.rightSubtitle} className="rightSubtitle">Entrez vos identifiants pour accéder au système</p>

          <form style={{ width: "100%", marginTop: "1.5rem" }} onSubmit={handleSubmit}>
            
            <div style={styles.inputGroup}>
              <label style={styles.label} className="label">Nom d'utilisateur</label>
              <div style={styles.inputWrapper}>
                <input
                  style={styles.input}
                  className="input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="votre username"
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label} className="label">Mot de passe</label>
              <div style={styles.inputWrapper}>
                <input
                  style={styles.input}
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div style={styles.actionsRow}>
              {erreur && <p style={styles.erreur} className="erreur">{erreur}</p>}
            </div>

            <button style={styles.bouton} className="bouton" type="submit" disabled={chargement}>
              {chargement ? "Connexion..." : "Se connecter"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}

// --- TOUT LE STYLE CSS AVANCÉ (PALETTE BLEUE OCÉAN) ---
const styles = {
  pageContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "radial-gradient(circle at center, #003b6f 0%, #001a33 100%)", // Dégradé bleu océan profond
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Poppins', 'Segoe UI', sans-serif",
    transition: 'background 0.4s ease',
  },

  toggleBtn: {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: 999,
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "40px",
    padding: "10px 18px",
    color: "#cceeff",
    fontWeight: "600",
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "0.3s ease",
    boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
    fontFamily: "'Poppins', sans-serif",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  explosionContainer: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1,
    pointerEvents: "none",
  },
  particle: {
    position: "absolute",
    borderRadius: "50%",
    boxShadow: "0 0 20px rgba(0, 150, 255, 0.4)",
  },

  giantBubbleContainer: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 0,
    pointerEvents: "none",
    overflow: "hidden",
  },
  giantBubble: {
    position: "absolute",
    borderRadius: "50%",
  },

  nebula: {
    position: "absolute",
    borderRadius: "50%",
    filter: "blur(80px)",
    zIndex: 0,
  },

  mainCard: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    width: "900px",
    maxWidth: "95%",
    height: "550px",
    background: "rgba(255, 255, 255, 0.05)", // Translucide
    backdropFilter: "blur(25px)",
    WebkitBackdropFilter: "blur(25px)",
    borderRadius: "30px",
    boxShadow: "0 30px 80px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    overflow: "hidden",
    transition: 'all 0.4s ease',
  },

  leftPanel: {
  width: "45%",
  padding: "3rem 2.5rem",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",   // Centre verticalement
  alignItems: "center",       // Centre horizontalement
  textAlign: "center",        // Centre le texte
  position: "relative",
  background: "linear-gradient(135deg, rgba(0, 50, 100, 0.5) 0%, rgba(0, 150, 255, 0.05) 100%)",
  borderRight: "1px solid rgba(255,255,255,0.05)",
  transition: "all 0.4s ease",
},
  badge: {
    background: "rgba(0, 150, 255, 0.15)",
    backdropFilter: "blur(5px)",
    padding: "0.4rem 1rem",
    borderRadius: "20px",
    color: "#80d0ff", // Cyan clair
    fontSize: "0.7rem",
    fontWeight: "600",
    letterSpacing: "1px",
    marginBottom: "1rem",
    border: "1px solid rgba(0, 150, 255, 0.15)",
    transition: 'all 0.3s ease',
  },
  leftTitle: {
    color: "#e8f4ff", // Presque blanc
    fontSize: "2rem",
    fontWeight: "700",
    marginBottom: "0.5rem",
    lineHeight: "1.2",
    textShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
    transition: 'color 0.4s ease',
  },
  leftSubtitle: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: "0.85rem",
    lineHeight: "1.5",
    marginBottom: "1.5rem",
    transition: 'color 0.4s ease',
  },
  
  logoContainerLeft: {
  width: "110px",
  height: "110px",
  marginTop: "2rem",
  background: "rgba(255,255,255,0.03)",
  borderRadius: "12px",
  padding: "12px",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.05)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  transition: "all 0.4s ease",
},
  logoImgLeft: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    filter: "brightness(0) invert(1)",
    transition: 'filter 0.4s ease',
  },

  rightPanel: {
    width: "55%",
    padding: "2.5rem 3rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.85)", // Fond blanc légèrement bleuté
    transition: 'background 0.4s ease',
  },
  
  logoContainerRight: {
    width: "200px",
    height: "170px",
    marginBottom: "0.3rem",
  },
  logoImgRight: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  
  rightTitle: {
    fontSize: "1.6rem",
    fontWeight: "700",
    color: "#002b5e", // Bleu foncé
    marginBottom: "0.2rem",
    transition: 'color 0.4s ease',
  },
  rightSubtitle: {
    fontSize: "0.8rem",
    color: "#005a9a", // Bleu moyen
    marginBottom: "0.5rem",
    transition: 'color 0.4s ease',
  },
  
  inputGroup: {
    width: "100%",
    marginBottom: "1rem",
  },
  label: {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: "600",
    color: "#003a6a", // Bleu océan foncé
    marginBottom: "0.3rem",
    transition: 'color 0.4s ease',
  },
  inputWrapper: {
    width: "100%",
    position: "relative",
  },
  input: {
    width: "100%",
    padding: "0.8rem 1.2rem",
    border: "2px solid #b0d0f0", // Bordure bleutée
    borderRadius: "12px",
    background: "white",
    fontSize: "0.9rem",
    outline: "none",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    color: "#002b5e",
    fontFamily: "inherit",
  },

  actionsRow: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.2rem",
  },
  forgotLink: {
    fontSize: "0.75rem",
    color: "#005a9a",
    textDecoration: "none",
    fontWeight: "600",
    transition: "color 0.3s",
  },
  erreur: {
    color: "#c62828",
    fontSize: "0.75rem",
    fontWeight: "600",
    background: "rgba(198, 40, 40, 0.08)",
    padding: "0.3rem 0.8rem",
    borderRadius: "8px",
    margin: 0,
  },

  bouton: {
    width: "100%",
    padding: "0.8rem",
    border: "none",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #0050a0 0%, #0090ff 100%)", // Dégradé bleu océan vers cyan
    color: "white",
    fontSize: "0.95rem",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 15px rgba(0, 100, 255, 0.3)",
    fontFamily: "inherit",
  },
};