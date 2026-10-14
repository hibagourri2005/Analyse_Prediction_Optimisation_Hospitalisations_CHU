import { useThemeAnalyste } from "../theme/ThemeAnalyste";

export default function PanneauGraphique({ titre, largeurPleine, children }) {
  const { c } = useThemeAnalyste();
  return (
    <section
      className="hd-carte-glass"
      style={{
        ...styles.panneau(c),
        ...(largeurPleine ? { gridColumn: "1 / -1", width: "100%" } : {}),
      }}
    >
      {titre && <h3 style={styles.titre(c)}>{titre}</h3>}
      {children}
    </section>
  );
}

const styles = {
  panneau: (c) => ({
    background: c.panneau,
    backdropFilter: "blur(16px)",
    border: `1px solid ${c.bordure}`,
    borderRadius: "20px",
    padding: "1.4rem 1.6rem",
    marginBottom: "1.4rem",
    boxShadow: c.ombre,
    animation: "hd-entree 0.45s ease both",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  }),
  titre: (c) => ({
    margin: "0 0 1rem",
    fontSize: "1rem",
    fontWeight: 600,
    fontFamily: "'Poppins',sans-serif",
    color: c.texte,
  }),
};