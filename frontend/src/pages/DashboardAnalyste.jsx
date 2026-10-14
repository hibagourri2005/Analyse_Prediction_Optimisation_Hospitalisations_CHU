import { useEffect, useState, useCallback } from "react";
import { Download, Search, X, ArrowUp, ArrowDown, Filter } from "lucide-react";
import api from "../api/axiosConfig";
import LayoutAnalyste from "../components/LayoutAnalyste";
import { useThemeAnalyste, NombreAnime } from "../theme/ThemeAnalyste";

export default function DashboardAnalyste() {
  return (
    <LayoutAnalyste>
      <DashboardContenu />
    </LayoutAnalyste>
  );
}

function DashboardContenu() {
  const { c } = useThemeAnalyste();

  const [donnees, setDonnees] = useState([]);
  const [page, setPage] = useState(1);
  const [totalLignes, setTotalLignes] = useState(0);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(true);
  const [exportEnCours, setExportEnCours] = useState(false);
  const taillePage = 20;

  const [triPar, setTriPar] = useState("id_fait");
  const [ordre, setOrdre] = useState("asc");

  const [services, setServices] = useState([]);
  const [pathologiesDisponibles, setPathologiesDisponibles] = useState([]);

  const [recherche, setRecherche] = useState("");
  const [rechercheSaisie, setRechercheSaisie] = useState("");
  const [idService, setIdService] = useState("");
  const [sexe, setSexe] = useState("");
  const [typeAdmission, setTypeAdmission] = useState("");
  const [modeSortieFiltre, setModeSortieFiltre] = useState("");
  const [pathologieFiltre, setPathologieFiltre] = useState("");

  useEffect(() => {
    const minuteur = setTimeout(() => {
      setRecherche(rechercheSaisie);
      setPage(1);
    }, 400);
    return () => clearTimeout(minuteur);
  }, [rechercheSaisie]);

  useEffect(() => {
    api.get("/api/services")
      .then((res) => setServices(res.data))
      .catch((e) => console.error("[DashboardAnalyste] Échec /api/services →", e.response?.status));

    api.get("/api/pathologies-disponibles")
      .then((res) => setPathologiesDisponibles(res.data))
      .catch((e) => console.error("[DashboardAnalyste] Échec pathologies-disponibles →", e.response?.status));
  }, []);

  const parametresFiltres = {
    recherche: recherche || undefined,
    id_service: idService || undefined,
    sexe: sexe || undefined,
    type_admission: typeAdmission || undefined,
    mode_sortie: modeSortieFiltre || undefined,
    pathologie: pathologieFiltre || undefined,
  };

  const chargerDonnees = useCallback(async () => {
    setChargement(true);
    try {
      const reponse = await api.get("/api/hospitalisations", {
        params: { page, taille_page: taillePage, tri_par: triPar, ordre, ...parametresFiltres },
      });
      setDonnees(reponse.data.donnees);
      setTotalLignes(reponse.data.total_lignes);
      setErreur("");
    } catch (err) {
      console.error("[DashboardAnalyste] Erreur chargement →", err.response?.status, err.response?.data);
      setErreur("Erreur lors du chargement des données");
    } finally {
      setChargement(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, triPar, ordre, recherche, idService, sexe, typeAdmission, modeSortieFiltre, pathologieFiltre]);

  useEffect(() => { chargerDonnees(); }, [chargerDonnees]);

  const totalPages = Math.max(1, Math.ceil(totalLignes / taillePage));
  const filtresActifs = !!(recherche || idService || sexe || typeAdmission || modeSortieFiltre || pathologieFiltre);

  function changerTri(colonne) {
    if (triPar === colonne) setOrdre(ordre === "asc" ? "desc" : "asc");
    else { setTriPar(colonne); setOrdre("asc"); }
    setPage(1);
  }

  function reinitialiserFiltres() {
    setRechercheSaisie(""); setRecherche(""); setIdService(""); setSexe("");
    setTypeAdmission(""); setModeSortieFiltre(""); setPathologieFiltre("");
    setPage(1);
  }

  async function exporterCSV() {
    setExportEnCours(true);
    try {
      const reponse = await api.get("/api/hospitalisations/export", {
        params: parametresFiltres,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([reponse.data]));
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = "export_hospitalisations.csv";
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[DashboardAnalyste] Échec export CSV →", e.response?.status);
      alert("Erreur lors de l'export CSV. Voir la console (F12) pour le détail.");
    } finally {
      setExportEnCours(false);
    }
  }

  function renderSkeletonCells(nbColonnes) {
    return Array.from({ length: 6 }).map((_, rowIndex) => (
      <tr key={rowIndex} style={styles.tr(c)}>
        {Array.from({ length: nbColonnes }).map((_, colIndex) => (
          <td key={colIndex} style={styles.td(c)}>
            <div style={styles.skeletonBar(c)} />
          </td>
        ))}
      </tr>
    ));
  }

  const colonnes = [
    { key: "id_fait", label: "ID" },
    { key: null, label: "Service" },
    { key: null, label: "Médecin" },
    { key: "age", label: "Âge" },
    { key: null, label: "Sexe" },
    { key: null, label: "Ville" },
    { key: "date_entree", label: "Entrée" },
    { key: "duree_sejour", label: "Durée" },
    { key: null, label: "Admission" },
    { key: null, label: "Pathologie" },
    { key: null, label: "Sortie" },
  ];

  return (
    <div style={styles.pageBackground}>
{/* --- ENTÊTE --- */}
      <div style={styles.enteteContainer}>
        <div className="hd-carte-glass" style={styles.badgeStat(c)}>
          <span style={styles.badgeStatNumber(c)}><NombreAnime valeur={totalLignes} /></span>
          <span style={styles.badgeStatLabel(c)}>Hospitalisations</span>
        </div>
        {filtresActifs && (
          <div style={styles.badgeFiltreInfo(c)}>
            <Filter size={14} style={{ marginRight: "4px" }} /> Filtré
          </div>
        )}
      </div>

      {/* --- ACTION EXPORT --- */}
      <div style={styles.barreActionExport}>
        <button style={styles.boutonExport(c)} onClick={exporterCSV} disabled={exportEnCours}>
          <Download size={18} />
          <span>{exportEnCours ? "Export..." : "Exporter CSV"}</span>
        </button>
      </div>

      {/* --- FILTRES --- */}
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
          <select value={idService} onChange={(e) => { setIdService(e.target.value); setPage(1); }} style={styles.selectFiltre(c)}>
            <option value="">Service</option>
            {services.map((s) => <option key={s.id_service} value={s.id_service}>{s.nom_service}</option>)}
          </select>
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

      {/* --- CARTE TABLEAU --- */}
      <div className="hd-carte-glass" style={styles.tableCard(c)}>
        {erreur && <div style={styles.erreurBanner(c)}>{erreur}</div>}

        <div style={{ overflowX: "auto", position: "relative", minHeight: "400px" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {colonnes.map((col, index) => (
                  <th
                    key={index}
                    style={styles.th(c)}
                    onClick={col.key ? () => changerTri(col.key) : undefined}
                  >
                    <div style={styles.thContent}>
                      {col.label}
                      {col.key && (triPar === col.key ? (
                        <span style={{ display: "flex", color: c.accentVif }}>
                          {ordre === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                        </span>
                      ) : (
                        <span style={{ width: "14px", height: "14px" }} />
                      ))}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chargement ? (
                renderSkeletonCells(11)
              ) : donnees.length === 0 ? (
                <tr>
                  <td style={{ ...styles.td(c), padding: "4rem", textAlign: "center", color: c.texteAtténué }} colSpan={11}>
                    <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🔍</div>
                    Aucune donnée trouvée
                  </td>
                </tr>
              ) : (
                donnees.map((ligne, index) => (
                  <tr key={ligne.id_fait} className="hd-ligne-hover" style={{ ...styles.tr(c), backgroundColor: index % 2 === 1 ? c.panneau : "transparent", animationDelay: `${Math.min(index, 12) * 25}ms` }}>
                    <td style={styles.td(c)}>{ligne.id_fait}</td>
                    <td style={styles.td(c)}>{ligne.nom_service}</td>
                    <td style={styles.td(c)}>{ligne.medecin || "—"}</td>
                    <td style={styles.td(c)}><span style={styles.badgeAge(c)}>{ligne.age}</span></td>
                    <td style={styles.td(c)}>
                      <span style={ligne.sexe === "M" ? styles.badgeHomme(c) : styles.badgeFemme(c)}>
                        {ligne.sexe}
                      </span>
                    </td>
                    <td style={styles.td(c)}>{ligne.ville}</td>
                    <td style={styles.td(c)}>{ligne.date_entree}</td>
                    <td style={styles.td(c)}>
                      <span style={styles.badgeDuree(c)}>{ligne.duree_sejour} j</span>
                    </td>
                    <td style={styles.td(c)}>{ligne.type_admission}</td>
                    <td style={styles.td(c)}>{ligne.pathologie}</td>
                    <td style={styles.td(c)}>
                      <span style={
                        ligne.mode_sortie === "Domicile" ? styles.badgeDomicile(c) :
                        ligne.mode_sortie === "Décès" ? styles.badgeDeces(c) :
                        styles.badgeTransfert(c)
                      }>
                        {ligne.mode_sortie}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* --- PAGINATION --- */}
        <div style={styles.paginationContainer(c)}>
          <div style={styles.paginationInfo(c)}>
            Lignes {(page - 1) * taillePage + 1} à {Math.min(page * taillePage, totalLignes)} sur {totalLignes}
          </div>
          <div style={styles.paginationControles}>
            <button style={styles.boutonPage(c)} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Précédent
            </button>

            <div style={styles.paginationNombres}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let num = i + 1;
                if (totalPages > 5) {
                  if (page > 3) num = page - 3 + i;
                  if (page > totalPages - 3) num = totalPages - 4 + i;
                }
                return (
                  <button
                    key={num}
                    style={page === num ? styles.boutonPageActive(c) : styles.boutonPageNum(c)}
                    onClick={() => setPage(num)}
                  >{num}</button>
                );
              })}
            </div>

            <button style={styles.boutonPage(c)} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  pageBackground: { padding: "1.5rem 2rem", position: "relative", zIndex: 1, minWidth: 0, maxWidth: "100%", boxSizing: "border-box" },

  enteteContainer: { display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" },
  barreActionExport: { display: "flex", justifyContent: "flex-end", marginBottom: "1rem" },  badgeStat: (c) => ({ display: "flex", flexDirection: "column", background: c.panneau, backdropFilter: "blur(10px)", padding: "0.6rem 1.2rem", borderRadius: "14px", border: `1px solid ${c.bordure}`, boxShadow: c.ombre }),
  badgeStatNumber: (c) => ({ fontSize: "1.4rem", fontWeight: 700, color: c.accent, fontFamily: "'Poppins',sans-serif" }),
  badgeStatLabel: (c) => ({ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "1px", color: c.texteSecondaire }),
  badgeFiltreInfo: (c) => ({ display: "flex", alignItems: "center", padding: "0.4rem 0.8rem", background: `${c.accent}22`, borderRadius: "20px", fontSize: "0.8rem", color: c.accent, border: `1px solid ${c.accent}33` }),
  boutonExport: (c) => ({ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.7rem 1.5rem", background: c.degradeAccent, color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: 600, boxShadow: `0 8px 20px ${c.accentProfond}44`, transition: "transform 0.2s ease" }),

  barreFiltresContainer: (c) => ({ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1.6rem", alignItems: "center", background: c.panneau, padding: "1rem", borderRadius: "18px", backdropFilter: "blur(14px)", border: `1px solid ${c.bordure}` }),
  rechercheWrapper: { flex: "1 1 250px", position: "relative", display: "flex", alignItems: "center" },
  searchIcon: (c) => ({ position: "absolute", left: "12px", color: c.texteAtténué }),
  clearIcon: (c) => ({ position: "absolute", right: "12px", color: c.texteAtténué, cursor: "pointer" }),
  inputRecherche: (c) => ({ width: "100%", padding: "0.7rem 2.5rem", borderRadius: "10px", border: `1px solid ${c.bordure}`, background: c.panneauSolide, fontSize: "0.9rem", color: c.texte, outline: "none" }),
  filtresWrapper: { display: "flex", flexWrap: "wrap", gap: "0.5rem", flex: "2 1 400px" },
  selectFiltre: (c) => ({ padding: "0.5rem 1rem", borderRadius: "10px", border: `1px solid ${c.bordure}`, background: c.panneauSolide, color: c.texte, fontSize: "0.85rem", outline: "none", minWidth: "100px", cursor: "pointer" }),
  boutonReset: (c) => ({ display: "flex", alignItems: "center", padding: "0.5rem 1rem", background: `${c.danger}18`, color: c.danger, border: `1px solid ${c.danger}33`, borderRadius: "10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }),

  tableCard: (c) => ({ background: c.panneau, backdropFilter: "blur(20px)", borderRadius: "24px", border: `1px solid ${c.bordure}`, padding: "1.5rem", boxShadow: c.ombre, width: "100%" }),
  erreurBanner: (c) => ({ background: `${c.danger}18`, color: c.danger, padding: "1rem", borderRadius: "12px", marginBottom: "1rem", textAlign: "center", fontWeight: 600 }),
  table: { width: "100%", borderCollapse: "separate", borderSpacing: "0 4px" },
  th: (c) => ({ padding: "1rem", textAlign: "left", color: c.texteSecondaire, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, cursor: "pointer", borderBottom: `1px solid ${c.bordure}` }),
  thContent: { display: "flex", alignItems: "center", gap: "6px" },

  tr: (c) => ({ animation: "hd-entree 0.35s ease both", backgroundColor: "transparent", borderRadius: "12px" }),
  td: (c) => ({ padding: "0.8rem 1rem", fontSize: "0.88rem", borderBottom: `1px solid ${c.bordure}`, verticalAlign: "middle", color: c.texte }),
  skeletonBar: (c) => ({ height: "14px", width: "60%", background: c.bordureForte, borderRadius: "4px", animation: "hd-pulse 1.5s ease-in-out infinite" }),

  badgeAge: (c) => ({ background: c.panneauSolide, padding: "0.2rem 0.6rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, border: `1px solid ${c.bordure}` }),
  badgeDuree: (c) => ({ background: `${c.accent}18`, color: c.accent, padding: "0.2rem 0.6rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600 }),
  badgeHomme: (c) => ({ color: "#4a90d9", background: "#4a90d918", padding: "0.2rem 0.6rem", borderRadius: "6px", fontWeight: 600 }),
  badgeFemme: (c) => ({ color: "#e0669e", background: "#e0669e18", padding: "0.2rem 0.6rem", borderRadius: "6px", fontWeight: 600 }),
  badgeDomicile: (c) => ({ color: c.succes, background: `${c.succes}18`, padding: "0.2rem 0.8rem", borderRadius: "20px", fontSize: "0.8rem" }),
  badgeTransfert: (c) => ({ color: c.alerte, background: `${c.alerte}18`, padding: "0.2rem 0.8rem", borderRadius: "20px", fontSize: "0.8rem" }),
  badgeDeces: (c) => ({ color: c.danger, background: `${c.danger}18`, padding: "0.2rem 0.8rem", borderRadius: "20px", fontSize: "0.8rem" }),

  paginationContainer: (c) => ({ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem", paddingTop: "1rem", borderTop: `1px solid ${c.bordure}`, flexWrap: "wrap", gap: "1rem" }),
  paginationInfo: (c) => ({ color: c.texteSecondaire, fontSize: "0.85rem" }),
  paginationControles: { display: "flex", alignItems: "center", gap: "0.5rem" },
  paginationNombres: { display: "flex", gap: "0.3rem" },
  boutonPage: (c) => ({ padding: "0.4rem 1rem", background: c.panneauSolide, color: c.texte, border: `1px solid ${c.bordure}`, borderRadius: "8px", cursor: "pointer", transition: "all 0.2s" }),
  boutonPageNum: (c) => ({ width: "36px", height: "36px", background: c.panneauSolide, color: c.texteSecondaire, border: `1px solid ${c.bordure}`, borderRadius: "8px", cursor: "pointer" }),
  boutonPageActive: (c) => ({ width: "36px", height: "36px", background: c.degradeAccent, color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "default" }),
};