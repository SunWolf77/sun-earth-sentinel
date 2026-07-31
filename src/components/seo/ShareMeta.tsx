import { useEffect } from "react";
import { SITE, resolveShareOrigin, ogImageUrl, absoluteUrl } from "@/lib/site";

/**
 * Keeps absolute og/twitter image URLs aligned with the live origin.
 */
export function ShareMeta() {
  useEffect(() => {
    const origin = resolveShareOrigin();
    const image = ogImageUrl(origin);
    const page = absoluteUrl("/", origin);

    const upsert = (
      attr: "name" | "property",
      key: string,
      content: string,
    ) => {
      let el = document.head.querySelector<HTMLMetaElement>(
        `meta[${attr}="${key}"]`,
      );
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    upsert("property", "og:url", page);
    upsert("property", "og:image", image);
    upsert("property", "og:image:secure_url", image);
    upsert("name", "twitter:image", image);
    upsert("name", "twitter:url", page);

    let canon = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canon) {
      canon = document.createElement("link");
      canon.rel = "canonical";
      document.head.appendChild(canon);
    }
    canon.href = page;

    // JSON-LD helps some non-X previews
    const id = "ww-jsonld";
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = id;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: SITE.name,
      url: page,
      description: SITE.description,
      applicationCategory: "ScienceApplication",
      operatingSystem: "Web",
      image: image,
      author: {
        "@type": "Person",
        name: "SunWolf",
        url: "https://x.com/Sunwolf77",
      },
    });
  }, []);

  return null;
}
