import { useThemeAnalyste, NombreAnime } from "../theme/ThemeAnalyste";

/**
 * Carte KPI compacte : titre, valeur (animée si numérique), couleur d'accent optionnelle.
 * `couleur` reste rétrocompatible avec les appels existants (ex: "#dd6b20").
 */
export default function CarteKPI({ titre, valeur, couleur, petite }) {
  const { c } = useThemeAnalyste();
  const accent = couleur || c.accent;

  const numerique = typeof valeur === "number";
  const correspondance = typeof valeur === "string" && valeur.match(/^(-?\d+(?:\.\d+)?)(.*)$/);

  return (
    <div className="hd-carte-glass" style={styles.carte(c, accent, petite)}>
      <div style={styles.barreAccent(accent)} />
      <p style={styles.titre(c, petite)}>{titre}</p>
      <p style={styles.valeur(c, petite)}>
        {numerique ? (
          <NombreAnime valeur={valeur} />
        ) : correspondance ? (
          <>
            <NombreAnime valeur={parseFloat(correspondance[1])} />
            {correspondance[2]}
          </>
        ) : (
          valeur
        )}
      </p>
    </div>
  );
}

const styles = {
  carte: (c, accent, petite) => ({
    position: "relative",
    overflow: "hidden",
    background: c.panneau,
    backdropFilter: "blur(14px)",
    border: `1px solid ${c.bordure}`,
    borderRadius: petite ? "12px" : "16px",
    padding: petite ? "0.8rem 1rem" : "1.1rem 1.2rem",
    animation: "hd-entree 0.4s ease both",
    boxShadow: c.ombre,
  }),
  barreAccent: (accent) => ({
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: "3px",
    background: accent,
    boxShadow: `0 0 12px ${accent}`,
  }),
  titre: (c, petite) => ({
    margin: petite ? "0 0 0.3rem" : "0 0 0.4rem",
    fontSize: petite ? "0.66rem" : "0.72rem",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    color: c.texteSecondaire,
    fontWeight: 600,
  }),
  valeur: (c, petite) => ({
    margin: 0,
    fontSize: petite ? "1.25rem" : "1.6rem",
    fontWeight: 700,
    fontFamily: "'Poppins',sans-serif",
    color: c.texte,
  }),
};