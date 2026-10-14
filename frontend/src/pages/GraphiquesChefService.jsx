import { useEffect, useState } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import api from "../api/axiosConfig";
import LayoutChefService from "../components/LayoutChefService";
import PanneauGraphique from "../components/PanneauGraphique";
import { useAuth } from "../context/AuthContext";
import { useThemeAnalyste } from "../theme/ThemeAnalyste";

const GRAPHIQUES_CONFIG = [
  { champ: "type_admission", titre: "Répartition par type d'admission", type: "camembert" },
  { champ: "ville", titre: "Hospitalisations par ville", type: "barres_horizontales" },
  { champ: "tranche_age", titre: "Répartition par tranche d'âge", type: "camembert" },
  { champ: "sexe", titre: "Répartition par sexe", type: "anneau" },
  { champ: "couverture_sante", titre: "Répartition par couverture santé", type: "camembert" },
  { champ: "groupe_sanguin", titre: "Répartition par groupe sanguin", type: "anneau" },
  { champ: "mode_sortie", titre: "Répartition par mode de sortie", type: "camembert" },
  { champ: "pathologie", titre: "Top pathologies", type: "barres_horizontales" },
];

export default function GraphiquesChefService() {
  const { user } = useAuth();
  const { c } = useThemeAnalyste();
  const idService = user.id_service;

  const [donnees, setDonnees] = useState({});
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    async function charger() {
      const resultats = await Promise.allSettled(
        GRAPHIQUES_CONFIG.map((g) => api.get(`/api/kpi/repartition/${g.champ}`, { params: { id_service: idService } }))
      );
      const nouvellesDonnees = {};
      const echecs = [];
      resultats.forEach((res, i) => {
        const champ = GRAPHIQUES_CONFIG[i].champ;
        if (res.status === "rejected") {
          echecs.push(champ);
          nouvellesDonnees[champ] = [];
          return;
        }
        nouvellesDonnees[champ] = res.value.data;
      });
      setDonnees(nouvellesDonnees);
      if (echecs.length) setErreur(`Certains graphiques n'ont pas pu être chargés : ${echecs.join(", ")}.`);
      setChargement(false);
    }
    charger();
  }, [idService]);

  if (chargement) {
    return (
      <LayoutChefService>
        <div style={styles.grille}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="hd-carte-glass" style={styles.skeletonPanneau(c)} />
          ))}
        </div>
      </LayoutChefService>
    );
  }

  return (
    <LayoutChefService titre="Graphiques détaillés du service">
      {erreur && <div style={styles.erreurBanner(c)}>{erreur}</div>}

      <div style={styles.grille}>
        {GRAPHIQUES_CONFIG.map((g) => (
          <PanneauGraphique key={g.champ} titre={g.titre}>
            <GraphiqueUnitaire type={g.type} data={donnees[g.champ] || []} c={c} />
          </PanneauGraphique>
        ))}
      </div>
    </LayoutChefService>
  );
}

function GraphiqueUnitaire({ type, data, c }) {
  const palette = [c.accent, c.accentVif, c.succes, c.alerte, c.danger, c.accentProfond];
  const tooltipStyle = {
    contentStyle: { background: c.panneauSolide, border: `1px solid ${c.bordure}`, borderRadius: "10px", color: c.texte, fontSize: "0.82rem" },
    labelStyle: { color: c.texteSecondaire },
  };
  const axisTick = { fill: c.texteSecondaire, fontSize: 10 };
  const legendStyle = { color: c.texteSecondaire, fontSize: "0.78rem" };

  if (!data.length) {
    return <p style={{ fontSize: "0.85rem", color: c.texteAtténué, textAlign: "center", paddingTop: "3rem" }}>Aucune donnée disponible.</p>;
  }

  if (type === "camembert") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="total" nameKey="label" outerRadius={90} label>
            {data.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
          </Pie>
          <Tooltip {...tooltipStyle} />
          <Legend wrapperStyle={legendStyle} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === "anneau") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="total" nameKey="label" innerRadius={50} outerRadius={90} label>
            {data.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
          </Pie>
          <Tooltip {...tooltipStyle} />
          <Legend wrapperStyle={legendStyle} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(260, data.length * 26)}>
      <BarChart data={data} layout="vertical" margin={{ left: 90 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.bordure} />
        <XAxis type="number" tick={axisTick} />
        <YAxis type="category" dataKey="label" width={150} tick={axisTick} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="total" fill={c.accentProfond} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const styles = {
  erreurBanner: (c) => ({ background: `${c.danger}18`, color: c.danger, padding: "1rem", borderRadius: "12px", fontWeight: 600, textAlign: "center", marginBottom: "1rem" }),
  skeletonPanneau: (c) => ({ background: c.panneau, backdropFilter: "blur(16px)", border: `1px solid ${c.bordure}`, borderRadius: "20px", height: "280px", animation: "hd-pulse 1.5s ease-in-out infinite" }),
  grille: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1.2rem", minWidth: 0 },
};