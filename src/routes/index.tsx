import { createFileRoute } from "@tanstack/react-router";
// @ts-ignore JS module
import { TisanProvider, useTisan } from "../components/tisan/state";
// @ts-ignore JS module
import PublicSite from "../components/tisan/PublicSite";
// @ts-ignore JS module
import { AdminLogin, AdminDashboard } from "../components/tisan/Admin";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TISAN GREEN ENERGY PRIVATE LIMITED — Real Estate & Sustainable Development" },
      { name: "description", content: "Thoughtfully designed spaces and forward-looking, sustainability-minded real estate development by TISAN GREEN ENERGY PRIVATE LIMITED." },
      { property: "og:title", content: "TISAN GREEN ENERGY PRIVATE LIMITED" },
      { property: "og:description", content: "Building Tomorrow, Sustainably. Explore residential, commercial and sustainable concept showcases." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Screens() {
  const { screen, authenticated } = useTisan();
  if (screen === "admin" && authenticated) return <AdminDashboard />;
  if (screen === "login" || screen === "admin") return <AdminLogin />;
  return <PublicSite />;
}

function Index() {
  return (
    <TisanProvider>
      <Screens />
    </TisanProvider>
  );
}
