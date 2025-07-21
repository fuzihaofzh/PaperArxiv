// This file is required by the index.html file and will
// be executed in the renderer process for that window.

// Initialize remote module
try {
  require('@electron/remote/renderer').initialize();
} catch (err) {
  console.log('Remote module initialization not needed:', err.message);
}

// Wait for DOM to be ready before loading the app
window.addEventListener('DOMContentLoaded', () => {
  // Load the application
  const script = document.createElement('script');
  script.src = './src/index.js';
  document.body.appendChild(script);
});