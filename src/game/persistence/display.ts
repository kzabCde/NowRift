import { useSettings } from "../../state/settings";
export function enterPreferredFullscreen() {
  if (
    useSettings.getState().fullscreen &&
    !document.fullscreenElement &&
    document.documentElement.requestFullscreen
  )
    void document.documentElement.requestFullscreen().catch(() => {});
}
export async function toggleFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    useSettings.getState().set({ fullscreen: false });
  } else {
    await document.documentElement.requestFullscreen();
    useSettings.getState().set({ fullscreen: true });
  }
}
