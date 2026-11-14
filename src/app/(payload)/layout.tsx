/* Based on the official Payload 3.91 blank template (src/app/(payload)/layout.tsx). */
import React from "react";
import "@payloadcms/next/css";
import { handleServerFunctions, RootLayout } from "@payloadcms/next/layouts";
import { rubik } from "@/app/(site)/fonts";
import config from "@payload-config";
import { importMap } from "./admin/importMap.js";
// Site tokens (`--ig-*`) only: no Tailwind and no `.ig-*` classes in the admin.
import "@/styles/ig-vars.css";
import "./custom.scss";
import type { ServerFunctionClient } from "payload";

type Args = { children: React.ReactNode };

const serverFunction: ServerFunctionClient = async function (args) {
  "use server";
  return handleServerFunctions({ ...args, config, importMap });
};

const Layout = ({ children }: Args) => (
  <RootLayout
    config={config}
    importMap={importMap}
    serverFunction={serverFunction}
    // Rubik: `--font-rubik` on <html>, used by `--ig-font` (ig-vars.css) → Payload `--font-body`.
    htmlProps={{ className: rubik.variable }}
  >
    {children}
  </RootLayout>
);

export default Layout;
