import { signOutUser } from "./features/auth/useAuth.js";
import JoinScreen from "./features/membership/JoinScreen.jsx";
import { useMembership } from "./features/membership/useMembership.js";
import MapScreen from "./features/map/MapScreen.jsx";
import Splash from "./Splash.jsx";

export default function SignedIn({ user }) {
  const membership = useMembership(user);

  switch (membership.status) {
    case "invite":
      return <JoinScreen user={user} invite={membership.invite} onDismiss={membership.dismissInvite} />;
    case "ready":
      return <MapScreen key={membership.map.id} map={membership.map} user={user} />;
    case "error":
      console.error(membership.error);
      return (
        <div className="center-screen">
          <div className="card glass-card">
            <p>地図を読み込めませんでした。通信状況を確認して、再読み込みしてください。</p>
            <button className="text-button" type="button" onClick={signOutUser}>ログアウト</button>
          </div>
        </div>
      );
    default:
      return <Splash />;
  }
}
