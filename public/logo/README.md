# Skily Logo Assets

## Current Logo (2025)

**File:** `skily-logo-current.svg`

This is the **official, current Skily logo** used across the application.

### Specifications:
- **Icon:** `car-front` from Lucide (car facing forward with visible headlights)
- **Gradient:** Blue gradient (`#3b82f6` → `#2563eb` → `#1d4ed8`)
- **Box:** 60x60px rounded square (rx=18)
- **Text:** "Skily" in Inter font-weight 900
- **Size:** 220x60px

### Usage:
- Watermarks for images
- Email templates
- External branding
- Social media

### Source:
Extracted from `src/components/landing/LandingLogo.tsx` (header variant)

---

## Deprecated Files

Files in `public/email-assets/` with `-OLD-DEPRECATED` suffix are outdated and should not be used.
They contain old logo versions with incorrect icons.

---

## Need to Update the Logo?

1. Edit `src/components/landing/LandingLogo.tsx`
2. Run the app: `npm run dev`
3. Open browser DevTools and inspect the logo element
4. Copy the rendered SVG
5. Update `skily-logo-current.svg` with the new SVG
6. Update this README with any specification changes
