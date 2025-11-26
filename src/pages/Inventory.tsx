import Layout from "@/components/Layout";
import { CosmeticsInventory } from "@/components/cosmetics/CosmeticsInventory";

export default function Inventory() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <CosmeticsInventory />
      </div>
    </Layout>
  );
}
