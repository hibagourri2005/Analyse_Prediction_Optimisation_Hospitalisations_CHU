import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Square } from "lucide-react";
import api from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import { useThemeAnalyste } from "../theme/ThemeAnalyste";

// NOTE : ce composant lit désormais le thème via useThemeAnalyste(), donc
// il doit être rendu à l'intérieur d'un LayoutAnalyste (ou de tout ThemeAnalysteProvider).
export default function AgentChat() {
  const { user } = useAuth();
  const { c } = useThemeAnalyste();
  const [messages, setMessages] = useState([
    { role: "agent", contenu: `Bonjour ${user?.nom_complet || ""}, je peux répondre à tes questions sur les hospitalisations, les KPI et les prédictions de durée de séjour. Que veux-tu savoir ?` },
  ]);
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);
  const finDesMessages = useRef(null);
  const controleurRef = useRef(null);

  useEffect(() => {
    finDesMessages.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, enCours]);

  async function envoyerMessage(e) {
    e.preventDefault();
    const question = saisie.trim();
    if (!question || enCours) return;

    setMessages((m) => [...m, { role: "user", contenu: question }]);
    setSaisie("");
    setEnCours(true);

    const controleur = new AbortController();
    controleurRef.current = controleur;

    try {
      const reponse = await api.post("/api/agent/chat", {
        message: question,
        historique: messages.slice(-6).map((m) => ({ role: m.role, contenu: m.contenu })),
      }, { signal: controleur.signal });
      setMessages((m) => [...m, { role: "agent", contenu: reponse.data.reponse, donnees: reponse.data.donnees }]);
    } catch (err) {
      if (err.code === "ERR_CANCELED" || err.name === "CanceledError") {
        setMessages((m) => [...m, { role: "agent", contenu: "Génération interrompue.", erreur: false }]);
      } else {
        const detail = err.response?.data?.detail || "Une erreur est survenue. Vérifie que le serveur Ollama tourne bien.";
        setMessages((m) => [...m, { role: "agent", contenu: detail, erreur: true }]);
      }
    } finally {
      setEnCours(false);
      controleurRef.current = null;
    }
  }

  function arreterGeneration() {
    controleurRef.current?.abort();
  }

  return (
    <div style={styles.conteneur}>
      <h2 style={styles.titre(c)}>Assistant IA</h2>

      <div className="hd-carte-glass" style={styles.zoneMessages(c)}>
        {messages.map((m, i) => (
          <div key={i} style={{ ...styles.ligneMessage, justifyContent: m.role === "user" ? "flex-end" : "flex-start", animation: "hd-entree 0.3s ease both" }}>
            {m.role === "agent" && <div style={styles.avatarAgent(c)}><Bot size={16} /></div>}
            <div style={styles.colonneAgent}>
              <div style={{
                ...styles.bulle,
                ...(m.role === "user" ? styles.bulleUser(c) : styles.bulleAgent(c)),
                ...(m.erreur ? styles.bulleErreur(c) : {}),
              }}>
                {m.contenu}
              </div>
              <TableauDonnees donnees={m.donnees} c={c} />
            </div>
            {m.role === "user" && <div style={styles.avatarUser(c)}><User size={16} /></div>}
          </div>
        ))}
        {enCours && (
          <div style={{ ...styles.ligneMessage, justifyContent: "flex-start" }}>
            <div style={styles.avatarAgent(c)}><Bot size={16} /></div>
            <div style={{ ...styles.bulle, ...styles.bulleAgent(c), display: "flex", gap: "4px", alignItems: "center" }}>
              <span style={styles.pointRebond(c, 0)} />
              <span style={styles.pointRebond(c, 0.15)} />
              <span style={styles.pointRebond(c, 0.3)} />
            </div>
          </div>
        )}
        <div ref={finDesMessages} />
      </div>

      <form onSubmit={envoyerMessage} style={styles.formulaire}>
        <input
          type="text"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder="Pose ta question sur les hospitalisations..."
          style={styles.input(c)}
          disabled={enCours}
        />
        {enCours ? (
          <button type="button" style={styles.boutonStop(c)} onClick={arreterGeneration} title="Arrêter la génération">
            <Square size={16} fill="currentColor" />
          </button>
        ) : (
          <button type="submit" style={styles.boutonEnvoyer(c)} disabled={!saisie.trim()}>
            <Send size={18} />
          </button>
        )}
      </form>
    </div>
  );
}

function TableauDonnees({ donnees, c }) {
  let lignes = null;

  if (Array.isArray(donnees) && donnees.length > 0 && typeof donnees[0] === "object") {
    lignes = donnees;
  } else if (donnees && Array.isArray(donnees.resultats) && donnees.resultats.length > 0) {
    lignes = donnees.resultats;
  }

  if (!lignes) return null;

  const colonnes = Object.keys(lignes[0]);

  return (
    <div style={styles.conteneurTableau(c)}>
      <table style={styles.tableau}>
        <thead>
          <tr>
            {colonnes.map((col) => <th key={col} style={styles.thTableau(c)}>{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {lignes.slice(0, 20).map((ligne, i) => (
            <tr key={i}>
              {colonnes.map((col) => <td key={col} style={styles.tdTableau(c)}>{String(ligne[col] ?? "—")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {lignes.length > 20 && (
        <p style={styles.noteTableau(c)}>Affichage limité aux 20 premières lignes sur {lignes.length}.</p>
      )}
    </div>
  );
}

const styles = {
  conteneur: { display: "flex", flexDirection: "column", height: "calc(100vh - 3rem)", maxWidth: "900px", padding: "1.5rem 2rem 0" },
  titre: (c) => ({ marginTop: 0, fontFamily: "'Poppins',sans-serif", color: c.texte }),

  zoneMessages: (c) => ({
    flex: 1, overflowY: "auto", padding: "1rem",
    background: c.panneau, backdropFilter: "blur(16px)",
    border: `1px solid ${c.bordure}`, borderRadius: "20px", boxShadow: c.ombre,
    display: "flex", flexDirection: "column", gap: "0.8rem",
  }),
  ligneMessage: { display: "flex", alignItems: "flex-end", gap: "0.5rem" },
  colonneAgent: { display: "flex", flexDirection: "column", gap: "0.4rem", maxWidth: "85%" },

  avatarAgent: (c) => ({ width: "28px", height: "28px", borderRadius: "50%", background: c.degradeAccent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 0 10px ${c.accentProfond}55` }),
  avatarUser: (c) => ({ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: c.texteAtténué, color: c.panneauSolide, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }),

  bulle: { padding: "0.6rem 0.9rem", borderRadius: "14px", fontSize: "0.9rem", lineHeight: 1.4, whiteSpace: "pre-line" },
  bulleAgent: (c) => ({ backgroundColor: c.panneauSolide, color: c.texte, border: `1px solid ${c.bordure}` }),
  bulleUser: (c) => ({ background: c.degradeAccent, color: "#fff", alignSelf: "flex-end" }),
  bulleErreur: (c) => ({ backgroundColor: `${c.danger}18`, color: c.danger, border: `1px solid ${c.danger}44` }),

  pointRebond: (c, delai) => ({ width: "6px", height: "6px", borderRadius: "50%", background: c.accent, animation: `hd-rebond 1.2s ease-in-out ${delai}s infinite` }),

  conteneurTableau: (c) => ({ backgroundColor: c.panneauSolide, border: `1px solid ${c.bordure}`, borderRadius: "10px", overflow: "auto", maxHeight: "300px" }),
  tableau: { width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" },
  thTableau: (c) => ({ background: c.degradeAccent, color: "#fff", padding: "0.4rem 0.6rem", textAlign: "left", position: "sticky", top: 0 }),
  tdTableau: (c) => ({ padding: "0.35rem 0.6rem", borderBottom: `1px solid ${c.bordure}`, whiteSpace: "nowrap", color: c.texte }),
  noteTableau: (c) => ({ fontSize: "0.72rem", color: c.texteAtténué, padding: "0.3rem 0.6rem", margin: 0 }),

  formulaire: { display: "flex", gap: "0.6rem", margin: "0.8rem 0 1.5rem" },
  input: (c) => ({ flex: 1, padding: "0.7rem 1rem", border: `1px solid ${c.bordure}`, borderRadius: "10px", fontSize: "0.9rem", background: c.panneauSolide, color: c.texte, outline: "none" }),
  boutonEnvoyer: (c) => ({ padding: "0.7rem 1rem", background: c.degradeAccent, color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", boxShadow: `0 6px 16px ${c.accentProfond}44` }),
  boutonStop: (c) => ({ padding: "0.7rem 1rem", background: c.danger, color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", boxShadow: `0 6px 16px ${c.danger}44` }),
};