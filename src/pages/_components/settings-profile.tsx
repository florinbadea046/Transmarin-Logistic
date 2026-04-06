import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/auth-provider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface ProfileErrors {
  name?: string;
  email?: string;
  phone?: string;
}

export function SettingsProfile() {
  const { t } = useTranslation();
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = React.useState(user?.name ?? "");
  const [email, setEmail] = React.useState(user?.email ?? "");
  const [phone, setPhone] = React.useState(user?.phone ?? "");
  const [errors, setErrors] = React.useState<ProfileErrors>({});

  const [oldPassword, setOldPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordError, setPasswordError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone ?? "");
    }
  }, [user]);

  function validateProfile(): boolean {
    const errs: ProfileErrors = {};

    if (!name.trim() || name.trim().length < 2) {
      errs.name = t("settings.profile.validation.nameMin");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      errs.email = t("settings.profile.validation.emailInvalid");
    }

    if (phone.trim() && !/^(\+?\d{10,15}|0\d{9})$/.test(phone.trim().replace(/\s/g, ""))) {
      errs.phone = t("settings.profile.validation.phoneInvalid");
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSaveProfile() {
    if (!validateProfile()) return;
    updateUser({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined });
    toast.success(t("settings.profile.saved"));
  }

  function handleChangePassword() {
    setPasswordError(null);
    if (!oldPassword) {
      setPasswordError(t("settings.profile.oldPasswordRequired"));
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t("settings.profile.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("settings.profile.passwordMismatch"));
      return;
    }
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success(t("settings.profile.passwordChanged"));
  }

  function handleLogout() {
    logout();
    navigate({ to: "/login" });
  }

  if (!user) return null;

  return (
    <div className="grid gap-4 max-w-2xl">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.profile.title")}</CardTitle>
          <CardDescription>{t("settings.profile.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-lg">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="profile-name">{t("settings.profile.name")}</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                placeholder={t("settings.profile.namePlaceholder")}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-email">{t("settings.profile.email")}</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                placeholder={t("settings.profile.emailPlaceholder")}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-phone">{t("settings.profile.phone")}</Label>
              <Input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setErrors((p) => ({ ...p, phone: undefined })); }}
                placeholder={t("settings.profile.phonePlaceholder")}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
            <div className="grid gap-2">
              <Label>{t("settings.profile.role")}</Label>
              <div>
                <Badge variant="secondary">
                  {t(`settings.profile.roles.${user.role}`)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile}>
              {t("settings.profile.saveBtn")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.profile.passwordTitle")}</CardTitle>
          <CardDescription>{t("settings.profile.passwordDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="old-password">{t("settings.profile.oldPassword")}</Label>
              <Input
                id="old-password"
                type="password"
                value={oldPassword}
                onChange={(e) => { setOldPassword(e.target.value); setPasswordError(null); }}
                placeholder={t("settings.profile.oldPasswordPlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-password">{t("settings.profile.newPassword")}</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordError(null); }}
                placeholder={t("settings.profile.newPasswordPlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">{t("settings.profile.confirmPassword")}</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(null); }}
                placeholder={t("settings.profile.confirmPasswordPlaceholder")}
              />
            </div>
          </div>
          {passwordError && (
            <p className="text-sm text-destructive">{passwordError}</p>
          )}
          <div className="flex justify-end">
            <Button onClick={handleChangePassword}>
              {t("settings.profile.changePasswordBtn")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">
            {t("settings.profile.dangerTitle")}
          </CardTitle>
          <CardDescription>{t("settings.profile.dangerDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{t("settings.profile.logoutBtn")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.profile.logoutDesc")}</p>
            </div>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              {t("settings.profile.logoutBtn")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
