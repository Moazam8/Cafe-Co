# Café & Co

Static responsive café website with a scroll-controlled coffee scene, 18 menu items, search, category filters, and pickup ordering through WhatsApp.

## Local preview

Run `python -m http.server 8765`, then open http://localhost:8765/.

## Menu and ordering

Edit names, descriptions, PKR prices and image paths in `menu.js`. `CAFE_SETTINGS.ordersEnabled` controls the WhatsApp handoff. The receiving number is `923236881910`. Customers check their message, open WhatsApp and send it themselves. Café confirmation is required; the site takes no payment and has no order database. Only cart quantities persist locally.

The owner requested customer-facing copy without review banners on October 7. Address and hours remain omitted because they have not been supplied. The menu originated as sample content and the images are generated; verify actual availability and pricing operationally before publishing. The website has not been deployed.

## Motion and layout

The hero uses 340 viewport heights, with video progress mapped to the entire sticky travel. The final frame coincides with release, with no extra hold. Reverse scrolling reverses the clip. Navigation stays fixed; a failed video collapses to one screen with a still. Other effects respect reduced motion.

The café introduction has a coffee image on the left, tighter typography and reduced vertical padding. Contact and footer spacing are compact on desktop and phones.

## Media

`assets/hero-video-hq.mp4` is a higher-quality 1280 × 720 export of the original six-second clip. AI 4K enhancement remains pending 0.48-credit approval; no extra Higgsfield credits have been spent. Menu photos are individually generated 1200px WebP images, lazily loaded. The source direction was warm limestone, olive background, burgundy linen, natural side light and realistic food texture.
