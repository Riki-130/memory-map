import { useEffect, useState } from "react";
import { photoUrl } from "../../firebase/pins.js";

export default function PhotoImage({ path, alt = "", className, onClick }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setSrc(null);
    setFailed(false);
    photoUrl(path)
      .then((url) => active && setSrc(url))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [path]);

  if (failed) return <div className={`${className} photo-placeholder`}>読み込めません</div>;
  if (!src) return <div className={`${className} photo-placeholder loading`} />;
  return <img className={className} src={src} alt={alt} loading="lazy" onClick={onClick} />;
}
