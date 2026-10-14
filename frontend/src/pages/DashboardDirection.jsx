import { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import api from "../api/axiosConfig";
import LayoutDirection from "../components/LayoutDirection";
import CarteKPI from "../components/CarteKPI";
import PanneauGraphique from "../components/PanneauGraphique";
import { useThemeAnalyste } from "../theme/ThemeAnalyste";

export default function DashboardDirection() {
  return (
    <LayoutDirection>
      <DashboardDirectionContenu />
    </LayoutDirection>
  );
}

function DashboardDirectionContenu() {
  const { c } = useThemeAnalyste();

  const [kpi, setKpi] = useState(null);
  const [volumes, setVolumes] = useState([]);
  const [typeAdmission, setTypeAdmission] = useState([]);
  const [topVilles, setTopVilles] = useState([]);
  const [trancheAge, setTrancheAge] = useState([]);
  const [sexe, setSexe] = useState([]);
  const [couverture, setCouverture] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const palette = [c.accent, c.accentVif, c.succes, c.alerte, c.danger, c.accentProfond];

  useEffect(() => {
    async function charger() {
      try {
        const [r1, r2, r3, r4, r5, r6, r7] = await Promise.all([
          api.get("/api/kpi/global"),
          api.get("/api/kpi/volumes-mensuels"),
          api.get("/api/kpi/repartition/type_admission"),
          api.get("/api/kpi/repartition/ville"),
          api.get("/api/kpi/repartition/tranche_age"),
          api.get("/api/kpi/repartition/sexe"),
          api.get("/api/kpi/repartition/couverture_sante"),
        ]);
        setKpi(r1.data);
        setVolumes(r2.data);
        setTypeAdmission(r3.data);
        setTopVilles(r4.data.slice(0, 12));
        setTrancheAge(r5.data);
        setSexe(r6.data);
        setCouverture(r7.data);
      } catch (e) {
        setErreur("Erreur lors du chargement des données");
      } finally {
        setChargement(false);
      }
    }
    charger();
  }, []);

  const tooltipStyle = {
    contentStyle: { background: c.panneauSolide, border: `1px solid ${c.bordure}`, borderRadius: "10px", color: c.texte, fontSize: "0.82rem" },
    labelStyle: { color: c.texteSecondaire },
  };
  const axisTick = { fill: c.texteSecondaire, fontSize: 10 };
  const legendStyle = { color: c.texteSecondaire, fontSize: "0.78rem" };

  if (erreur) {
    return (
      <div style={styles.pageBackground}>
        <h2 style={styles.titre(c)}>Vue Exécutive</h2>
        <div style={styles.erreurBanner(c)}>{erreur}</div>
      </div>
    );
  }

  return (
    <div style={styles.pageBackground}>
      <h2 style={styles.titre(c)}>Vue Exécutive</h2>

      {chargement ? (
        <SqueletteChargement c={c} />
      ) : (
        <>
          <div style={styles.grilleCartes}>
            <CarteKPI titre="Total Hospitalisations" valeur={kpi.total_hospitalisations} />
            <CarteKPI titre="Patients Uniques" valeur={kpi.nb_patients_uniques} couleur={c.accentProfond} />
            <CarteKPI titre="Durée Moyenne" valeur={`${kpi.duree_moyenne_sejour} j`} couleur={c.accentVif} />
            <CarteKPI titre="Services" valeur={kpi.nb_services} couleur="#805ad5" />
            <CarteKPI titre="Médecins" valeur={kpi.nb_medecins} couleur="#805ad5" />
            <CarteKPI titre="Total Lits" valeur={kpi.nombre_total_lits} couleur={c.texteAtténué} />
          </div>

          <div style={styles.grilleCartes}>
            <CarteKPI titre="Âge Moyen" valeur={`${kpi.age_moyen} ans`} petite />
            <CarteKPI titre="Taux Guérison" valeur={`${kpi.taux_guerison_pct} %`} couleur={c.succes} petite />
            <CarteKPI titre="Taux Urgence" valeur={`${kpi.taux_urgence_pct} %`} couleur={c.alerte} petite />
            <CarteKPI titre="Taux Décès" valeur={`${kpi.taux_deces_pct} %`} couleur={c.danger} petite />
          </div>

          <div style={styles.grilleGraphiques}>
            <PanneauGraphique titre="Évolution mensuelle des admissions" largeurPleine>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={volumes}>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.bordure} />
                  <XAxis dataKey="periode" tick={axisTick} interval={2} />
                  <YAxis tick={axisTick} />
                  <Tooltip {...tooltipStyle} />
                  <Line type="monotone" dataKey="total" stroke={c.accentVif} strokeWidth={2} dot={false} name="Admissions" />
                </LineChart>
              </ResponsiveContainer>
            </PanneauGraphique>

            <PanneauGraphique titre="Répartition par type d'admission">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={typeAdmission} dataKey="total" nameKey="label" outerRadius={90} label>
                    {typeAdmission.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={legendStyle} />
                </PieChart>
              </ResponsiveContainer>
            </PanneauGraphique>

            <PanneauGraphique titre="Répartition par sexe">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={sexe} dataKey="total" nameKey="label" innerRadius={55} outerRadius={90} label>
                    {sexe.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={legendStyle} />
                </PieChart>
              </ResponsiveContainer>
            </PanneauGraphique>

            <PanneauGraphique titre="Top 12 des villes de résidence" largeurPleine>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topVilles}>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.bordure} />
                  <XAxis dataKey="label" tick={axisTick} angle={-30} textAnchor="end" height={70} />
                  <YAxis tick={axisTick} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="total" fill={c.accentProfond} name="Hospitalisations" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </PanneauGraphique>

            <PanneauGraphique titre="Répartition par tranche d'âge">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={trancheAge} dataKey="total" nameKey="label" outerRadius={90} label>
                    {trancheAge.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={legendStyle} />
                </PieChart>
              </ResponsiveContainer>
            </PanneauGraphique>

            <PanneauGraphique titre="Répartition par couverture santé">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={couverture} dataKey="total" nameKey="label" outerRadius={90} label>
                    {couverture.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={legendStyle} />
                </PieChart>
              </ResponsiveContainer>
            </PanneauGraphique>
          </div>
        </>
      )}
    </div>
  );
}

function SqueletteChargement({ c }) {
  return (
    <>
      <div style={styles.grilleCartes}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="hd-carte-glass" style={styles.skeletonCarte(c)}>
            <div style={styles.skeletonLigne(c, "50%")} />
            <div style={styles.skeletonLigne(c, "70%", "1.4rem")} />
          </div>
        ))}
      </div>
      <div style={styles.grilleGraphiques}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="hd-carte-glass" style={styles.skeletonPanneau(c)} />
        ))}
      </div>
    </>
  );
}

const styles = {
  pageBackground: { padding: "1.5rem 2rem", position: "relative", zIndex: 1, minWidth: 0, maxWidth: "100%", boxSizing: "border-box" },
  titre: (c) => ({ marginTop: 0, marginBottom: "1.2rem", fontFamily: "'Poppins',sans-serif", color: c.texte }),
  erreurBanner: (c) => ({ background: `${c.danger}18`, color: c.danger, padding: "1rem", borderRadius: "12px", fontWeight: 600, textAlign: "center" }),

  grilleCartes: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1rem" },
  grilleGraphiques: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "1.2rem", marginTop: "1.5rem" },

  skeletonCarte: (c) => ({ background: c.panneau, backdropFilter: "blur(14px)", border: `1px solid ${c.bordure}`, borderRadius: "16px", padding: "1.1rem 1.2rem", boxShadow: c.ombre }),
  skeletonLigne: (c, largeur, hauteur = "0.8rem") => ({ height: hauteur, width: largeur, background: c.bordureForte, borderRadius: "4px", animation: "hd-pulse 1.5s ease-in-out infinite", marginBottom: "0.5rem" }),
  skeletonPanneau: (c) => ({ background: c.panneau, backdropFilter: "blur(16px)", border: `1px solid ${c.bordure}`, borderRadius: "20px", height: "280px", animation: "hd-pulse 1.5s ease-in-out infinite" }),
};