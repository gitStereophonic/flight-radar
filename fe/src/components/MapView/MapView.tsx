/**
 * The interactive MapLibre map that plots the planes.
 *
 * Contains:
 *  - `MapView`, the component: creates the map, runs the animation loop that
 *    redraws planes every frame, handles clicks for selecting/deselecting, and
 *    makes the camera follow the selected plane until the user moves the map
 *  - `drawPlaneIcon`, which paints a plane silhouette in a given colour
 *  - map constants (style URL, source/layer ids, initial view, follow settings)
 *
 * MapLibre is driven imperatively (not through React state) on purpose: planes
 * are redrawn up to 60 times a second, which React re-rendering could not
 * handle gracefully. React only passes in props and refs.
 */

import { useEffect, useRef, type RefObject } from 'react';
import {
  LngLatBounds,
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
} from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { lerp } from '../../lib/geo';
import { positionAt, type Track } from '../../lib/tracks';

// MapLibre 6 looks for its worker file next to its own bundle, which breaks once
// Vite moves the bundle. Having Vite bundle the worker and passing its URL fixes
// both the dev server and the production build.
setWorkerUrl(maplibreWorkerUrl);

/** Free dark vector basemap that needs no API key. */
const STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
/** Id of the GeoJSON source that holds the plane points. */
const SOURCE_ID = 'planes';
/** Id of the layer that draws a glow ring behind the selected plane. */
const HALO_LAYER_ID = 'planes-halo';
/** Id of the layer that draws the plane icons. */
const ICON_LAYER_ID = 'planes-icons';
/** Prefix of the generated icon image ids; the plane's colour follows it. */
const ICON_PREFIX = 'plane-';
/** Initial view (centre of the area the backend simulates). */
const INITIAL_CENTER: [number, number] = [-90, 50];
const INITIAL_ZOOM = 3;
/** How far (in screen pixels) from a plane's centre a click still counts as hitting it. */
const CLICK_TOLERANCE_PX = 14;
/** Selecting a plane zooms in to at least this level (it never zooms out by itself). */
const FOLLOW_MIN_ZOOM = 7;
/** Share of the remaining distance the camera covers each frame while following (0-1). */
const FOLLOW_SMOOTHING = 0.12;

/** Props for `MapView`. */
type Props = {
  /** animation tracks written by `usePlanes`; read on every frame */
  tracksRef: RefObject<Map<string, Track>>;
  /**
   * id of the selected plane, or null. The selected plane is drawn bigger with a
   * ring, and the camera follows it until the user moves the map.
   */
  selectedId: string | null;
  /** called with a plane's id when the user clicks it on the map */
  onSelect: (id: string) => void;
  /** called when the user clicks empty map space */
  onClear: () => void;
};

/**
 * Paints a top-down plane silhouette (nose pointing up/north) in `color`
 * and returns it as image data that MapLibre can use as an icon.
 */
function drawPlaneIcon(color: string): ImageData {
  const size = 48;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Outline of the plane in a 24-unit box centred on (0, 0), scaled up 2x.
  const outline: Array<[number, number]> = [
    [0, -11],
    [1.6, -6],
    [1.8, -2],
    [10, 3],
    [10, 5],
    [1.8, 2.5],
    [1.5, 7],
    [4, 9],
    [4, 10.5],
    [0, 9.5],
    [-4, 10.5],
    [-4, 9],
    [-1.5, 7],
    [-1.8, 2.5],
    [-10, 5],
    [-10, 3],
    [-1.8, -2],
    [-1.6, -6],
  ];

  ctx.translate(size / 2, size / 2);
  ctx.scale(2, 2);
  ctx.beginPath();
  outline.forEach(([x, y], index) => (index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.stroke();

  return ctx.getImageData(0, 0, size, size);
}

/** Renders the map. The component itself draws nothing but a container div. */
export function MapView({ tracksRef, selectedId, onSelect, onClear }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  // True while the camera should track the selected plane; switched off by any user camera move.
  const followingRef = useRef(false);
  // Zoom level to reach while flying in to a newly selected plane; null once reached.
  const zoomTargetRef = useRef<number | null>(null);

  // Latest props, readable from the long-lived map callbacks without re-creating the map.
  const selectedIdRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const onClearRef = useRef(onClear);
  useEffect(() => {
    selectedIdRef.current = selectedId;
    onSelectRef.current = onSelect;
    onClearRef.current = onClear;
  });

  // Create the map once; set up the layers, the animation loop and click handling.
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: STYLE_URL,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');

    let frameId = 0;
    let fitted = false;
    let disposed = false;
    // True only while our own code moves the camera, so those moves don't cancel following.
    let movingSelf = false;

    // Any camera movement that did not come from us (dragging, wheel zoom, the +/- buttons,
    // rotating) means the user took control, so stop following.
    map.on('movestart', () => {
      if (!movingSelf) followingRef.current = false;
    });

    // Icons are generated lazily, one per colour the backend actually sends.
    map.on('styleimagemissing', (event) => {
      if (event.id.startsWith(ICON_PREFIX) && !map.hasImage(event.id)) {
        map.addImage(event.id, drawPlaneIcon(event.id.slice(ICON_PREFIX.length)), {
          pixelRatio: 2,
        });
      }
    });

    /**
     * Runs once per animation frame: pushes every plane's interpolated position to
     * the map, fits the view on the first data, and moves the camera while following.
     */
    const renderFrame = () => {
      if (disposed) return;
      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      const tracks = tracksRef.current;
      const now = performance.now();

      if (source) {
        const features = Array.from(tracks.values(), (track) => {
          const position = positionAt(track, now);
          return {
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [position.lng, position.lat] },
            properties: {
              id: track.id,
              color: track.color,
              heading: track.heading,
              selected: track.id === selectedIdRef.current,
            },
          };
        });
        source.setData({ type: 'FeatureCollection', features });
      }

      // Once the first planes arrive, zoom the camera to show all of them.
      if (!fitted && tracks.size > 0) {
        fitted = true;
        const bounds = new LngLatBounds();
        tracks.forEach((track) => bounds.extend([track.to.lng, track.to.lat]));
        map.fitBounds(bounds, { padding: 80, maxZoom: 6, duration: 0 });
      }

      // While following, glide the camera toward the selected plane's current position.
      const followedId = selectedIdRef.current;
      const followedTrack =
        followingRef.current && followedId !== null ? tracks.get(followedId) : undefined;
      if (followedTrack) {
        const target = positionAt(followedTrack, now);
        const center = map.getCenter();
        const zoom = map.getZoom();
        const zoomTarget = zoomTargetRef.current;
        const flyingIn = zoomTarget !== null && zoom < zoomTarget - 0.01;
        if (!flyingIn) zoomTargetRef.current = null;

        movingSelf = true;
        try {
          map.jumpTo({
            center: [
              lerp(center.lng, target.lng, FOLLOW_SMOOTHING),
              lerp(center.lat, target.lat, FOLLOW_SMOOTHING),
            ],
            zoom: flyingIn ? lerp(zoom, zoomTarget, FOLLOW_SMOOTHING) : zoom,
          });
        } finally {
          movingSelf = false;
        }
      }

      frameId = requestAnimationFrame(renderFrame);
    };

    map.on('load', () => {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: HALO_LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['==', ['get', 'selected'], true],
        paint: {
          'circle-radius': 22,
          'circle-color': '#38bdf8',
          'circle-opacity': 0.2,
          'circle-stroke-color': '#38bdf8',
          'circle-stroke-width': 2,
        },
      });
      map.addLayer({
        id: ICON_LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
        layout: {
          'icon-image': ['concat', ICON_PREFIX, ['get', 'color']],
          'icon-rotate': ['get', 'heading'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-size': ['case', ['get', 'selected'], 1.1, 0.8],
        },
      });

      map.on('mouseenter', ICON_LAYER_ID, () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', ICON_LAYER_ID, () => (map.getCanvas().style.cursor = ''));

      frameId = requestAnimationFrame(renderFrame);
    });

    // A click on a plane selects it; a click anywhere else clears the selection.
    map.on('click', (event) => {
      const { x, y } = event.point;
      const hit = map.queryRenderedFeatures(
        [
          [x - CLICK_TOLERANCE_PX, y - CLICK_TOLERANCE_PX],
          [x + CLICK_TOLERANCE_PX, y + CLICK_TOLERANCE_PX],
        ],
        { layers: [ICON_LAYER_ID] },
      )[0];
      const id = hit?.properties?.id;
      if (typeof id === 'string') onSelectRef.current(id);
      else onClearRef.current();
    });

    map.on('error', (event) => console.warn('Map error:', event.error));

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      map.remove();
      mapRef.current = null;
    };
  }, [tracksRef]);

  // Start following whenever a plane gets selected (from the map or the list); stop when cleared.
  useEffect(() => {
    const map = mapRef.current;
    followingRef.current = selectedId !== null;
    zoomTargetRef.current =
      selectedId !== null && map ? Math.max(map.getZoom(), FOLLOW_MIN_ZOOM) : null;
  }, [selectedId]);

  return <div ref={containerRef} className="h-full w-full" />;
}
