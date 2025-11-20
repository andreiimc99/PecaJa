"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image"; // Migrar <img> para <Image>
import "./Carousel.css";

// Tipo genérico: carrossel de imagens via URL completa
interface ImageItem {
  src: string;
  alt?: string;
  onClick?: () => void;
}

type Props = { images?: ImageItem[] };

export default function Carousel({ images }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slidesToShow, setSlidesToShow] = useState(1);
  const autoplayRef = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const [loadedRemote, setLoadedRemote] = useState<ImageItem[] | null>(null);

  // Se prop não fornecida, tenta buscar do backend
  useEffect(() => {
    if (!images) {
      fetch("http://localhost:3001/api/carousel")
        .then((r) => (r.ok ? r.json() : []))
        .then(
          (
            rows: {
              image_url: string;
              title?: string | null;
              target_url?: string | null;
            }[]
          ) => {
            const mapped: ImageItem[] = rows.map((r) => ({
              src: r.image_url,
              alt: r.title || "banner",
              onClick: r.target_url
                ? () => {
                    window.location.href = r.target_url!;
                  }
                : undefined,
            }));
            setLoadedRemote(mapped);
          }
        )
        .catch(() => setLoadedRemote([]));
    }
  }, [images]);

  const items: ImageItem[] = images || loadedRemote || [];
  const count = items.length;

  // Exibir sempre 1 imagem por vez (desktop e mobile)
  useEffect(() => {
    setSlidesToShow(1);
  }, []);

  useEffect(() => {
    const maxIndex = Math.max(0, count - slidesToShow);
    if (currentIndex > maxIndex) setCurrentIndex(maxIndex);
  }, [count, slidesToShow, currentIndex]);

  useEffect(() => {
    if (count <= 1) return;
    autoplayRef.current = window.setInterval(() => {
      setCurrentIndex((i) => {
        const max = Math.max(0, count - slidesToShow);
        return i >= max ? 0 : i + 1;
      });
    }, 5000);

    return () => {
      if (autoplayRef.current) {
        window.clearInterval(autoplayRef.current);
        autoplayRef.current = null;
      }
    };
  }, [count, slidesToShow]);

  const prev = () => {
    const max = Math.max(0, count - slidesToShow);
    setCurrentIndex((i) => (i === 0 ? max : i - 1));
  };

  const next = () => {
    const max = Math.max(0, count - slidesToShow);
    setCurrentIndex((i) => (i >= max ? 0 : i + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    if (autoplayRef.current) {
      window.clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    if (start == null) return;
    const end = e.changedTouches[0].clientX;
    const delta = end - start;
    const threshold = 50;
    if (delta > threshold) prev();
    else if (delta < -threshold) next();
    touchStartX.current = null;
  };

  const percentage = slidesToShow > 0 ? 100 / slidesToShow : 100;
  const translate = `-${currentIndex * percentage}%`;

  if (!items || items.length === 0) return null;

  return (
    <div className="carousel">
      <button
        className="carousel-button prev"
        onClick={prev}
        aria-label="Anterior"
      >
        ‹
      </button>

      <div
        className="carousel-viewport"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="carousel-track"
          style={{ transform: `translateX(${translate})` }}
        >
          {items.map((item, idx) => (
            <div key={idx} className="carousel-slide">
              <Image
                src={item.src}
                alt={item.alt || "imagem do carrossel"}
                width={1200}
                height={240}
                className="carousel-image"
                placeholder="blur"
                blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="
                onClick={item.onClick}
                priority
              />
            </div>
          ))}
        </div>
      </div>

      <button
        className="carousel-button next"
        onClick={next}
        aria-label="Próximo"
      >
        ›
      </button>
    </div>
  );
}
