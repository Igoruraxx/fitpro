import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

/**
 * Home page: redirects authenticated users to /dashboard, unauthenticated to /login
 */
export default function Home() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/login";
    }
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
