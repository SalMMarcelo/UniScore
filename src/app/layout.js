import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PwaInstall from "@/components/PwaInstall";
import LinkPularConteudo from "@/components/LinkPularConteudo";
import { I18nProvider } from "@/i18n/I18nProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadados do servidor ficam em português (idioma padrão); o idioma da
// interface é escolhido no cliente (RNF07).
export const metadata = {
  title: "UniScore",
  description: "Avalie e descubra eventos universitários com foco em interculturalidade.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UniScore",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: "#002247",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        {/* lang="pt-BR" é o padrão do servidor; o I18nProvider atualiza <html lang> no cliente */}
        <I18nProvider>
          <LinkPularConteudo />
          {children}
          <PwaInstall />
        </I18nProvider>
      </body>
    </html>
  );
}
