import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation, Link } from "react-router-dom";

const ONGLETS_PAR_ROLE = {
  direction: [
    { label: "Exécutive", path: "/dashboard/direction" },
    { label: "Services", path: "/dashboard/direction/services" },
    { label: "Prévisionnelle", path: "/dashboard/direction/prevision" },
    { label: "Prédiction", path: "/prediction" },
  ],
  chef_service: [
    { label: "Dashboard", path: "/dashboard/chef-service" },
    { label: "Prédiction", path: "/prediction" },
  ],
  analyste: [{ label: "Données brutes", path: "/dashboard/analyste" }],
};

export default function LayoutPrincipal({ titre, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const onglets = ONGLETS_PAR_ROLE[user?.role] || [];

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", minHeight: "100vh", backgroundColor: "#f0f2f5" }}>
      <header style={styles.header}>
        <div>
          <strong style={{ fontSize: "1.05rem" }}>CHU Mohammed VI — Agadir</strong>
          <span style={styles.sousTitre}> · {titre}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={styles.role}>{user?.nom_complet || user?.username}</span>
          <span style={styles.badgeRole}>{user?.role}</span>
          <button style={styles.boutonDeconnexion} onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </header>

      {onglets.length > 1 && (
        <nav style={styles.nav}>
          {onglets.map((onglet) => (
            <Link
              key={onglet.path}
              to={onglet.path}
              style={{
                ...styles.onglet,
                ...(location.pathname === onglet.path ? styles.ongletActif : {}),
              }}
            >
              {onglet.label}
            </Link>
          ))}
        </nav>
      )}

      <main style={{ padding: "1.5rem 2rem" }}>{children}</main>
    </div>
  );
}

const styles = {
  header: {
    backgroundColor: "#12325c",
    color: "white",
    padding: "0.9rem 2rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sousTitre: {
    fontWeight: "normal",
    fontSize: "0.9rem",
    opacity: 0.8,
  },
  role: {
    fontSize: "0.85rem",
    marginRight: "0.6rem",
    opacity: 0.9,
  },
  badgeRole: {
    fontSize: "0.75rem",
    backgroundColor: "#2b6cb0",
    padding: "0.2rem 0.6rem",
    borderRadius: "12px",
    marginRight: "1rem",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  boutonDeconnexion: {
    backgroundColor: "transparent",
    border: "1px solid rgba(255,255,255,0.5)",
    color: "white",
    padding: "0.4rem 0.9rem",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  nav: {
    backgroundColor: "white",
    display: "flex",
    padding: "0 2rem",
    borderBottom: "1px solid #e0e0e0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  onglet: {
    padding: "0.9rem 1.3rem",
    textDecoration: "none",
    color: "#555",
    fontSize: "0.9rem",
    fontWeight: 500,
    borderBottom: "3px solid transparent",
  },
  ongletActif: {
    color: "#12325c",
    borderBottom: "3px solid #12325c",
  },
};