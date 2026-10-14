import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import RouteProtegee from "./components/RouteProtegee";

import Login from "./pages/Login";
import DashboardRedirect from "./pages/DashboardRedirect";
import DashboardDirection from "./pages/DashboardDirection";
import DashboardServices from "./pages/DashboardServices";
import DashboardPrevision from "./pages/DashboardPrevision";
import DashboardAnalyste from "./pages/DashboardAnalyste";
import ListePatientsDirection from "./pages/ListePatientsDirection";
import DetailsModeleAnalyste from "./pages/DetailsModeleAnalyste";
import Prediction from "./pages/Prediction";

// Nouvelles pages du chef de service (remplacent l'ancien DashboardChefService)
import VueEnsembleChefService from "./pages/VueEnsembleChefService";
import GraphiquesChefService from "./pages/GraphiquesChefService";
import ListePatientsChefService from "./pages/ListePatientsChefService";
import ParametresChefService from "./pages/ParametresChefService";

// Assistant IA (un par rôle, même composant AgentChat réutilisé dans chaque layout)
import AgentChatChefService from "./pages/AgentChatChefService";
import AgentChatDirection from "./pages/AgentChatDirection";
import AgentChatAnalyste from "./pages/AgentChatAnalyste";
import GestionUtilisateursAdmin from "./pages/GestionUtilisateursAdmin";


import { ThemeAnalysteProvider } from "./theme/ThemeAnalyste";


function App() {
  return (
  <AuthProvider>
    <ThemeAnalysteProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<DashboardRedirect />} />
        
        <Route
          path="/dashboard/administration"
          element={
            <RouteProtegee rolesAutorises={["administrateur"]}>
              <GestionUtilisateursAdmin />
           </RouteProtegee>
          }
       />
        <Route
          path="/dashboard/direction"
          element={
            <RouteProtegee rolesAutorises={["direction"]}>
              <DashboardDirection />
            </RouteProtegee>
          }
        />

        <Route
          path="/dashboard/direction/services"
          element={
            <RouteProtegee rolesAutorises={["direction"]}>
              <DashboardServices />
            </RouteProtegee>
          }
        />

        {/* Vue Prévisionnelle retirée de la Direction — elle vit maintenant uniquement chez l'Analyste, plus bas */}

        <Route
          path="/dashboard/direction/patients"
          element={
            <RouteProtegee rolesAutorises={["direction"]}>
              <ListePatientsDirection />
            </RouteProtegee>
          }
        />

        <Route
          path="/dashboard/direction/assistant"
          element={
            <RouteProtegee rolesAutorises={["direction"]}>
              <AgentChatDirection />
            </RouteProtegee>
          }
        />

        {/* Redirection : /dashboard/chef-service seul -> vue d'ensemble */}
        <Route
          path="/dashboard/chef-service"
          element={<Navigate to="/dashboard/chef-service/vue-ensemble" replace />}
        />

        <Route
          path="/dashboard/chef-service/vue-ensemble"
          element={
            <RouteProtegee rolesAutorises={["chef_service"]}>
              <VueEnsembleChefService />
            </RouteProtegee>
          }
        />

        <Route
          path="/dashboard/chef-service/graphiques"
          element={
            <RouteProtegee rolesAutorises={["chef_service"]}>
              <GraphiquesChefService />
            </RouteProtegee>
          }
        />

        <Route
          path="/dashboard/chef-service/patients"
          element={
            <RouteProtegee rolesAutorises={["chef_service"]}>
              <ListePatientsChefService />
            </RouteProtegee>
          }
        />

        <Route
          path="/dashboard/chef-service/prediction"
          element={
            <RouteProtegee rolesAutorises={["chef_service"]}>
              <Prediction />
            </RouteProtegee>
          }
        />

        <Route
          path="/dashboard/chef-service/parametres"
          element={
            <RouteProtegee rolesAutorises={["chef_service"]}>
              <ParametresChefService />
            </RouteProtegee>
          }
        />

        <Route
          path="/dashboard/chef-service/assistant"
          element={
            <RouteProtegee rolesAutorises={["chef_service"]}>
              <AgentChatChefService />
            </RouteProtegee>
          }
        />

        <Route
          path="/dashboard/analyste"
          element={
            <RouteProtegee rolesAutorises={["analyste"]}>
              <DashboardAnalyste />
            </RouteProtegee>
          }
        />

        <Route
          path="/dashboard/analyste/prevision"
          element={
            <RouteProtegee rolesAutorises={["analyste"]}>
              <DashboardPrevision />
            </RouteProtegee>
          }
        />

        <Route
          path="/dashboard/analyste/modele"
          element={
            <RouteProtegee rolesAutorises={["analyste"]}>
              <DetailsModeleAnalyste />
            </RouteProtegee>
          }
        />

        <Route
          path="/dashboard/analyste/assistant"
          element={
            <RouteProtegee rolesAutorises={["analyste"]}>
              <AgentChatAnalyste />
            </RouteProtegee>
          }
        />

        {/* Route générique de prédiction, accessible direction + chef_service, hors sidebar chef-service */}
        <Route
          path="/prediction"
          element={
            <RouteProtegee rolesAutorises={["direction", "chef_service"]}>
              <Prediction />
            </RouteProtegee>
          }
        />
      </Routes>
    </ThemeAnalysteProvider>
  </AuthProvider>
  );
}

export default App;