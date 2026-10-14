import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar, Treemap, Cell,
} from "recharts";
import api from "../api/axiosConfig";
import LayoutDirection from "../components/LayoutDirection";
import PanneauGraphique from "../components/PanneauGraphique";
import { useThemeAnalyste } from "../theme/ThemeAnalyste";

export default function DashboardServices() {
  return (
    <LayoutDirection>
      <DashboardServicesContenu />
    </LayoutDirection>
  );
}

function DashboardServicesContenu() {
  const { c } = useThemeAnalyste();
  const [services, setServices] = useState([]);
  const [pathologies, setPathologies] = useState([]);
  const [topMedecins, setTopMedecins] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const palette = [c.accent, c.accentVif, c.succes, c.alerte, c.danger, c.accentProfond, "#805ad5"];

  useEffect(() => {
    async function charger() {
      try {
        const [r1, r2, r3] = await Promise.all([
          api.get("/api/kpi/services-detail"),
          api.get("/api/kpi/pathologie-dominante"),
          api.get("/api/kpi/top-medecins"),
        ]);
        setServices(r1.data.services);
        setPathologies(r2.data);
        setTopMedecins(r3.data);
      } catch (e) {
        setErreur("Erreur lors du chargement des données");
      } finally {
        setChargement(false);
      }
    }
    charger();
  }, []);

  if (chargement) {
    return (
      <div style={styles.pageBackground}>
        <h2 style={styles.titre(c)}>Vue Services</h2>
        <div className="hd-carte-glass" style={styles.skeletonPanneau(c)} />
      </div>
    );
  }
  if (erreur) {
    return (
      <div style={styles.pageBackground}>
        <h2 style={styles.titre(c)}>Vue Services</h2>
        <div style={styles.erreurBanner(c)}>{erreur}</div>
      </div>
    );
  }

  const parActivite = [...services].sort((a, b) => b.total_hospitalisations - a.total_hospitalisations);
  const parDuree = [...services].sort((a, b) => b.duree_moyenne_sejour - a.duree_moyenne_sejour);
  const parOccupation = [...services].sort((a, b) => b.taux_occupation_pct - a.taux_occupation_pct);
  const parDeces = [...services].sort((a, b) => b.taux_deces_pct - a.taux_deces_pct);

  const tauxOccupationGlobal = services.length
    ? Math.round((services.reduce((s, x) => s + x.taux_occupation_pct, 0) / services.length) * 10) / 10
    : 0;

  const donneesTreemap = services.map((s) => ({ name: s.nom_service, size: s.total_hospitalisations }));

  const tableComplete = services.map((s) => {
    const path = pathologies.find((p) => p.nom_service === s.nom_service);
    const med = topMedecins.find((m) => m.nom_service === s.nom_service);
    return {
      ...s,
      pathologie_dominante: path?.pathologie_dominante || "—",
      top_medecin: med?.medecin || "—",
    };
  }).sort((a, b) => b.total_hospitalisations - a.total_hospitalisations);

  const tooltipStyle = {
    contentStyle: { background: c.panneauSolide, border: `1px solid ${c.bordure}`, borderRadius: "10px", color: c.texte, fontSize: "0.82rem" },
    labelStyle: { color: c.texteSecondaire },
  };
  const axisTick = { fill: c.texteSecondaire, fontSize: 11 };

  return (
    <div style={styles.pageBackground}>
      <h2 style={styles.titre(c)}>Vue Services</h2>

      <div style={styles.grilleGraphiques}>
        <PanneauGraphique titre="Total hospitalisations par service">
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={parActivite} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.bordure} />
              <XAxis type="number" tick={axisTick} />
              <YAxis type="category" dataKey="nom_service" width={130} tick={axisTick} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="total_hospitalisations" fill={c.accentProfond} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PanneauGraphique>

        <PanneauGraphique titre="Durée moyenne de séjour par service (jours)">
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={parDuree} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.bordure} />
              <XAxis type="number" tick={axisTick} />
              <YAxis type="category" dataKey="nom_service" width={130} tick={axisTick} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="duree_moyenne_sejour" fill={c.danger} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PanneauGraphique>

        <PanneauGraphique titre="Taux d'occupation des lits par service (%)">
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={parOccupation} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.bordure} />
              <XAxis type="number" tick={axisTick} />
              <YAxis type="category" dataKey="nom_service" width={130} tick={axisTick} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="taux_occupation_pct" fill={c.succes} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PanneauGraphique>

        <PanneauGraphique titre="Taux de décès par service (%)">
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={parDeces} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.bordure} />
              <XAxis type="number" tick={axisTick} />
              <YAxis type="category" dataKey="nom_service" width={130} tick={axisTick} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="taux_deces_pct" fill={c.alerte} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PanneauGraphique>

        <PanneauGraphique titre="Répartition de l'activité par service" largeurPleine>
          <ResponsiveContainer width="100%" height={320}>
            <Treemap data={donneesTreemap} dataKey="size" stroke={c.fond} fill={c.accentProfond}>
              {donneesTreemap.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
            </Treemap>
          </ResponsiveContainer>
        </PanneauGraphique>

        <PanneauGraphique titre="Taux d'occupation global" largeurPleine>
  <div style={{ position: "relative", textAlign: "center", maxWidth: "640px", margin: "0 auto" }}>
    <ResponsiveContainer width="100%" height={260}>
      <RadialBarChart
        innerRadius="70%"
        outerRadius="100%"
        data={[{ name: "Occupation", value: tauxOccupationGlobal, fill: c.accentVif }]}
        startAngle={180}
        endAngle={0}
      >
        <RadialBar dataKey="value" background={{ fill: c.bordure }} clockWise domain={[0, 100]} />
      </RadialBarChart>
    </ResponsiveContainer>
    <div style={styles.valeurJauge(c)}>{tauxOccupationGlobal} %</div>
    <p style={{ color: c.texteSecondaire, fontSize: "0.85rem" }}>Objectif de référence : 70%</p>
  </div>
</PanneauGraphique>

        <PanneauGraphique titre="Tableau KPI complet par service" largeurPleine>
          <div style={{ overflowX: "auto", maxWidth: "100%" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {["Service", "Hospitalisations", "Durée moy.", "Taux urgence", "Taux décès", "Occupation", "Pathologie dominante", "Médecin le plus actif"].map((h) => (
                    <th key={h} style={styles.th(c)}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableComplete.map((s, i) => (
                  <tr key={s.id_service} className="hd-ligne-hover" style={{ ...styles.tr(c), backgroundColor: i % 2 === 1 ? c.panneau : "transparent" }}>
                    <td style={styles.td(c)}><strong>{s.nom_service}</strong></td>
                    <td style={styles.td(c)}>{s.total_hospitalisations}</td>
                    <td style={styles.td(c)}><span style={styles.badgeDuree(c)}>{s.duree_moyenne_sejour} j</span></td>
                    <td style={styles.td(c)}>{s.taux_urgence_pct} %</td>
                    <td style={styles.td(c)}>
                      <span style={{ color: c.danger, background: `${c.danger}18`, padding: "0.2rem 0.6rem", borderRadius: "6px", fontWeight: 600 }}>
                        {s.taux_deces_pct} %
                      </span>
                    </td>
                    <td style={styles.td(c)}>{s.taux_occupation_pct} %</td>
                    <td style={styles.td(c)}>{s.pathologie_dominante}</td>
                    <td style={styles.td(c)}>{s.top_medecin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

  grilleGraphiques: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "1.2rem", minWidth: 0 },
  valeurJauge: (c) => ({ position: "absolute", top: "58%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "1.7rem", fontWeight: 700, fontFamily: "'Poppins',sans-serif", color: c.texte }),

  table: { width: "100%", borderCollapse: "separate", borderSpacing: "0 4px", fontSize: "0.85rem" },
  th: (c) => ({ padding: "0.8rem 1rem", textAlign: "left", color: c.texteSecondaire, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600, borderBottom: `1px solid ${c.bordure}` }),
  tr: (c) => ({ animation: "hd-entree 0.35s ease both" }),
  td: (c) => ({ padding: "0.65rem 1rem", borderBottom: `1px solid ${c.bordure}`, color: c.texte }),
  badgeDuree: (c) => ({ background: `${c.accent}18`, color: c.accent, padding: "0.2rem 0.6rem", borderRadius: "6px", fontWeight: 600 }),
};