import "./globals.css";

export const metadata = {
  title: "Inquiry Desk | Coffee Ninja",
  description: "A clear, reliable workspace for customer requests.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
