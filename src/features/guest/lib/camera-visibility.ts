let guestCameraActive = false;
const listeners = new Set<() => void>();

export function setGuestCameraActive(active: boolean) {
  if (guestCameraActive === active) return;
  guestCameraActive = active;
  listeners.forEach((listener) => listener());
}

export function subscribeGuestCameraActive(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getGuestCameraActiveSnapshot() {
  return guestCameraActive;
}
