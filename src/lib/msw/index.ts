export async function startMsw() {
  if (import.meta.env.VITE_ENABLE_MSW !== 'true') return;

  const { worker } = await import('./browser');
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
}
