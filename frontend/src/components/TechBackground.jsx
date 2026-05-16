import { motion } from "framer-motion";

export default function TechBackground() {
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
      }}
    >
      {/* Moving Data Streams / Glowing Lines */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            top: `${Math.random() * 100}vh`,
            left: "-20vw",
            width: `${Math.random() * 30 + 10}vw`,
            height: "2px",
            background: `linear-gradient(90deg, transparent, ${i % 3 === 0 ? "rgba(0, 87, 217, 0.9)" : i % 3 === 1 ? "rgba(40, 209, 124, 0.9)" : "rgba(122, 53, 223, 0.9)"}, transparent)`,
            filter: "blur(1px)",
            boxShadow: `0 0 10px ${i % 3 === 0 ? "rgba(0, 87, 217, 0.8)" : "rgba(40, 209, 124, 0.8)"}`
          }}
          animate={{
            x: ["0vw", "140vw"],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: Math.random() * 4 + 4,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 10
          }}
        />
      ))}

      {/* Large Glowing Orbs for ambiance */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={`orb-${i}`}
          style={{
            position: "absolute",
            width: "50vw",
            height: "50vw",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${i === 0 ? "rgba(42, 140, 255, 0.08)" : i === 1 ? "rgba(122, 53, 223, 0.06)" : "rgba(40, 209, 124, 0.05)"} 0%, transparent 60%)`,
            filter: "blur(60px)",
            top: i === 0 ? "-10%" : i === 1 ? "50%" : "20%",
            left: i === 0 ? "50%" : i === 1 ? "-10%" : "80%",
          }}
          animate={{
            x: [0, 50, -50, 0],
            y: [0, -50, 50, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{
            duration: 20 + i * 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
