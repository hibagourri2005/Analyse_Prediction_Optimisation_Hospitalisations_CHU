import { Sun, Moon } from "lucide-react";
import SidebarDirection from "./SidebarDirection";
import { ThemeAnalysteProvider, useThemeAnalyste, FondAmbiance } from "../theme/ThemeAnalyste";

export default function LayoutDirection({ children }) {
  return (
    <ThemeAnalysteProvider>
      <LayoutInterieur>{children}</LayoutInterieur>
    </ThemeAnalysteProvider>
  );
}

function LayoutInterieur({ children }) {
  const { modeSombre, toggleTheme, c } = useThemeAnalyste();

  return (
    <div style={styles.layout(c)}>
      <FondAmbiance />
      <SidebarDirection />

      <button
        style={styles.toggleBtn(c)}
        onClick={toggleTheme}
        aria-label={modeSombre ? "Passer en mode clair" : "Passer en mode sombre"}
      >
        {modeSombre ? <Sun size={16} /> : <Moon size={16} />}
        <span>{modeSombre ? "Mode clair" : "Mode sombre"}</span>
      </button>

      <main style={styles.main(c)}>{children}</main>
    </div>
  );
}

const styles = {
  layout: (c) => ({
    display: "flex",
    minHeight: "100vh",
    width: "100%",
    maxWidth: "100vw",
    backgroundColor: c.fond,
    position: "relative",
    fontFamily: "'Inter','Segoe UI',sans-serif",
    transition: "background-color 0.4s ease",
  }),
  main: (c) => ({
    flex: "1 1 0%",
    minWidth: 0,
    position: "relative",
    zIndex: 1,
    minHeight: "100vh",
    color: c.texte,
    overflowX: "auto",
    transition: "color 0.4s ease",
  }),
  toggleBtn: (c) => ({
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: 999,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: c.panneau,
    backdropFilter: "blur(10px)",
    border: `1px solid ${c.bordure}`,
    borderRadius: "40px",
    padding: "10px 18px",
    color: c.accent,
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    fontFamily: "'Poppins',sans-serif",
    boxShadow: c.ombre,
    transition: "all 0.3s ease",
  }),
};