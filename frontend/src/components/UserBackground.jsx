import { motion } from "framer-motion";

export default function UserBackground() {
  const nodes = Array.from({ length: 15 });

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
      {/* Network Nodes (Users pinging) */}
      {nodes.map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: i % 2 === 0 ? "rgba(42, 140, 255, 0.8)" : "rgba(40, 209, 124, 0.8)",
            boxShadow: `0 0 15px 4px ${i % 2 === 0 ? "rgba(42, 140, 255, 0.4)" : "rgba(40, 209, 124, 0.4)"}`,
          }}
          initial={{
            top: `${Math.random() * 100}vh`,
            left: `${Math.random() * 100}vw`,
          }}
          animate={{
            top: [`${Math.random() * 100}vh`, `${Math.random() * 100}vh`, `${Math.random() * 100}vh`],
            left: [`${Math.random() * 100}vw`, `${Math.random() * 100}vw`, `${Math.random() * 100}vw`],
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: Math.random() * 30 + 30,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {/* Concentric rings to look like "pings" or user activity */}
          <motion.div
            style={{
              position: "absolute",
              top: "-17px",
              left: "-17px",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: `1px solid ${i % 2 === 0 ? "rgba(42, 140, 255, 0.5)" : "rgba(40, 209, 124, 0.5)"}`,
            }}
            animate={{ scale: [0.2, 2.5], opacity: [0.8, 0] }}
            transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: Math.random() * 3 }}
          />
        </motion.div>
      ))}

      {/* Very faint large abstract user icon in background */}
      <motion.svg
        viewBox="0 0 24 24"
        style={{
          position: "absolute",
          top: "10vh",
          right: "5vw",
          width: "90vh",
          height: "90vh",
          fill: "none",
          stroke: "rgba(255, 255, 255, 0.02)",
          strokeWidth: 0.3,
        }}
        animate={{ y: [0, 30, 0], opacity: [0.01, 0.04, 0.01], rotate: [0, 5, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </motion.svg>
      
      <motion.svg
        viewBox="0 0 24 24"
        style={{
          position: "absolute",
          bottom: "-5vh",
          left: "0vw",
          width: "70vh",
          height: "70vh",
          fill: "none",
          stroke: "rgba(42, 140, 255, 0.03)",
          strokeWidth: 0.3,
        }}
        animate={{ y: [0, -30, 0], opacity: [0.01, 0.04, 0.01], rotate: [0, -5, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </motion.svg>
    </div>
  );
}
