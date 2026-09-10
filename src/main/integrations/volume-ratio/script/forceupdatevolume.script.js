(function() {
  let volume = document.querySelector("ytmusic-player-bar").polymerController.playerApi.getVolume();
  document.querySelector("ytmusic-player-bar").polymerController.playerApi.setVolume(volume);
  window.__YTMD_HOOK__.ytmStore.dispatch({ type: 'SET_VOLUME', payload: volume });
})
