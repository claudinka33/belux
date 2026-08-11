import { withAuth } from "next-auth/middleware";
import { AUTH_SECRET } from "./lib/secret";

export default withAuth({
  secret: AUTH_SECRET,
  callbacks: {
    authorized: ({ token, req }) => {
      if (req.nextUrl.pathname.startsWith("/admin")) {
        return token?.role === "ADMIN";
      }
      return true;
    },
  },
  pages: { signIn: "/prijava" },
});

export const config = { matcher: ["/admin/:path*", "/admin"] };
