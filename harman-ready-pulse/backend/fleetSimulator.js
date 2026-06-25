const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const booleanPointInPolygon = require('@turf/boolean-point-in-polygon').default;
const { point } = require('@turf/helpers');

// Load user's deadzones
let deadZonesGeoJSON = { type: "FeatureCollection", features: [] };
let activeProvider = "Airtel";
let activeDeadzonesFeatures = []; // Cached list of features for the active provider

function updateActiveDeadzonesCache() {
  if (!deadZonesGeoJSON || !deadZonesGeoJSON.features) {
    activeDeadzonesFeatures = [];
    return;
  }
  const providerLower = activeProvider.toLowerCase();
  activeDeadzonesFeatures = deadZonesGeoJSON.features.filter(f => 
    !f.properties || !f.properties.network || f.properties.network.toLowerCase().includes(providerLower)
  );
}

function getActiveDeadzones() {
  return {
    type: "FeatureCollection",
    features: activeDeadzonesFeatures
  };
}

try {
  const filePath = path.join(__dirname, 'data', 'deadzones.json');
  const fileData = fs.readFileSync(filePath, 'utf-8');
  deadZonesGeoJSON = JSON.parse(fileData);
  updateActiveDeadzonesCache();
} catch (error) {
  console.error("Could not load deadzones.json:", error);
}

// Load simulation route
let routeGeoJSON = null;
try {
  const routePath = path.join(__dirname, 'data', 'simulation_route.json');
  const routeData = fs.readFileSync(routePath, 'utf-8');
  routeGeoJSON = JSON.parse(routeData);
} catch(error) {
  console.error("Could not load simulation_route.json:", error);
}

// Check if dead zone
function isInsideDeadZone(lat, lng) {
  const pt = point([lng, lat]);
  return activeDeadzonesFeatures.some(feature => {
     if (feature.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')) {
        return booleanPointInPolygon(pt, feature);
     }
     return false;
  });
}

class FleetSimulator {
  constructor(io) {
    this.io = io;
    this.ghostCars = Array.from({ length: 15 }).map(() => ({
      id: uuidv4(),
      lat: 12.95 + (Math.random() * 0.1 - 0.05),
      lng: 77.63 + (Math.random() * 0.1 - 0.05),
      latSpeed: (Math.random() * 0.001) - 0.0005,
      lngSpeed: (Math.random() * 0.001) - 0.0005,
      inDeadZone: false,
      deadZoneEntryLat: null,
      deadZoneEntryLng: null
    }));
    
    this.staticBuffer = []; // Permanent demo route and polygon heat
    this.telemetryBuffer = []; // Temporary ghost car telemetry
    this.MAX_BUFFER_SIZE = 1500;
    
    this.prepopulateHeatmap();
    this.startSimulation();

    // Listen for provider changes
    this.io.on('connection', (socket) => {
      // Send current provider on connect
      socket.emit('provider_changed', activeProvider);

      socket.on('set_provider', (provider) => {
        if (provider === activeProvider) return;
        activeProvider = provider;
        console.log(`[FLEET] Network Provider changed to: ${provider}`);
        updateActiveDeadzonesCache();
        this.prepopulateHeatmap();
        this.telemetryBuffer = []; // Clear live ghost cars on switch
        
        // Broadcast new provider to all clients
        this.io.emit('provider_changed', provider);
        
        // Force an immediate sync to update the frontend map
        const mappedCars = this.ghostCars.map(c => [c.lat, c.lng]);
        this.io.emit('fleet_telemetry_sync', {
            buffer: this.staticBuffer,
            activeCars: mappedCars
        });
      });
    });
  }

  prepopulateHeatmap() {
    this.staticBuffer = []; // Reset static buffer before repopulating
    const currentDeadzones = getActiveDeadzones();
    // 1. Explicitly fill the polygon dead zones so they are permanently RED and clearly visible.
    if (currentDeadzones.features) {
       currentDeadzones.features.forEach(feature => {
         if (feature.geometry.type === 'Polygon') {
           const coords = feature.geometry.coordinates[0];
           if (coords.length > 0) {
             const lats = coords.map(c => c[1]);
             const lngs = coords.map(c => c[0]);
             const minLat = Math.min(...lats);
             const maxLat = Math.max(...lats);
             const minLng = Math.min(...lngs);
             const maxLng = Math.max(...lngs);
             
             // Dense red points to vividly create the "heat" shape.
             for(let i=0; i<150; i++) {
                const rLat = minLat + Math.random() * (maxLat - minLat);
                const rLng = minLng + Math.random() * (maxLng - minLng);
                if (isInsideDeadZone(rLat, rLng)) {
                   this.staticBuffer.push([rLat, rLng, 0.1]); // 0.1 = solid red block
                } else {
                   // Sprinkle some yellow (weak) to transition the boundary cleanly
                   const dist = Math.sqrt(Math.pow(rLat - minLat, 2) + Math.pow(rLng - minLng, 2));
                   if (dist < 0.01) {
                      this.staticBuffer.push([rLat, rLng, 0.5]); // 0.5 = yellow
                   }
                }
             }
           }
         }
       });
    }

    // 2. Plot the demo route explicitly as Green/Yellow/Red so it precisely maps the demo visually regardless of ghost car chaos.
    if (routeGeoJSON && routeGeoJSON.features && routeGeoJSON.features[0]) {
       const routeCoords = routeGeoJSON.features[0].geometry.coordinates;
       // Interpolate line segments to create thick green heatmap trail
       for(let i=0; i<routeCoords.length - 1; i++) {
          const pt1 = routeCoords[i]; // [lng, lat]
          const pt2 = routeCoords[i+1];
          
          const steps = 10; 
          for(let s=0; s<=steps; s++) {
             const cLat = pt1[1] + (pt2[1] - pt1[1]) * (s / steps);
             const cLng = pt1[0] + (pt2[0] - pt1[0]) * (s / steps);
             
             // Expand thickness horizontally/vertically so route is wide, visible, and realistic
             for(let t=0; t<2; t++) {
                const jitterLat = cLat + (Math.random() * 0.005 - 0.0025);
                const jitterLng = cLng + (Math.random() * 0.005 - 0.0025);
                
                if (isInsideDeadZone(jitterLat, jitterLng)) {
                   this.staticBuffer.push([jitterLat, jitterLng, 0.1]); // Red inside deadzone
                } else {
                   // Green 5G active for route
                   this.staticBuffer.push([jitterLat, jitterLng, 1.0]); 
                }
             }
          }
       }
    }
  }

  startSimulation() {
    setInterval(() => {
      this.ghostCars.forEach(car => {
        car.lat += car.latSpeed;
        car.lng += car.lngSpeed;
        
        // Bounce off Bengaluru bounds
        if (car.lat > 13.10 || car.lat < 12.85) car.latSpeed *= -1;
        if (car.lng > 77.75 || car.lng < 77.45) car.lngSpeed *= -1;

        const currentlyInDz = isInsideDeadZone(car.lat, car.lng);

        if (currentlyInDz && !car.inDeadZone) {
           car.inDeadZone = true;
           car.deadZoneEntryLat = car.lat;
           car.deadZoneEntryLng = car.lng;
        } 
        else if (!currentlyInDz && car.inDeadZone) {
           car.inDeadZone = false;
           // Generate red trace connecting where connection was lost
           const steps = 15;
           const latStep = (car.lat - car.deadZoneEntryLat) / steps;
           const lngStep = (car.lng - car.deadZoneEntryLng) / steps;
           for(let s=0; s<=steps; s++) {
               this.telemetryBuffer.push([
                   car.deadZoneEntryLat + latStep * s, 
                   car.deadZoneEntryLng + lngStep * s, 
                   0.1 // Flag gap as dead zone visually (red)
               ]);
           }
        }
        else if (!currentlyInDz && !car.inDeadZone) {
           // Normal 5G ping
           this.telemetryBuffer.push([car.lat, car.lng, 1.0]); 
        }

        // Keep dynamic buffer capped so UI memory doesn't leak. Static array never gets overwritten.
        if (this.telemetryBuffer.length > this.MAX_BUFFER_SIZE) {
           const excess = this.telemetryBuffer.length - this.MAX_BUFFER_SIZE;
           this.telemetryBuffer.splice(0, excess);
        }
      });
      
      const activeCars = this.ghostCars.map(c => [c.lat, c.lng, c.id]);
      this.io.emit('fleet_telemetry_sync', {
          // Combine permanent demo data and transient ghost car data securely
          buffer: [...this.staticBuffer, ...this.telemetryBuffer],
          activeCars: activeCars
      });
    }, 1000);
  }
}

module.exports = FleetSimulator;
