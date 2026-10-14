import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Building2, Users, Bot, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useThemeAnalyste } from "../theme/ThemeAnalyste";

const LIENS = [
  { to: "/dashboard/direction", label: "Vue Exécutive", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/direction/services", label: "Services", icon: Building2 },
  { to: "/dashboard/direction/patients", label: "Liste des patients", icon: Users },
  { to: "/dashboard/direction/assistant", label: "Assistant IA", icon: Bot },
];

export default function SidebarDirection() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { c } = useThemeAnalyste();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside style={styles.sidebar(c)}>
      <div style={styles.marqueLigne}>
        <span style={styles.pointLumineux(c)} />
        <span style={styles.marqueTexte(c)}>HospiDecision AI</span>
      </div>

      <div style={styles.entete(c)}>
        <div style={styles.avatar(c)}>{user?.nom_complet?.[0] ?? "D"}</div>
        <div>
          <p style={styles.nom(c)}>{user?.nom_complet}</p>
          <p style={styles.role(c)}>Direction</p>
        </div>
      </div>

      <nav style={styles.nav}>
        {LIENS.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            style={({ isActive }) => ({
              ...styles.lien(c),
              ...(isActive ? styles.lienActif(c) : {}),
            })}
          >
            {({ isActive }) => (
              <>
                {isActive && <span style={styles.barreActive(c)} />}
                <Icon size={18} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <button style={styles.deconnexion(c)} onClick={handleLogout}>
        <LogOut size={18} />
        <span>Déconnexion</span>
      </button>
    </aside>
  );
}

const styles = {
  sidebar: (c) => ({
    width: "240px",
    minHeight: "100vh",
    backgroundColor: c.panneauSolide,
    color: c.texte,
    display: "flex",
    flexDirection: "column",
    padding: "1.25rem 1rem 1.5rem",
    position: "sticky",
    top: 0,
    zIndex: 2,
    flexShrink: 0,
    borderRight: `1px solid ${c.bordure}`,
    transition: "background-color 0.4s ease, color 0.4s ease",
  }),
  marqueLigne: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.3rem 0.2rem 1.1rem",
  },
  pointLumineux: (c) => ({
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: c.accentVif,
    boxShadow: `0 0 10px ${c.accentVif}`,
    animation: "hd-lueur 2.4s ease-in-out infinite",
  }),
  marqueTexte: (c) => ({
    fontFamily: "'Poppins',sans-serif",
    fontWeight: 700,
    fontSize: "0.8rem",
    letterSpacing: "0.4px",
    color: c.texteSecondaire,
  }),
  entete: (c) => ({
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
    padding: "0.5rem 0.2rem 1.4rem",
    borderBottom: `1px solid ${c.bordure}`,
    marginBottom: "1.4rem",
  }),
  avatar: (c) => ({
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    background: c.degradeAccent,
    color: "#001a33",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "1.05rem",
    fontFamily: "'Poppins',sans-serif",
    boxShadow: `0 0 0 3px ${c.bordure}`,
  }),
  nom: (c) => ({ margin: 0, fontSize: "0.9rem", fontWeight: 600, color: c.texte }),
  role: (c) => ({ margin: 0, fontSize: "0.72rem", color: c.accent, opacity: 0.85 }),
  nav: { display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1 },
  lien: (c) => ({
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
    padding: "0.7rem 1rem",
    borderRadius: "12px",
    color: c.texteSecondaire,
    textDecoration: "none",
    fontSize: "0.88rem",
    transition: "all 0.2s ease",
  }),
  lienActif: (c) => ({
    backgroundColor: `${c.accent}1f`,
    color: c.accent,
    fontWeight: 600,
    boxShadow: `inset 0 0 0 1px ${c.bordureForte}`,
  }),
  barreActive: (c) => ({
    position: "absolute",
    left: "-1rem",
    top: "50%",
    transform: "translateY(-50%)",
    width: "3px",
    height: "60%",
    borderRadius: "0 4px 4px 0",
    background: c.accentVif,
  }),
  deconnexion: (c) => ({
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
    padding: "0.7rem 1rem",
    background: `${c.danger}14`,
    border: `1px solid ${c.danger}33`,
    borderRadius: "12px",
    color: c.danger,
    cursor: "pointer",
    fontSize: "0.88rem",
    fontFamily: "inherit",
    transition: "all 0.2s ease",
    marginTop: "0.5rem",
  }),
};