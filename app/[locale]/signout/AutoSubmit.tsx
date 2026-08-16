"use client";

import { useEffect } from "react";

export function SignOutAutoSubmit() {
  useEffect(() => {
    const form = document.getElementById("signout-form") as HTMLFormElement | null;
    form?.requestSubmit();
  }, []);
  return null;
}
