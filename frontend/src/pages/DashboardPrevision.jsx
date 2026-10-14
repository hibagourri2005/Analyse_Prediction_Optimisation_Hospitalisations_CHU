import { useEffect, useState } from "react";
import { BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import api from "../api/axiosConfig";
import LayoutAnalyste from "../components/LayoutAnalyste";
import CarteKPI from "../components/CarteKPI";
import PanneauGraphique from "../components/PanneauGraphique";
import { useThemeAnalyste } from "../theme/ThemeAnalyste";

export default function DashboardPrevision() {
  return (
    <LayoutAnalyste>
      <DashboardPrevisionContenu />
    </LayoutAnalyste>
  );
}

function DashboardPrevisionContenu() {
  const { c } = useThemeAnalyste();
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    async function charger() {
      try {
        const r = await api.get("/api/predictions/stats");
        setDonnees(r.data);
      } catch (e) {
        setErreur("Erreur de chargement des données de prédiction");
      } finally {
        setChargement(false);
      }
    }
    charger();
  }, []);

  if (erreur) {
    return (
      <div style={styles.pageBackground}>
        <h2 style={styles.titre(c)}>Vue Prévisionnelle</h2>
        <div style={styles.erreurBanner(c)}>{erreur}</div>
      </div>
    );
  }
  if (chargement) {
    return (
      <div style={styles.pageBackground}>
        <h2 style={styles.titre(c)}>Vue Prévisionnelle</h2>
        <div className="hd-carte-glass" style={styles.skeletonPanneau(c)} />
      </div>
    );
  }

  const { metriques_modele, ecart_moyen_global, ecart_par_service, distribution_ecarts, nuage_points, charge_par_service } = donnees;
  const tooltipStyle = {
    contentStyle: { background: c.panneauSolide, border: `1px solid ${c.bordure}`, borderRadius: "10px", color: c.texte, fontSize: "0.82rem" },
    labelStyle: { color: c.texteSecondaire },
  };
  const axisTick = { fill: c.texteSecondaire, fontSize: 10 };
  const legendStyle = { color: c.texteSecondaire, fontSize: "0.78rem" };

  return (
    <div style={styles.pageBackground}>
      <h2 style={styles.titre(c)}>Vue Prévisionnelle</h2>
      <div style={styles.grilleCartes}>
        <CarteKPI titre="Écart Moyen Global" valeur={`${ecart_moyen_global} j`} couleur={c.accentProfond} />
        <CarteKPI titre={`MAE — Modèle ${metriques_modele.modele}`} valeur={`${metriques_modele.MAE} j`} couleur={c.alerte} />
        <CarteKPI titre="RMSE" valeur={`${metriques_modele.RMSE} j`} couleur={c.danger} />
        <CarteKPI titre="R² (précision)" valeur={metriques_modele.R2} couleur={c.succes} />
      </div>

      <div style={styles.grilleGraphiques}>
        <PanneauGraphique titre="Durée réelle vs prédite par service" largeurPleine>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={charge_par_service}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.bordure} />
              <XAxis dataKey="nom_service" tick={axisTick} angle={-25} textAnchor="end" height={70} />
              <YAxis tick={axisTick} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="duree_reelle" fill={c.accentProfond} name="Durée réelle" radius={[4, 4, 0, 0]} />
              <Bar dataKey="duree_predite" fill={c.accentVif} name="Durée prédite" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PanneauGraphique>

        <PanneauGraphique titre="Précision du modèle : réel vs prédit">
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke={c.bordure} />
              <XAxis type="number" dataKey="reel" name="Durée réelle" unit="j" tick={axisTick} />
              <YAxis type="number" dataKey="predit" name="Durée prédite" unit="j" tick={axisTick} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} {...tooltipStyle} />
              <Scatter data={nuage_points} fill={c.accentProfond} opacity={0.6} />
              <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 60, y: 60 }]} stroke={c.danger} strokeDasharray="4 4" label="Prédiction parfaite" />
            </ScatterChart>
          </ResponsiveContainer>
        </PanneauGraphique>

        <PanneauGraphique titre="Écart moyen de prédiction par service (jours)">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={ecart_par_service} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.bordure} />
              <XAxis type="number" tick={axisTick} />
              <YAxis type="category" dataKey="nom_service" width={130} tick={axisTick} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="ecart_moyen" fill={c.alerte} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PanneauGraphique>

        <PanneauGraphique titre="Distribution des écarts de prédiction">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={distribution_ecarts}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.bordure} />
              <XAxis dataKey="tranche" tick={axisTick} label={{ value: "Écart (jours)", position: "insideBottom", offset: -5, fill: c.texteSecondaire }} />
              <YAxis tick={axisTick} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="nb" fill={c.succes} name="Nombre de prédictions" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PanneauGraphique>
      </div>
    </div>
  );
}

const styles = {
  pageBackground: { padding: "1.5rem 2rem", position: "relative", zIndex: 1, minWidth: 0, maxWidth: "100%", boxSizing: "border-box" },
  titre: (c) => ({ marginTop: 0, marginBottom: "1.2rem", fontFamily: "'Poppins',sans-serif", color: c.texte }),
  erreurBanner: (c) => ({ background: `${c.danger}18`, color: c.danger, padding: "1rem", borderRadius: "12px", fontWeight: 600, textAlign: "center" }),
  skeletonPanneau: (c) => ({ background: c.panneau, backdropFilter: "blur(16px)", border: `1px solid ${c.bordure}`, borderRadius: "20px", height: "300px", animation: "hd-pulse 1.5s ease-in-out infinite" }),

  grilleCartes: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" },
  grilleGraphiques: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "1.2rem", minWidth: 0 },
};