import React from "react";
import { motion } from "framer-motion";

export const LoadingCamerton = () => {
  const totalDuration = 2.8; // Увеличил цикл для внятного замедления

  // Таймлайн (от 0 до 1)
  const T_PREP = 0.1; // Замах назад
  const T_SPIN_PEAK = 0.3; // Максимальная скорость
  const T_SLOW_DOWN = 0.45; // Начало фазы замедления
  const T_STOP_SPIN = 0.55; // Полная остановка (вращения больше нет)
  const T_STILL_PAUSE = 0.6; // Пауза в покое перед ударом (честная фиксация)
  const T_IMPACT = 0.64; // Пик удара вниз
  const T_RETURN = 0.68; // Возврат и старт волн
  const T_END_PAUSE = 1.0; // Покой до конца цикла

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "150px",
      }}
    >
      <div style={{ position: "relative", width: 60, height: 60 }}>
        {/* Хлесткие волны (запуск после T_RETURN) */}
        <Wave
          side="left"
          delay={totalDuration * T_RETURN}
          totalCycle={totalDuration}
        />
        <Wave
          side="right"
          delay={totalDuration * T_RETURN}
          totalCycle={totalDuration}
        />

        <motion.svg
          viewBox="0 0 30 30"
          style={{ width: "100%", height: "100%", overflow: "visible" }}
          animate={{
            // Вращение: замах -> разгон -> замедление -> МЕРТВАЯ ОСТАНОВКА
            rotate: [0, -25, 600, 1080, 1080, 1080, 1080, 1080],
            // Удар: стоит(0) до тех пор, пока вращение полностью не прекратится
            y: [0, 0, 0, 0, 0, 12, 0, 0],
          }}
          transition={{
            duration: totalDuration,
            repeat: Infinity,
            times: [
              0,
              T_PREP,
              T_SPIN_PEAK,
              T_STOP_SPIN,
              T_STILL_PAUSE,
              T_IMPACT,
              T_RETURN,
              T_END_PAUSE,
            ],
            ease: [
              "easeOut", // Замах
              "circIn", // Взрывной разгон
              "easeOut", // Плавное замедление до остановки
              "linear", // Фиксация в 0 (покой)
              "easeIn", // Удар вниз
              "easeOut", // Отскок вверх
              "linear", // Финальный покой
            ],
          }}
        >
          <defs>
            <linearGradient id="camertonGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#BD9673" />
              <stop offset="100%" stopColor="#7D5E42" />
            </linearGradient>
          </defs>
          <path
            d="m 19,4 c -0.6,0 -1,0.4 -1,1 v 10 c 0,1.1 -0.9,2 -2,2 -1.1,0 -2,-0.9 -2,-2 V 5 C 14,4.4 13.6,4 13,4 12.4,4 12,4.4 12,5 v 10 c 0,1.9 1.3,3.4 3,3.9 v 7.4 c -0.6,0.3 -1,1 -1,1.7 0,1.1 0.9,2 2,2 1.1,0 2,-0.9 2,-2 0,-0.7 -0.4,-1.4 -1,-1.7 v -7.4 c 1.7,-0.4 3,-2 3,-3.9 V 5 C 20,4.4 19.6,4 19,4 Z"
            fill="url(#camertonGradient)"
            style={{
              transformOrigin: "16px 15px",
              transform: "translateX(-1px)",
            }}
          />
        </motion.svg>
      </div>
    </div>
  );
};

const Wave = ({
  side,
  delay,
  totalCycle,
}: {
  side: "left" | "right";
  delay: number;
  totalCycle: number;
}) => {
  const isLeft = side === "left";
  return (
    <div
      style={{
        position: "absolute",
        top: "15%",
        [side]: "14px",
        width: "20px",
        height: "30px",
      }}
    >
      {[0, 0.08].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 0 }}
          animate={{
            opacity: [0, 1, 0],
            x: isLeft ? [0, -22] : [0, 22],
            scaleY: [1, 1.4, 0.7],
          }}
          transition={{
            delay: delay + i,
            duration: 0.4,
            repeat: Infinity,
            repeatDelay: totalCycle - 0.4,
            ease: "circOut",
          }}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            borderLeft: isLeft ? "2.5px solid #BD9673" : "none",
            borderRight: !isLeft ? "2.5px solid #BD9673" : "none",
            borderRadius: isLeft ? "100% 0 0 100%" : "0 100% 100% 0",
          }}
        />
      ))}
    </div>
  );
};
