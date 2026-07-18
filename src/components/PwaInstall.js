"use client";

import { useEffect, useState } from "react";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIos() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function PwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    if (isIos()) {
      setShowButton(true);
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShowButton(true);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setShowButton(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (installed || !showButton) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
      setShowButton(false);
      return;
    }

    if (isIos()) {
      setShowIosHint(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-full border-2 border-white bg-[#002247] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
        aria-label="Instalar aplicativo UniScore"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
        <span className="hidden sm:inline">Instalar app</span>
      </button>

      {showIosHint && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setShowIosHint(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-base font-semibold text-[#002247]">
              Instalar o UniScore
            </p>
            <p className="text-sm text-gray-600">
              Toque no ícone de compartilhar
              <span aria-hidden="true"> (⬆️) </span>
              na barra do Safari e depois em{" "}
              <strong>&quot;Adicionar à Tela de Início&quot;</strong>.
            </p>
            <button
              onClick={() => setShowIosHint(false)}
              className="mt-4 rounded-full bg-[#002247] px-4 py-2 text-sm font-semibold text-white"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
