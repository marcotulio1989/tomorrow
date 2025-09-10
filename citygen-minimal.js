// Minimal CityGen stub for testing purposes
// This is a temporary solution to bypass the corrupted CoffeeScript runtime

(function() {
  // Set the flag that the React app checks for
  window.CityGenReady = true;
  
  // Minimal require system stub
  window.require = function(module) {
    if (module === 'game_modules/mapgen') {
      return {
        generate: function(seed) {
          // Generate a simple test map structure
          const segments = [];
          const numSegments = 50 + Math.floor(Math.random() * 100);
          
          for (let i = 0; i < numSegments; i++) {
            const startX = (Math.random() - 0.5) * 1000;
            const startY = (Math.random() - 0.5) * 1000;
            const endX = startX + (Math.random() - 0.5) * 100;
            const endY = startY + (Math.random() - 0.5) * 100;
            
            segments.push({
              r: {
                start: { x: startX, y: startY },
                end: { x: endX, y: endY }
              },
              width: Math.random() * 5 + 1,
              q: {
                highway: Math.random() < 0.1
              }
            });
          }
          
          return { segments };
        }
      };
    }
    
    throw new Error(`Module ${module} not found`);
  };
  
  console.log('CityGen minimal stub loaded');
})();