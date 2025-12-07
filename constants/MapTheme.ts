export const COLORS = {
  primary: '#ec7813',       // Burnt Orange
  secondary: '#B5651D',     // Deep Amber
  bg: '#FAFAF5',           // Soft Cream
  textMain: '#2D2D2D',      // Nearly Black
  textSub: '#897461',       // Muted Earth
  card: '#FFFFFF',
  success: '#2E7D32',
  error: '#C62828',
};

// Clean Map Style (Hides default POIs)
export const AUTUMN_MAP_STYLE = [
  {
    "featureType": "all",
    "elementType": "geometry",
    "stylers": [{ "color": "#f5f5f5" }]
  },
  {
    "featureType": "poi",
    "stylers": [{ "visibility": "off" }] // Hide default shops
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "water",
    "stylers": [{ "color": "#c9c9c9" }]
  }
];