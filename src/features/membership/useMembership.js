import { useEffect, useRef, useState } from "react";
import { createMap, subscribeMyMaps } from "../../firebase/maps.js";

function readInviteFromUrl() {
  const params = new URLSearchParams(location.search);
  const mapId = params.get("map");
  const token = params.get("invite");
  return mapId && token ? { mapId, token } : null;
}

export function clearInviteFromUrl() {
  const url = new URL(location.href);
  url.searchParams.delete("map");
  url.searchParams.delete("invite");
  history.replaceState(null, "", url);
}

// Resolves which map the signed-in user works on:
//   { status: "loading" }
//   { status: "invite", invite }      opened an invite link for a map they are not in yet
//   { status: "ready", map, maps }
//   { status: "error", error }
export function useMembership(user) {
  const [state, setState] = useState({ status: "loading" });
  const [invite, setInvite] = useState(readInviteFromUrl);
  const creatingRef = useRef(false);

  useEffect(() => {
    if (!user) return undefined;
    setState({ status: "loading" });

    return subscribeMyMaps(
      user.uid,
      ({ maps, fromCache }) => {
        if (invite) {
          if (maps.some((map) => map.id === invite.mapId)) {
            clearInviteFromUrl();
            setInvite(null);
          } else {
            setState({ status: "invite", invite });
            return;
          }
        }

        if (maps.length > 0) {
          const preferred = maps.find((map) => map.id === lastMapId()) || maps[0];
          setState({ status: "ready", map: preferred, maps });
          return;
        }

        // Only auto-create once the server confirms there really are no maps,
        // otherwise an empty offline cache would create a duplicate.
        if (!fromCache && !creatingRef.current) {
          creatingRef.current = true;
          createMap(user).catch((error) => setState({ status: "error", error }));
        }
      },
      (error) => setState({ status: "error", error })
    );
  }, [user, invite]);

  function dismissInvite() {
    clearInviteFromUrl();
    setInvite(null);
  }

  return { ...state, dismissInvite };
}

function lastMapId() {
  try {
    return localStorage.getItem("memory-map:last-map");
  } catch {
    return null;
  }
}
