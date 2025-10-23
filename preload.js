const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('sacApp', {});
