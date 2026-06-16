const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,

  downloadAudio(url) {
    return ipcRenderer.invoke('download-audio', url);
  },

  onDownloadProgress(callback) {
    ipcRenderer.on('download-progress', (_e, pct) => callback(pct));
  },

  removeDownloadProgress() {
    ipcRenderer.removeAllListeners('download-progress');
  },
});
