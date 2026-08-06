import { useEffect, useState } from "react";
import worldGeoUrl from "../../assets/world.json?url";

let worldGeoPromise;

const loadWorldGeo = () => {
  worldGeoPromise ??= fetch(worldGeoUrl).then((response) => {
    if (!response.ok) {
      throw new Error(`Unable to load world map: ${response.status}`);
    }
    return response.json();
  });
  return worldGeoPromise;
};

export function useWorldGeo() {
  const [worldGeo, setWorldGeo] = useState(null);

  useEffect(() => {
    let active = true;
    loadWorldGeo().then((data) => {
      if (active) setWorldGeo(data);
    });
    return () => {
      active = false;
    };
  }, []);

  return worldGeo;
}
