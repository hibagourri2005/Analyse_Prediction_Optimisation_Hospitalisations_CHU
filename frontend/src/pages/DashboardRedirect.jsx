import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function DashboardRedirect() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "direction") return <Navigate to="/dashboard/direction" replace />;
  if (user.role === "chef_service") return <Navigate to="/dashboard/chef-service/vue-ensemble" replace />;
  if (user.role === "analyste") return <Navigate to="/dashboard/analyste" replace />;
  if (user.role === "administrateur") return <Navigate to="/dashboard/administration" replace />;

  return <Navigate to="/login" replace />;
}