"use client";

import { motion, AnimatePresence } from "framer-motion";
import { createContext, useCallback, useContext, useState } from "react";

interface Burst {
  id: number;
  x: number;
  y: number;
}

interface AddToCartBurstContextValue {
  triggerBurst: (element: HTMLElement | null) => void;
}

const AddToCartBurstContext = createContext<AddToCartBurstContextValue | null>(
  null,
);

export function AddToCartBurstProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [bursts, setBursts] = useState<Burst[]>([]);

  const triggerBurst = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const id = Date.now();
    setBursts((b) => [...b, { id, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }]);
    window.setTimeout(() => {
      setBursts((b) => b.filter((x) => x.id !== id));
    }, 700);
  }, []);

  return (
    <AddToCartBurstContext.Provider value={{ triggerBurst }}>
      {children}
      <AnimatePresence>
        {bursts.map((b) => (
          <motion.div
            key={b.id}
            className="pointer-events-none fixed z-[100] h-3 w-3 rounded-full bg-primary shadow-lg shadow-primary/50"
            style={{ left: b.x - 6, top: b.y - 6 }}
            initial={{ scale: 1, opacity: 1 }}
            animate={{
              scale: [1, 1.4, 0.2],
              opacity: [1, 1, 0],
              y: [0, -48, -96],
              x: [0, 24, 48],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>
    </AddToCartBurstContext.Provider>
  );
}

export function useAddToCartBurst() {
  const ctx = useContext(AddToCartBurstContext);
  if (!ctx) {
    return { triggerBurst: () => {} };
  }
  return ctx;
}
