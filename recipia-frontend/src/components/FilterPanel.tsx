import { SlidersHorizontal } from "lucide-react";

interface FilterPanelProps {
  cuisines: string[];
  selectedCuisine: string;
  onCuisineChange: (cuisine: string) => void;
  selectedPrepTime: string;
  onPrepTimeChange: (range: string) => void;
}

const prepTimeOptions = [
  { label: "All", value: "" },
  { label: "< 15 min", value: "0-15" },
  { label: "15-30 min", value: "15-30" },
  { label: "30+ min", value: "30-999" },
];

const FilterPanel = ({
  cuisines,
  selectedCuisine,
  onCuisineChange,
  selectedPrepTime,
  onPrepTimeChange,
}: FilterPanelProps) => (
  <div className="flex flex-wrap items-center gap-2">
    <button className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground px-3 py-2 rounded-lg border border-input bg-card hover:bg-accent transition-colors">
      <SlidersHorizontal className="h-4 w-4" />
      Filter
    </button>

    {["All", ...cuisines].map((cuisine) => (
      <button
        key={cuisine}
        onClick={() => onCuisineChange(cuisine === "All" ? "" : cuisine)}
        className={`text-sm px-3 py-2 rounded-lg font-medium transition-colors ${
          (cuisine === "All" && !selectedCuisine) || selectedCuisine === cuisine
            ? "bg-primary text-primary-foreground"
            : "bg-card border border-input text-foreground hover:bg-accent"
        }`}
      >
        {cuisine}
      </button>
    ))}

    <select
      value={selectedPrepTime}
      onChange={(e) => onPrepTimeChange(e.target.value)}
      className="text-sm px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {prepTimeOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

export default FilterPanel;
