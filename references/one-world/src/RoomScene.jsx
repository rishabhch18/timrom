import React from "react";
export function Avatar({ color = "#a99dcc", body = "miniature", size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="-25 -44 50 62" aria-hidden="true">
      <ellipse cy="14" rx="18" ry="5" fill="#233c3820" />
      <path
        d={
          body === "mature"
            ? "M-12-9Q-17 0-13 13H-5L-3 3H3L5 13H13Q17 0 12-9Z"
            : "M-14-6Q-18 3-13 13H-4L0 6 4 13H13Q18 3 14-6Z"
        }
        fill={color}
      />
      <circle
        cy={body === "mature" ? -25 : -22}
        r={body === "mature" ? 13 : 17}
        fill="#ecc7a9"
      />
      <path
        d={
          body === "mature"
            ? "M-13-25Q-17-43 1-41Q18-39 13-25L8-32Q-4-27-10-33Z"
            : "M-17-22Q-22-44 0-42Q22-39 16-21L11-29Q-3-26-12-32Z"
        }
        fill="#4e403c"
      />
      <circle cx="-6" cy="-22" r="1.5" fill="#493e38" />
      <circle cx="6" cy="-22" r="1.5" fill="#493e38" />
      <path
        d="M-3-16Q0-13 3-16"
        fill="none"
        stroke="#ac7c6c"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function Furniture({ kind, color = "#b8b6d4", rotation = 0 }) {
  return (
    <g transform={rotation ? "scale(-1 1)" : undefined}>
      <ellipse cy="4" rx="25" ry="11" fill="#21372e16" />
      {kind === "plant" ? (
        <>
          <path d="M-10-14L-7 6Q0 12 8 6L11-14Z" fill="#d4b195" />
          <ellipse cy="-14" rx="11" ry="5" fill="#b89175" />
          <path
            d="M0-14V-49M0-30Q-28-53-19-25Q-13-14 0-26M0-38Q26-62 19-34Q12-23 0-33M0-24Q27-40 20-17Q10-12 0-18"
            fill="#648b72"
            stroke="#557a61"
            strokeWidth="2"
          />
        </>
      ) : kind === "desk" ? (
        <>
          <path d="M-23-12V8M23-12V8M0 0V18" stroke="#96795d" strokeWidth="5" />
          <path d="M0-32L30-17 0-1-30-17Z" fill="#c6a37f" />
          <path d="M-30-17V-10L0 6 30-10V-17L0-1Z" fill="#b08b67" />
          <path d="M-12-20L0-26 13-20 0-13Z" fill="#efe8d9" />
        </>
      ) : kind === "lamp" ? (
        <>
          <path d="M0-5V-50" stroke="#b39360" strokeWidth="3" />
          <ellipse cy="2" rx="14" ry="6" fill="#bba47e" />
          <path d="M-9-58L-18-34Q0-22 18-34L9-58Z" fill="#efd49c" />
          <ellipse cy="-58" rx="9" ry="4" fill="#f8eacb" />
        </>
      ) : (
        <>
          <path d="M-22-19L-22 4M16-2V15" stroke="#9c816c" strokeWidth="4" />
          <path
            d="M-24-28Q-24-36-15-34L19-17Q26-13 25-5L25 4-24-20Z"
            fill={kind === "chair" ? "#bea48d" : color}
          />
          <path
            d="M-24-12L0-24 28-10 4 4Z"
            fill={kind === "chair" ? "#dbc4ae" : "#cecee5"}
          />
          <path
            d="M-24-12V-3L4 13 28 0V-10L4 4Z"
            fill={kind === "chair" ? "#c7ad93" : color}
          />
          <path
            d="M-27-15Q-27-23-21-20L-10-14V-3L-27-11Z M17 2V-10Q18-16 25-12L30-9V1L20 7Z"
            fill={kind === "chair" ? "#d4bda7" : "#c4c3df"}
          />
        </>
      )}
    </g>
  );
}
export default function RoomScene({
  room,
  me,
  builder,
  selected,
  onTile,
  onPerson,
}) {
  const point = (x, y) => [350 + (x - y) * 30, 110 + (x + y) * 16];
  const poly = (x, y) => {
    const [a, b] = point(x, y);
    return `${a},${b - 16} ${a + 30},${b} ${a},${b + 16} ${a - 30},${b}`;
  };
  const things = [
    ...room.items.map((i) => ({ ...i, type: "item" })),
    ...room.people.map((i) => ({ ...i, type: "person" })),
  ].sort((a, b) => a.x + a.y - b.x - b.y);
  return (
    <svg
      className="room-scene"
      viewBox="40 0 730 475"
      role="group"
      aria-label={`${room.name}. Interactive floor: choose a tile to walk, or use arrow keys while a tile is focused.`}
    >
      <defs>
        <filter id="shadow">
          <feDropShadow
            dx="0"
            dy="18"
            stdDeviation="16"
            floodColor="#687d65"
            floodOpacity=".13"
          />
        </filter>
        <linearGradient id="floor" x2="1" y2="1">
          <stop stopColor="#f5efdf" />
          <stop offset="1" stopColor="#e8dfcb" />
        </linearGradient>
      </defs>
      <g filter="url(#shadow)">
        <path d="M320 94L680 286 410 430 50 238Z" fill="url(#floor)" />
        <path d="M320 94V20L680 212V286Z" fill={room.theme} />
        <path d="M320 94L50 238V164L320 20Z" fill={room.theme} opacity=".72" />
        <path d="M50 238V249L410 441 680 297V286L410 430Z" fill="#d9cdb7" />
      </g>
      <path
        d="M166 111L256 63V119L166 167Z"
        fill="#eff5e9"
        stroke="#fffaf2"
        strokeWidth="8"
      />
      <path d="M210 89V144M171 137L252 94" stroke="#fffaf2" strokeWidth="4" />
      <path d="M494 136L542 162V198L494 172Z" fill="#f5eddd" />
      <path d="M504 157L518 147 534 179Z" fill="#96ad93" />
      {Array.from({ length: 108 }, (_, i) => {
        const x = i % 12,
          y = Math.floor(i / 12);
        return (
          <polygon
            key={i}
            points={poly(x, y)}
            className={"floor-tile " + (builder ? "build-tile" : "")}
            tabIndex={0}
            role="button"
            aria-label={`Floor ${x}, ${y}`}
            onClick={() => onTile(x, y)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onTile(x, y);
              } else if (
                ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
                  e.key,
                )
              ) {
                e.preventDefault();
                const p = room.people.find((p) => p.id === me.id);
                onTile(
                  Math.max(
                    0,
                    Math.min(
                      11,
                      p.x +
                        (e.key === "ArrowRight"
                          ? 1
                          : e.key === "ArrowLeft"
                            ? -1
                            : 0),
                    ),
                  ),
                  Math.max(
                    0,
                    Math.min(
                      8,
                      p.y +
                        (e.key === "ArrowDown"
                          ? 1
                          : e.key === "ArrowUp"
                            ? -1
                            : 0),
                    ),
                  ),
                );
              }
            }}
          />
        );
      })}
      <g pointerEvents="none">
        <path
          d="M350 302L410 334 470 302 410 270Z"
          fill="#b8c4ae"
          opacity=".52"
        />
        <path d="M365 303L410 327 455 303" stroke="#e7e9d9" fill="none" />
      </g>
      {things.map((i) => {
        const [x, y] = point(i.x, i.y);
        return (
          <g
            key={i.id}
            className={i.type === "person" ? "scene-person" : ""}
            style={{
              transform: `translate(${x}px,${y}px)`,
              transition:
                i.type === "person" ? "transform 180ms linear" : undefined,
            }}
          >
            {i.type === "item" ? (
              <g
                pointerEvents="none"
                opacity={selected === i.id?.toString() ? 0.55 : 1}
              >
                <Furniture kind={i.asset} rotation={i.rotation} />
              </g>
            ) : (
              <g
                onClick={() => onPerson(i)}
                role="button"
                tabIndex={0}
                aria-label={`View ${i.name}`}
                onKeyDown={(e) => e.key === "Enter" && onPerson(i)}
              >
                <ellipse
                  rx="19"
                  ry="9"
                  fill={i.id === me.id ? "#86a88c66" : "#536a4918"}
                />
                <g transform={`translate(-23,${i.seat ? -47 : -60})`}>
                  <Avatar color={i.color} body={i.body} size={46} />
                </g>
                <rect
                  x={-Math.min(65, i.name.length * 3 + 12)}
                  y="-86"
                  width={Math.min(130, i.name.length * 6 + 24)}
                  height="22"
                  rx="11"
                  fill={i.id === me.id ? "#294e42" : "#fffdf6"}
                  stroke="#e1e3d7"
                />
                <text
                  y="-71"
                  textAnchor="middle"
                  fontSize="10"
                  fill={i.id === me.id ? "#fff" : "#31483d"}
                >
                  {i.name.slice(0, 18)}
                  {i.voice ? " ♪" : ""}
                </text>
              </g>
            )}
          </g>
        );
      })}
      <text x="410" y="470" textAnchor="middle" fontSize="12" fill="#6e7968">
        {builder
          ? "Choose an inventory item, then a free floor tile."
          : "Click the floor to walk · Click a chair to sit · Click a person to say hello"}
      </text>
    </svg>
  );
}
