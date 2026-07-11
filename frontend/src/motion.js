export const easeOutExpo = [0.16, 1, 0.3, 1];

export const reveal = {
  hidden: { opacity: 0, y: 34 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: easeOutExpo }
  }
};

export const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.11, delayChildren: 0.08 }
  }
};

export const viewportOnce = { once: true, amount: 0.16 };
