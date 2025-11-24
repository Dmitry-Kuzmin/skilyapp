import Layout from "@/components/Layout";
import { CosmeticsCatalog } from "@/components/cosmetics/CosmeticsCatalog";

export default function Inventory() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <CosmeticsCatalog />
      </div>
    </Layout>
  );
}

