import { useEffect, useState, type FC } from 'react';

type ArcGalleryHeroProps = {
  images: string[];
  startAngle?: number;
  endAngle?: number;
  radiusLg?: number;
  radiusMd?: number;
  radiusSm?: number;
  cardSizeLg?: number;
  cardSizeMd?: number;
  cardSizeSm?: number;
  overlapLg?: number;
  overlapMd?: number;
  overlapSm?: number;
  className?: string;
  children?: React.ReactNode;
};

export const ArcGalleryHero: FC<ArcGalleryHeroProps> = ({
  images,
  startAngle = 10,
  endAngle = 170,
  radiusLg = 580,
  radiusMd = 420,
  radiusSm = 280,
  cardSizeLg = 100,
  cardSizeMd = 80,
  cardSizeSm = 58,
  overlapLg = -20,
  overlapMd = -16,
  overlapSm = -24,
  className = '',
  children,
}) => {
  const [dims, setDims] = useState({
    radius: radiusLg,
    cardSize: cardSizeLg,
    overlap: overlapLg,
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 640) {
        setDims({ radius: radiusSm, cardSize: cardSizeSm, overlap: overlapSm });
      } else if (w < 1024) {
        setDims({ radius: radiusMd, cardSize: cardSizeMd, overlap: overlapMd });
      } else {
        setDims({ radius: radiusLg, cardSize: cardSizeLg, overlap: overlapLg });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [radiusLg, radiusMd, radiusSm, cardSizeLg, cardSizeMd, cardSizeSm, overlapLg, overlapMd, overlapSm]);

  const count = Math.max(images.length, 2);
  const step = (endAngle - startAngle) / (count - 1);

  return (
    <div className={`relative w-full ${className}`}>
      {/* Arc ring */}
      <div
        className="relative mx-auto overflow-visible"
        style={{ width: '100%', height: dims.radius + dims.cardSize / 2 }}
      >
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2">
          {images.map((src, i) => {
            const angle = startAngle + step * i;
            const rad = (angle * Math.PI) / 180;
            const x = Math.cos(rad) * dims.radius;
            const y = Math.sin(rad) * dims.radius;

            // tilt: centre cards straight, edges tilted
            const centreAngle = (startAngle + endAngle) / 2;
            const tilt = ((angle - centreAngle) / (endAngle - startAngle)) * 24;

            return (
              <div
                key={i}
                className="absolute opacity-0 arc-fade-in-up"
                style={{
                  width: dims.cardSize,
                  height: dims.cardSize,
                  left: `calc(50% + ${x}px)`,
                  bottom: `${y}px`,
                  transform: 'translate(-50%, 50%)',
                  animationDelay: `${i * 80}ms`,
                  animationFillMode: 'forwards',
                  zIndex: images.length - Math.abs(i - Math.floor(images.length / 2)),
                }}
              >
                <div
                  className="rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/[0.12] bg-[#0d1526] transition-transform duration-300 hover:scale-110 hover:z-50 w-full h-full"
                  style={{ transform: `rotate(${tilt}deg)` }}
                >
                  <img
                    src={src}
                    alt={`Вопрос ${i + 1}`}
                    className="block w-full h-full object-cover"
                    draggable={false}
                    loading="lazy"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Children content overlapping into the arc */}
      {children && (
        <div
          className="relative z-10 flex items-center justify-center px-4"
          style={{ marginTop: dims.overlap }}
        >
          <div
            className="text-center w-full opacity-0 arc-fade-in"
            style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}
          >
            {children}
          </div>
        </div>
      )}

      <style>{`
        @keyframes arc-fade-in-up-kf {
          from { opacity: 0; transform: translate(-50%, 60%); }
          to   { opacity: 1; transform: translate(-50%, 50%); }
        }
        @keyframes arc-fade-in-kf {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .arc-fade-in-up {
          animation: arc-fade-in-up-kf 0.7s ease-out;
        }
        .arc-fade-in {
          animation: arc-fade-in-kf 0.6s ease-out;
        }
      `}</style>
    </div>
  );
};
