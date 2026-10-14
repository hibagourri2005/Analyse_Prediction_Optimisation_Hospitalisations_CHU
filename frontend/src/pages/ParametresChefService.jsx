import { useAuth } from "../context/AuthContext";
import LayoutChefService from "../components/LayoutChefService";
import PanneauGraphique from "../components/PanneauGraphique";
import { useThemeAnalyste } from "../theme/ThemeAnalyste";

export default function ParametresChefService() {
  const { user } = useAuth();
  const { c } = useThemeAnalyste();

  return (
    <LayoutChefService titre="Paramètres">
      <PanneauGraphique titre="Informations du compte" largeurPleine>
        <div style={styles.ligne(c)}>
          <span style={styles.label(c)}>Nom complet</span>
          <span style={styles.valeur(c)}>{user.nom_complet}</span>
        </div>
        <div style={styles.ligne(c)}>
          <span style={styles.label(c)}>Rôle</span>
          <span style={styles.valeur(c)}>Chef de service</span>
        </div>
        <div style={{ ...styles.ligne(c), borderBottom: "none" }}>
          <span style={styles.label(c)}>Identifiant de service</span>
          <span style={styles.valeur(c)}>{user.id_service}</span>
        </div>
      </PanneauGraphique>

    </LayoutChefService>
  );
}

const styles = {
  ligne: (c) => ({ display: "flex", justifyContent: "space-between", padding: "0.7rem 0", borderBottom: `1px solid ${c.bordure}`, fontSize: "0.9rem" }),
  label: (c) => ({ color: c.texteSecondaire }),
  valeur: (c) => ({ fontWeight: 600, color: c.texte }),
};