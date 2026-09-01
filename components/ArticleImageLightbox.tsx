"use client";

import { useEffect, useState } from "react";

export function ArticleImageLightbox() {
  const [activeSrc, setActiveSrc] = useState<string | null>(null);
  const [activeAlt, setActiveAlt] = useState<string>("");

  useEffect(() => {
    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName.toLowerCase() === "img" &&
        target.closest(".article-body")
      ) {
        const img = target as HTMLImageElement;
        // 若圖片存在 src 且不是非常小的 icon 則觸發燈箱放大
        if (img.src && !img.classList.contains("no-zoom")) {
          e.preventDefault();
          setActiveSrc(img.src);
          setActiveAlt(img.alt || "文章圖片");
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveSrc(null);
      }
    };

    document.addEventListener("click", handleImageClick);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("click", handleImageClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // 鎖定背景捲軸
  useEffect(() => {
    if (activeSrc) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeSrc]);

  if (!activeSrc) return null;

  return (
    <div
      className="image-lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="圖片放大預覽"
    >
      <button
        type="button"
        className="image-lightbox-overlay-btn"
        onClick={() => setActiveSrc(null)}
        aria-label="關閉燈箱"
        style={{
          position: "absolute",
          inset: 0,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          width: "100%",
          height: "100%",
        }}
      />
      <div className="image-lightbox-content" style={{ position: "relative", zIndex: 1 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeSrc}
          alt={activeAlt}
          className="image-lightbox-img"
        />
        {activeAlt && <p className="image-lightbox-caption">{activeAlt}</p>}
        <button
          type="button"
          className="image-lightbox-close"
          onClick={() => setActiveSrc(null)}
          aria-label="關閉"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
