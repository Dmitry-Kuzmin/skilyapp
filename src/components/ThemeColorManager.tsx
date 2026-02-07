import { useEffect } from 'react';
import { useTheme } from 'next-themes';

export function ThemeColorManager() {
    const { resolvedTheme } = useTheme();

    useEffect(() => {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');

        // Define colors
        const darkColor = '#0f172a'; // Slate 900 (Matches app background)
        const lightColor = '#ffffff'; // White (Matches light mode background)

        const color = resolvedTheme === 'dark' ? darkColor : lightColor;

        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', color);
        } else {
            // Create if missing
            const meta = document.createElement('meta');
            meta.name = 'theme-color';
            meta.content = color;
            document.head.appendChild(meta);
        }

        // Also update msapplication-TileColor
        const metaTileColor = document.querySelector('meta[name="msapplication-TileColor"]');
        if (metaTileColor) {
            metaTileColor.setAttribute('content', color);
        }

    }, [resolvedTheme]);

    return null; // This component doesn't render anything visible
}
