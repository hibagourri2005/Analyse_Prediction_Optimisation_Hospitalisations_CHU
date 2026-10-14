import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "../api/axiosConfig";
import LayoutChefService from "../components/LayoutChefService";
import CarteKPI from "../components/CarteKPI";
import PanneauGraphique from "../components/PanneauGraphique";
import { useAuth } from "../context/AuthContext";
import { useThemeAnalyste } from "../theme/ThemeAnalyste";

export default function VueEnsembleChefService() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { c } = useThemeAnalyste();
  const idService = user.id_service;

  const [kpi, setKpi] = useState(null);
  const [volumes, setVolumes] = useState([]);
  const [sexe, setSexe] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const palette = [c.accent, c.accentVif, c.succes, c.alerte, c.danger, c.accentProfond];

  useEffect(() => {
    async function charger() {
      const appels = [
        { nom: "kpi", promesse: api.get(`/api/kpi/service/${idService}`) },
        { nom: "volumes", promesse: api.get(`/api/kpi/volumes-mensuels`, { params: { id_service: idService } }) },
        { nom: "sexe", promesse: api.get(`/api/kpi/repartition/sexe`, { params: { id_service: idService } }) },
      ];
      const resultats = await Promise.allSettled(appels.map((a) => a.promesse));
      const echecs = [];
      resultats.forEach((res, i) => {
        const nom = appels[i].nom;
        if (res.status === "rejected") {
          echecs.push(nom);
          console.error(`[VueEnsemble] Échec "${nom}" →`, res.reason?.response?.status);
          return;
        }
        if (nom === "kpi") setKpi(res.value.data);
        if (nom === "volumes") setVolumes(res.value.data);
        if (nom === "sexe") setSexe(res.value.data);
      });
      if (echecs.length) setErreur(`Erreur de chargement : ${echecs.join(", ")}.`);
      setChargement(false);
    }
    charger();
  }, [idService]);

  if (chargement) {
    return (
      <LayoutChefService>
        <div className="hd-carte-glass" style={styles.skeletonPanneau(c)} />
      </LayoutChefService>
    );
  }
  if (erreur) {
    return (
      <LayoutChefService>
        <div style={styles.erreurBanner(c)}>{erreur}</div>
      </LayoutChefService>
    );
  }

  const ecartPositif = kpi.ecart_vs_moyenne_globale >= 0;
  const tooltipStyle = {
    contentStyle: { background: c.panneauSolide, border: `1px solid ${c.bordure}`, borderRadius: "10px", color: c.texte, fontSize: "0.82rem" },
    labelStyle: { color: c.texteSecondaire },
  };
  const axisTick = { fill: c.texteSecondaire, fontSize: 10 };

  return (
    <LayoutChefService>
      <div className="hd-carte-glass" style={styles.entete(c)}>
        <h2 style={{ margin: 0, fontFamily: "'Poppins',sans-serif" }}>Bienvenue, {user.nom_complet}</h2>
        <p style={{ margin: "0.3rem 0 0", opacity: 0.9 }}>
          Service <strong>{kpi.nom_service}</strong> — classé <strong>#{kpi.rang_activite} / {kpi.nb_services_total}</strong> en volume d'activité.
        </p>
      </div>

      <div style={styles.grilleCartes}>
        <CarteKPI titre="Hospitalisations" valeur={kpi.total_hospitalisations} />
        <CarteKPI titre="Patients uniques" valeur={kpi.patients_uniques} />
        <CarteKPI titre="Âge moyen" valeur={`${kpi.age_moyen} ans`} />
        <CarteKPI titre="Durée Moyenne Séjour" valeur={`${kpi.duree_moyenne_sejour} j`} couleur={c.accentProfond} />
        <CarteKPI titre="Taux Guérison" valeur={`${kpi.taux_guerison_pct} %`} couleur={c.succes} />
        <CarteKPI titre="Taux Décès" valeur={`${kpi.taux_deces_pct} %`} couleur={c.danger} />
        <CarteKPI titre="Taux Occupation" valeur={`${kpi.taux_occupation_pct} %`} couleur={c.alerte} />
        <CarteKPI titre="Capacité en Lits" valeur={kpi.capacite_lits} couleur={c.texteAtténué} />
      </div>

      <div style={styles.grilleInfos}>
        <div className="hd-carte-glass" style={styles.carteInfo(c)}>
          <p style={styles.labelInfo(c)}>Durée de séjour vs moyenne du CHU</p>
          <p style={{ ...styles.valeurInfo, color: ecartPositif ? c.danger : c.succes }}>
            {ecartPositif ? "+" : ""}{kpi.ecart_vs_moyenne_globale} j
          </p>
          <p style={styles.sousInfo(c)}>Votre service : {kpi.duree_moyenne_sejour} j — Moyenne CHU : {kpi.moyenne_globale_duree_sejour} j</p>
        </div>
        <div className="hd-carte-glass" style={styles.carteInfo(c)}>
          <p style={styles.labelInfo(c)}>Pathologie la plus fréquente</p>
          <p style={styles.valeurInfoTexte(c)}>{kpi.top_pathologie}</p>
          <p style={styles.sousInfo(c)}>{kpi.top_pathologie_nb} cas</p>
        </div>
        <div className="hd-carte-glass" style={styles.carteInfo(c)}>
          <p style={styles.labelInfo(c)}>Médecin le plus actif</p>
          <p style={styles.valeurInfoTexte(c)}>{kpi.top_medecin}</p>
          <p style={styles.sousInfo(c)}>{kpi.top_medecin_nb} patients</p>
        </div>
      </div>

      <div style={styles.grilleGraphiquesDuo}>
        <PanneauGraphique titre="Évolution mensuelle des admissions">
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={volumes}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.bordure} />
              <XAxis dataKey="periode" tick={axisTick} interval={2} />
              <YAxis tick={axisTick} />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="total" stroke={c.accentVif} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </PanneauGraphique>

        <PanneauGraphique titre="Répartition par sexe">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={sexe} dataKey="total" nameKey="label" innerRadius={45} outerRadius={85} label>
                {sexe.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
              </Pie>
              <Tooltip {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </PanneauGraphique>
      </div>

      <p style={styles.lienVoirPlus(c)} onClick={() => navigate("/dashboard/chef-service/graphiques")}>
        Voir tous les graphiques détaillés →
      </p>

      <div style={styles.raccourcis}>
        <div className="hd-carte-glass" style={styles.carteRaccourci(c)} onClick={() => navigate("/dashboard/chef-service/patients")}>
          <strong style={{ color: c.texte }}>Liste des patients</strong>
          <p style={styles.sousInfo(c)}>Consulter, rechercher et filtrer les patients du service</p>
        </div>
        <div className="hd-carte-glass" style={styles.carteRaccourci(c)} onClick={() => navigate("/dashboard/chef-service/prediction")}>
          <strong style={{ color: c.texte }}>Prédiction durée de séjour</strong>
          <p style={styles.sousInfo(c)}>Estimer la durée de séjour d'un nouveau patient</p>
        </div>
      </div>
    </LayoutChefService>
  );
}

const styles = {
  entete: (c) => ({ background: c.degradeAccent, color: "#fff", padding: "1.3rem 1.6rem", borderRadius: "20px", marginBottom: "1.3rem", boxShadow: c.ombre }),
  erreurBanner: (c) => ({ background: `${c.danger}18`, color: c.danger, padding: "1rem", borderRadius: "12px", fontWeight: 600, textAlign: "center" }),
  skeletonPanneau: (c) => ({ background: c.panneau, backdropFilter: "blur(16px)", border: `1px solid ${c.bordure}`, borderRadius: "20px", height: "300px", animation: "hd-pulse 1.5s ease-in-out infinite" }),

  grilleCartes: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1.3rem" },
  grilleInfos: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" },
  carteInfo: (c) => ({ background: c.panneau, backdropFilter: "blur(14px)", padding: "1rem 1.2rem", borderRadius: "16px", border: `1px solid ${c.bordure}`, boxShadow: c.ombre }),
  labelInfo: (c) => ({ fontSize: "0.8rem", color: c.texteSecondaire, margin: 0 }),
  valeurInfo: { fontSize: "1.6rem", fontWeight: 700, margin: "0.2rem 0", fontFamily: "'Poppins',sans-serif" },
  valeurInfoTexte: (c) => ({ fontSize: "1.05rem", fontWeight: 700, margin: "0.2rem 0", color: c.accent }),
  sousInfo: (c) => ({ fontSize: "0.78rem", color: c.texteAtténué, margin: 0 }),
  grilleGraphiquesDuo: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.2rem", marginBottom: "0.6rem" },
  lienVoirPlus: (c) => ({ textAlign: "right", color: c.accent, fontSize: "0.85rem", cursor: "pointer", marginBottom: "1.5rem" }),
  raccourcis: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" },
  carteRaccourci: (c) => ({ background: c.panneau, backdropFilter: "blur(14px)", padding: "1.1rem 1.3rem", borderRadius: "16px", border: `1px solid ${c.bordure}`, boxShadow: c.ombre, cursor: "pointer" }),
};