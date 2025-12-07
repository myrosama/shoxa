// A custom "Autumn/Minimalist" map style that hides clutter
export const AUTUMN_MAP_STYLE = [
  {
    "featureType": "all",
    "elementType": "geometry",
    "stylers": [{ "color": "#f5f5f5" }] // Light grey base
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "featureType": "poi.business",
    "elementType": "all",
    "stylers": [{ "visibility": "off" }] // Hide default google shops so ours stand out
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{ "color": "#e5e5e5" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#ffffff" }] // Pure white roads
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#c9c9c9" }]
  }
];

export const COLORS = {
  primary: '#ec7813',       // Burnt Orange
  secondary: '#B5651D',     // Deep Amber
  bg: '#FAFAF5',           // More subtle Cream (easier on eyes than F5F5DC)
  textMain: '#2D2D2D',      // Nearly Black
  textSub: '#897461',       // Muted Earth
  card: '#FFFFFF',
  shadow: 'rgba(0, 0, 0, 0.08)',
};