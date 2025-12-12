import { Category, CATEGORIES } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface CategoryFilterProps {
  selected: Category | "All";
  onSelect: (category: Category | "All") => void;
}

export default function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="w-full border-b border-border bg-background/50 backdrop-blur-sm sticky top-16 md:top-16 z-40 py-4">
      <ScrollArea className="w-full whitespace-nowrap px-4 md:px-6">
        <div className="flex w-max space-x-2">
          <Badge
            variant={selected === "All" ? "default" : "outline"}
            className={cn(
              "cursor-pointer px-4 py-2 text-sm transition-all hover:opacity-80",
              selected === "All" 
                ? "bg-primary text-primary-foreground border-primary" 
                : "border-border hover:border-primary/50"
            )}
            onClick={() => onSelect("All")}
          >
            All Bars
          </Badge>
          {CATEGORIES.map((category) => (
            <Badge
              key={category}
              variant={selected === category ? "default" : "outline"}
              className={cn(
                "cursor-pointer px-4 py-2 text-sm transition-all hover:opacity-80",
                selected === category 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => onSelect(category)}
            >
              {category}
            </Badge>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}
