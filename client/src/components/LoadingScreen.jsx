import { motion } from "framer-motion";

const ringTransition = {
  duration: 2.2,
  ease: "linear",
  repeat: Infinity
};

export function LoadingScreen({ message = "Preparing fresh Gujarati snacks" }) {
  return (
    <motion.div
      className="fixed inset-0 z-[120] grid place-items-center overflow-hidden bg-[#050914]"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.015 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      role="status"
      aria-live="polite"
      aria-label="Loading Mota Bhai"
    >
      <div className="absolute inset-0 loader-aura" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-emerald-950/35 to-transparent" />

      <div className="relative mx-auto flex w-full max-w-sm flex-col items-center px-6 text-center">
        <div className="relative grid h-44 w-44 place-items-center">
          <motion.div
            className="absolute inset-0 rounded-full border border-sovereign/25"
            animate={{ rotate: 360 }}
            transition={ringTransition}
          />
          <motion.div
            className="absolute inset-4 rounded-full border border-dashed border-emerald-300/35"
            animate={{ rotate: -360 }}
            transition={{ ...ringTransition, duration: 3.3 }}
          />
          <motion.div
            className="absolute inset-8 rounded-full bg-gradient-to-br from-sovereign via-[#f7df8a] to-emerald-300 shadow-[0_0_60px_rgba(212,175,55,0.32)]"
            animate={{
              boxShadow: [
                "0 0 36px rgba(212, 175, 55, 0.26)",
                "0 0 72px rgba(16, 185, 129, 0.32)",
                "0 0 36px rgba(212, 175, 55, 0.26)"
              ],
              scale: [1, 1.045, 1]
            }}
            transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity }}
          />
          <motion.div
            className="relative grid h-24 w-24 place-items-center rounded-full border border-white/40 bg-obsidian text-3xl font-black text-sovereign shadow-2xl"
            animate={{ y: [0, -7, 0] }}
            transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
          >
            MB
          </motion.div>
        </div>

        <motion.p
          className="mt-4 text-xs font-black uppercase tracking-[0.34em] text-emerald-200/80"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.45 }}
        >
          Gujarati Jalso
        </motion.p>
        <motion.h1
          className="mt-3 text-4xl font-black leading-none text-white"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Mota Bhai
        </motion.h1>
        <motion.p
          className="mt-4 min-h-6 text-sm font-bold text-champagne/85"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {message}
        </motion.p>

        <div className="mt-7 flex items-center gap-2" aria-hidden="true">
          {[0, 1, 2].map((dot) => (
            <motion.span
              key={dot}
              className="h-2.5 w-2.5 rounded-full bg-sovereign"
              animate={{ opacity: [0.35, 1, 0.35], y: [0, -5, 0] }}
              transition={{ duration: 0.9, delay: dot * 0.14, ease: "easeInOut", repeat: Infinity }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
