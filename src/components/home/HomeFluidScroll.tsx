import Lenis from "lenis";
import { useEffect } from "react";

/** Buttery smooth scroll on the marketing homepage only. */
export function HomeFluidScroll() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("home-fluid");

    const lenis = new Lenis({
      duration: 1.35,
      easing: (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4,
    });

    const onScroll = ({ scroll }: { scroll: number }) => {
      root.style.setProperty("--home-scroll", String(scroll));
    };

    lenis.on("scroll", onScroll);

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      root.classList.remove("home-fluid");
      root.style.removeProperty("--home-scroll");
    };
  }, []);

  return null;
}
