import { useEffect, useState } from "react";
import api from "../api/axiosConfig";
import LayoutPrincipal from "../components/LayoutPrincipal";
import LayoutChefService from "../components/LayoutChefService";
import { useAuth } from "../context/AuthContext";

const PATHOLOGIES_PAR_SERVICE = {
  "Cardiologie": ["Infarctus du myocarde", "Insuffisance cardiaque", "Arythmie", "Hypertension artérielle sévère", "Angine de poitrine"],
  "Pédiatrie": ["Bronchiolite", "Gastro-entérite aiguë", "Pneumonie infantile", "Fièvre typhoïde", "Déshydratation sévère"],
  "Chirurgie Générale": ["Appendicite", "Hernie inguinale", "Occlusion intestinale", "Cholécystite", "Péritonite"],
  "Urgences": ["Traumatisme crânien", "Polytraumatisme", "Intoxication aiguë", "Douleur abdominale aiguë", "AVC suspecté"],
  "Maternité": ["Accouchement normal", "Césarienne", "Pré-éclampsie", "Grossesse à risque", "Hémorragie post-partum"],
  "Oncologie": ["Cancer du sein", "Cancer colorectal", "Lymphome", "Cancer du poumon", "Leucémie"],
  "Néphrologie": ["Insuffisance rénale chronique", "Insuffisance rénale aiguë", "Lithiase rénale", "Néphrite", "Dialyse"],
  "Médecine Interne": ["Diabète décompensé", "Anémie sévère", "Infection généralisée", "Bilan diagnostique complexe", "Fièvre inexpliquée"],
  "Orthopédie": ["Fracture du fémur", "Fracture du bras", "Prothèse de hanche", "Entorse grave", "Rupture ligamentaire"],
  "Pneumologie": ["Pneumonie", "Asthme sévère", "BPCO décompensée", "Tuberculose", "Embolie pulmonaire"],
  "Gastro-Entérologie": ["Ulcère gastroduodénal", "Hépatite", "Pancréatite aiguë", "Colite", "Hémorragie digestive"],
  "Urologie": ["Colique néphrétique", "Infection urinaire sévère", "Hypertrophie prostatique", "Cancer de la vessie", "Rétention urinaire"],
  "Neurologie": ["AVC ischémique", "Épilepsie", "Migraine sévère", "Méningite", "Sclérose en plaques"],
  "Réanimation": ["Choc septique", "Détresse respiratoire aiguë", "Coma", "Polytraumatisme grave", "Défaillance multi-organes"],
  "Dermatologie": ["Brûlure étendue", "Infection cutanée sévère", "Psoriasis sévère", "Eczéma sévère", "Cellulite"],
  "Orl": ["Otite sévère", "Sinusite chronique", "Amygdalite", "Surdité brutale", "Vertige sévère"],
};

function calculerTrancheAge(age) {
  if (age <= 18) return "0-18";
  if (age <= 40) return "19-40";
  if (age <= 60) return "41-60";
  return "60+";
}

function formaterDuree(joursDecimal) {
  const totalHeures = Math.round(joursDecimal * 24);
  const jours = Math.floor(totalHeures / 24);
  const heures = totalHeures % 24;

  if (jours === 0) return `${heures} h`;
  if (heures === 0) return `${jours} j`;
  return `${jours} j ${heures} h`;
}
export default function Prediction() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [formulaire, setFormulaire] = useState({
    age: 45,
    sexe: "M",
    id_service: user.role === "chef_service" ? user.id_service : "",
    type_admission: "Urgence",
    pathologie: "",
  });
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  const Layout = user.role === "chef_service" ? LayoutChefService : LayoutPrincipal;

  useEffect(() => {
    api.get("/api/services").then((r) => setServices(r.data));
  }, []);

  const serviceSelectionne = services.find((s) => s.id_service === Number(formulaire.id_service));
  const pathologiesDisponibles = serviceSelectionne ? PATHOLOGIES_PAR_SERVICE[serviceSelectionne.nom_service] || [] : [];

  function handleChange(champ, valeur) {
    setFormulaire((f) => ({ ...f, [champ]: valeur, ...(champ === "id_service" ? { pathologie: "" } : {}) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur("");
    setResultat(null);
    setChargement(true);
    try {
      const reponse = await api.post("/api/predict", {
        age: Number(formulaire.age),
        sexe: formulaire.sexe,
        id_service: Number(formulaire.id_service),
        type_admission: formulaire.type_admission,
        pathologie: formulaire.pathologie,
        tranche_age: calculerTrancheAge(Number(formulaire.age)),
      });
      setResultat(reponse.data);
    } catch (err) {
      setErreur(err.response?.data?.detail || "Erreur lors de la prédiction");
    } finally {
      setChargement(false);
    }
  }

  return (
    <Layout titre="Prédiction de durée de séjour">
      <div style={styles.conteneur}>
        <form className="hd-carte-glass" style={styles.formulaire} onSubmit={handleSubmit}>
          <h3 style={styles.formTitre}>Paramètres du patient</h3>

          <label style={styles.label}>Âge</label>
          <input style={styles.input} type="number" min="0" max="120" value={formulaire.age} onChange={(e) => handleChange("age", e.target.value)} required />

          <label style={styles.label}>Sexe</label>
          <select style={styles.input} value={formulaire.sexe} onChange={(e) => handleChange("sexe", e.target.value)}>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </select>

          <label style={styles.label}>Service</label>
          <select style={styles.input} value={formulaire.id_service} onChange={(e) => handleChange("id_service", e.target.value)} disabled={user.role === "chef_service"} required>
            <option value="">— Choisir un service —</option>
            {services.map((s) => <option key={s.id_service} value={s.id_service}>{s.nom_service}</option>)}
          </select>

          <label style={styles.label}>Type d'admission</label>
          <select style={styles.input} value={formulaire.type_admission} onChange={(e) => handleChange("type_admission", e.target.value)}>
            <option value="Urgence">Urgence</option>
            <option value="Programmée">Programmée</option>
            <option value="Transfert">Transfert</option>
          </select>

          <label style={styles.label}>Pathologie</label>
          <select style={styles.input} value={formulaire.pathologie} onChange={(e) => handleChange("pathologie", e.target.value)} disabled={!serviceSelectionne} required>
            <option value="">— Choisir une pathologie —</option>
            {pathologiesDisponibles.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          {erreur && <p style={styles.erreur}>{erreur}</p>}

          <button style={styles.bouton} type="submit" disabled={chargement}>
            {chargement ? "Calcul en cours..." : "Prédire la durée de séjour"}
          </button>
        </form>

        {resultat && (
          <div className="hd-carte-glass" style={styles.resultat}>
            <p style={styles.resultatLabel}>Durée de séjour prédite</p>
            <p style={styles.resultatValeur}>{formaterDuree(resultat.duree_predite_jours)}</p>
            <p style={styles.resultatService}>Service : {resultat.nom_service}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

const styles = {
  conteneur: { display: "flex", gap: "2rem", alignItems: "flex-start", flexWrap: "wrap" },
  formulaire: { backgroundColor: "rgba(255,255,255,0.85)", backdropFilter: "blur(14px)", padding: "1.8rem", borderRadius: "20px", boxShadow: "0 12px 30px rgba(0,60,120,0.1)", border: "1px solid rgba(0,90,180,0.1)", width: "380px", display: "flex", flexDirection: "column" },
  formTitre: { marginTop: 0, fontFamily: "'Poppins',sans-serif", color: "#00294f" },
  label: { fontSize: "0.85rem", color: "#3d6a94", marginBottom: "0.3rem", marginTop: "0.8rem", fontWeight: 600 },
  input: { padding: "0.6rem 0.7rem", border: "1px solid rgba(0,90,180,0.18)", borderRadius: "10px", fontSize: "0.95rem", background: "#fff", color: "#00294f", outline: "none" },
  bouton: { marginTop: "1.5rem", padding: "0.75rem", background: "linear-gradient(135deg,#0060c0 0%,#0090ff 100%)", color: "white", border: "none", borderRadius: "12px", fontSize: "1rem", fontWeight: 600, cursor: "pointer", boxShadow: "0 8px 20px rgba(0,120,220,0.3)" },
  erreur: { color: "#c0392b", fontSize: "0.85rem", marginTop: "0.8rem" },
  resultat: { backgroundColor: "rgba(255,255,255,0.85)", backdropFilter: "blur(14px)", padding: "2.2rem", borderRadius: "20px", boxShadow: "0 12px 30px rgba(0,60,120,0.1)", border: "1px solid rgba(0,90,180,0.1)", textAlign: "center", minWidth: "280px", borderTop: "5px solid #0090ff" },
  resultatLabel: { color: "#3d6a94", fontSize: "0.9rem", margin: 0 },
  resultatValeur: { fontSize: "2.6rem", fontWeight: 700, color: "#00294f", margin: "0.5rem 0", fontFamily: "'Poppins',sans-serif" },
  resultatService: { color: "#3d6a94", fontSize: "0.85rem", margin: 0 },
};