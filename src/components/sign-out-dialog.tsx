import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface SignOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignOut?: () => void;
}

export function SignOutDialog({
  open,
  onOpenChange,
  onSignOut,
}: SignOutDialogProps) {
  const { t } = useTranslation();
  const handleSignOut = () => {
    onSignOut?.();
    onOpenChange(false);
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("auth.signOut")}
      desc={t("auth.signOutDesc")}
      confirmText={t("auth.signOut")}
      destructive
      handleConfirm={handleSignOut}
      className="sm:max-w-sm"
    />
  );
}
