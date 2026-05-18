/* eslint-disable @typescript-eslint/no-explicit-any */
export {};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: {
            id?: number;
            username?: string;
          };
        };
        themeParams?: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
          header_bg_color?: string;
          accent_text_color?: string;
          section_bg_color?: string;
          section_header_text_color?: string;
          subtitle_text_color?: string;
          destructive_text_color?: string;
        };
        colorScheme?: 'light' | 'dark';
        ready?: () => void;
        expand?: () => void;
        openInvoice?: (url: string, callback?: (status: string) => void) => void;
      };
    };
  }
}
