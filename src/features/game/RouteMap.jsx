import { useEffect, useRef, useState } from "react";
import { countries } from "../../data";
import { featurePath, mapMeta } from "../world/geo";
import { useWorldGeo } from "../world/useWorldGeo";

function LandmarkIcon({ type }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 0.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  if (type === "mountain")
    return (
      <>
        <path {...common} d="M-6 4L-1-3 1-1 4-5 8 4Z" />
        <path {...common} d="M-2-2L0 0 2-2" />
      </>
    );
  if (type === "tower" || type === "clocktower")
    return (
      <>
        <path {...common} d="M-2 5L-1-3 0-7 1-3 3 5M-3 5H4" />
        {type === "clocktower" && <circle {...common} cy="-1" r="1.2" />}
      </>
    );
  if (type === "twinTowers")
    return (
      <>
        <path
          {...common}
          d="M-5 5V-3L-4-6-3-3V5M2 5V-3L3-6 4-3V5M-3-1H2M-6 5H5"
        />
      </>
    );
  if (type === "bridge")
    return (
      <>
        <path
          {...common}
          d="M-8 4H8M-7 4V-2M7 4V-2M-7-1Q0 5 7-1M-8-3H-5M5-3H8"
        />
      </>
    );
  if (type === "wheel")
    return (
      <>
        <circle {...common} r="6" />
        <circle {...common} r="1" />
        <path {...common} d="M0-6V6M-6 0H6M-4-4L4 4M4-4L-4 4" />
      </>
    );
  if (type === "temple" || type === "castle")
    return (
      <>
        <path
          {...common}
          d="M-7 5H7M-5 5V0H5V5M-7 0H7L4-2H-4ZM-4-3H4L2-5H-2Z"
        />
      </>
    );
  if (type === "palace" || type === "memorial")
    return (
      <>
        <path
          {...common}
          d="M-8 5H8M-6 5V0H6V5M-8 0H8L5-3H-5ZM-3 1V5M0 1V5M3 1V5"
        />
      </>
    );
  if (type === "skyline" || type === "marina")
    return (
      <>
        <path
          {...common}
          d="M-8 5V0H-5V5M-4 5V-5H-1V5M0 5V-2H3V5M4 5V-6H7V5M-9 5H8"
        />
        {type === "marina" && <path {...common} d="M-5-6Q0-8 7-7" />}
      </>
    );
  if (type === "ferry" || type === "junk")
    return (
      <>
        <path {...common} d="M-7 2H7L4 5H-4ZM0 2V-5M0-4L6 0H0Z" />
        <path {...common} d="M-8 7Q-4 5 0 7T8 7" />
      </>
    );
  if (type === "torii")
    return (
      <>
        <path {...common} d="M-6 5V-3M6 5V-3M-8-4H8M-6-1H6" />
      </>
    );
  if (type === "skyscraper")
    return (
      <>
        <path
          {...common}
          d="M-3 6V-2H-2V-5H-1V-8H1V-5H2V-2H3V6ZM-5 6H5M-2 1H2M-2 3H2"
        />
      </>
    );
  if (type === "jewel")
    return (
      <>
        <ellipse {...common} rx="7" ry="4" />
        <path {...common} d="M-7 0Q0-8 7 0M-4 3Q0-2 4 3" />
      </>
    );
  if (type === "supertrees")
    return (
      <>
        <path {...common} d="M-4 6V-1M4 6V-2M-8-2Q-4-7 0-2M0-3Q4-8 8-3" />
      </>
    );
  if (type === "merlion")
    return (
      <>
        <path {...common} d="M-5 5Q-2 1-3-3L0-6 2-3Q6-1 5 5ZM1-1Q6-4 8-2" />
      </>
    );
  if (type === "lanterns")
    return (
      <>
        <path {...common} d="M-7-5H7M-5-5V-2M0-5V-1M5-5V-2" />
        <rect {...common} x="-7" y="-2" width="4" height="5" rx="1" />
        <rect {...common} x="-2" y="-1" width="4" height="5" rx="1" />
        <rect {...common} x="3" y="-2" width="4" height="5" rx="1" />
      </>
    );
  return <circle {...common} r="5" />;
}

function LandmarkLayer({ countryId }) {
  const country = countries.find((candidate) => candidate.id === countryId);
  return (
    <g className="landmarks" aria-hidden="true">
      {country?.landmarks.map((landmark) => (
        <g
          key={landmark.id}
          className="landmark"
          transform={`translate(${landmark.x} ${landmark.y}) scale(${landmark.scale})`}
        >
          <LandmarkIcon type={landmark.icon} />
          <text y="9" textAnchor="middle">
            {landmark.label}
          </text>
        </g>
      ))}
    </g>
  );
}

function routePath(points) {
  if (points.length < 2) return "";
  let d = `M${points[0]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)],
      p1 = points[i],
      p2 = points[i + 1],
      p3 = points[Math.min(points.length - 1, i + 2)];
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2}`;
  }
  return d;
}
export default function RouteMap({ line, index, bounce, celebrate }) {
  const pathRef = useRef(),
    [pts, setPts] = useState([]);
  const worldGeo = useWorldGeo();
  // Singapore is much wider than it is tall. Fit its normalized transit
  // waypoints to the island's true aspect ratio instead of the full square.
  const displayShape =
    line.countryId === "sg"
      ? line.shape.map(([x, y]) => [10 + x * 0.8, 29 + y * 0.42])
      : line.shape;
  const d = routePath(displayShape);
  useEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const len = p.getTotalLength();
    setPts(
      line.stations.map((_, i) =>
        p.getPointAtLength((len * i) / (line.stations.length - 1)),
      ),
    );
  }, [line, d]);
  const cur = pts[index] || { x: 50, y: 50 },
    prev = pts[Math.max(0, index - 1)] || cur,
    flip = cur.x < prev.x;
  const countryFeature = worldGeo?.features.find(
    (f) => f.properties.ADM0_A3 === mapMeta[line.countryId]?.iso,
  );
  const viewX = line.countryId === "sg" ? 0 : Math.max(-2, cur.x - 50),
    viewY = line.countryId === "sg" ? 7 : Math.max(-2, cur.y - 43),
    viewHeight = line.countryId === "sg" ? 78 : 86,
    vb = `${viewX} ${viewY} 100 ${viewHeight}`;
  return (
    <div className="map-wrap">
      <svg className="map" viewBox={vb} aria-label={`${line.name} route map`}>
        <defs>
          <pattern id="grid" width="6" height="6" patternUnits="userSpaceOnUse">
            <path
              d="M6 0H0V6"
              fill="none"
              stroke="#fff"
              strokeOpacity=".18"
              strokeWidth=".25"
            />
          </pattern>
          <filter id="shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity=".25" />
          </filter>
          <linearGradient id="trainBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff9e8" />
            <stop offset=".55" stopColor="#ffe6a8" />
            <stop offset="1" stopColor="#efbd68" />
          </linearGradient>
          <linearGradient id="trainRoof" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#315b78" />
            <stop offset="1" stopColor="#14243a" />
          </linearGradient>
          <linearGradient id="trainWindow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d8f4f3" />
            <stop offset="1" stopColor="#72b8c8" />
          </linearGradient>
          <radialGradient id="trainGold">
            <stop offset="0" stopColor="#f8dc8b" />
            <stop offset="1" stopColor="#b77b2f" />
          </radialGradient>
        </defs>
        <rect
          x={viewX - 5}
          y={viewY - 5}
          width="110"
          height={viewHeight + 10}
          fill="#a8d6df"
        />
        <rect
          x={viewX - 5}
          y={viewY - 5}
          width="110"
          height={viewHeight + 10}
          fill="url(#grid)"
        />
        <path className="land" d={featurePath(countryFeature, true)} />
        <LandmarkLayer countryId={line.countryId} />
        <text x={viewX + 7} y={viewY + 11} className="map-label">
          {line.city} · {line.name}
        </text>
        <g
          className="compass"
          transform={`translate(${viewX + 92} ${viewY + 12})`}
        >
          <circle r="5" />
          <path d="M0-4L1 0 0 4-1 0Z" />
          <text y="-6">N</text>
        </g>
        <path d={d} className="route-case" />
        <path
          ref={pathRef}
          d={d}
          className="route"
          style={{ stroke: line.color }}
        />
        {pts.map((p, i) => (
          <g
            key={i}
            className={
              "stop " + (i < index ? "visited" : i === index ? "current" : "")
            }
            transform={`translate(${p.x} ${p.y})`}
          >
            <circle
              r={i === index ? 2.2 : 1.35}
              style={i <= index ? { fill: line.color } : {}}
            />
            {i < index && (
              <text className="check" textAnchor="middle" y=".7">
                ✓
              </text>
            )}
            {(i === index ||
              i === 0 ||
              i === line.stations.length - 1 ||
              i % 3 === 0) && (
              <text
                className="station-label"
                textAnchor="middle"
                y={i % 2 ? 5 : -3.5}
              >
                {line.stations[i]}
              </text>
            )}
          </g>
        ))}
        {pts.length > 0 && (
          <g
            className={`train ${bounce ? "chug" : ""} ${celebrate ? "party" : ""}`}
            style={{ transformOrigin: `${cur.x}px ${cur.y}px` }}
            transform={`translate(${cur.x} ${cur.y - 4}) scale(${flip ? -1 : 1} 1)`}
          >
            <Train />
          </g>
        )}
      </svg>
      {celebrate && <div className="confetti">✦ ★ ✦</div>}
    </div>
  );
}
function Train() {
  return (
    <g className="cute-train" filter="url(#shadow)">
      <g className="steam">
        <circle cx="1.8" cy="-10" r="1.15" />
        <circle cx="3.1" cy="-12.5" r="1.55" />
        <circle cx="1.7" cy="-15" r=".85" />
      </g>
      <rect
        x="1"
        y="-9"
        width="2.8"
        height="4"
        rx=".7"
        fill="url(#trainGold)"
        stroke="#14243a"
        strokeWidth=".65"
      />
      <path d="M.4-9H4.4L3.5-10.4H1.3Z" fill="#14243a" />
      <path
        d="M-5.6-4.8V-7.2Q-5.6-8.4-4.3-8.4H-.7Q.5-8.4.5-7.2V-4.8"
        fill="url(#trainBody)"
        stroke="#14243a"
        strokeWidth=".7"
      />
      <path
        d="M-6.4-7Q-5-9.4-2.7-9.4T1-7Z"
        fill="url(#trainRoof)"
        stroke="#14243a"
        strokeWidth=".7"
      />
      <rect
        x="-6.4"
        y="-5.5"
        width="12.8"
        height="7.5"
        rx="3.4"
        fill="url(#trainBody)"
        stroke="#14243a"
        strokeWidth=".8"
      />
      <path d="M-6-1.1H6" stroke="#b77b2f" strokeWidth=".7" />
      <path
        d="M-5.7-4.9Q0-6.2 5.8-4.9"
        fill="none"
        stroke="#fff"
        strokeOpacity=".8"
        strokeWidth=".55"
      />
      <rect
        x="-4.9"
        y="-4.7"
        width="3.9"
        height="2.8"
        rx="1"
        fill="url(#trainWindow)"
        stroke="#14243a"
        strokeWidth=".55"
      />
      <path
        d="M-3.1-4.6V-2"
        stroke="#fff"
        strokeOpacity=".8"
        strokeWidth=".45"
      />
      <g className="tiny-conductor" transform="translate(-3 -3.15)">
        <circle cx="-.65" cy="-1" r=".45" fill="#9a663d" />
        <circle cx=".65" cy="-1" r=".45" fill="#9a663d" />
        <circle r="1.05" fill="#c98e58" stroke="#14243a" strokeWidth=".25" />
        <circle cx="-.34" cy="-.1" r=".13" fill="#14243a" />
        <circle cx=".34" cy="-.1" r=".13" fill="#14243a" />
        <path
          d="M-.25.35Q0 .6.25.35"
          fill="none"
          stroke="#14243a"
          strokeWidth=".15"
        />
        <path d="M-1-1H1L.65-1.65H-.65Z" fill="#315b78" />
      </g>
      <circle cx="2.1" cy="-3" r=".7" fill="#14243a" />
      <circle cx="4.5" cy="-3" r=".7" fill="#14243a" />
      <circle cx="2.3" cy="-3.2" r=".18" fill="#fff" />
      <circle cx="4.7" cy="-3.2" r=".18" fill="#fff" />
      <circle cx="1.2" cy="-1.7" r=".55" fill="#efa4a6" opacity=".8" />
      <circle cx="5.3" cy="-1.7" r=".55" fill="#efa4a6" opacity=".8" />
      <path
        d="M2.3-1.4Q3.3-.3 4.5-1.4"
        fill="none"
        stroke="#14243a"
        strokeWidth=".5"
        strokeLinecap="round"
      />
      <circle
        cx="6"
        cy="-.25"
        r=".75"
        fill="url(#trainGold)"
        stroke="#14243a"
        strokeWidth=".4"
      />
      <circle cx="6.1" cy="-.4" r=".22" fill="#fff8d8" />
      <path
        d="M6 1.2L8 2.7H5.6Z"
        fill="#d59b49"
        stroke="#14243a"
        strokeWidth=".4"
      />
      <path
        d="M-1.2-.3C-.3-1.4 1-1.1 1 .1.9.9 0 1.5-1.2 2.2-2.4 1.5-3.2.9-3.3.1-3.3-1.1-2-1.4-1.2-.3Z"
        fill="#d7a85d"
        transform="scale(.35) translate(-3 1)"
      />
      {[-3.8, 0, 3.8].map((x) => (
        <g key={x} transform={`translate(${x} 2)`}>
          <circle r="1.55" fill="#14243a" />
          <circle r=".82" fill="url(#trainGold)" />
          <circle r=".3" fill="#fff3cf" />
        </g>
      ))}
      <path
        d="M-5.5 3.2H5.5"
        stroke="#14243a"
        strokeWidth=".6"
        strokeLinecap="round"
      />
    </g>
  );
}
