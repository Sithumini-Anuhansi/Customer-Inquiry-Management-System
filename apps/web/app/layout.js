import "./globals.css";

export const metadata = {
  title: "InquiTrack | Customer Inquiry Management",
  description: "A clear, reliable workspace for customer requests.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
