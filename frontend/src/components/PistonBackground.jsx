import { motion } from "framer-motion";

export default function PistonBackground() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
        opacity: 0.04,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "flex-end"
      }}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          style={{
            width: "10vw",
            maxWidth: "120px",
            height: "80vh",
            background: "linear-gradient(180deg, currentColor 0%, transparent 100%)",
            borderRadius: "20px 20px 0 0",
            originY: 1
          }}
          animate={{
            scaleY: [0.3, 0.8, 0.3],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 3 + (i % 3),
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.4
          }}
        />
      ))}
    </div>
  );
}
