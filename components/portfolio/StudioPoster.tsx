import Image from "next/image";

export default function StudioPoster() {
  return (
    <picture>
      <source media="(max-width: 700px)" srcSet="/atelier-poster-mobile.jpg" />
      <Image
        src="/atelier-poster.jpg"
        alt=""
        fill
        sizes="100vw"
        loading="eager"
        className="studio-poster"
      />
    </picture>
  );
}
