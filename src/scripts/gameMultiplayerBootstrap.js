(function (window) {
  'use strict';
  // Check if multiplayer mode is enabled via URL parameter
  // If not, exit early
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const isMultiplayer = urlParams.has('multiplayer');
    // Exit if not in multiplayer mode
    if (!isMultiplayer) {
      return;
    }
    //
    window._multiplayerMode = true;
    window._gameInitialized = false;
    
    /**
     * Initializes multiplayer game components once the DOM is fully loaded.
     * 
     * @namespace GameMultiplayerBootstrap
     * @memberof window - Global namespace
     * @property {Function} init - Initializes multiplayer components.
     * @throws Will show a toast message and redirect to home on error.
     */
    document.addEventListener('DOMContentLoaded', function () {
      try {
        const db = window.FirebaseConfig && window.FirebaseConfig.init ? window.FirebaseConfig.init() : null;
        if (!db) throw new Error('Firebase not initialized');

        if (window.RoomManager && window.RoomManager.init) window.RoomManager.init(db);
        if (window.MultiplayerSync && window.MultiplayerSync.init) window.MultiplayerSync.init();

        if (window.MultiplayerModal) {
          window.MultiplayerModal.onGameReady = function (reconnectionGameState) {
            try {
              const room = (window.RoomManager && window.RoomManager.getCurrentRoom) ? window.RoomManager.getCurrentRoom() : null;

              if (window._gameInitialized) {
                if (window.MultiplayerSync && window.MultiplayerSync.updateTurnBlocker) {
                  setTimeout(() => window.MultiplayerSync.updateTurnBlocker(), 400);
                }
                return;
              }

              if (reconnectionGameState) {
                if (window.Toast && window.Toast.show) window.Toast.show('Reconnecting to game...', 3000);

                if (window.GameController && window.GameController.setupGame) {
                  window.GameController.setupGame(reconnectionGameState);
                  window._gameInitialized = true;
                }

                if (window.MultiplayerSync && window.MultiplayerSync.updateTurnBlocker) {
                  setTimeout(() => window.MultiplayerSync.updateTurnBlocker(), 500);
                }
                return;
              }

              if (window.RoomManager && window.RoomManager.isHost && window.RoomManager.isHost()) {
                if (window.GameController && window.GameController.setupGame) {
                  window.GameController.setupGame();
                  window._gameInitialized = true;
                }
              } else {
                if (window.Toast && window.Toast.show) window.Toast.show('Synchronizing with host...', 3000);
              }
            } catch (e) {

            }
          };
        }

        setTimeout(() => {
          if (window.MultiplayerModal && window.MultiplayerModal.open) {
            window.MultiplayerModal.open();
          }
        }, 50);

      } catch (error) {
        if (window.Toast && window.Toast.show) window.Toast.show('Error: ' + error.message, 5000);
        setTimeout(() => { window.location.href = 'index.html'; }, 3000);
      }
    });
  } catch (e) {
  }
})(window);