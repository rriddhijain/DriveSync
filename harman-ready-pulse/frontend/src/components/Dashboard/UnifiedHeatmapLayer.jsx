import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

export default function UnifiedHeatmapLayer({ data }) {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!data || !Array.isArray(data)) return;

    // Filter out invalid heatmap coordinates
    const safeData = data.filter(d => 
      Array.isArray(d) && 
      d.length >= 2 && 
      typeof d[0] === 'number' && !isNaN(d[0]) &&
      typeof d[1] === 'number' && !isNaN(d[1])
    );

    // If layer doesn't exist yet, create it
    if (!heatLayerRef.current) {
      heatLayerRef.current = L.heatLayer(safeData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        max: 1.0,
        gradient: {
          0.1: 'red',
          0.4: 'orange',
          0.6: 'yellow',
          1.0: '#22c55e'
        }
      }).addTo(map);
    } else {
      // Update points dynamically without tearing down the layer
      heatLayerRef.current.setLatLngs(safeData);
    }
  }, [data, map]);

  // Clean up layer on component unmount
  useEffect(() => {
    return () => {
      if (heatLayerRef.current && map) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map]);

  return null;
}
