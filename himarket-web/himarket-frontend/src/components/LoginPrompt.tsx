import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { LockKeyhole } from "lucide-react";
import { Button, Modal } from "./common";

interface LoginPromptProps {
  open: boolean;
  onClose: () => void;
  contextMessage: string;
  returnUrl?: string;
}

export function LoginPrompt({
  open,
  onClose,
  contextMessage,
  returnUrl,
}: LoginPromptProps) {
  const navigate = useNavigate();
  const { t } = useTranslation("loginPrompt");

  const handleLogin = () => {
    const url = returnUrl || window.location.pathname + window.location.search;
    navigate(`/login?returnUrl=${encodeURIComponent(url)}`);
    onClose();
  };

  const handleRegister = () => {
    navigate("/register");
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={420}
      destroyOnClose
    >
      <div className="px-2 py-5 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-claude-full bg-colorPrimaryBgHover text-colorPrimary">
          <LockKeyhole className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="mb-3 text-2xl font-semibold text-claude-neutral-900">
          {t("title")}
        </div>
        <p className="mb-6 text-sm leading-relaxed text-claude-neutral-600">
          {contextMessage}
        </p>
        <div className="flex flex-col gap-3">
          <Button variant="primary" size="large" block onClick={handleLogin}>
            {t('login')}
          </Button>
          <Button
            size="large"
            block
            className="rounded-claude-lg"
            onClick={handleRegister}
          >
            {t("registerNewAccount")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
