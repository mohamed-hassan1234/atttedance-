import hormuudLogoSrc from '../assets/hormuud-logo.jpeg';

// Official Hormuud University crest (frontend/src/assets/hormuud-logo.jpeg).
// The source file has a solid white background and no transparency (it's a
// JPEG), so on a dark surface (the sidebar, the login brand panel) it would
// otherwise sit inside a harsh white rectangle. Wrapping it in a small white
// rounded "chip" with a soft ring/shadow turns that into an intentional
// badge instead, and reads correctly on light surfaces too (the chip is
// white-on-white there, just a subtle bordered mark). `object-fit: contain`
// preserves the crest's real proportions — it's taller than it is wide, so
// a square box naturally letterboxes it rather than stretching it.
//
// Every place the app shows the Hormuud identity (sidebar, login) renders
// through this one component — change the image here and it updates
// everywhere at once.
const HormuudLogo = ({ size = 40, className = '' }) => {
  const padding = Math.max(3, Math.round(size * 0.12));

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-ledger-950/10 ${className}`}
      style={{ width: size, height: size, padding }}
    >
      <img
        src={hormuudLogoSrc}
        alt="Hormuud University"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </span>
  );
};

export default HormuudLogo;
