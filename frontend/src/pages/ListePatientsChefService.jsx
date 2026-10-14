import { useEffect, useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import api from "../api/axiosConfig";
import LayoutChefService from "../components/LayoutChefService";
import { useAuth } from "../context/AuthContext";
import { useThemeAnalyste } from "../theme/ThemeAnalyste";

export default function ListePatientsChefService() {
  const { user } = useAuth();
  const { c } = useThemeAnalyste();
  const idService = user.id_service;

  const [patients, setPatients] = useState([]);
  const [page, setPage] = useState(1);
  const [totalLignes, setTotalLignes] = useState(0);
  const [triPar, setTriPar] = useState("duree_sejour");
  const [ordre, setOrdre] = useState("desc");
  const [chargementPatients, setChargementPatients] = useState(false);
  const [pathologiesDisponibles, setPathologiesDisponibles] = useState([]);
  const taillePage = 10;

  const [recherche, setRecherche] = useState("");
  const [rechercheSaisie, setRechercheSaisie] = useState("");
  const [sexe, setSexe] = useState("");
  const [typeAdmission, setTypeAdmission] = useState("");
  const [modeSortieFiltre, setModeSortieFiltre] = useState("");
  const [pathologieFiltre, setPathologieFiltre] = useState("");

  useEffect(() => {
    const minuteur = setTimeout(() => { setRecherche(rechercheSaisie); setPage(1); }, 400);
    return () => clearTimeout(minuteur);
  }, [rechercheSaisie]);

  useEffect(() => {
    api.get(`/api/service/${idService}/pathologies-disponibles`).then((res) => setPathologiesDisponibles(res.data)).catch(() => {});
  }, [idService]);

  const chargerPatients = useCallback(async () => {
    setChargementPatients(true);
    try {
      const reponse = await api.get(`/api/service/${idService}/patients`, {
        params: {
          page, taille_page: taillePage, tri_par: triPar, ordre,
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
      console.error("[ListePatientsChefService] Échec →", e.response?.status);
    } finally {
      setChargementPatients(false);
    }
  }, [idService, page, triPar, ordre, recherche, sexe, typeAdmission, modeSortieFiltre, pathologieFiltre]);

  useEffect(() => { chargerPatients(); }, [chargerPatients]);

  const totalPages = Math.max(1, Math.ceil(totalLignes / taillePage));
  const filtresActifs = !!(recherche || sexe || typeAdmission || modeSortieFiltre || pathologieFiltre);

  function changerTri(colonne) {
    if (triPar === colonne) setOrdre(ordre === "asc" ? "desc" : "asc");
    else { setTriPar(colonne); setOrdre("desc"); }
    setPage(1);
  }

  function reinitialiserFiltres() {
    setRechercheSaisie(""); setRecherche(""); setSexe("");
    setTypeAdmission(""); setModeSortieFiltre(""); setPathologieFiltre("");
    setPage(1);
  }

  return (
    <LayoutChefService titre="Patients du service">
      <div style={styles.barreFiltresContainer(c)}>
        <div style={styles.rechercheWrapper}>
          <Search size={18} style={styles.searchIcon(c)} />
          <input
            type="text"
            placeholder="Rechercher (pathologie, ville, médecin...)"
            value={rechercheSaisie}
            onChange={(e) => setRechercheSaisie(e.target.value)}
            style={styles.inputRecherche(c)}
          />
          {rechercheSaisie && <X size={16} style={styles.clearIcon(c)} onClick={() => setRechercheSaisie("")} />}
        </div>

        <div style={styles.filtresWrapper}>
          <select value={sexe} onChange={(e) => { setSexe(e.target.value); setPage(1); }} style={styles.selectFiltre(c)}>
            <option value="">Sexe</option>
            <option value="M">Homme</option>
            <option value="F">Femme</option>
          </select>
          <select value={typeAdmission} onChange={(e) => { setTypeAdmission(e.target.value); setPage(1); }} style={styles.selectFiltre(c)}>
            <option value="">Admission</option>
            <option value="Urgence">Urgence</option>
            <option value="Programmée">Programmée</option>
            <option value="Transfert">Transfert</option>
          </select>
          <select value={modeSortieFiltre} onChange={(e) => { setModeSortieFiltre(e.target.value); setPage(1); }} style={styles.selectFiltre(c)}>
            <option value="">Sortie</option>
            <option value="Domicile">Domicile</option>
            <option value="Transfert">Transfert</option>
            <option value="Décès">Décès</option>
          </select>
          <select value={pathologieFiltre} onChange={(e) => { setPathologieFiltre(e.target.value); setPage(1); }} style={styles.selectFiltre(c)}>
            <option value="">Pathologie</option>
            {pathologiesDisponibles.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {filtresActifs && (
            <button style={styles.boutonReset(c)} onClick={reinitialiserFiltres}>
              <X size={14} style={{ marginRight: "4px" }} /> Effacer
            </button>
          )}
        </div>
      </div>

      <div className="hd-carte-glass" style={styles.tableCard(c)}>
        <div style={{ overflowX: "auto", position: "relative", minHeight: "300px" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th(c)}>ID Patient</th>
                <th style={styles.th(c)} onClick={() => changerTri("age")}>Âge</th>
                <th style={styles.th(c)}>Sexe</th>
                <th style={styles.th(c)}>Ville</th>
                <th style={styles.th(c)} onClick={() => changerTri("date_entree")}>Entrée</th>
                <th style={styles.th(c)} onClick={() => changerTri("duree_sejour")}>Durée</th>
                <th style={styles.th(c)}>Pathologie</th>
                <th style={styles.th(c)}>Médecin</th>
                <th style={styles.th(c)}>Sortie</th>
              </tr>
            </thead>
            <tbody>
              {chargementPatients ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={styles.tr(c)}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} style={styles.td(c)}><div style={styles.skeletonBar(c)} /></td>
                    ))}
                  </tr>
                ))
              ) : patients.length === 0 ? (
                <tr>
                  <td style={{ ...styles.td(c), padding: "4rem", textAlign: "center", color: c.texteAtténué }} colSpan={9}>
                    <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🔍</div>
                    Aucun patient ne correspond à ces critères.
                  </td>
                </tr>
              ) : (
                patients.map((p, index) => (
                  <tr key={p.id_fait} className="hd-ligne-hover" style={{ ...styles.tr(c), backgroundColor: index % 2 === 1 ? c.panneau : "transparent" }}>
                    <td style={styles.td(c)}>{p.id_patient}</td>
                    <td style={styles.td(c)}><span style={styles.badgeAge(c)}>{p.age}</span></td>
                    <td style={styles.td(c)}>
                      <span style={p.sexe === "M" ? styles.badgeHomme(c) : styles.badgeFemme(c)}>{p.sexe}</span>
                    </td>
                    <td style={styles.td(c)}>{p.ville}</td>
                    <td style={styles.td(c)}>{p.date_entree}</td>
                    <td style={styles.td(c)}>
                      <span style={p.duree_sejour > 15 ? styles.badgeDureeLongue(c) : styles.badgeDuree(c)}>{p.duree_sejour} j</span>
                    </td>
                    <td style={styles.td(c)}>{p.pathologie}</td>
                    <td style={styles.td(c)}>{p.medecin || "—"}</td>
                    <td style={styles.td(c)}>
                      <span style={
                        p.mode_sortie === "Domicile" ? styles.badgeDomicile(c) :
                        p.mode_sortie === "Décès" ? styles.badgeDeces(c) :
                        styles.badgeTransfert(c)
                      }>
                        {p.mode_sortie}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.paginationContainer(c)}>
          <div style={styles.paginationInfo(c)}>Page {page} sur {totalPages} — {totalLignes} résultats</div>
          <div style={styles.paginationControles}>
            <button style={styles.boutonPage(c)} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Précédent</button>
            <div style={styles.paginationNombres}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let num = i + 1;
                if (totalPages > 5) {
                  if (page > 3) num = page - 3 + i;
                  if (page > totalPages - 3) num = totalPages - 4 + i;
                }
                return (
                  <button key={num} style={page === num ? styles.boutonPageActive(c) : styles.boutonPageNum(c)} onClick={() => setPage(num)}>{num}</button>
                );
              })}
            </div>
            <button style={styles.boutonPage(c)} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Suivant</button>
          </div>
        </div>
      </div>
    </LayoutChefService>
  );
}

const styles = {
  barreFiltresContainer: (c) => ({ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1.6rem", alignItems: "center", background: c.panneau, padding: "1rem", borderRadius: "18px", backdropFilter: "blur(14px)", border: `1px solid ${c.bordure}` }),
  rechercheWrapper: { flex: "1 1 250px", position: "relative", display: "flex", alignItems: "center" },
  searchIcon: (c) => ({ position: "absolute", left: "12px", color: c.texteAtténué }),
  clearIcon: (c) => ({ position: "absolute", right: "12px", color: c.texteAtténué, cursor: "pointer" }),
  inputRecherche: (c) => ({ width: "100%", padding: "0.7rem 2.5rem", borderRadius: "10px", border: `1px solid ${c.bordure}`, background: c.panneauSolide, fontSize: "0.9rem", color: c.texte, outline: "none" }),
  filtresWrapper: { display: "flex", flexWrap: "wrap", gap: "0.5rem", flex: "2 1 300px" },
  selectFiltre: (c) => ({ padding: "0.5rem 1rem", borderRadius: "10px", border: `1px solid ${c.bordure}`, background: c.panneauSolide, color: c.texte, fontSize: "0.85rem", outline: "none", minWidth: "100px", cursor: "pointer" }),
  boutonReset: (c) => ({ display: "flex", alignItems: "center", padding: "0.5rem 1rem", background: `${c.danger}18`, color: c.danger, border: `1px solid ${c.danger}33`, borderRadius: "10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }),

  tableCard: (c) => ({ background: c.panneau, backdropFilter: "blur(20px)", borderRadius: "24px", border: `1px solid ${c.bordure}`, padding: "1.5rem", boxShadow: c.ombre, width: "100%" }),
  table: { width: "100%", borderCollapse: "separate", borderSpacing: "0 4px" },
  th: (c) => ({ padding: "1rem", textAlign: "left", color: c.texteSecondaire, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, cursor: "pointer", borderBottom: `1px solid ${c.bordure}` }),
  tr: (c) => ({ animation: "hd-entree 0.35s ease both" }),
  td: (c) => ({ padding: "0.8rem 1rem", fontSize: "0.88rem", borderBottom: `1px solid ${c.bordure}`, verticalAlign: "middle", color: c.texte }),
  skeletonBar: (c) => ({ height: "14px", width: "60%", background: c.bordureForte, borderRadius: "4px", animation: "hd-pulse 1.5s ease-in-out infinite" }),

  badgeAge: (c) => ({ background: c.panneauSolide, padding: "0.2rem 0.6rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, border: `1px solid ${c.bordure}` }),
  badgeDuree: (c) => ({ background: `${c.accent}18`, color: c.accent, padding: "0.2rem 0.6rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600 }),
  badgeDureeLongue: (c) => ({ background: `${c.danger}18`, color: c.danger, padding: "0.2rem 0.6rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 700 }),
  badgeHomme: () => ({ color: "#4a90d9", background: "#4a90d918", padding: "0.2rem 0.6rem", borderRadius: "6px", fontWeight: 600 }),
  badgeFemme: () => ({ color: "#e0669e", background: "#e0669e18", padding: "0.2rem 0.6rem", borderRadius: "6px", fontWeight: 600 }),
  badgeDomicile: (c) => ({ color: c.succes, background: `${c.succes}18`, padding: "0.2rem 0.8rem", borderRadius: "20px", fontSize: "0.8rem" }),
  badgeTransfert: (c) => ({ color: c.alerte, background: `${c.alerte}18`, padding: "0.2rem 0.8rem", borderRadius: "20px", fontSize: "0.8rem" }),
  badgeDeces: (c) => ({ color: c.danger, background: `${c.danger}18`, padding: "0.2rem 0.8rem", borderRadius: "20px", fontSize: "0.8rem" }),

  paginationContainer: (c) => ({ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem", paddingTop: "1rem", borderTop: `1px solid ${c.bordure}`, flexWrap: "wrap", gap: "1rem" }),
  paginationInfo: (c) => ({ color: c.texteSecondaire, fontSize: "0.85rem" }),
  paginationControles: { display: "flex", alignItems: "center", gap: "0.5rem" },
  paginationNombres: { display: "flex", gap: "0.3rem" },
  boutonPage: (c) => ({ padding: "0.4rem 1rem", background: c.panneauSolide, color: c.texte, border: `1px solid ${c.bordure}`, borderRadius: "8px", cursor: "pointer" }),
  boutonPageNum: (c) => ({ width: "36px", height: "36px", background: c.panneauSolide, color: c.texteSecondaire, border: `1px solid ${c.bordure}`, borderRadius: "8px", cursor: "pointer" }),
  boutonPageActive: (c) => ({ width: "36px", height: "36px", background: c.degradeAccent, color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "default" }),
};