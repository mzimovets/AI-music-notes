/**
 * Плавный скролл страницы к заданной Y-позиции.
 * Использует ease-in-out квадратичную функцию через requestAnimationFrame
 * вместо браузерного scrollIntoView({ behavior: "smooth" }) — более равномерный
 * и предсказуемый результат на всех платформах.
 */

let activeRaf: number | null = null;

export function smoothScrollTo(targetY: number, duration = 320) {
  // Отменяем предыдущую анимацию если ещё идёт
  if (activeRaf !== null) {
    cancelAnimationFrame(activeRaf);
    activeRaf = null;
  }

  const startY = window.scrollY;
  const diff = targetY - startY;

  if (Math.abs(diff) < 1) return;

  const startTime = performance.now();

  // ease-in-out quad
  const ease = (t: number) =>
    t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  const step = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    window.scrollTo(0, startY + diff * ease(progress));
    if (progress < 1) {
      activeRaf = requestAnimationFrame(step);
    } else {
      activeRaf = null;
    }
  };

  activeRaf = requestAnimationFrame(step);
}
