import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, KeyRound, X, Users, Shield, Stethoscope, LineChart, Building2 } from "lucide-react";
import api from "../api/axiosConfig";
import LayoutAdmin from "../components/LayoutAdmin";
import PanneauGraphique from "../components/PanneauGraphique";
import { useThemeAnalyste } from "../theme/ThemeAnalyste";

const ROLES = ["direction", "chef_service", "analyste", "administrateur"];

const FORMULAIRE_VIDE = { username: "", mot_de_passe: "", role: "chef_service", id_service: "", nom_complet: "" };

export default function GestionUtilisateursAdmin() {
  return (
    <LayoutAdmin>
      <GestionUtilisateursContenu />
    </LayoutAdmin>
  );
}

function GestionUtilisateursContenu() {
  const { c } = useThemeAnalyste();

  const [utilisateurs, setUtilisateurs] = useState([]);
  const [servicesChefs, setServicesChefs] = useState([]); // [{id_service, nom_service, id_chef_actuel, nom_chef_actuel}]
  const [stats, setStats] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [idEnEdition, setIdEnEdition] = useState(null);
  const [formulaire, setFormulaire] = useState(FORMULAIRE_VIDE);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const [motDePasseGenere, setMotDePasseGenere] = useState(null);

  const chargerTout = useCallback(async () => {
    try {
      const [resUtilisateurs, resStats, resServicesChefs] = await Promise.all([
        api.get("/api/admin/utilisateurs"),
        api.get("/api/admin/stats"),
        api.get("/api/admin/services-chefs"),
      ]);
      setUtilisateurs(resUtilisateurs.data);
      setStats(resStats.data);
      setServicesChefs(resServicesChefs.data);
    } catch (e) {
      setErreur(e.response?.data?.detail || "Erreur lors du chargement des données.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { chargerTout(); }, [chargerTout]);

  function ouvrirCreation() {
    setIdEnEdition(null);
    setFormulaire(FORMULAIRE_VIDE);
    setFormulaireOuvert(true);
  }

  function ouvrirEdition(u) {
    setIdEnEdition(u.id);
    setFormulaire({
      username: u.username,
      mot_de_passe: "",
      role: u.role,
      id_service: u.id_service || "",
      nom_complet: u.nom_complet || "",
    });
    setFormulaireOuvert(true);
  }

  function fermerFormulaire() {
    setFormulaireOuvert(false);
    setIdEnEdition(null);
    setFormulaire(FORMULAIRE_VIDE);
  }

  // Un service est disponible pour ce formulaire si : personne ne l'occupe,
  // OU si l'occupant actuel est justement l'utilisateur qu'on est en train d'éditer.
  function serviceEstDisponible(service) {
    if (service.id_chef_actuel === null) return true;
    if (idEnEdition !== null && service.id_chef_actuel === idEnEdition) return true;
    return false;
  }

  async function soumettreFormulaire(e) {
    e.preventDefault();
    setEnvoiEnCours(true);
    setErreur("");
    try {
      if (idEnEdition === null) {
        await api.post("/api/admin/utilisateurs", {
          username: formulaire.username,
          mot_de_passe: formulaire.mot_de_passe,
          role: formulaire.role,
          id_service: formulaire.role === "chef_service" ? Number(formulaire.id_service) : null,
          nom_complet: formulaire.nom_complet || null,
        });
      } else {
        await api.put(`/api/admin/utilisateurs/${idEnEdition}`, {
          username: formulaire.username,
          role: formulaire.role,
          id_service: formulaire.role === "chef_service" ? Number(formulaire.id_service) : null,
          nom_complet: formulaire.nom_complet || null,
        });
      }
      fermerFormulaire();
      chargerTout();
    } catch (e) {
      // Le backend renvoie 409 avec un message clair si le service est déjà pris
      setErreur(e.response?.data?.detail || "Erreur lors de l'enregistrement.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function supprimer(u) {
    if (!window.confirm(`Supprimer définitivement le compte "${u.username}" ?`)) return;
    try {
      await api.delete(`/api/admin/utilisateurs/${u.id}`);
      chargerTout();
    } catch (e) {
      alert(e.response?.data?.detail || "Erreur lors de la suppression.");
    }
  }

  async function reinitialiserMotDePasse(u) {
    if (!window.confirm(`Générer un nouveau mot de passe temporaire pour "${u.username}" ?`)) return;
    try {
      const res = await api.post(`/api/admin/utilisateurs/${u.id}/reinitialiser-mot-de-passe`, {});
      setMotDePasseGenere({ username: u.username, mot_de_passe: res.data.nouveau_mot_de_passe });
    } catch (e) {
      alert(e.response?.data?.detail || "Erreur lors de la réinitialisation.");
    }
  }

  return (
    <div style={styles.pageBackground}>
      <h2 style={styles.titre(c)}>Gestion des utilisateurs</h2>

      {erreur && <div style={styles.erreurBanner(c)}>{erreur}</div>}

      {/* --- KPI --- */}
      {stats && (
        <div style={styles.grilleKpi}>
          <CarteKpi c={c} icone={Users} label="Utilisateurs au total" valeur={stats.nb_total_utilisateurs} />
          <CarteKpi c={c} icone={Shield} label="Direction" valeur={stats.nb_direction} />
          <CarteKpi c={c} icone={Stethoscope} label="Chefs de service" valeur={stats.nb_chef_service} />
          <CarteKpi c={c} icone={LineChart} label="Analystes" valeur={stats.nb_analyste} />
          <CarteKpi c={c} icone={Shield} label="Administrateurs" valeur={stats.nb_administrateur} />
          <CarteKpi
            c={c}
            icone={Building2}
            label="Services avec chef"
            valeur={`${stats.nb_services_avec_chef} / ${stats.nb_total_services}`}
            sousLabel={stats.nb_services_sans_chef > 0 ? `${stats.nb_services_sans_chef} service(s) sans chef` : "Tous les services sont couverts"}
          />
        </div>
      )}

      {motDePasseGenere && (
        <div style={styles.encartMotDePasse(c)}>
          <div>
            <strong style={{ color: c.texte }}>Nouveau mot de passe pour {motDePasseGenere.username} :</strong>
            <p style={styles.motDePasseAffiche(c)}>{motDePasseGenere.mot_de_passe}</p>
            <p style={{ fontSize: "0.78rem", color: c.texteSecondaire, margin: 0 }}>
              Note-le maintenant et transmets-le à l'utilisateur — il ne sera plus jamais affichable ensuite.
            </p>
          </div>
          <button style={styles.boutonFermerEncart(c)} onClick={() => setMotDePasseGenere(null)}><X size={16} /></button>
        </div>
      )}

      {formulaireOuvert && (
        <PanneauGraphique titre={idEnEdition === null ? "Créer un utilisateur" : "Modifier l'utilisateur"} largeurPleine>
          <form onSubmit={soumettreFormulaire} style={styles.formulaire}>
            <div style={styles.ligneFormulaire}>
              <label style={styles.label(c)}>
                Nom d'utilisateur
                <input
                  style={styles.input(c)}
                  value={formulaire.username}
                  onChange={(e) => setFormulaire((f) => ({ ...f, username: e.target.value }))}
                  required
                />
              </label>

              {idEnEdition === null && (
                <label style={styles.label(c)}>
                  Mot de passe initial
                  <input
                    style={styles.input(c)}
                    type="password"
                    value={formulaire.mot_de_passe}
                    onChange={(e) => setFormulaire((f) => ({ ...f, mot_de_passe: e.target.value }))}
                    required
                    minLength={6}
                  />
                </label>
              )}
            </div>

            <div style={styles.ligneFormulaire}>
              <label style={styles.label(c)}>
                Rôle
                <select
                  style={styles.input(c)}
                  value={formulaire.role}
                  onChange={(e) => setFormulaire((f) => ({ ...f, role: e.target.value, id_service: "" }))}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>

              {formulaire.role === "chef_service" && (
                <label style={styles.label(c)}>
                  Service
                  <select
                    style={styles.input(c)}
                    value={formulaire.id_service}
                    onChange={(e) => setFormulaire((f) => ({ ...f, id_service: e.target.value }))}
                    required
                  >
                    <option value="">— Choisir un service —</option>
                    {servicesChefs.map((s) => {
                      const disponible = serviceEstDisponible(s);
                      return (
                        <option key={s.id_service} value={s.id_service} disabled={!disponible}>
                          {s.nom_service}{!disponible ? ` — déjà attribué à ${s.nom_chef_actuel}` : ""}
                        </option>
                      );
                    })}
                  </select>
                  <span style={styles.aideChamp(c)}>
                    Un service ne peut avoir qu'un seul chef à la fois — les services déjà attribués sont grisés.
                  </span>
                </label>
              )}
            </div>

            <label style={styles.label(c)}>
              Nom complet
              <input
                style={styles.input(c)}
                value={formulaire.nom_complet}
                onChange={(e) => setFormulaire((f) => ({ ...f, nom_complet: e.target.value }))}
              />
            </label>

            <div style={styles.actionsFormulaire}>
              <button type="button" style={styles.boutonAnnuler(c)} onClick={fermerFormulaire}>Annuler</button>
              <button type="submit" style={styles.boutonPrincipal(c)} disabled={envoiEnCours}>
                {envoiEnCours ? "Enregistrement..." : idEnEdition === null ? "Créer" : "Enregistrer"}
              </button>
            </div>
          </form>
        </PanneauGraphique>
      )}

      <div style={styles.barreActionTableau}>
        <button style={styles.boutonPrincipal(c)} onClick={ouvrirCreation}>
          <Plus size={16} /> Nouvel utilisateur
        </button>
      </div>

      <PanneauGraphique titre={`${utilisateurs.length} utilisateur(s)`} largeurPleine>
        {chargement ? (
          <div style={styles.skeletonBloc(c)} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th(c)}>Utilisateur</th>
                  <th style={styles.th(c)}>Nom complet</th>
                  <th style={styles.th(c)}>Rôle</th>
                  <th style={styles.th(c)}>Service</th>
                  <th style={styles.th(c)}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {utilisateurs.length === 0 ? (
                  <tr>
                    <td style={{ ...styles.td(c), padding: "3rem", textAlign: "center", color: c.texteAtténué }} colSpan={5}>
                      Aucun utilisateur enregistré.
                    </td>
                  </tr>
                ) : (
                  utilisateurs.map((u, i) => (
                    <tr key={u.id} style={{ ...styles.tr(c), backgroundColor: i % 2 === 1 ? c.panneau : "transparent" }}>
                      <td style={styles.td(c)}>{u.username}</td>
                      <td style={styles.td(c)}>{u.nom_complet || "—"}</td>
                      <td style={styles.td(c)}><span style={styles.badgeRole(c)}>{u.role}</span></td>
                      <td style={styles.td(c)}>{u.nom_service || "—"}</td>
                      <td style={styles.td(c)}>
                        <button style={styles.boutonAction(c)} title="Modifier" onClick={() => ouvrirEdition(u)}>
                          <Pencil size={15} />
                        </button>
                        <button style={styles.boutonAction(c)} title="Réinitialiser le mot de passe" onClick={() => reinitialiserMotDePasse(u)}>
                          <KeyRound size={15} />
                        </button>
                        <button style={{ ...styles.boutonAction(c), color: c.danger }} title="Supprimer" onClick={() => supprimer(u)}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </PanneauGraphique>
    </div>
  );
}

function CarteKpi({ c, icone: Icone, label, valeur, sousLabel }) {
  return (
    <div style={styles.carteKpi(c)}>
      <div style={styles.iconeKpi(c)}><Icone size={18} /></div>
      <div>
        <p style={styles.valeurKpi(c)}>{valeur}</p>
        <p style={styles.labelKpi(c)}>{label}</p>
        {sousLabel && <p style={styles.sousLabelKpi(c)}>{sousLabel}</p>}
      </div>
    </div>
  );
}

const styles = {
  pageBackground: { minWidth: 0, maxWidth: "100%", boxSizing: "border-box" },
  titre: (c) => ({ margin: "0 0 1.2rem", fontFamily: "'Poppins',sans-serif", color: c.texte }),
  barreActionTableau: { display: "flex", justifyContent: "flex-end", marginBottom: "1rem" },
  erreurBanner: (c) => ({ background: `${c.danger}18`, color: c.danger, padding: "0.8rem 1rem", borderRadius: "12px", fontWeight: 600, marginBottom: "1rem" }),

  grilleKpi: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "0.9rem",
    marginBottom: "1.4rem",
  },
  carteKpi: (c) => ({
    display: "flex", alignItems: "flex-start", gap: "0.7rem",
    background: c.panneauSolide, border: `1px solid ${c.bordure}`, borderRadius: "14px",
    padding: "1rem 1.1rem",
  }),
  iconeKpi: (c) => ({
    width: "34px", height: "34px", borderRadius: "10px", background: `${c.accent}18`, color: c.accent,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  }),
  valeurKpi: (c) => ({ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: c.texte }),
  labelKpi: (c) => ({ margin: "0.1rem 0 0", fontSize: "0.78rem", color: c.texteSecondaire }),
  sousLabelKpi: (c) => ({ margin: "0.2rem 0 0", fontSize: "0.7rem", color: c.texteAtténué }),

  boutonPrincipal: (c) => ({
    display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.65rem 1.2rem",
    background: c.degradeAccent, color: "#fff", border: "none", borderRadius: "10px",
    cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, boxShadow: `0 8px 20px ${c.accentProfond}44`,
  }),
  boutonAnnuler: (c) => ({
    padding: "0.6rem 1.2rem", background: c.panneauSolide, color: c.texte,
    border: `1px solid ${c.bordure}`, borderRadius: "10px", cursor: "pointer", fontSize: "0.85rem",
  }),

  encartMotDePasse: (c) => ({
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    background: `${c.alerte}18`, border: `1px solid ${c.alerte}44`, borderRadius: "16px",
    padding: "1rem 1.2rem", marginBottom: "1.2rem",
  }),
  motDePasseAffiche: (c) => ({
    fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 700,
    background: c.panneauSolide, color: c.texte, padding: "0.4rem 0.7rem", borderRadius: "8px",
    display: "inline-block", margin: "0.4rem 0", border: `1px solid ${c.bordure}`,
  }),
  boutonFermerEncart: (c) => ({ background: "none", border: "none", cursor: "pointer", color: c.texteSecondaire }),

  formulaire: { display: "flex", flexDirection: "column", gap: "0.9rem" },
  ligneFormulaire: { display: "flex", gap: "1rem", flexWrap: "wrap" },
  label: (c) => ({ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.83rem", color: c.texteSecondaire, flex: "1 1 220px" }),
  input: (c) => ({ padding: "0.6rem 0.8rem", border: `1px solid ${c.bordure}`, borderRadius: "10px", fontSize: "0.9rem", background: c.panneauSolide, color: c.texte, outline: "none" }),
  aideChamp: (c) => ({ fontSize: "0.72rem", color: c.texteAtténué, marginTop: "0.15rem" }),
  actionsFormulaire: { display: "flex", gap: "0.6rem", justifyContent: "flex-end", marginTop: "0.5rem" },

  skeletonBloc: (c) => ({ height: "180px", background: c.bordureForte, borderRadius: "12px", animation: "hd-pulse 1.5s ease-in-out infinite" }),

  table: { width: "100%", borderCollapse: "separate", borderSpacing: "0 4px", fontSize: "0.88rem" },
  th: (c) => ({ padding: "0.8rem 1rem", textAlign: "left", color: c.texteSecondaire, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600, borderBottom: `1px solid ${c.bordure}` }),
  tr: (c) => ({ animation: "hd-entree 0.35s ease both" }),
  td: (c) => ({ padding: "0.7rem 1rem", borderBottom: `1px solid ${c.bordure}`, color: c.texte }),
  badgeRole: (c) => ({ background: `${c.accent}18`, color: c.accent, padding: "0.25rem 0.7rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600 }),
  boutonAction: (c) => ({ background: "none", border: "none", cursor: "pointer", padding: "0.35rem", marginRight: "0.3rem", color: c.texteSecondaire, borderRadius: "6px", transition: "background 0.15s" }),
};