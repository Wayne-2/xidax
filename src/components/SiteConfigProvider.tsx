"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { fetchSiteConfig } from "@/lib/api";
import { defaultSupportEmail, setSupportEmail } from "@/data/support";

type SiteConfig = { supportEmail: string; ready: boolean };
const Ctx = createContext<SiteConfig>({ supportEmail: defaultSupportEmail, ready: false });

export function SiteConfigProvider({ children }: { children: React.ReactNode }) {
  const [supportEmail, setEmail] = useState(defaultSupportEmail);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    fetchSiteConfig()
      .then((c) => {
        if (c.supportEmail) { setEmail(c.supportEmail); setSupportEmail(c.supportEmail); }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  return <Ctx.Provider value={{ supportEmail, ready }}>{children}</Ctx.Provider>;
}

export function useSiteConfig() { return useContext(Ctx); }
