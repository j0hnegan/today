"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CategoriesPanel } from "@/components/tags/CategoriesPanel";
import { GoalsPanel } from "@/components/tags/GoalsPanel";

export function TagsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Categories &amp; Goals</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="categories" className="mt-2">
          <TabsList>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
          </TabsList>
          <TabsContent value="categories" className="mt-4">
            <CategoriesPanel />
          </TabsContent>
          <TabsContent value="goals" className="mt-4">
            <GoalsPanel />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
