import { useEffect, useState } from "react";
import api from "../api/axiosConfig";
import LayoutAnalyste from "../components/LayoutAnalyste";
import CarteKPI from "../components/CarteKPI";
import PanneauGraphique from "../components/PanneauGraphique";
import { useThemeAnalyste } from "../theme/ThemeAnalyste";

export default function DetailsModeleAnalyste() {
  return (
    <LayoutAnalyste>
      <DetailsModeleContenu />
    </LayoutAnalyste>
  );
}

function DetailsModeleContenu() {
  const { c } = useThemeAnalyste();
  const [comparatif, setComparatif] = useState([]);
  const [modeleRetenu, setModeleRetenu] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    async function charger() {
      try {
        const [rComparatif, rModele] = await Promise.all([
          api.get("/api/ml/comparatif-modeles"),
          api.get("/api/ml/modele-retenu"),
        ]);
        setComparatif(rComparatif.data);
        setModeleRetenu(rModele.data);
      } catch (e) {
        console.error("[DetailsModele] Erreur →", e.response?.status, e.response?.data);
        setErreur(e.response?.data?.detail || "Erreur lors du chargement des détails du modèle.");
      } finally {
        setChargement(false);
      }
    }
    charger();
  }, []);

  if (chargement) {
    return (
      <div style={styles.page(c)}>
        <h2 style={styles.titrePage(c)}>Modèle & Données</h2>
        <p style={{ color: c.texteSecondaire }}>Chargement...</p>
      </div>
    );
  }
  if (erreur) {
    return (
      <div style={styles.page(c)}>
        <h2 style={styles.titrePage(c)}>Modèle & Données</h2>
        <p style={{ color: c.danger }}>{erreur}</p>
      </div>
    );
  }

  return (
    <div style={styles.page(c)}>
      <h2 style={styles.titrePage(c)}>Modèle & Données</h2>

      <PanneauGraphique titre={`Modèle retenu : ${modeleRetenu.nom_modele}`} largeurPleine>
        <div style={styles.grilleCartes}>
          <CarteKPI titre="MAE (erreur moyenne)" valeur={`${modeleRetenu.MAE} j`} couleur="#dd6b20" />
          <CarteKPI titre="RMSE" valeur={`${modeleRetenu.RMSE} j`} couleur="#e53e3e" />
          <CarteKPI titre="R² (précision)" valeur={modeleRetenu.R2} couleur={c.succes} />
          <CarteKPI titre="Modèles comparés" valeur={modeleRetenu.nb_modeles_compares} couleur={c.texteSecondaire} />
        </div>
        <div style={styles.infosMethodo(c)}>
          <p><strong>Cible prédite :</strong> {modeleRetenu.cible}</p>
          <p><strong>Répartition des données :</strong> {modeleRetenu.split}</p>
          <p><strong>Validation :</strong> {modeleRetenu.validation}</p>
          {modeleRetenu.RMSE_cv_moyen != null && (
            <p><strong>RMSE en validation croisée :</strong> {modeleRetenu.RMSE_cv_moyen} j (écart-type : {modeleRetenu.RMSE_cv_std})</p>
          )}
        </div>
      </PanneauGraphique>

      <PanneauGraphique titre={`Comparatif des ${comparatif.length} modèles testés`} largeurPleine>
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th(c)}>Modèle</th>
                <th style={styles.th(c)}>MAE</th>
                <th style={styles.th(c)}>RMSE</th>
                <th style={styles.th(c)}>R²</th>
                <th style={styles.th(c)}>RMSE (val. croisée)</th>
              </tr>
            </thead>
            <tbody>
              {comparatif.map((m, i) => (
                <tr key={m.modele} style={i === 0 ? styles.ligneGagnante(c) : styles.ligne(c)}>
                  <td style={styles.td(c)}>{m.modele}</td>
                  <td style={styles.td(c)}>{m.MAE}</td>
                  <td style={styles.td(c)}>{m.RMSE}</td>
                  <td style={styles.td(c)}>{m.R2}</td>
                  <td style={styles.td(c)}>{m.RMSE_cv_moyen ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={styles.legende(c)}>Trié par RMSE croissant (le plus bas = le meilleur). La ligne en surbrillance est le modèle actuellement utilisé en production.</p>
      </PanneauGraphique>

      <PanneauGraphique titre="Variables utilisées & pipeline de préparation" largeurPleine>
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th(c)}>Variable</th>
                <th style={styles.th(c)}>Type</th>
                <th style={styles.th(c)}>Traitement appliqué</th>
              </tr>
            </thead>
            <tbody>
              {modeleRetenu.features_utilisees.map((f) => (
                <tr key={f.nom} style={styles.ligne(c)}>
                  <td style={styles.td(c)}><code style={styles.code(c)}>{f.nom}</code></td>
                  <td style={styles.td(c)}>{f.type}</td>
                  <td style={styles.td(c)}>{f.traitement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanneauGraphique>

      <PanneauGraphique titre="Structure des données — schéma en étoile" largeurPleine>
        <SchemaEnEtoile c={c} />
      </PanneauGraphique>
    </div>
  );
}

function SchemaEnEtoile({ c }) {
  const dimensions = [
    { nom: "DimPatient", cles: "id_patient", champs: "âge, sexe, ville, tranche_age, couverture_sante, groupe_sanguin" },
    { nom: "DimService", cles: "id_service", champs: "nom_service, categorie, capacite_lits" },
    { nom: "DimMedecin", cles: "id_medecin", champs: "prenom, nom, specialite" },
    { nom: "DimTemps", cles: "id_temps", champs: "date_complete, annee, mois, trimestre" },
  ];

  return (
    <div style={styles.schemaConteneur}>
      <div style={styles.schemaLigneDim}>
        {dimensions.slice(0, 2).map((d) => <BoiteDimension key={d.nom} dim={d} c={c} />)}
      </div>

      <div style={styles.boiteFait(c)}>
        <span style={styles.faitLueur(c)} />
        <p style={styles.faitTitre}>FactHospitalisation</p>
        <p style={styles.faitSousTitre}>Table de faits — 1 ligne = 1 hospitalisation</p>
        <p style={styles.faitChamps}>
          id_fait, id_patient, id_service, id_medecin, id_temps,<br />
          duree_sejour, type_admission, pathologie, mode_sortie, jours_occupation
        </p>
      </div>

      <div style={styles.schemaLigneDim}>
        {dimensions.slice(2, 4).map((d) => <BoiteDimension key={d.nom} dim={d} c={c} />)}
      </div>

      <p style={styles.legende(c)}>
        Modèle en étoile classique : une table de faits centrale reliée à 4 tables de dimensions.
        C'est cette structure qui alimente à la fois les KPI (agrégations SQL) et les features du modèle ML (jointures Fact ↔ Dim).
      </p>
    </div>
  );
}

function BoiteDimension({ dim, c }) {
  return (
    <div className="hd-carte-glass" style={styles.boiteDim(c)}>
      <p style={styles.dimTitre(c)}>{dim.nom}</p>
      <p style={styles.dimCle(c)}>Clé : {dim.cles}</p>
      <p style={styles.dimChamps(c)}>{dim.champs}</p>
    </div>
  );
}

const styles = {
  page: (c) => ({ padding: "1.5rem 2rem", position: "relative", zIndex: 1 }),
  titrePage: (c) => ({ marginTop: 0, fontFamily: "'Poppins',sans-serif", color: c.texte }),

  grilleCartes: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1.2rem" },
  infosMethodo: (c) => ({ fontSize: "0.88rem", color: c.texteSecondaire, lineHeight: 1.8, background: c.panneauSolide, border: `1px solid ${c.bordure}`, padding: "0.9rem 1.1rem", borderRadius: "12px" }),

  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" },
  th: (c) => ({ background: c.degradeAccent, color: "#fff", padding: "0.6rem 0.7rem", textAlign: "left", fontWeight: 600 }),
  ligne: (c) => ({ transition: "background 0.2s ease" }),
  td: (c) => ({ padding: "0.55rem 0.7rem", borderBottom: `1px solid ${c.bordure}`, color: c.texte }),
  code: (c) => ({ background: `${c.accent}18`, color: c.accent, padding: "0.15rem 0.4rem", borderRadius: "4px", fontSize: "0.82rem" }),
  ligneGagnante: (c) => ({ backgroundColor: `${c.succes}18`, fontWeight: 600 }),
  legende: (c) => ({ fontSize: "0.78rem", color: c.texteAtténué, marginTop: "0.8rem" }),

  schemaConteneur: { display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" },
  schemaLigneDim: { display: "flex", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap" },
  boiteDim: (c) => ({ background: c.panneauSolide, border: `1px solid ${c.bordure}`, borderRadius: "12px", padding: "0.8rem 1rem", width: "230px", textAlign: "center" }),
  dimTitre: (c) => ({ margin: 0, fontWeight: 700, color: c.accent, fontSize: "0.9rem", fontFamily: "'Poppins',sans-serif" }),
  dimCle: (c) => ({ margin: "0.25rem 0", fontSize: "0.75rem", color: c.texteSecondaire }),
  dimChamps: (c) => ({ margin: 0, fontSize: "0.72rem", color: c.texteAtténué }),

  boiteFait: (c) => ({
    position: "relative",
    overflow: "hidden",
    background: c.degradeAccent,
    color: "#fff",
    borderRadius: "16px",
    padding: "1.2rem 1.5rem",
    width: "340px",
    textAlign: "center",
    boxShadow: `0 12px 30px ${c.accentProfond}44`,
  }),
  faitLueur: (c) => ({
    position: "absolute", inset: 0,
    background: "linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.25) 40%, transparent 60%)",
    backgroundSize: "200% 100%",
    animation: "hd-balayage 3.5s ease-in-out infinite",
  }),
  faitTitre: { margin: 0, fontWeight: 700, fontSize: "1rem", fontFamily: "'Poppins',sans-serif", position: "relative" },
  faitSousTitre: { margin: "0.2rem 0 0.6rem", fontSize: "0.75rem", opacity: 0.85, position: "relative" },
  faitChamps: { margin: 0, fontSize: "0.72rem", opacity: 0.95, lineHeight: 1.5, position: "relative" },
};