import { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";
import LayoutPrincipal from "../components/LayoutPrincipal";
import CarteKPI from "../components/CarteKPI";
import PanneauGraphique from "../components/PanneauGraphique";
import { useAuth } from "../context/AuthContext";
import { PALETTE } from "../theme/palette";

export default function DashboardChefService() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [kpi, setKpi] = useState(null);
  const [volumes, setVolumes] = useState([]);
  const [pathologies, setPathologies] = useState([]);
  const [modeSortie, setModeSortie] = useState([]);

  const [patients, setPatients] = useState([]);
  const [page, setPage] = useState(1);
  const [totalLignes, setTotalLignes] = useState(0);
  const [triPar, setTriPar] = useState("duree_sejour");
  const [ordre, setOrdre] = useState("desc");
  const [chargement, setChargement] = useState(true);
  const [chargementPatients, setChargementPatients] = useState(false);
  const [erreur, setErreur] = useState("");
  const taillePage = 10;

  // --- Recherche & filtres ---
  const [recherche, setRecherche] = useState("");
  const [rechercheSaisie, setRechercheSaisie] = useState(""); // valeur affichée dans l'input (avant délai)
  const [sexe, setSexe] = useState("");
  const [typeAdmission, setTypeAdmission] = useState("");
  const [modeSortieFiltre, setModeSortieFiltre] = useState("");
  const [pathologieFiltre, setPathologieFiltre] = useState("");
  const [pathologiesDisponibles, setPathologiesDisponibles] = useState([]);

  const idService = user.id_service;

  // Débounce : on attend 400ms après la dernière frappe avant de lancer la recherche
  useEffect(() => {
    const minuteur = setTimeout(() => {
      setRecherche(rechercheSaisie);
      setPage(1);
    }, 400);
    return () => clearTimeout(minuteur);
  }, [rechercheSaisie]);

  // Chargement des données fixes du service (KPI, graphiques, liste des pathologies pour le filtre)
  useEffect(() => {
    async function chargerDonneesFixes() {
      try {
        const [rKpi, rVolumes, rPatho, rSortie, rPathoDispo] = await Promise.all([
          api.get(`/api/kpi/service/${idService}`),
          api.get(`/api/kpi/volumes-mensuels`, { params: { id_service: idService } }),
          api.get(`/api/kpi/repartition/pathologie`, { params: { id_service: idService } }),
          api.get(`/api/kpi/repartition/mode_sortie`, { params: { id_service: idService } }),
          api.get(`/api/service/${idService}/pathologies-disponibles`),
        ]);
        setKpi(rKpi.data);
        setVolumes(rVolumes.data);
        setPathologies(rPatho.data.slice(0, 6));
        setModeSortie(rSortie.data);
        setPathologiesDisponibles(rPathoDispo.data);
      } catch (e) {
        setErreur("Erreur lors du chargement des données de votre service");
      } finally {
        setChargement(false);
      }
    }
    chargerDonneesFixes();
  }, [idService]);

  // Chargement de la liste des patients, dépend de la page, du tri ET des filtres
  const chargerPatients = useCallback(async () => {
    setChargementPatients(true);
    try {
      const reponse = await api.get(`/api/service/${idService}/patients`, {
        params: {
          page,
          taille_page: taillePage,
          tri_par: triPar,
          ordre,
          recherche: recherche || undefined,
          sexe: sexe || undefined,
          type_admission: typeAdmission || undefined,
          mode_sortie: modeSortieFiltre || undefined,
          pathologie: pathologieFiltre || undefined,
        },
      });
      setPatients(reponse.data.donnees);
      setTotalLignes(reponse.data.total_lignes);
    } catch (e) {
      // silencieux, non bloquant pour le reste du dashboard
    } finally {
      setChargementPatients(false);
    }
  }, [idService, page, triPar, ordre, recherche, sexe, typeAdmission, modeSortieFiltre, pathologieFiltre]);

  useEffect(() => {
    chargerPatients();
  }, [chargerPatients]);

  if (chargement) return <LayoutPrincipal titre="Dashboard"><p>Chargement...</p></LayoutPrincipal>;
  if (erreur) return <LayoutPrincipal titre="Dashboard"><p style={{ color: "red" }}>{erreur}</p></LayoutPrincipal>;

  const totalPages = Math.ceil(totalLignes / taillePage);
  const ecartPositif = kpi.ecart_vs_moyenne_globale >= 0;

  function changerTri(colonne) {
    if (triPar === colonne) {
      setOrdre(ordre === "asc" ? "desc" : "asc");
    } else {
      setTriPar(colonne);
      setOrdre("desc");
    }
    setPage(1);
  }

  function reinitialiserFiltres() {
    setRechercheSaisie("");
    setRecherche("");
    setSexe("");
    setTypeAdmission("");
    setModeSortieFiltre("");
    setPathologieFiltre("");
    setPage(1);
  }

  const filtresActifs = !!(recherche || sexe || typeAdmission || modeSortieFiltre || pathologieFiltre);

  return (
    <LayoutPrincipal titre={`Dashboard — ${kpi.nom_service}`}>
      {/* En-tête de bienvenue personnalisé */}
      <div style={styles.entete}>
        <h2 style={{ margin: 0 }}>Bienvenue, {user.nom_complet}</h2>
        <p style={{ margin: "0.3rem 0 0", opacity: 0.9 }}>
          Vous consultez le tableau de bord du service <strong>{kpi.nom_service}</strong> — classé{" "}
          <strong>#{kpi.rang_activite} sur {kpi.nb_services_total}</strong> en volume d'activité parmi tous les services du CHU.
        </p>
      </div>

      {/* Cartes KPI */}
      <div style={styles.grilleCartes}>
        <CarteKPI titre="Hospitalisations" valeur={kpi.total_hospitalisations} />
        <CarteKPI titre="Durée Moyenne Séjour" valeur={`${kpi.duree_moyenne_sejour} j`} couleur="#2b6cb0" />
        <CarteKPI titre="Taux Urgence" valeur={`${kpi.taux_urgence_pct} %`} couleur="#dd6b20" />
        <CarteKPI titre="Taux Décès" valeur={`${kpi.taux_deces_pct} %`} couleur="#e53e3e" />
        <CarteKPI titre="Taux Occupation" valeur={`${kpi.taux_occupation_pct} %`} couleur="#38a169" />
        <CarteKPI titre="Capacité en Lits" valeur={kpi.capacite_lits} couleur="#718096" />
      </div>

      {/* Comparaison à la moyenne + top pathologie/médecin */}
      <div style={styles.grilleInfos}>
        <div style={styles.carteInfo}>
          <p style={styles.labelInfo}>Durée de séjour vs moyenne du CHU</p>
          <p style={{ ...styles.valeurInfo, color: ecartPositif ? "#e53e3e" : "#38a169" }}>
            {ecartPositif ? "+" : ""}{kpi.ecart_vs_moyenne_globale} j
          </p>
          <p style={styles.sousInfo}>
            Votre service : {kpi.duree_moyenne_sejour} j — Moyenne CHU : {kpi.moyenne_globale_duree_sejour} j
          </p>
        </div>
        <div style={styles.carteInfo}>
          <p style={styles.labelInfo}>Pathologie la plus fréquente</p>
          <p style={styles.valeurInfoTexte}>{kpi.top_pathologie}</p>
          <p style={styles.sousInfo}>{kpi.top_pathologie_nb} cas enregistrés</p>
        </div>
        <div style={styles.carteInfo}>
          <p style={styles.labelInfo}>Médecin le plus actif</p>
          <p style={styles.valeurInfoTexte}>{kpi.top_medecin}</p>
          <p style={styles.sousInfo}>{kpi.top_medecin_nb} patients pris en charge</p>
        </div>
      </div>

      {/* Section graphiques — regroupée dans un bloc titré, avec une hiérarchie claire :
          1 grand graphique d'évolution en haut, puis 2 graphiques de répartition côte à côte */}
      <div style={styles.sectionTitreWrapper}>
        <h3 style={styles.sectionTitre}> Analyse de l'activité du service</h3>
      </div>

      <PanneauGraphique titre="Évolution mensuelle des admissions — votre service" largeurPleine>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={volumes}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="periode" tick={{ fontSize: 10 }} interval={2} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="total" stroke="#12325c" strokeWidth={2} dot={false} name="Admissions" />
          </LineChart>
        </ResponsiveContainer>
      </PanneauGraphique>

      <div style={styles.grilleGraphiquesDuo}>
        <PanneauGraphique titre="Top pathologies de votre service">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={pathologies} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#2b6cb0" />
            </BarChart>
          </ResponsiveContainer>
        </PanneauGraphique>

        <PanneauGraphique titre="Mode de sortie des patients">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={modeSortie} dataKey="total" nameKey="label" outerRadius={90} label>
                {modeSortie.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </PanneauGraphique>
      </div>

      {/* Raccourci vers le moteur de prédiction */}
      <div style={styles.encartPrediction}>
        <div>
          <strong>Besoin d'estimer la durée de séjour d'un nouveau patient ?</strong>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", opacity: 0.85 }}>
            Utilisez le moteur de prédiction basé sur le Machine Learning (modèle Ridge, précision R² = 0.84).
          </p>
        </div>
        <button style={styles.boutonPrediction} onClick={() => navigate("/prediction")}>
          Ouvrir le moteur de prédiction →
        </button>
      </div>

      {/* Section liste des patients — bloc séparé avec sa propre barre de recherche/filtres */}
      <div style={styles.sectionTitreWrapper}>
        <h3 style={styles.sectionTitre}>🧑‍⚕️ Patients du service</h3>
      </div>

      <PanneauGraphique titre={`${totalLignes} patient(s) trouvé(s)`} largeurPleine>
        {/* Barre de recherche + filtres */}
        <div style={styles.barreFiltres}>
          <input
            type="text"
            placeholder="Rechercher (pathologie, ville, médecin...)"
            value={rechercheSaisie}
            onChange={(e) => setRechercheSaisie(e.target.value)}
            style={styles.inputRecherche}
          />

          <select
            value={sexe}
            onChange={(e) => { setSexe(e.target.value); setPage(1); }}
            style={styles.selectFiltre}
          >
            <option value="">Sexe : tous</option>
            <option value="M">Homme</option>
            <option value="F">Femme</option>
          </select>

          <select
            value={typeAdmission}
            onChange={(e) => { setTypeAdmission(e.target.value); setPage(1); }}
            style={styles.selectFiltre}
          >
            <option value="">Type d'admission : tous</option>
            <option value="Urgence">Urgence</option>
            <option value="Programmée">Programmée</option>
            <option value="Transfert">Transfert</option>
          </select>

          <select
            value={modeSortieFiltre}
            onChange={(e) => { setModeSortieFiltre(e.target.value); setPage(1); }}
            style={styles.selectFiltre}
          >
            <option value="">Mode de sortie : tous</option>
            <option value="Domicile">Domicile</option>
            <option value="Transfert">Transfert</option>
            <option value="Décès">Décès</option>
          </select>

          <select
            value={pathologieFiltre}
            onChange={(e) => { setPathologieFiltre(e.target.value); setPage(1); }}
            style={styles.selectFiltre}
          >
            <option value="">Pathologie : toutes</option>
            {pathologiesDisponibles.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {filtresActifs && (
            <button style={styles.boutonReset} onClick={reinitialiserFiltres}>
              ✕ Réinitialiser
            </button>
          )}
        </div>

        <div style={{ overflowX: "auto", position: "relative", minHeight: "120px" }}>
          {chargementPatients && (
            <div style={styles.overlayChargement}>Mise à jour...</div>
          )}
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID Patient</th>
                <th style={styles.th} onClick={() => changerTri("age")}>Âge {triPar === "age" ? (ordre === "asc" ? "▲" : "▼") : ""}</th>
                <th style={styles.th}>Sexe</th>
                <th style={styles.th}>Ville</th>
                <th style={styles.th} onClick={() => changerTri("date_entree")}>Entrée {triPar === "date_entree" ? (ordre === "asc" ? "▲" : "▼") : ""}</th>
                <th style={styles.th} onClick={() => changerTri("duree_sejour")}>Durée {triPar === "duree_sejour" ? (ordre === "asc" ? "▲" : "▼") : ""}</th>
                <th style={styles.th}>Pathologie</th>
                <th style={styles.th}>Médecin</th>
                <th style={styles.th}>Sortie</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 && !chargementPatients && (
                <tr>
                  <td style={styles.td} colSpan={9} align="center">
                    Aucun patient ne correspond à ces critères.
                  </td>
                </tr>
              )}
              {patients.map((p) => (
                <tr key={p.id_fait}>
                  <td style={styles.td}>{p.id_patient}</td>
                  <td style={styles.td}>{p.age}</td>
                  <td style={styles.td}>{p.sexe}</td>
                  <td style={styles.td}>{p.ville}</td>
                  <td style={styles.td}>{p.date_entree}</td>
                  <td style={{ ...styles.td, fontWeight: p.duree_sejour > 15 ? 700 : 400, color: p.duree_sejour > 15 ? "#e53e3e" : "#333" }}>
                    {p.duree_sejour} j
                  </td>
                  <td style={styles.td}>{p.pathologie}</td>
                  <td style={styles.td}>{p.medecin || "—"}</td>
                  <td style={styles.td}>{p.mode_sortie}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={styles.pagination}>
          <button style={styles.boutonPage} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Précédent
          </button>
          <span style={{ margin: "0 1rem" }}>Page {page} / {totalPages || 1}</span>
          <button style={styles.boutonPage} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Suivant
          </button>
        </div>
      </PanneauGraphique>
    </LayoutPrincipal>
  );
}

const styles = {
  entete: {
    backgroundColor: "#12325c",
    color: "white",
    padding: "1.3rem 1.6rem",
    borderRadius: "10px",
    marginBottom: "1.3rem",
  },
  grilleCartes: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "1rem",
    marginBottom: "1.3rem",
  },
  grilleInfos: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1rem",
    marginBottom: "1.5rem",
  },
  carteInfo: {
    backgroundColor: "white",
    padding: "1rem 1.2rem",
    borderRadius: "10px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  labelInfo: {
    fontSize: "0.8rem",
    color: "#666",
    margin: 0,
  },
  valeurInfo: {
    fontSize: "1.6rem",
    fontWeight: 700,
    margin: "0.2rem 0",
  },
  valeurInfoTexte: {
    fontSize: "1.05rem",
    fontWeight: 700,
    margin: "0.2rem 0",
    color: "#12325c",
  },
  sousInfo: {
    fontSize: "0.78rem",
    color: "#888",
    margin: 0,
  },
  sectionTitreWrapper: {
    marginTop: "0.5rem",
    marginBottom: "0.8rem",
  },
  sectionTitre: {
    margin: 0,
    fontSize: "1.05rem",
    color: "#12325c",
    borderBottom: "2px solid #e2e8f0",
    paddingBottom: "0.4rem",
  },
  grilleGraphiquesDuo: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1.2rem",
    marginBottom: "1.5rem",
  },
  encartPrediction: {
    backgroundColor: "#e8f0fe",
    padding: "1.1rem 1.5rem",
    borderRadius: "10px",
    marginBottom: "1.5rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.8rem",
  },
  boutonPrediction: {
    padding: "0.6rem 1.2rem",
    backgroundColor: "#12325c",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.9rem",
    whiteSpace: "nowrap",
  },
  barreFiltres: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.6rem",
    marginBottom: "1rem",
    alignItems: "center",
  },
  inputRecherche: {
    flex: "1 1 220px",
    padding: "0.5rem 0.7rem",
    border: "1px solid #cbd5e0",
    borderRadius: "6px",
    fontSize: "0.85rem",
  },
  selectFiltre: {
    padding: "0.5rem 0.6rem",
    border: "1px solid #cbd5e0",
    borderRadius: "6px",
    fontSize: "0.85rem",
    backgroundColor: "white",
  },
  boutonReset: {
    padding: "0.5rem 0.8rem",
    backgroundColor: "#fed7d7",
    color: "#c53030",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.82rem",
    fontWeight: 600,
  },
  overlayChargement: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: "0.4rem",
    textAlign: "center",
    fontSize: "0.78rem",
    color: "#12325c",
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.83rem",
  },
  th: {
    backgroundColor: "#12325c",
    color: "white",
    padding: "0.55rem",
    textAlign: "left",
    cursor: "pointer",
    userSelect: "none",
  },
  td: {
    padding: "0.45rem 0.55rem",
    borderBottom: "1px solid #eee",
  },
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginTop: "1rem",
  },
  boutonPage: {
    padding: "0.4rem 1rem",
    backgroundColor: "#12325c",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};