let registration;

export async function initializeOffline(report, onUpdate) {
  if (!isSecureContext || !("serviceWorker" in navigator)) {
    report("Mode hors ligne indisponible à cette adresse : utilise l’adresse HTTPS de Pupitro.");
    return;
  }
  report("Préparation de l’application hors ligne…");
  try {
    registration = await navigator.serviceWorker.register("./sw.js", {scope: "./", updateViaCache: "none"});
    const ready = async () => {
      const worker = registration.active;
      if (!worker) return false;
      const manifest = await new Promise(resolve => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => {channel.port1.close();resolve(null);},3000);
        channel.port1.onmessage = event => {clearTimeout(timer);channel.port1.close();resolve(event.data);};
        worker.postMessage("OFFLINE_STATUS",[channel.port2]);
      });
      if (!manifest) return false;
      report(`Application prête hors ligne · ${Math.ceil(manifest.bytes / 1024 / 1024)} Mo sur cet appareil.`);
      return true;
    };
    if (registration.active) await ready();
    if (registration.waiting) onUpdate();
    function watch(worker) {
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed" && registration.active) onUpdate();
        if (worker.state === "activated") ready().catch(() => report("Vérification hors ligne impossible ; recharge Pupitro."));
        if (worker.state === "redundant" && !registration.active) report("Préparation hors ligne interrompue. Reconnecte-toi puis recharge Pupitro.");
      });
    }
    watch(registration.installing);
    registration.addEventListener("updatefound", () => watch(registration.installing));
  } catch {
    report("Application hors ligne non préparée. Reconnecte-toi puis recharge Pupitro.");
  }
}

export function activateUpdate() {
  if (!registration?.waiting) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), {once: true});
  registration.waiting.postMessage("ACTIVATE_UPDATE");
}
