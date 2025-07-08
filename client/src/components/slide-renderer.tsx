import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BarChart3, PieChart, LineChart } from "lucide-react";

interface SlideProps {
  slide: any;
  index: number;
  className?: string;
}

export function SlideRenderer({ slide, index, className }: SlideProps) {
  const renderChart = () => {
    if (!slide.chartData) return null;
    
    const Icon = slide.chartData.type === 'pie' ? PieChart :
                 slide.chartData.type === 'line' ? LineChart :
                 BarChart3;
    
    return (
      <div className="flex flex-col items-center justify-center h-32 bg-muted/20 rounded">
        <Icon className="h-12 w-12 text-muted-foreground mb-2" />
        <p className="text-xs text-muted-foreground">
          {slide.chartData.type.charAt(0).toUpperCase() + slide.chartData.type.slice(1)} Chart
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {slide.chartData.categories.length} categories
        </p>
      </div>
    );
  };

  const renderContent = () => {
    switch (slide.type) {
      case 'title':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-2xl font-bold mb-3">{slide.title}</h2>
            {slide.content?.[0] && (
              <p className="text-sm text-muted-foreground max-w-[80%]">
                {slide.content[0]}
              </p>
            )}
          </div>
        );
      
      case 'bullet':
        return (
          <div className="h-full">
            <h3 className="text-lg font-semibold mb-3">{slide.title}</h3>
            <ul className="space-y-2 text-sm">
              {slide.content?.slice(0, 4).map((item: string, i: number) => (
                <li key={i} className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span className="text-muted-foreground line-clamp-2">{item}</span>
                </li>
              ))}
              {slide.content?.length > 4 && (
                <li className="text-xs text-muted-foreground/50 ml-4">
                  +{slide.content.length - 4} more...
                </li>
              )}
            </ul>
          </div>
        );
      
      case 'chart':
        return (
          <div className="h-full">
            <h3 className="text-lg font-semibold mb-3">{slide.title}</h3>
            {renderChart()}
          </div>
        );
      
      case 'quote':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl text-primary/20 mb-2">"</div>
            <p className="text-sm italic text-muted-foreground max-w-[80%]">
              {slide.content?.[0]}
            </p>
            <div className="text-4xl text-primary/20 mt-2">"</div>
          </div>
        );
      
      default:
        return (
          <div className="h-full">
            <h3 className="text-lg font-semibold mb-3">{slide.title}</h3>
            {slide.content && (
              <div className="text-sm text-muted-foreground space-y-2">
                {slide.content.slice(0, 3).map((item: string, i: number) => (
                  <p key={i} className="line-clamp-2">{item}</p>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <Card className={cn(
      "relative aspect-[16/9] p-6 overflow-hidden bg-background",
      "border-2 hover:border-primary/50 transition-colors",
      className
    )}>
      {/* Slide number badge */}
      <div className="absolute top-2 right-2 text-xs text-muted-foreground">
        Slide {index + 1}
      </div>
      
      {/* Slide content */}
      {renderContent()}
      
      {/* Decorative element */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-primary/0" />
    </Card>
  );
}