export const metadata = {
  title: "Inquiry Desk",
  description: "Customer inquiry management for your team",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
