import Layout from "@/components/Layout";
import { CosmeticsInventory } from "@/components/cosmetics/CosmeticsInventory";
import { CosmeticsCatalog } from "@/components/cosmetics/CosmeticsCatalog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Sparkles } from "lucide-react";

export default function Inventory() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="inventory" className="gap-2">
              <Package className="w-4 h-4" />
              Мой инвентарь
            </TabsTrigger>
            <TabsTrigger value="catalog" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Каталог
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="inventory" className="mt-0">
            <CosmeticsInventory />
          </TabsContent>
          
          <TabsContent value="catalog" className="mt-0">
            <CosmeticsCatalog />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

