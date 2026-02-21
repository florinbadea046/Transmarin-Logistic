// ──────────────────────────────────────────────────────────
// Pagina de Login — autentificare simulată cu selectare rol
// ──────────────────────────────────────────────────────────

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { useAuth, type UserRole } from "@/context/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  dispecer: "Dispecer",
  hr: "Resurse Umane",
  contabil: "Contabil",
};

export default function LoginPage() {
  const { login, loginAs } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(email, password);
    if (success) {
      navigate({ to: "/" });
    } else {
      setError("Email invalid. Folosiți unul din conturile de test.");
    }
  };

  const handleQuickLogin = (role: UserRole) => {
    loginAs(role);
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md space-y-6">
        {/* Logo & Title */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <Truck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Transmarin Logistic</h1>
          <p className="text-sm text-muted-foreground">
            Sistem ERP — Transport & Logistică
          </p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Autentificare</CardTitle>
            <CardDescription>
              Introduceți email-ul și parola (orice parolă e acceptată)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@transmarin.ro"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Parolă</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="orice parolă"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full">
                Conectare
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick Login — selectare rapidă de rol */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Conectare Rapidă (Dev)</CardTitle>
            <CardDescription>Alegeți un rol pentru acces rapid</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                <Button
                  key={role}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickLogin(role)}
                >
                  {ROLE_LABELS[role]}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
