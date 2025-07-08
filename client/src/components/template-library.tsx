import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Palette, BarChart3, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export function TemplateLibrary() {
  const { data: templates, isLoading, error } = useQuery({
    queryKey: ["/api/v1/templates"],
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "consulting":
        return <FileText className="w-4 h-4" />;
      case "executive":
        return <Target className="w-4 h-4" />;
      case "data-viz":
        return <BarChart3 className="w-4 h-4" />;
      case "strategic":
        return <Palette className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "consulting":
        return "from-blue-500 to-purple-600";
      case "executive":
        return "from-green-500 to-teal-600";
      case "data-viz":
        return "from-orange-500 to-red-600";
      case "strategic":
        return "from-purple-500 to-pink-600";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  if (isLoading) {
    return (
      <div data-template-library className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Professional Templates</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-video" />
              <div className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-template-library className="text-center py-8">
        <div className="w-12 h-12 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-red-600">⚠</span>
        </div>
        <h3 className="font-semibold text-foreground mb-2">Failed to Load Templates</h3>
        <p className="text-muted-foreground text-sm">
          Unable to fetch template library. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div data-template-library className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Professional Templates</h3>
        <Button variant="outline" size="sm">
          View All Templates
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        {templates?.map((template) => (
          <Card 
            key={template.id} 
            className="overflow-hidden hover:shadow-md transition-shadow group cursor-pointer"
          >
            <div className={cn(
              "aspect-video bg-gradient-to-br p-6 flex items-center justify-center",
              getCategoryColor(template.category)
            )}>
              <div className="text-center text-white">
                <div className="w-12 h-12 bg-white/20 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  {getCategoryIcon(template.category)}
                </div>
                <h4 className="font-semibold">{template.name}</h4>
                <Badge variant="secondary" className="mt-2 bg-white/20 text-white border-white/20">
                  {template.category}
                </Badge>
              </div>
            </div>
            <div className="p-4">
              <h4 className="font-semibold text-foreground mb-1">
                {template.name.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
              </h4>
              <p className="text-sm text-muted-foreground">
                {template.description}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  {template.category}
                </Badge>
                <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  Use Template
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Chart Examples */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">Business Charts Gallery</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
          {[
            { title: "Growth Trends", type: "line" },
            { title: "Market Share", type: "pie" },
            { title: "KPI Dashboard", type: "metrics" },
            { title: "Comparative Analysis", type: "bar" },
            { title: "Revenue Forecast", type: "area" },
            { title: "Customer Segments", type: "donut" }
          ].map((chart, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow group cursor-pointer">
              <div className="aspect-video bg-white p-4 flex items-center justify-center border-b">
                <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div className="p-3">
                <h4 className="font-medium text-foreground text-sm">{chart.title}</h4>
                <p className="text-xs text-muted-foreground capitalize">{chart.type} chart</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
