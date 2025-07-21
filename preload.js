const { contextBridge, ipcRenderer, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  versions: process.versions,
  path: {
    join: (...args) => path.join(...args),
    dirname: (filepath) => path.dirname(filepath)
  },
  fs: {
    readFileSync: (filepath) => fs.readFileSync(filepath),
    writeFileSync: (filepath, data) => fs.writeFileSync(filepath, data),
    existsSync: (filepath) => fs.existsSync(filepath),
    unlink: (filepath, callback) => fs.unlink(filepath, callback),
    mkdirSync: (dirpath) => fs.mkdirSync(dirpath)
  },
  process: {
    env: {
      HOME: process.env.HOME,
      USERPROFILE: process.env.USERPROFILE
    }
  },
  shell: {
    openPath: (path) => shell.openPath(path),
    openExternal: (url) => shell.openExternal(url)
  }
});

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
      const element = document.getElementById(selector)
      if (element) element.innerText = text
    }
  
    for (const type of ['chrome', 'node', 'electron']) {
      replaceText(`${type}-version`, process.versions[type])
    }
  })
  