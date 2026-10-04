"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { compressImage } from "@/lib/compress-image";

interface AvatarUploadFormProps {
  childId: string;
  action: (formData: FormData) => Promise<void>;
  className?: string;
}

/**
 * Child avatar upload. Phone photos are often 2–5 MB, above the 1 MB server
 * action body limit, so the image is compressed in the browser before upload
 * and the outcome is shown inline instead of failing silently.
 */
export function AvatarUploadForm({ childId, action, className = "" }: AvatarUploadFormProps) {
  const t = useTranslations("kids");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const file = (form.elements.namedItem("avatar") as HTMLInputElement).files?.[0];
    if (!file) return;
    setStatus("idle");
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("child_id", childId);
        fd.set("avatar", await compressImage(file));
        await action(fd);
        setStatus("saved");
        form.reset();
      } catch (err) {
        console.error("[AvatarUploadForm]", err);
        setStatus("error");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className={className}>
      <input type="file" name="avatar" accept="image/*" required className="min-w-0 flex-1 text-xs" />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? t("avatarSaving") : t("avatarSave")}
      </Button>
      {status === "saved" && <span className="w-full text-xs text-emerald-600">✓ {t("avatarSaved")}</span>}
      {status === "error" && <span className="w-full text-xs text-red-500">{t("avatarError")}</span>}
    </form>
  );
}
